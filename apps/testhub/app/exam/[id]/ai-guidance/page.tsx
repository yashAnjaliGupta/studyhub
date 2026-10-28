'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer, PageHeading, MetricCard, Panel } from '../../../../components/ui';
import { getExamSession, evaluateAttempt, type ExamEvaluationResult } from '../../../../lib/exam-session';
import { JEE_MAIN_DEFAULT_PAPER } from '../../../../lib/jee-mock-paper';
import { getDynamicPaper } from '../../../../lib/dynamic-paper-provider';
import type { ProcessedPaper } from '../../../../lib/paper-service';
import { getCachedPaper } from '../../../../lib/paper-cache';
import { TestHubLoader } from '../../../../components/testhub-loader';

export default function ExamAIGuidancePage() {
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

  const sessionData = useMemo(() => getExamSession(id), [id]);

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

  // Derived real focus topics from student attempt
  const dynamicFocusTopics = useMemo(() => {
    if (evaluation.weakTopics.length > 0) {
      return evaluation.weakTopics.slice(0, 3).map((topic) => ({
        name: topic.name,
        subject: topic.subject,
        accuracy: topic.accuracy,
        next: `Review core ${topic.name} concepts and solve 15 targeted practice questions to fix negative marking.`,
        time: topic.accuracy < 40 ? '45 min/day' : '30 min/day',
      }));
    }
    // Fallback to top topics with room for improvement
    return evaluation.topicPerformance.slice(0, 3).map((topic) => ({
      name: topic.name,
      subject: topic.subject,
      accuracy: topic.accuracy,
      next: `Strengthen calculation speed and accuracy for ${topic.name}.`,
      time: '25 min/day',
    }));
  }, [evaluation]);

  const primaryWeakTopic = dynamicFocusTopics[0];
  const strongestTopic = evaluation.strongTopics[0] || evaluation.topicPerformance[0];

  // Tailored weekly plan based on actual weak topic
  const dynamicWeeklyPlan = useMemo(() => {
    const weakName = primaryWeakTopic?.name || 'Weak Concepts';
    const strongName = strongestTopic?.name || 'Core Strength';

    return [
      {
        day: 'Mon–Tue',
        title: `Rebuild ${weakName} Fundamentals`,
        detail: `Review formulas and standard derivations for ${weakName}. Focus on mistakes made during this attempt.`,
      },
      {
        day: 'Wed–Thu',
        title: 'Timed Sub-topic Problem Sets',
        detail: `Solve 20 mixed numerical and MCQ questions with a 90-second soft limit per question.`,
      },
      {
        day: 'Fri',
        title: `Mixed Practice & ${strongName} Maintenance`,
        detail: `Consolidate your strength in ${strongName} while testing topic-switching agility.`,
      },
      {
        day: 'Weekend',
        title: 'Full Sectional Mock Re-evaluation',
        detail: `Take a 60-minute sectional mock test to verify whether your accuracy in ${weakName} improves past 75%.`,
      },
    ];
  }, [primaryWeakTopic, strongestTopic]);

  if (loading) {
    return (
      <PageContainer className="text-center py-16">
        <TestHubLoader size={38} text="Generating personalized AI study guidance & strategic revision plan..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Next steps"
        title="AI-Powered Study Guidance"
        description="A tailored learning plan synthesized directly from your live test responses and time patterns."
        action={
          <Link
            href={`/exam/${id}/results`}
            className="rounded-lg border border-[#d9e1ec] bg-white px-4 py-2 text-sm font-semibold text-[#0875f9] hover:bg-blue-50 transition"
          >
            Back to Results
          </Link>
        }
      />

      <Panel className="mb-5 flex flex-col gap-4 bg-[#edf4ff] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 border border-blue-200">
        <div>
          <p className="text-sm font-bold text-[#0875f9]">Personalized Learning Diagnosis</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#365579]">
            Based on your score of <strong>{evaluation.scoreAwarded} / {evaluation.totalMarks}</strong> ({evaluation.percentage}%), targeted practice on your bottom {dynamicFocusTopics.length} topics will yield the highest percentile jump.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <MetricCard label="Recommended Cycle" value="3 Weeks" tone="blue" />
          <MetricCard label="Daily Commitment" value="75 Mins" tone="blue" />
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        {/* Dynamic Focus Areas */}
        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#102a56]">Identified Focus Areas</h2>
          <p className="mt-1 text-sm text-[#68778b]">
            Topics with highest potential mark gains based on your missed and skipped questions.
          </p>
          <div className="mt-4 space-y-3">
            {dynamicFocusTopics.map((topic, i) => (
              <article key={topic.name} className="rounded-lg border border-[#d9e1ec] bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-[#1c2d45]">
                    {i + 1}. {topic.name} <span className="text-xs text-slate-400">({topic.subject})</span>
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      topic.accuracy >= 70
                        ? 'bg-[#e7f8ee] text-[#258747]'
                        : topic.accuracy >= 50
                        ? 'bg-[#fff8ed] text-[#a95d00]'
                        : 'bg-[#fff0ef] text-[#d3483d]'
                    }`}
                  >
                    {topic.accuracy}% accuracy
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#68778b]">{topic.next}</p>
                <p className="mt-2 text-xs font-semibold text-[#0875f9]">Suggested focus: {topic.time}</p>
              </article>
            ))}
          </div>
        </Panel>

        {/* Dynamic Weekly Plan */}
        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#102a56]">Targeted Weekly Schedule</h2>
          <p className="mt-1 text-sm text-[#68778b]">Structured pacing for concept recovery and speed drills.</p>
          <div className="mt-5 space-y-0">
            {dynamicWeeklyPlan.map((item, i) => (
              <div key={item.day} className="relative flex gap-4 pb-5 last:pb-0">
                {i < dynamicWeeklyPlan.length - 1 && (
                  <span className="absolute left-3 top-7 h-[calc(100%-12px)] w-px bg-[#d9e1ec]" />
                )}
                <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full bg-[#0875f9] text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#0875f9]">{item.day}</p>
                  <h3 className="mt-1 text-sm font-semibold text-[#1c2d45]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-[#68778b]">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Top Priority"
          value={primaryWeakTopic?.name || 'Revision'}
          detail={`Current accuracy: ${primaryWeakTopic?.accuracy ?? 0}%`}
          tone="orange"
        />
        <MetricCard
          label="Strongest Area"
          value={strongestTopic?.name || 'Strength'}
          detail={`Maintain accuracy: ${strongestTopic?.accuracy ?? 0}%`}
          tone="green"
        />
        <MetricCard
          label="Average Pacing"
          value={`${evaluation.avgTimePerQuestionSeconds} sec / q`}
          detail={evaluation.avgTimePerQuestionSeconds <= 120 ? 'Good pacing speed' : 'Needs time budgeting'}
          tone="blue"
        />
      </div>

      <p className="mt-4 text-xs leading-5 text-[#68778b]">
        Guidance dynamically calculated from your live test attempt ID: {id}.
      </p>
    </PageContainer>
  );
}
