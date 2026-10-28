'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer, PageHeading } from '../../components/ui';
import { TestHubLoader } from '../../components/testhub-loader';

interface PaperItem {
  id: number;
  fileName: string;
  cleanTitle: string;
  exam: string;
  className: string;
  subject: string;
  rawSubject?: string;
  year: number;
  fileSize: number | null;
  status: string;
  isExtracted: boolean;
  questionCount: number;
  totalMarks: number | null;
  durationMin: number;
  paperId: string | null;
  pdfViewerUrl?: string;
}

interface YearGroup {
  year: number;
  paperCount: number;
  papers: PaperItem[];
}

interface SubjectGroup {
  subject: string;
  exams: string[];
  classes: string[];
  totalPapers: number;
  availableYearsCount: number;
  years: YearGroup[];
}

type ExamFilterType = 'all' | 'cbse' | 'jee' | 'other';

export default function PapersLibraryPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [totalPapers, setTotalPapers] = useState(0);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedExamFilter, setSelectedExamFilter] = useState<ExamFilterType>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State: Selected Subject, Selected Year ('all' or number), and Selected Class inside modal
  const [selectedSubject, setSelectedSubject] = useState<SubjectGroup | null>(null);
  const [modalYear, setModalYear] = useState<number | 'all'>('all');
  const [modalClass, setModalClass] = useState<string>('all');

  useEffect(() => {
    let isCancelled = false;

    async function fetchGroupedPapers(attempt = 1) {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/papers');
        const data = await res.json();

        if (!isCancelled) {
          if (data.success && Array.isArray(data.subjects)) {
            setSubjects(data.subjects);
            setTotalPapers(data.totalQuestionPapers || 0);
            setAvailableClasses(data.availableClasses || ['Class X', 'Class XII', 'common']);
            setLoading(false);
          } else if (attempt < 3) {
            setTimeout(() => {
              if (!isCancelled) fetchGroupedPapers(attempt + 1);
            }, 1200);
          } else {
            setError(data.error || 'Failed to load papers from database.');
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          if (attempt < 3) {
            setTimeout(() => {
              if (!isCancelled) fetchGroupedPapers(attempt + 1);
            }, 1200);
          } else {
            setError(err?.message || 'Error connecting to paper library service.');
            setLoading(false);
          }
        }
      }
    }

    fetchGroupedPapers();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Compute paper counts per exam filter
  const examCounts = useMemo(() => {
    let cbse = 0;
    let jee = 0;
    let other = 0;

    for (const s of subjects) {
      for (const y of s.years) {
        for (const p of y.papers) {
          const ex = p.exam.toUpperCase();
          if (ex === 'CBSE') {
            cbse += 1;
          } else if (ex.includes('JEE')) {
            jee += 1;
          } else {
            other += 1;
          }
        }
      }
    }

    return { all: totalPapers, cbse, jee, other };
  }, [subjects, totalPapers]);

  // Filter subjects by exam filter, class filter, and search query
  const filteredSubjects = useMemo(() => {
    return subjects
      .map((s) => {
        // Filter papers by exam and class within each year
        const filteredYears = s.years
          .map((y) => {
            const papersInYear = y.papers.filter((p) => {
              const ex = p.exam.toUpperCase();
              const matchExam =
                selectedExamFilter === 'all' ||
                (selectedExamFilter === 'cbse' && ex === 'CBSE') ||
                (selectedExamFilter === 'jee' && ex.includes('JEE')) ||
                (selectedExamFilter === 'other' && ex !== 'CBSE' && !ex.includes('JEE'));

              const matchClass =
                selectedClassFilter === 'all' ||
                p.className.toLowerCase() === selectedClassFilter.toLowerCase();

              return matchExam && matchClass;
            });

            return {
              ...y,
              paperCount: papersInYear.length,
              papers: papersInYear,
            };
          })
          .filter((y) => y.paperCount > 0);

        const totalFiltered = filteredYears.reduce((sum, y) => sum + y.paperCount, 0);

        return {
          ...s,
          totalPapers: totalFiltered,
          availableYearsCount: filteredYears.length,
          years: filteredYears,
        };
      })
      .filter((s) => {
        if (s.totalPapers === 0) return false;
        if (!searchQuery.trim()) return true;

        const term = searchQuery.toLowerCase();
        const matchSubject = s.subject.toLowerCase().includes(term);
        const matchPapers = s.years.some((y) =>
          y.papers.some(
            (p) =>
              p.cleanTitle.toLowerCase().includes(term) ||
              p.fileName.toLowerCase().includes(term) ||
              p.className.toLowerCase().includes(term)
          )
        );
        return matchSubject || matchPapers;
      });
  }, [subjects, selectedExamFilter, selectedClassFilter, searchQuery]);

  // Open Subject Modal
  const handleOpenSubjectModal = (subj: SubjectGroup) => {
    setSelectedSubject(subj);
    setModalYear('all');
    setModalClass(selectedClassFilter !== 'all' ? selectedClassFilter : 'all');
  };

  const handleCloseModal = () => {
    setSelectedSubject(null);
    setModalYear('all');
    setModalClass('all');
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered papers inside the pop-up modal
  const activePapersInModal = useMemo(() => {
    if (!selectedSubject) return [];

    let pool: PaperItem[] = [];
    if (modalYear === 'all') {
      pool = selectedSubject.years.flatMap((y) => y.papers);
    } else {
      const yearData = selectedSubject.years.find((y) => y.year === modalYear);
      pool = yearData ? yearData.papers : [];
    }

    if (modalClass !== 'all') {
      pool = pool.filter((p) => p.className.toLowerCase() === modalClass.toLowerCase());
    }

    return pool;
  }, [selectedSubject, modalYear, modalClass]);

  // Subject icon color helper
  const getSubjectColor = (subjectName: string) => {
    const s = subjectName.toLowerCase();
    if (s.includes('math')) return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', bar: 'from-blue-600 to-indigo-600' };
    if (s.includes('physic')) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', bar: 'from-amber-500 to-orange-500' };
    if (s.includes('chem')) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', bar: 'from-emerald-600 to-teal-600' };
    if (s.includes('bio') || s.includes('sci')) return { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', bar: 'from-cyan-600 to-blue-500' };
    if (s.includes('hindi') || s.includes('english')) return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', bar: 'from-purple-600 to-pink-600' };
    return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', bar: 'from-[#0875f9] to-[#38bdf8]' };
  };

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Official Assessment Repository"
        title="Question Papers Library"
        description="Filter question papers by Exam and Class. View official PDFs on StudyHub or configure computer-based practice sessions."
        action={
          <span className="rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-[#0875f9] shadow-xs">
            {totalPapers} Total Papers Available
          </span>
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-8 space-y-4 rounded-2xl border border-[#dce4ef] bg-white p-5 shadow-xs">
        {/* Exam Filter Tabs: CBSE, JEE, Other, All */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#68778b] mr-1">
              Exam:
            </span>

            <button
              type="button"
              onClick={() => setSelectedExamFilter('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedExamFilter === 'all'
                  ? 'bg-[#0875f9] text-white shadow-xs'
                  : 'border border-[#dce4ef] bg-[#f8fafc] text-[#4d607b] hover:bg-white hover:text-[#102a56]'
              }`}
            >
              All Exams ({examCounts.all})
            </button>

            <button
              type="button"
              onClick={() => setSelectedExamFilter('cbse')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedExamFilter === 'cbse'
                  ? 'bg-[#0875f9] text-white shadow-xs'
                  : 'border border-[#dce4ef] bg-[#f8fafc] text-[#4d607b] hover:bg-white hover:text-[#102a56]'
              }`}
            >
              CBSE ({examCounts.cbse})
            </button>

            <button
              type="button"
              onClick={() => setSelectedExamFilter('jee')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedExamFilter === 'jee'
                  ? 'bg-[#0875f9] text-white shadow-xs'
                  : 'border border-[#dce4ef] bg-[#f8fafc] text-[#4d607b] hover:bg-white hover:text-[#102a56]'
              }`}
            >
              JEE ({examCounts.jee})
            </button>

            <button
              type="button"
              onClick={() => setSelectedExamFilter('other')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedExamFilter === 'other'
                  ? 'bg-[#0875f9] text-white shadow-xs'
                  : 'border border-[#dce4ef] bg-[#f8fafc] text-[#4d607b] hover:bg-white hover:text-[#102a56]'
              }`}
            >
              Other ({examCounts.other})
            </button>
          </div>

          {/* Group by Class Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="class-select" className="text-xs font-bold uppercase tracking-wider text-[#68778b]">
              Class:
            </label>
            <select
              id="class-select"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#1c2d45] focus:border-[#0875f9] focus:outline-none"
            >
              <option value="all">All Classes</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls === 'common' ? 'JEE / Common' : cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects or papers by title, keyword, or class..."
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-2.5 pl-10 pr-4 text-xs font-medium text-[#1c2d45] placeholder-slate-400 focus:border-[#0875f9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-sm"
          />
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[#dce4ef] bg-white p-12 text-center">
          <TestHubLoader size={38} text="Loading official question papers from database..." />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xs">
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-[#0875f9] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-base font-bold text-[#102a56]">No papers found for this filter</p>
          <p className="mt-1 text-xs text-[#68778b]">Try resetting your filters or clearing your search query.</p>
          <button
            onClick={() => {
              setSelectedExamFilter('all');
              setSelectedClassFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-xs font-bold text-[#0875f9] hover:bg-blue-100"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Subjects Grid */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subj) => {
            const colors = getSubjectColor(subj.subject);

            return (
              <div
                key={subj.subject}
                onClick={() => handleOpenSubjectModal(subj)}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#dce4ef] bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#0875f9]/50 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className={`h-1.5 w-full bg-gradient-to-r ${colors.bar}`} />

                  <div className="p-5 sm:p-6">
                    {/* Header: Exam Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex size-9 items-center justify-center rounded-xl font-extrabold text-sm ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {subj.subject.charAt(0)}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {subj.exams.map((ex) => (
                            <span
                              key={ex}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 uppercase"
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>

                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#0875f9]">
                        {subj.totalPapers} {subj.totalPapers === 1 ? 'Paper' : 'Papers'}
                      </span>
                    </div>

                    {/* Subject Title */}
                    <h3 className="mt-4 text-lg font-bold tracking-tight text-[#102a56] group-hover:text-[#0875f9] transition">
                      {subj.subject}
                    </h3>
                    <p className="mt-1 text-xs text-[#68778b]">
                      Available across {subj.availableYearsCount} examination {subj.availableYearsCount === 1 ? 'year' : 'years'}
                    </p>

                    {/* Classes Badges */}
                    {subj.classes && subj.classes.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#68778b] uppercase">Classes:</span>
                        {subj.classes.map((c) => (
                          <span
                            key={c}
                            className="rounded-md bg-blue-50/70 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#0875f9]"
                          >
                            {c === 'common' ? 'JEE' : c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Years Preview Badges */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-1">
                      {subj.years.slice(0, 5).map((y) => (
                        <span
                          key={y.year}
                          className="rounded-md bg-[#f8fafc] border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                        >
                          {y.year}
                        </span>
                      ))}
                      {subj.years.length > 5 && (
                        <span className="text-[11px] font-bold text-slate-400">
                          +{subj.years.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between border-t border-[#edf2f7] bg-[#fbfcfd] px-5 py-3.5 sm:px-6">
                  <span className="text-xs font-semibold text-slate-500">
                    Click to browse papers
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-[#0875f9] group-hover:translate-x-0.5 transition-transform">
                    Browse Papers by Year →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          SUBJECT YEARS, CLASSES & QUESTION PAPERS POP-UP MODAL
          ========================================================================= */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={handleCloseModal}
          />

          {/* Modal Container */}
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#edf2f7] bg-white px-6 py-4.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-extrabold text-[#0875f9] uppercase">
                    {selectedSubject.exams.join(', ')}
                  </span>
                  <h2 className="text-lg font-bold text-[#102a56] sm:text-xl">
                    {selectedSubject.subject}
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-[#68778b]">
                  {selectedSubject.totalPapers} question papers across {selectedSubject.availableYearsCount} available years.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Step 1: Classes Filter inside Modal */}
              {selectedSubject.classes.length > 1 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#68778b] mb-2.5">
                    Filter by Class:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setModalClass('all')}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                        modalClass === 'all'
                          ? 'bg-[#102a56] text-white shadow-xs'
                          : 'border border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-white'
                      }`}
                    >
                      All Classes
                    </button>
                    {selectedSubject.classes.map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setModalClass(cls)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                          modalClass === cls
                            ? 'bg-[#102a56] text-white shadow-xs'
                            : 'border border-slate-200 bg-[#f8fafc] text-slate-600 hover:bg-white'
                        }`}
                      >
                        {cls === 'common' ? 'JEE' : cls}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Years Tabs / Pills (including 'All Available Years') */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#68778b] mb-2.5">
                  Select Examination Year:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* All Years Button */}
                  <button
                    type="button"
                    onClick={() => setModalYear('all')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      modalYear === 'all'
                        ? 'bg-[#0875f9] text-white shadow-sm ring-2 ring-blue-200'
                        : 'border border-[#dce4ef] bg-[#f8fafc] text-[#1c2d45] hover:bg-white hover:border-[#0875f9]'
                    }`}
                  >
                    <span>All Available Years</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        modalYear === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedSubject.totalPapers}
                    </span>
                  </button>

                  {/* Individual Year Buttons */}
                  {selectedSubject.years.map((yearGroup) => {
                    const isSelected = modalYear === yearGroup.year;

                    return (
                      <button
                        key={yearGroup.year}
                        type="button"
                        onClick={() => setModalYear(yearGroup.year)}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                          isSelected
                            ? 'bg-[#0875f9] text-white shadow-sm ring-2 ring-blue-200'
                            : 'border border-[#dce4ef] bg-[#f8fafc] text-[#1c2d45] hover:bg-white hover:border-[#0875f9]'
                        }`}
                      >
                        <span>{yearGroup.year}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {yearGroup.paperCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Question Papers List */}
              <div className="border-t border-[#edf2f7] pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="text-sm font-bold text-[#102a56]">
                    {modalYear === 'all'
                      ? `All Question Papers (${activePapersInModal.length})`
                      : `Question Papers for Year ${modalYear} (${activePapersInModal.length})`}
                  </h3>
                  <span className="text-[11px] text-[#68778b]">
                    CBSE papers are viewable in the official StudyHub PDF viewer.
                  </span>
                </div>

                {activePapersInModal.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                    No papers found matching this class and year combination.
                  </div>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {activePapersInModal.map((paper) => {
                      const isCbse = paper.exam.toUpperCase() === 'CBSE';
                      const configUrl = `/exam/${encodeURIComponent(paper.id)}/configure`;
                      const studyhubBaseUrl =
                        process.env.NEXT_PUBLIC_STUDYHUB_URL || "https://studyhub.yashguptaiiit.in";
                      const pdfViewerUrl =
                        paper.pdfViewerUrl ||
                        `${studyhubBaseUrl}/${encodeURIComponent(paper.exam)}/${encodeURIComponent(paper.className)}/${encodeURIComponent(paper.rawSubject || paper.subject)}/${encodeURIComponent(paper.fileName)}`;

                      return (
                        <div
                          key={paper.id}
                          className="group flex flex-col justify-between rounded-xl border border-[#dce4ef] bg-white p-4 transition hover:border-[#0875f9] hover:shadow-xs"
                        >
                          <div>
                            {/* Tags */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0875f9]">
                                {paper.exam} • {paper.className === 'common' ? 'JEE' : paper.className}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                Year {paper.year}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 className="mt-2 text-xs font-bold text-[#102a56] line-clamp-2 leading-snug">
                              {paper.cleanTitle}
                            </h4>
                            <p className="mt-1 text-[11px] text-slate-400 truncate">
                              ID: {paper.id} • {paper.fileName}
                            </p>
                          </div>

                          {/* Action Buttons: View PDF (StudyHub) & Configure (disabled for CBSE) */}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px]">
                            {/* View Button -> redirects to StudyHub PDF viewer */}
                            <a
                              href={pdfViewerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0875f9] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                              title="Open this paper in StudyHub official PDF Reader"
                            >
                              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View PDF ↗
                            </a>

                            {/* Configure Button: only shown for active exams like JEE */}
                            {!isCbse && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleCloseModal();
                                  router.push(configUrl);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#102a56] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                              >
                                Configure Test →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#edf2f7] bg-[#f8fafc] px-6 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
