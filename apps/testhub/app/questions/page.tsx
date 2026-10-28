'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageContainer, PageHeading } from '../../components/ui';
import { TestHubLoader } from '../../components/testhub-loader';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Compass,
  Layers,
  Search,
  Sparkles,
  X,
  HelpCircle,
  FileQuestion,
} from 'lucide-react';

export interface QuestionOptionItem {
  id: string;
  text: string;
  imageUrl: string | null;
  isCorrect: boolean;
  sequenceNum: number;
}

export interface QuestionItem {
  id: string;
  sequenceNum: number;
  text: string;
  type: string;
  marks: number;
  negativeMarks: number | null;
  imageUrl: string | null;
  diagramSvg: string | null;
  pageNumber: number | null;
  options: QuestionOptionItem[];
  topic: {
    id: string;
    name: string;
    subject: string;
  };
  paper: {
    id: string;
    title: string;
    examType: string;
    year: number;
    subject: string;
  } | null;
}

export interface TopicGroup {
  name: string;
  questionCount: number;
  questions: QuestionItem[];
}

export interface SubjectGroup {
  subject: string;
  questionCount: number;
  topics: TopicGroup[];
}

function getSubjectTheme(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes('math')) {
    return {
      gradient: 'from-indigo-600 to-purple-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      borderHover: 'hover:border-indigo-400',
      bar: 'from-indigo-500 via-purple-500 to-pink-500',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      symbol: '∑',
    };
  }
  if (s.includes('physic')) {
    return {
      gradient: 'from-sky-500 to-blue-600',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      iconBg: 'bg-sky-100 text-sky-700 border-sky-200',
      borderHover: 'hover:border-sky-400',
      bar: 'from-sky-500 via-blue-500 to-indigo-500',
      btn: 'bg-sky-600 hover:bg-sky-700 text-white',
      symbol: '⚛',
    };
  }
  if (s.includes('chem')) {
    return {
      gradient: 'from-emerald-500 to-teal-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      borderHover: 'hover:border-emerald-400',
      bar: 'from-emerald-500 via-teal-500 to-cyan-500',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      symbol: '🧪',
    };
  }
  return {
    gradient: 'from-rose-500 to-orange-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
    borderHover: 'hover:border-rose-400',
    bar: 'from-rose-500 via-amber-500 to-orange-500',
    btn: 'bg-rose-600 hover:bg-rose-700 text-white',
    symbol: '🔬',
  };
}

export default function QuestionsBankPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalTopicsCount, setTotalTopicsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<SubjectGroup | null>(null);
  const [modalTopicSearch, setModalTopicSearch] = useState('');

  useEffect(() => {
    let isCancelled = false;

    async function loadQuestions(attempt = 1) {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/questions?limit=1000');
        const data = await res.json();

        if (!isCancelled) {
          if (data.success && Array.isArray(data.subjects)) {
            // Filter out CBSE questions and subjects
            const cleanedSubjects = data.subjects
              .filter((s: SubjectGroup) => !s.subject.toUpperCase().includes('CBSE'))
              .map((s: SubjectGroup) => {
                const cleanedTopics = s.topics
                  .map((t: TopicGroup) => ({
                    ...t,
                    questions: t.questions.filter((q: QuestionItem) => {
                      const isCbse =
                        (q.paper?.examType && q.paper.examType.toUpperCase().includes('CBSE')) ||
                        (q.paper?.title && q.paper.title.toUpperCase().includes('CBSE')) ||
                        (q.topic?.subject && q.topic.subject.toUpperCase().includes('CBSE'));
                      return !isCbse;
                    }),
                  }))
                  .map((t: TopicGroup) => ({ ...t, questionCount: t.questions.length }))
                  .filter((t: TopicGroup) => t.questionCount > 0);

                return {
                  ...s,
                  questionCount: cleanedTopics.reduce((sum: number, t: TopicGroup) => sum + t.questionCount, 0),
                  topics: cleanedTopics,
                };
              })
              .filter((s: SubjectGroup) => s.questionCount > 0);

            const totalQ = cleanedSubjects.reduce((acc: number, s: SubjectGroup) => acc + s.questionCount, 0);
            const totalT = cleanedSubjects.reduce((acc: number, s: SubjectGroup) => acc + s.topics.length, 0);

            setSubjects(cleanedSubjects);
            setTotalQuestions(totalQ);
            setTotalTopicsCount(totalT);
            setLoading(false);
          } else if (attempt < 3) {
            // Neon database wake-up retry
            setTimeout(() => {
              if (!isCancelled) loadQuestions(attempt + 1);
            }, 1200);
          } else {
            setError(data.error || 'Failed to load questions from database.');
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          if (attempt < 3) {
            setTimeout(() => {
              if (!isCancelled) loadQuestions(attempt + 1);
            }, 1200);
          } else {
            setError(err?.message || 'Error connecting to question bank service.');
            setLoading(false);
          }
        }
      }
    }

    loadQuestions();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Filter subjects based on search query
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const term = searchQuery.toLowerCase();
    return subjects.filter((s) => {
      const matchSubject = s.subject.toLowerCase().includes(term);
      const matchTopic = s.topics.some((t) => t.name.toLowerCase().includes(term));
      return matchSubject || matchTopic;
    });
  }, [subjects, searchQuery]);

  // Filter topics within the open modal
  const modalFilteredTopics = useMemo(() => {
    if (!selectedSubject) return [];
    if (!modalTopicSearch.trim()) return selectedSubject.topics;
    const term = modalTopicSearch.toLowerCase();
    return selectedSubject.topics.filter((t) => t.name.toLowerCase().includes(term));
  }, [selectedSubject, modalTopicSearch]);

  const handleOpenSubjectModal = (subj: SubjectGroup) => {
    setSelectedSubject(subj);
    setModalTopicSearch('');
  };

  const handleCloseModal = () => {
    setSelectedSubject(null);
    setModalTopicSearch('');
  };

  const handleNavigateToTopic = (subjectName: string, topicName: string) => {
    handleCloseModal();
    router.push(`/questions/${encodeURIComponent(subjectName)}/${encodeURIComponent(topicName)}`);
  };

  return (
    <PageContainer>
      {/* Page Heading with Real-Time Counters */}
      <PageHeading
        eyebrow="Question Bank"
        title="Subject & Topic Wise Repository"
        description="Select a subject to view all topic collections and practice individual questions curated from authentic examination papers."
        action={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-[#0875f9] shadow-xs">
              {totalQuestions} Questions
            </span>
            <span className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs">
              {totalTopicsCount} Topics
            </span>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="mb-8 rounded-2xl border border-[#dce4ef] bg-white p-5 shadow-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by subject (e.g. Physics) or topic (e.g. Calculus, Mechanics)..."
            className="w-full rounded-xl border border-[#dce4ef] bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 transition focus:border-[#0875f9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0875f9]/15"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce4ef] bg-white p-16 shadow-xs text-center">
          <TestHubLoader size={38} text="Loading questions repository & organizing by topics..." />
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
          <p className="text-base font-bold text-[#102a56]">No subjects or topics match your search</p>
          <p className="mt-1 text-xs text-[#68778b]">
            Try searching for a different keyword or reset your search.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-xs font-bold text-[#0875f9] hover:bg-blue-100"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Subjects Grid */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subj) => {
            const theme = getSubjectTheme(subj.subject);

            return (
              <div
                key={subj.subject}
                onClick={() => handleOpenSubjectModal(subj)}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#dce4ef] bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#0875f9]/50 hover:shadow-lg cursor-pointer"
              >
                <div>
                  {/* Top Color Accent Strip */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${theme.bar}`} />

                  <div className="p-5 sm:p-6">
                    {/* Header: Icon & Counters */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex size-11 items-center justify-center rounded-xl font-black text-lg border shadow-xs ${theme.iconBg}`}
                        >
                          {theme.symbol}
                        </span>
                        <div>
                          <h3 className="text-lg font-extrabold tracking-tight text-[#102a56] group-hover:text-[#0875f9] transition">
                            {subj.subject}
                          </h3>
                          <p className="text-xs text-[#68778b]">
                            {subj.topics.length} {subj.topics.length === 1 ? 'Topic' : 'Topics'} Available
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-[#0875f9]">
                        {subj.questionCount} Qs
                      </span>
                    </div>

                    {/* Topics Preview Badges */}
                    <div className="mt-5 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Top Topics
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {subj.topics.slice(0, 4).map((t) => (
                          <span
                            key={t.name}
                            className="rounded-lg bg-slate-50 border border-slate-200/80 px-2 py-1 text-[11px] font-medium text-slate-700 truncate max-w-[200px]"
                            title={t.name}
                          >
                            {t.name}
                          </span>
                        ))}
                        {subj.topics.length > 4 && (
                          <span className="rounded-lg bg-blue-50/70 border border-blue-100 px-2 py-1 text-[11px] font-bold text-[#0875f9]">
                            +{subj.topics.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="border-t border-[#edf2f7] bg-[#fbfcfd] px-5 py-3.5 flex items-center justify-between text-xs font-bold text-[#0875f9] group-hover:bg-blue-50/50 transition">
                  <span>Explore All {subj.topics.length} Topics</span>
                  <ArrowRight className="size-4 transform transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          TOPICS POP-UP MODAL (OPENED ON SUBJECT CLICK)
          ========================================================================= */}
      {selectedSubject && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={handleCloseModal}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#edf2f7] px-6 py-4 bg-[#fbfcfd]">
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl font-black text-lg border shadow-xs ${
                    getSubjectTheme(selectedSubject.subject).iconBg
                  }`}
                >
                  {getSubjectTheme(selectedSubject.subject).symbol}
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-[#102a56]">
                    {selectedSubject.subject} Topics
                  </h3>
                  <p className="text-xs text-[#68778b]">
                    {selectedSubject.topics.length} Topics · {selectedSubject.questionCount} Questions in Total
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Close modal"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-[#edf2f7] bg-white">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modalTopicSearch}
                  onChange={(e) => setModalTopicSearch(e.target.value)}
                  placeholder={`Search in ${selectedSubject.subject} topics...`}
                  className="w-full rounded-lg border border-[#dce4ef] bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#0875f9] focus:bg-white focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Topics List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
              {modalFilteredTopics.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-slate-700">No topics match "{modalTopicSearch}"</p>
                  <p className="text-xs text-slate-500 mt-1">Try another keyword.</p>
                </div>
              ) : (
                modalFilteredTopics.map((topic, idx) => (
                  <div
                    key={topic.name}
                    onClick={() => handleNavigateToTopic(selectedSubject.subject, topic.name)}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3.5 transition-all hover:border-[#0875f9] hover:bg-blue-50/40 hover:shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 group-hover:bg-[#0875f9] group-hover:text-white transition">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#102a56] group-hover:text-[#0875f9] transition truncate">
                          {topic.name}
                        </p>
                        <p className="text-[11px] text-[#68778b]">
                          {topic.questionCount} {topic.questionCount === 1 ? 'Question' : 'Questions'} Available
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-extrabold text-[#0875f9]">
                        Practice
                      </span>
                      <ChevronRight className="size-4 text-slate-400 group-hover:text-[#0875f9] group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#edf2f7] bg-[#fbfcfd] px-6 py-3 flex items-center justify-between text-xs text-slate-500">
              <span>Click on any topic to practice its questions</span>
              <button
                type="button"
                onClick={handleCloseModal}
                className="font-bold text-[#0875f9] hover:underline"
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
