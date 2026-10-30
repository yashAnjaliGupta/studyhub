'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer, PageHeading, MetricCard, Panel } from '../../../../components/ui';
import { getExamSession, saveExamSession, evaluateAttempt, type ExamEvaluationResult } from '../../../../lib/exam-session';
import { JEE_MAIN_DEFAULT_PAPER } from '../../../../lib/jee-mock-paper';
import { getDynamicPaper } from '../../../../lib/dynamic-paper-provider';
import type { ProcessedPaper } from '../../../../lib/paper-service';
import { getCachedPaper } from '../../../../lib/paper-cache';
import { TestHubLoader } from '../../../../components/testhub-loader';

export default function ExamResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<ProcessedPaper | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function loadPaper() {
      const cached = getCachedPaper(id);
      if (cached && cached.questions?.length > 0) {
        if (!isCancelled) {
          setPaper(cached);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(`/api/exam/paper/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!isCancelled) {
          if (data.status === 'READY' && data.paper && data.paper.questions?.length > 0) {
            setPaper(data.paper);
          } else {
            setPaper(getDynamicPaper(id));
          }
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setPaper(getDynamicPaper(id));
          setLoading(false);
        }
      }
    }
    loadPaper();
    return () => {
      isCancelled = true;
    };
  }, [id]);

  const [sessionData, setSessionData] = useState(() => getExamSession(id));

  // Automatically sync with server attempt if server has richer/more complete attempt data
  useEffect(() => {
    fetch(`/api/exam/attempt/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status === 'SUCCESS' && data.answers && Object.keys(data.answers).length > 0) {
          const existing = getExamSession(id);
          const serverAnswersCount = Object.keys(data.answers).length;
          const localAnswersCount = Object.keys(existing?.answers || {}).length;

          if (!existing || serverAnswersCount > localAnswersCount || localAnswersCount <= 4) {
            const restored = {
              attemptId: data.attemptId,
              paperId: id,
              paperTitle: paper?.title || data.paperTitle || 'Practice Paper',
              startedAt: data.startedAt || Date.now() - 3600000,
              submittedAt: data.submittedAt || Date.now(),
              durationSeconds: data.durationSeconds || (paper?.durationMin || 180) * 60,
              timeSpentSeconds: data.timeSpentSeconds || 3600,
              answers: data.answers,
              review: data.review || [],
              visited: data.visited || [],
              telemetry: data.telemetry || {},
              subjectTimeSpent: data.subjectTimeSpent || {},
            };
            saveExamSession(id, restored);
            setSessionData(restored);
          }
        }
      })
      .catch(() => {});
  }, [id, paper]);

  const evaluation: ExamEvaluationResult = useMemo(() => {
    const activePaper = paper || JEE_MAIN_DEFAULT_PAPER;
    const fallbackSession = sessionData || {
      paperId: id,
      paperTitle: activePaper.title,
      startedAt: Date.now() - 3600000,
      submittedAt: Date.now(),
      durationSeconds: (activePaper.durationMin || 180) * 60,
      timeSpentSeconds: 3600,
      answers: {},
      review: [],
      visited: [],
    };
    return evaluateAttempt(activePaper, fallbackSession);
  }, [paper, sessionData, id]);

  const subjectEntries = useMemo(() => {
    return Object.entries(evaluation.subjectPerformance).map(([name, data]) => ({
      section: name,
      accuracy: data.accuracy,
      correct: data.correct,
      total: data.total,
      score: data.score,
      tone: data.accuracy >= 75 ? ('green' as const) : data.accuracy >= 50 ? ('orange' as const) : ('red' as const),
    }));
  }, [evaluation]);

  const strongestSubject = useMemo(() => {
    if (!subjectEntries.length) return null;
    return [...subjectEntries].sort((a, b) => b.accuracy - a.accuracy)[0];
  }, [subjectEntries]);

  const weakestSubject = useMemo(() => {
    if (!subjectEntries.length) return null;
    return [...subjectEntries].sort((a, b) => a.accuracy - b.accuracy)[0];
  }, [subjectEntries]);

  if (loading) {
    return (
      <PageContainer className="text-center py-16">
        <TestHubLoader size={38} text="Calculating your official exam evaluation & score card..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-5 rounded-xl border border-[#b9e7c9] bg-[#e9f9ef] p-4 sm:flex sm:items-center sm:gap-4 sm:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#35a853] text-xl font-bold text-white">
          ✓
        </span>
        <div className="mt-3 sm:mt-0">
          <p className="font-bold text-[#102a56]">Practice submitted successfully</p>
          <p className="mt-1 text-sm text-[#68778b]">
            Your responses for {paper?.title || 'Practice Paper'} have been evaluated according to the official examination marking scheme (+4 / -1).
          </p>
        </div>
      </div>

      <PageHeading
        eyebrow="Your performance"
        title="Practice Results & Evaluation"
        description="Comprehensive summary of your scores, accuracy, and subject breakdown."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Score summary">
        <MetricCard
          label="Total Score"
          value={`${evaluation.scoreAwarded} / ${evaluation.totalMarks}`}
          detail={`${evaluation.percentage}% overall`}
          tone={evaluation.percentage >= 60 ? 'green' : 'blue'}
        />
        <MetricCard label="Correct Answers" value={String(evaluation.correctCount)} tone="green" />
        <MetricCard label="Incorrect Answers" value={String(evaluation.incorrectCount)} tone="red" />
        <MetricCard label="Unanswered" value={String(evaluation.unansweredCount)} tone="orange" />
        <MetricCard
          label="Total Questions"
          value={String(evaluation.totalQuestions)}
          detail={`Time: ${evaluation.timeSpentMinutes} mins`}
        />
      </section>

      {/* Section / Subject Performance */}
      <Panel className="mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#102a56]">Subject Performance</h2>
            <p className="mt-1 text-sm text-[#68778b]">Accuracy and marks awarded across each subject</p>
          </div>
          <span className="text-xs text-[#68778b]">Live Evaluated Data</span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {subjectEntries.map((item) => (
            <div key={item.section} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <span className="font-bold text-[#1c2d45]">{item.section}</span>
                <span className={`font-extrabold ${item.tone === 'green' ? 'text-[#258747]' : item.tone === 'orange' ? 'text-[#c66a00]' : 'text-red-600'}`}>
                  {item.accuracy}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#edf0f5]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.tone === 'green' ? 'bg-[#35a853]' : item.tone === 'orange' ? 'bg-[#f7941d]' : 'bg-red-500'
                  }`}
                  style={{ width: `${item.accuracy}%` }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                <span>{item.correct} of {item.total} correct</span>
                <span className="font-semibold text-slate-700">{item.score} marks</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#102a56]">Key Attempt Observations</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#1c2d45]">
            {strongestSubject && (
              <li className="flex gap-2.5">
                <span className="text-[#35a853] font-bold">●</span>
                <span>
                  <strong>{strongestSubject.section}</strong> was your strongest subject at{' '}
                  <span className="text-[#258747] font-bold">{strongestSubject.accuracy}% accuracy</span>.
                </span>
              </li>
            )}
            {weakestSubject && weakestSubject.section !== strongestSubject?.section && (
              <li className="flex gap-2.5">
                <span className="text-[#f7941d] font-bold">●</span>
                <span>
                  <strong>{weakestSubject.section}</strong> requires more practice in your next revision session (accuracy:{' '}
                  {weakestSubject.accuracy}%).
                </span>
              </li>
            )}
            <li className="flex gap-2.5">
              <span className="text-[#0875f9] font-bold">●</span>
              <span>
                Average time per question was <strong>{evaluation.avgTimePerQuestionSeconds} seconds</strong>. Keep an eye on time allocation across numerical questions.
              </span>
            </li>
          </ul>
        </Panel>

        <Panel className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <p className="text-sm font-bold text-[#102a56]">Next Steps & AI Guidance</p>
            <p className="mt-2 text-sm leading-6 text-[#68778b]">
              Explore topic-level diagnostics, mistake breakdowns, and AI-generated study guidance.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            <Link
              href={`/exam/${id}/detailed-analysis`}
              className="rounded-lg border border-[#d9e1ec] px-4 py-2.5 text-center text-sm font-semibold text-[#0875f9] hover:bg-blue-50 transition"
            >
              View Detailed Topic Analysis
            </Link>
            <Link
              href={`/exam/${id}/ai-guidance`}
              className="rounded-lg bg-[#0875f9] px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-700 transition"
            >
              Get AI Study Guidance
            </Link>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
