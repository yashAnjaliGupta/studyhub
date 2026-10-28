'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { ProcessedPaper } from '../../../../lib/paper-service';
import type { PaperInstructionsData } from '../../../../lib/instruction-service';
import { getCachedPaper, fetchFullPaper, setCachedPaper, preloadPaper } from '../../../../lib/paper-cache';
import { TestHubLoader } from '../../../../components/testhub-loader';

export default function ExamInstructionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [paper, setPaper] = useState<ProcessedPaper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>('English');
  const [isDeclared, setIsDeclared] = useState(false);

  const mode = searchParams.get('mode') || 'timed';
  const customDuration = searchParams.get('duration');

  useEffect(() => {
    let isMounted = true;

    async function loadPaperInstructions() {
      // 1. Instant check: read from cached client state
      const cached = getCachedPaper(id);
      if (cached && cached.questions?.length > 0) {
        setPaper(cached);
        const inst: PaperInstructionsData | undefined = cached.instructionsData || undefined;
        if (inst?.availableLanguages && inst.availableLanguages.length > 0) {
          if (inst.primaryLanguage === 'Hindi' && inst.availableLanguages.includes('Hindi')) {
            setSelectedLang('Hindi');
          } else {
            setSelectedLang(inst.availableLanguages[0] || 'English');
          }
        }
        setIsLoading(false);
        return;
      }

      // 2. Fetch full paper and cache it
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchFullPaper(id);

        if (!isMounted) return;

        if (res.status === 'READY' && res.paper) {
          const p: ProcessedPaper = res.paper;
          setPaper(p);
          setCachedPaper(id, p);

          const inst: PaperInstructionsData | undefined = p.instructionsData || undefined;
          if (inst?.availableLanguages && inst.availableLanguages.length > 0) {
            if (inst.primaryLanguage === 'Hindi' && inst.availableLanguages.includes('Hindi')) {
              setSelectedLang('Hindi');
            } else {
              setSelectedLang(inst.availableLanguages[0] || 'English');
            }
          }
        } else {
          setError(res.message || 'Unable to load paper instructions.');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to connect to exam server.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (id) {
      loadPaperInstructions();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7fb] px-4 py-12 text-[#20324d]">
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-[#dce4ef] bg-white p-8 text-center shadow-sm">
          <TestHubLoader size={38} text="Preparing test guidelines, marking schemes, and question paper parameters..." />
          <h2 className="mt-2 text-base font-bold tracking-tight text-[#102a56]">Loading Exam Instructions</h2>
        </div>
      </main>
    );
  }

  if (error || !paper) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7fb] px-4 py-12 text-[#20324d]">
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#102a56]">Failed to Load Instructions</h2>
          <p className="mt-2 text-sm text-[#68778b]">{error || 'Paper details could not be retrieved.'}</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#0875f9] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push(`/exam/${encodeURIComponent(id)}/configure`)}
              className="rounded-lg border border-[#cfdbe8] bg-white px-5 py-2.5 text-sm font-semibold text-[#20324d] hover:bg-[#f4f7fb]"
            >
              Back to Settings
            </button>
          </div>
        </div>
      </main>
    );
  }

  const durationMinutes = customDuration ? Number(customDuration) : paper.durationMin || 180;
  const totalQuestions = paper.questions?.length || 0;
  const totalMarks = paper.totalMarks || totalQuestions * 4;
  const instructionsData: PaperInstructionsData | undefined = paper.instructionsData || undefined;

  const availableLangs = instructionsData?.availableLanguages?.length
    ? instructionsData.availableLanguages
    : ['English'];

  const currentInstructions =
    instructionsData?.instructionsByLanguage?.[selectedLang] ||
    instructionsData?.instructionsByLanguage?.['English'] ||
    [
      `This paper contains ${totalQuestions} questions with a total of ${totalMarks} marks.`,
      `Total time allotted is ${durationMinutes} minutes. The countdown timer on the upper header shows remaining time.`,
      'Each question has four answer choices. Choose the most appropriate answer.',
      'Correct answers receive +4 marks. Incorrect attempts deduct -1 mark; unattempted questions receive 0.',
      'Use the Question Palette to jump between questions and subject tabs at the top.',
      'Click "Save & Next" to save your response. You can change or clear an answer anytime before submitting.',
      'Click "Mark for Review & Next" to flag questions you wish to reconsider later.',
      'Submitting ends your examination session. Review your responses before confirming.',
    ];

  // Subject breakdown
  const subjectsMap = new Map<string, { count: number; marks: number }>();
  for (const q of paper.questions || []) {
    const s = q.subject || paper.subject || 'General';
    const curr = subjectsMap.get(s) || { count: 0, marks: 0 };
    curr.count += 1;
    curr.marks += q.marks || 4;
    subjectsMap.set(s, curr);
  }
  const subjectList = Array.from(subjectsMap.entries()).map(([subj, info]) => ({
    subject: subj,
    count: info.count,
    marks: info.marks,
  }));

  const handleStartExam = () => {
    if (!isDeclared) return;
    router.push(`/exam/${encodeURIComponent(paper.id)}?${searchParams.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#20324d] antialiased">
      {/* TestHub Top Bar */}
      <header className="border-b border-[#dce4ef] bg-white px-4 py-3 shadow-xs sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#0875f9] text-white shadow-sm">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-[#102a56] sm:text-lg">
                TESTHUB CANDIDATE INSTRUCTIONS
              </h1>
              <p className="text-xs font-semibold text-[#68778b]">
                {paper.examType} • {paper.subject} • Year {paper.year}
              </p>
            </div>
          </div>

          {/* Bilingual Language Switcher */}
          {availableLangs.length > 1 && (
            <div className="flex items-center gap-2 rounded-xl border border-[#dce4ef] bg-[#f8fafc] p-1 shadow-inner">
              <span className="hidden px-2 text-xs font-bold text-[#68778b] sm:inline">
                View in:
              </span>
              {availableLangs.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    selectedLang === lang
                      ? 'bg-[#0875f9] text-white shadow-xs'
                      : 'text-[#4d607b] hover:bg-white hover:text-[#102a56]'
                  }`}
                >
                  {lang === 'Hindi' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Official Exam Navigation Ribbon Banner */}
      <div
        role="region"
        aria-label="Exam Ribbon Banner"
        className="relative border-y border-amber-600/30 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] shadow-xs"
      >
        <div className="mx-auto flex min-h-[46px] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-amber-950">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-900/15 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-amber-950 border border-amber-900/20 shadow-xs">
              <span className="size-2 rounded-full bg-amber-950 animate-pulse" />
              <span>{paper.examType}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-3 py-0.5 text-xs font-bold text-slate-800 shadow-2xs backdrop-blur-xs border border-amber-700/15">
              <span className="text-[11px] font-medium text-slate-500">Subject:</span>
              <span>{paper.subject}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900/10 px-3 py-0.5 text-xs font-bold text-amber-950 border border-amber-900/15">
              <span className="text-[11px] font-medium text-amber-900/70">Mode:</span>
              <span>{mode === 'practice' ? 'Untimed Practice' : 'Timed Examination'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-amber-950">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/15 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-950">
              {paper.questions?.length || 0} Questions · {paper.totalMarks || 300} Marks
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Instructions Body */}
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-2xl border border-[#dce4ef] bg-white p-6 shadow-xs sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
                <div>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#0875f9]">
                    {paper.examType} Guidelines
                  </span>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-[#102a56] sm:text-2xl">
                    {selectedLang === 'Hindi'
                      ? 'सामान्य निर्देश एवं परीक्षा नियम'
                      : 'General Instructions & Examination Rules'}
                  </h2>
                </div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#68778b]">
                    {selectedLang === 'Hindi' ? 'कुल अवधि' : 'Total Time'}
                  </p>
                  <p className="text-base font-extrabold text-[#0875f9]">
                    {mode === 'practice' ? 'No Limit' : `${durationMinutes} Mins`}
                  </p>
                </div>
              </div>

              {/* Numbered Instructions in Target Language */}
              <div className="mt-6 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#68778b]">
                  {selectedLang === 'Hindi'
                    ? 'कृपया निम्नलिखित निर्देशों को ध्यानपूर्वक पढ़ें:'
                    : 'Please read the following instructions carefully:'}
                </p>
                <ol className="space-y-3.5">
                  {currentInstructions.map((instruction, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3.5 rounded-xl border border-[#f0f4f9] bg-[#fbfcfd] p-3.5 transition hover:border-[#dce4ef] hover:bg-white"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-[#0875f9]">
                        {index + 1}
                      </span>
                      <p className="pt-0.5 text-sm leading-relaxed text-[#20324d]">
                        {instruction}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* CBT Question Palette Legend */}
              <div className="mt-8 rounded-2xl border border-[#dce4ef] bg-[#f8fafc] p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#68778b]">
                  {selectedLang === 'Hindi'
                    ? 'कंप्यूटर आधारित परीक्षा (CBT) प्रश्न स्थिति संकेत:'
                    : 'Computer Based Test (CBT) Question Status Legend:'}
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white p-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#22c55e] text-xs font-bold text-white shadow-xs">
                      1
                    </span>
                    <span className="text-xs font-medium text-[#20324d]">
                      {selectedLang === 'Hindi' ? 'उत्तर दिया गया (Answered)' : 'Answered'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white p-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#ef4444] text-xs font-bold text-white shadow-xs">
                      2
                    </span>
                    <span className="text-xs font-medium text-[#20324d]">
                      {selectedLang === 'Hindi' ? 'उत्तर नहीं दिया गया (Not Answered)' : 'Not Answered'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white p-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#cbd5e1] bg-white text-xs font-bold text-[#475569]">
                      3
                    </span>
                    <span className="text-xs font-medium text-[#20324d]">
                      {selectedLang === 'Hindi' ? 'अभी तक नहीं देखा (Not Visited)' : 'Not Visited yet'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white p-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#8b5cf6] text-xs font-bold text-white shadow-xs">
                      4
                    </span>
                    <span className="text-xs font-medium text-[#20324d]">
                      {selectedLang === 'Hindi' ? 'समीक्षा के लिए चिह्नित (Marked for Review)' : 'Marked for Review'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-[#e2e8f0] bg-white p-2.5 sm:col-span-2">
                    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-md bg-[#8b5cf6] text-xs font-bold text-white shadow-xs">
                      5
                      <span className="absolute -top-1 -right-1 size-3 rounded-full bg-[#22c55e] border-2 border-white" />
                    </span>
                    <span className="text-xs font-medium text-[#20324d]">
                      {selectedLang === 'Hindi'
                        ? 'उत्तर दिया गया और समीक्षा के लिए चिह्नित (मूल्यांकन में शामिल होगा)'
                        : 'Answered & Marked for Review (Will be evaluated)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Candidate Declaration */}
              <div className="mt-7 rounded-xl border border-[#f5ddb6] bg-[#fffbf2] p-4.5">
                <label className="flex cursor-pointer items-start gap-3 select-none">
                  <input
                    type="checkbox"
                    checked={isDeclared}
                    onChange={(e) => setIsDeclared(e.target.checked)}
                    className="mt-1 size-4.5 rounded border-[#d4a373] text-[#0875f9] focus:ring-[#0875f9]"
                  />
                  <span className="text-xs leading-relaxed text-[#78350f]">
                    {selectedLang === 'Hindi'
                      ? 'मैंने सभी निर्देशों को ध्यानपूर्वक पढ़ और समझ लिया है। मैं प्रमाणित करता/करती हूँ कि मैं परीक्षा के सभी नियमों और अनुशासन का पूर्ण पालन करूँगा/करूँगी।'
                      : 'I have read and understood all instructions above. I declare that I will strictly abide by the rules and timing of this examination.'}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={handleStartExam}
                  disabled={!isDeclared}
                  className={`flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-white shadow-sm transition ${
                    isDeclared
                      ? 'bg-[#0875f9] hover:bg-blue-700 active:scale-[0.99]'
                      : 'cursor-not-allowed bg-slate-300 opacity-70'
                  }`}
                >
                  <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  {selectedLang === 'Hindi' ? 'परीक्षा शुरू करें' : 'I am ready to begin'}
                </button>

                <button
                  onClick={() => router.push(`/exam/${encodeURIComponent(paper.id)}/configure`)}
                  className="rounded-xl border border-[#cfdbe8] bg-white px-5 py-3.5 text-sm font-bold text-[#4d607b] transition hover:bg-[#f4f7fb] hover:text-[#102a56]"
                >
                  {selectedLang === 'Hindi' ? 'सेटिंग्स बदलें' : 'Change Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Accurate Paper Metadata */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-[#dce4ef] bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#68778b]">
                Question Paper Summary
              </span>
              <h3 className="mt-1.5 text-lg font-bold text-[#102a56] leading-snug">
                {paper.title}
              </h3>

              <div className="mt-5 space-y-3.5 border-t border-[#edf2f7] pt-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#68778b]">Course / Exam</span>
                  <span className="font-bold text-[#102a56]">{paper.examType}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#68778b]">Total Questions</span>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 font-extrabold text-[#0875f9]">
                    {totalQuestions}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#68778b]">Duration</span>
                  <span className="font-bold text-[#102a56]">
                    {mode === 'practice' ? 'Untimed' : `${durationMinutes} minutes`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#68778b]">Maximum Score</span>
                  <span className="font-bold text-[#102a56]">{totalMarks} Marks</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#68778b]">Primary Subject</span>
                  <span className="font-semibold text-[#102a56]">{paper.subject}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#68778b]">Paper Year</span>
                  <span className="font-semibold text-[#102a56]">{paper.year}</span>
                </div>
              </div>

              {/* Exact Subject Breakdown */}
              {subjectList.length > 0 && (
                <div className="mt-5 border-t border-[#edf2f7] pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#68778b]">
                    Subject Distribution
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {subjectList.map((item) => (
                      <div
                        key={item.subject}
                        className="flex items-center justify-between rounded-lg bg-[#f8fafc] px-3 py-2 text-xs"
                      >
                        <span className="font-bold text-[#20324d]">{item.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#68778b]">{item.count} Qs</span>
                          <span className="font-bold text-[#0875f9]">{item.marks} M</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TestHub Confidence Card */}
            <div className="rounded-2xl border border-[#dce4ef] bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#102a56]">
                    Authentic Examination Setup
                  </h4>
                  <p className="text-[11px] text-[#68778b]">
                    Strict CBSE / CBT alignment with real-time scoring.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
