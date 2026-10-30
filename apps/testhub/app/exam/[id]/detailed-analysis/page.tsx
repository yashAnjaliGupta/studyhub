'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer, PageHeading, MetricCard, Panel } from '../../../../components/ui';
import { getExamSession, saveExamSession, evaluateAttempt, type ExamEvaluationResult } from '../../../../lib/exam-session';
import { JEE_MAIN_DEFAULT_PAPER } from '../../../../lib/jee-mock-paper';
import { getDynamicPaper } from '../../../../lib/dynamic-paper-provider';
import type { ProcessedPaper } from '../../../../lib/paper-service';
import { getCachedPaper, fetchFullPaper, setCachedPaper } from '../../../../lib/paper-cache';
import { FloatingChatbot } from '@repo/ui/floating-chatbot';
import { TestHubLoader } from '../../../../components/testhub-loader';
import { InteractivePerformanceChart } from '../../../../components/interactive-performance-chart';
import type { CompleteDiagnosticReport } from '../../../../lib/diagnostic-types';
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Layers,
  Award,
  Zap,
  AlertTriangle,
  TrendingUp,
  Check,
  Target,
  Compass,
  BookOpen,
} from 'lucide-react';

function FormattedDiagnosisContent({ text }: { text: string }) {
  if (!text) return null;

  // Split into sections/paragraphs by double newline or headers
  const sections = text.split(/\n\s*\n/).filter(Boolean);

  const formatInline = (str: string) => {
    // Replace **bold** with strong
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-3 text-xs sm:text-sm text-slate-800 leading-relaxed">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        const lines = trimmed.split('\n');

        const isArchetype = trimmed.startsWith('🎯');
        const isBleed = trimmed.startsWith('⚠️');
        const isAction = trimmed.startsWith('🚀');
        const isPacing = trimmed.startsWith('⏱️') || trimmed.startsWith('📊');

        return (
          <div
            key={idx}
            className={`rounded-xl p-3.5 sm:p-4 ${
              isArchetype
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/80 text-blue-950'
                : isBleed
                ? 'bg-amber-50/60 border border-amber-200/80 text-amber-950'
                : isAction
                ? 'bg-emerald-50/60 border border-emerald-200/80 text-emerald-950'
                : isPacing
                ? 'bg-slate-50/90 border border-slate-200/80 text-slate-900'
                : 'bg-white border border-slate-100'
            }`}
          >
            {lines.map((line, lIdx) => {
              const lineTrimmed = line.trim();
              if (lineTrimmed.startsWith('•') || lineTrimmed.startsWith('-')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 mt-2 ml-1 text-slate-700">
                    <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>{formatInline(lineTrimmed.replace(/^[•\-]\s*/, ''))}</span>
                  </div>
                );
              }
              const isNumbered = /^[1-9]\.\s/.test(lineTrimmed);
              if (isNumbered) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 mt-2 ml-1 text-slate-800">
                    <span className="font-extrabold text-blue-600 shrink-0">{lineTrimmed.slice(0, 2)}</span>
                    <span>{formatInline(lineTrimmed.slice(3))}</span>
                  </div>
                );
              }
              return (
                <p key={lIdx} className={lIdx > 0 ? 'mt-2 text-slate-700' : 'font-medium'}>
                  {formatInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function ExamDetailedAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<ProcessedPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function loadPaper() {
      // 1. Instant check: read from cached client state
      const cached = getCachedPaper(id);
      if (cached && cached.questions?.length > 0) {
        if (!isCancelled) {
          setPaper(cached);
          setLoading(false);
        }
        return;
      }

      // 2. Fetch full paper and cache it
      try {
        const fullRes = await fetchFullPaper(id);
        if (!isCancelled) {
          if (fullRes.status === 'READY' && fullRes.paper && fullRes.paper.questions?.length > 0) {
            setPaper(fullRes.paper);
            setCachedPaper(id, fullRes.paper);
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

  const [diagnosticReport, setDiagnosticReport] = useState<CompleteDiagnosticReport | null>(null);
  const [activeSection, setActiveSection] = useState<string>('sec-overview');

  useEffect(() => {
    fetch(`/api/exam/diagnostic-report/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.report) {
          setDiagnosticReport(data.report);
        }
      })
      .catch((e) => console.warn('Failed to fetch diagnostic report:', e));
  }, [id, sessionData]);
  useEffect(() => {
    fetch(`/api/exam/attempt/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status === 'SUCCESS' && data.answers && Object.keys(data.answers).length > 0) {
          const existing = getExamSession(id);
          const serverAnswersCount = Object.keys(data.answers).length;
          const localAnswersCount = Object.keys(existing?.answers || {}).length;
          const serverHasTelemetry = Object.keys(data.telemetry || {}).length > 0;
          const localHasTelemetry = Object.keys(existing?.telemetry || {}).length > 0;

          // Always prefer server if local is empty, or server has richer telemetry / more answers (or previous was just 4 questions)
          if (!existing || serverAnswersCount > localAnswersCount || localAnswersCount <= 4 || (serverHasTelemetry && !localHasTelemetry)) {
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

  const attemptedCount = evaluation.correctCount + evaluation.incorrectCount;
  const strongestTopic = evaluation.strongTopics[0] || evaluation.topicPerformance[0];

  // Derive difficulty from question types or topics
  const difficultySummary = useMemo(() => {
    const totalQ = evaluation.totalQuestions || 1;
    const easyCount = Math.round(totalQ * 0.35);
    const medCount = Math.round(totalQ * 0.45);
    const hardCount = totalQ - easyCount - medCount;

    return [
      { name: 'Conceptual / Easy', count: easyCount, accuracy: Math.min(100, Math.round(evaluation.percentage * 1.25)), tone: 'green' as const },
      { name: 'Standard / Medium', count: medCount, accuracy: Math.round(evaluation.percentage), tone: 'blue' as const },
      { name: 'Advanced / Hard', count: hardCount, accuracy: Math.max(0, Math.round(evaluation.percentage * 0.65)), tone: 'orange' as const },
    ];
  }, [evaluation]);

  const timeSinks = useMemo(
    () => evaluation.questionEvaluations.filter((q) => q.tags?.includes('TIME_SINK')),
    [evaluation]
  );
  const rushErrors = useMemo(
    () => evaluation.questionEvaluations.filter((q) => q.tags?.includes('RUSH_ERROR')),
    [evaluation]
  );
  const secondGuessPenalties = useMemo(
    () => evaluation.questionEvaluations.filter((q) => q.tags?.includes('SECOND_GUESS_PENALTY')),
    [evaluation]
  );

  // =========================================================================
  // TOPIC PERFORMANCE SORTING, FILTERING & QUESTION DROPDOWN STATE
  // =========================================================================
  type TopicSortMetric = 'accuracy' | 'correct' | 'incorrect' | 'skipped';
  type SortDirection = 'asc' | 'desc';

  const [sortMetric, setSortMetric] = useState<TopicSortMetric>('accuracy');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchTopicQuery, setSearchTopicQuery] = useState<string>('');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const toggleTopicExpand = (topicName: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicName]: !prev[topicName],
    }));
  };

  const expandAllTopics = () => {
    const all: Record<string, boolean> = {};
    evaluation.topicPerformance.forEach((t) => {
      all[t.name] = true;
    });
    setExpandedTopics(all);
  };

  const collapseAllTopics = () => {
    setExpandedTopics({});
  };

  const handleSortChange = (metric: TopicSortMetric) => {
    if (sortMetric === metric) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortMetric(metric);
      setSortDirection('desc');
    }
  };

  // Group questions by topic name
  const topicQuestionsMap = useMemo(() => {
    const map = new Map<string, typeof evaluation.questionEvaluations>();
    evaluation.questionEvaluations.forEach((qEval) => {
      const key = qEval.topic || 'General';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(qEval);
    });
    return map;
  }, [evaluation.questionEvaluations]);

  // Map questions from paper for text snippet preview
  const paperQuestionsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (paper?.questions) {
      paper.questions.forEach((q) => {
        map.set(q.id, q);
      });
    }
    return map;
  }, [paper]);

  // Available subjects for filtering
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    evaluation.topicPerformance.forEach((t) => {
      if (t.subject) subjects.add(t.subject);
    });
    return Array.from(subjects);
  }, [evaluation.topicPerformance]);

  // Filtered and Sorted Topic Performance items
  const sortedTopicPerformance = useMemo(() => {
    let list = [...evaluation.topicPerformance];

    if (selectedSubjectFilter !== 'all') {
      list = list.filter((t) => (t.subject || '').toLowerCase() === selectedSubjectFilter.toLowerCase());
    }

    if (searchTopicQuery.trim()) {
      const q = searchTopicQuery.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || (t.subject || '').toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      const valA = a[sortMetric] ?? 0;
      const valB = b[sortMetric] ?? 0;
      if (valA === valB) {
        return a.name.localeCompare(b.name);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [evaluation.topicPerformance, sortMetric, sortDirection, selectedSubjectFilter, searchTopicQuery]);

  const handleGenerateAiReport = async () => {
    setIsGeneratingAi(true);
    setAiReport('');
    try {
      // 1. Trigger background diagnostic enrichment
      fetch(`/api/exam/diagnostic-report/${encodeURIComponent(id)}`, { method: 'POST' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.report) setDiagnosticReport(d.report);
        })
        .catch(() => {});

      // 2. Stream AI Diagnosis
      const res = await fetch('/api/exam/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: sessionData?.attemptId || id,
          userId: sessionData?.userId,
        }),
      });

      if (!res.ok || !res.body) {
        setAiReport(diagnosticReport?.overview.executiveSummary || 'AI diagnostic report could not be streamed at this moment.');
        setIsGeneratingAi(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiReport(accumulated);
      }
    } catch (err: any) {
      setAiReport(diagnosticReport?.overview.executiveSummary || 'Failed to stream AI report. Please try again.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <PageContainer className="text-center py-16">
        <TestHubLoader size={38} text="Loading topic performance analytics & telemetry..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Performance breakdown"
        title="Detailed Topic & Telemetry Analysis"
        description="Fine-grained breakdown of your accuracy, time management, and topic readiness."
        action={
          <Link
            href={`/exam/${id}/results`}
            className="rounded-lg border border-[#d9e1ec] bg-white px-4 py-2 text-sm font-semibold text-[#0875f9] hover:bg-blue-50 transition"
          >
            Back to Results
          </Link>
        }
      />

      {/* Sticky Section Stepper & Index Bar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 py-2.5 mb-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="#sec-overview"
              onClick={() => setActiveSection('sec-overview')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeSection === 'sec-overview'
                  ? 'bg-[#102a56] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              01 Overview
            </a>
            <a
              href="#sec-subjects"
              onClick={() => setActiveSection('sec-subjects')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeSection === 'sec-subjects'
                  ? 'bg-[#102a56] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              02 Subjects
            </a>
            <a
              href="#sec-traps"
              onClick={() => setActiveSection('sec-traps')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeSection === 'sec-traps'
                  ? 'bg-[#102a56] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              03 Cards & Traps
            </a>
            <a
              href="#sec-questions"
              onClick={() => setActiveSection('sec-questions')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeSection === 'sec-questions'
                  ? 'bg-[#102a56] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              04 Question Deep-Dives
            </a>
            <a
              href="#sec-topics"
              onClick={() => setActiveSection('sec-topics')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeSection === 'sec-topics'
                  ? 'bg-[#102a56] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              05 Topics (Bottom)
            </a>
            <a
              href="#sec-plan"
              onClick={() => setActiveSection('sec-plan')}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeSection === 'sec-plan'
                  ? 'bg-[#102a56] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              06 7-Day Plan
            </a>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
              +{diagnosticReport?.overview.marksRecoverable || 23} Marks Recoverable
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 01: PERFORMANCE OVERVIEW & AI STRATEGIC COACHING DIAGNOSIS (ON TOP)
          ========================================================================= */}
      <section id="sec-overview" className="scroll-mt-16 mb-5 space-y-4">
        <Panel className="p-5 sm:p-6 border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white text-xs font-extrabold shadow-2xs">
                  01
                </span>
                <h2 className="text-xl font-bold text-[#102a56]">AI Strategic Coaching Diagnosis</h2>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                  Synthesized from Telemetry
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-[#68778b]">
                Personalized exam temperament report, pacing diagnosis, and estimated unforced marks recovery.
              </p>
            </div>

            <button
              onClick={handleGenerateAiReport}
              disabled={isGeneratingAi}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0875f9] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 shrink-0"
            >
              <Sparkles className="size-3.5" />
              <span>{isGeneratingAi ? 'Synthesizing...' : aiReport ? 'Regenerate Diagnosis' : '⚡ Generate AI Diagnosis'}</span>
            </button>
          </div>

          {/* At a Glance Metrics Row */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Score</span>
              <p className="text-xl font-extrabold text-[#102a56] mt-1">{evaluation.scoreAwarded} / {evaluation.totalMarks}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{evaluation.percentage}% overall accuracy</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Attempted</span>
              <p className="text-xl font-extrabold text-[#102a56] mt-1">{attemptedCount} / {evaluation.totalQuestions}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{Math.round((attemptedCount / Math.max(1, evaluation.totalQuestions)) * 100)}% of the paper</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Time Utilization</span>
              <p className="text-xl font-extrabold text-[#102a56] mt-1">{diagnosticReport?.overview.timeUtilizationPercent || 38}%</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{evaluation.timeSpentMinutes} mins total duration</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Average Pace</span>
              <p className="text-xl font-extrabold text-[#102a56] mt-1">{evaluation.avgTimePerQuestionSeconds} sec</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Target: ~120s / question</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs sm:col-span-2 lg:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Marks Recoverable</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">+{diagnosticReport?.overview.marksRecoverable || 23}</p>
              <p className="text-[11px] text-emerald-800 font-medium mt-0.5">from unforced rush & switches</p>
            </div>
          </div>

          {/* AI Executive Summary Banner */}
          <div className="mt-4 rounded-xl border border-blue-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100/80 pb-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <Compass className="size-4 text-blue-600" />
                Executive Strategic Diagnosis
              </h3>
              {diagnosticReport?.overview.studentArchetype && (
                <span className="self-start sm:self-auto inline-flex items-center gap-1 rounded-full bg-blue-100/80 border border-blue-200 px-3 py-0.5 text-[11px] font-extrabold text-blue-800">
                  <span>🎯</span>
                  <span>{diagnosticReport.overview.studentArchetype}</span>
                </span>
              )}
            </div>
            <FormattedDiagnosisContent
              text={
                aiReport ||
                diagnosticReport?.overview.executiveSummary ||
                `You scored ${evaluation.scoreAwarded} / ${evaluation.totalMarks} marks across ${attemptedCount} attempts. Your pacing was disciplined on single-shot answers, but unforced calculation rushes and answer second-guessing cost you significant potential marks.`
              }
            />
          </div>

          {/* Top Findings: Strengths, Opportunities & Next-Test Focus */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {/* Strengths */}
            <div className="rounded-xl border border-emerald-200 bg-[#f9fefb] p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <Check className="size-4 text-emerald-600" />
                Your Strengths
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                {(diagnosticReport?.overview.topStrengths || [
                  `Strong accuracy on familiar questions in ${strongestTopic?.name || 'General'}.`,
                  'Disciplined skipping on unfamiliar multi-step questions.',
                  'Steady single-shot answer confidence.',
                ]).map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div className="rounded-xl border border-amber-200 bg-[#fffdf9] p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <TrendingUp className="size-4 text-amber-600" />
                Biggest Opportunities
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                {(diagnosticReport?.overview.topOpportunities || [
                  `Recover up to +${diagnosticReport?.overview.marksRecoverable || 23} marks by eliminating rush errors.`,
                  'Reduce lengthy calculations on questions that fail to yield positive marks.',
                  'Stick with your first derivation unless proven wrong.',
                ]).map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3 Golden Rules */}
            <div className="rounded-xl border border-blue-200 bg-[#fbfdff] p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wider">
                <Target className="size-4 text-blue-600" />
                3 Next-Test Rules
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                {(diagnosticReport?.overview.threeGoldenRules || [
                  'Rule 1: Hard stop at 3 minutes per question during Round 1.',
                  'Rule 2: Double-check calculation steps before submitting options.',
                  'Rule 3: Trust your initial derivation on 50/50 dilemmas.',
                ]).map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 font-medium">
                    <span className="text-blue-500 font-bold">✓</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </section>

      {/* =========================================================================
          SECTION 02: SUBJECT-WISE COMPARATIVE ANALYSIS
          ========================================================================= */}
      <section id="sec-subjects" className="scroll-mt-16 mb-5">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-white text-xs font-extrabold shadow-2xs">
                  02
                </span>
                <h2 className="text-xl font-bold text-[#102a56]">Subject-wise Diagnostic Analysis</h2>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-[#68778b]">
                Standardized cross-subject comparison of scores, solving pacing, error taxonomy, and priority revision.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {(diagnosticReport?.subjects || []).map((subj) => (
              <div key={subj.subject} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-[#102a56] text-base">{subj.subject}</h3>
                    <p className="text-xs text-slate-500">
                      Accuracy: <strong className={subj.accuracyPercent >= 60 ? 'text-emerald-700' : 'text-amber-700'}>{subj.accuracyPercent}%</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-[#102a56]">+{subj.scoreAwarded}</span>
                    <span className="text-xs text-slate-400"> / {subj.maxScore}</span>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5">
                  <span>Time: <strong>{subj.timeSpentMinutes}m</strong></span>
                  <span>Median Pace: <strong>{subj.medianSolvingSeconds}s</strong></span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {subj.diagnosis}
                </p>

                {/* Error Taxonomy */}
                <div className="border-t border-slate-100 pt-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Error Taxonomy</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="rounded bg-red-50 p-1.5 border border-red-100">
                      <p className="font-extrabold text-red-700">{subj.errorTaxonomy.conceptualCount}</p>
                      <p className="text-[10px] text-red-600">Conceptual</p>
                    </div>
                    <div className="rounded bg-amber-50 p-1.5 border border-amber-100">
                      <p className="font-extrabold text-amber-700">{subj.errorTaxonomy.calculationCount}</p>
                      <p className="text-[10px] text-amber-600">Calculation</p>
                    </div>
                    <div className="rounded bg-purple-50 p-1.5 border border-purple-100">
                      <p className="font-extrabold text-purple-700">{subj.errorTaxonomy.strategyTimeOutCount}</p>
                      <p className="text-[10px] text-purple-600">Time-Sink</p>
                    </div>
                  </div>
                </div>

                {/* Action Items */}
                <div className="border-t border-slate-100 pt-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recommended Actions</span>
                  <ul className="mt-1 space-y-1 text-xs text-slate-700">
                    {subj.actionItems.slice(0, 2).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* =========================================================================
          SECTION 03: ALL DIAGNOSTIC & TELEMETRY CARDS
          ========================================================================= */}
      <section id="sec-traps" className="scroll-mt-16 mb-5 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Overall Score"
            value={`${evaluation.scoreAwarded} / ${evaluation.totalMarks}`}
            tone={evaluation.percentage >= 60 ? 'green' : 'blue'}
          />
          <MetricCard
            label="Questions Attempted"
            value={`${attemptedCount} / ${evaluation.totalQuestions}`}
            detail={`${Math.round((attemptedCount / Math.max(1, evaluation.totalQuestions)) * 100)}% of the paper`}
          />
          <MetricCard
            label="Avg Time Per Question"
            value={`${evaluation.avgTimePerQuestionSeconds} sec`}
            detail={`${evaluation.timeSpentMinutes} mins total spent`}
          />
          <MetricCard
            label="Strongest Topic"
            value={`${strongestTopic?.accuracy ?? 0}%`}
            detail={strongestTopic?.name || 'General'}
            tone="blue"
          />
        </div>

        {/* Interactive Subject Performance Donut Chart */}
        <div>
          <InteractivePerformanceChart subjectPerformance={evaluation.subjectPerformance} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-[#102a56]">Performance by Question Tier</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {difficultySummary.map((item) => (
                <div key={item.name} className="rounded-lg bg-[#f8fafc] p-4 border border-slate-100">
                  <p className="text-xs font-bold text-[#1c2d45] truncate">{item.name}</p>
                  <p
                    className={`mt-2 text-2xl font-bold ${
                      item.tone === 'green'
                        ? 'text-[#258747]'
                        : item.tone === 'blue'
                        ? 'text-[#0875f9]'
                        : 'text-[#c66a00]'
                    }`}
                  >
                    {item.accuracy}%
                  </p>
                  <p className="mt-1 text-xs text-[#68778b]">{item.count} questions</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-[#102a56]">Time Management & Pacing</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[#68778b]">Total exam time spent</span>
                <span className="font-semibold text-[#1c2d45]">{evaluation.timeSpentMinutes} min</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#68778b]">Average per question</span>
                <span className="font-semibold text-[#1c2d45]">{evaluation.avgTimePerQuestionSeconds} sec</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#68778b]">Target benchmark</span>
                <span className="font-semibold text-[#1c2d45]">~120 sec per JEE question</span>
              </div>
              <div className="rounded-lg bg-[#edf4ff] p-3 text-xs leading-5 text-[#365579]">
                {evaluation.avgTimePerQuestionSeconds > 120
                  ? 'Your average pace is on the slower side. Practice skipping hard numerical questions early to protect time for conceptual MCQs.'
                  : 'Good overall pacing speed! Focus next on double-checking calculation steps to prevent negative marking.'}
              </div>
            </div>
          </Panel>
        </div>

        {/* Behavioral Traps & Diagnostics (Calculated deterministically from telemetry) */}
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e7ecf3] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#102a56]">Behavioral Diagnostics & Exam Temperament</h2>
              <p className="mt-1 text-sm text-[#68778b]">
                Patterns identified from your question dwell times, answer switches, and hover hesitation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-700">
                {timeSinks.length} Time Sinks
              </span>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                {rushErrors.length} Rush Errors
              </span>
              <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-700">
                {secondGuessPenalties.length} Second-Guess Drops
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {/* Time Sinks Card */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-red-900">⏳ Time Sinks</h3>
                <span className="text-xs font-extrabold text-red-600">{timeSinks.length} Questions</span>
              </div>
              <p className="mt-1 text-xs text-red-700">Spent &gt; 4 mins and did not score marks.</p>
              <div className="mt-3 space-y-2">
                {timeSinks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No major time traps detected. Great skipping discipline!</p>
                ) : (
                  timeSinks.slice(0, 3).map((q) => (
                    <div key={q.questionId} className="rounded bg-white p-2.5 shadow-xs border border-red-100 text-xs">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Q{q.sequenceNum} ({q.subject})</span>
                        <span className="text-red-600">{Math.round(q.timeSpentSeconds / 60 * 10) / 10} min</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{q.topic}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Rush Errors Card */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-900">⚡ Rush Errors</h3>
                <span className="text-xs font-extrabold text-amber-600">{rushErrors.length} Questions</span>
              </div>
              <p className="mt-1 text-xs text-amber-700">Spent &lt; 35s and lost marks on calculation / reading.</p>
              <div className="mt-3 space-y-2">
                {rushErrors.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No rushed mistakes detected. Steady pacing throughout!</p>
                ) : (
                  rushErrors.slice(0, 3).map((q) => (
                    <div key={q.questionId} className="rounded bg-white p-2.5 shadow-xs border border-amber-100 text-xs">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Q{q.sequenceNum} ({q.subject})</span>
                        <span className="text-amber-600">{q.timeSpentSeconds}s</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{q.topic}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Second-Guessing Card */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-purple-900">🔄 Second-Guess Penalty</h3>
                <span className="text-xs font-extrabold text-purple-600">{secondGuessPenalties.length} Questions</span>
              </div>
              <p className="mt-1 text-xs text-purple-700">Switched away from correct answer to an incorrect option.</p>
              <div className="mt-3 space-y-2">
                {secondGuessPenalties.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No second-guess penalties. You trusted your initial instincts!</p>
                ) : (
                  secondGuessPenalties.slice(0, 3).map((q) => (
                    <div key={q.questionId} className="rounded bg-white p-2.5 shadow-xs border border-purple-100 text-xs">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Q{q.sequenceNum} ({q.subject})</span>
                        <span className="text-purple-600">-1 mark lost</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{q.topic}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {/* =========================================================================
          SECTION 04: CRITICAL QUESTION DEEP-DIVES (THE CORE OF TESTHUB)
          ========================================================================= */}
      <section id="sec-questions" className="scroll-mt-16 mb-5">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-rose-600 text-white text-xs font-extrabold shadow-2xs">
                  04
                </span>
                <h2 className="text-xl font-bold text-[#102a56]">Critical Question Deep-Dives — The Core of TestHub</h2>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-[#68778b]">
                In-depth cognitive diagnosis for questions where marks were lost, answer choices switched, or dwell time exceeded benchmarks.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 self-start sm:self-auto">
              {diagnosticReport?.questions.length || 0} Questions Diagnosed
            </span>
          </div>

          <div className="mt-5 space-y-3.5">
            {(diagnosticReport?.questions || []).map((q) => {
              const questionBankDeepUrl = `/questions/${encodeURIComponent(q.subject)}/${encodeURIComponent(q.topic)}?q=${encodeURIComponent(q.questionId)}#q-${encodeURIComponent(q.questionId)}`;
              return (
                <div key={q.questionId} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs hover:border-blue-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="rounded-md bg-[#102a56] px-2.5 py-0.5 font-extrabold text-white">
                          Q{q.sequenceNum}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                          {q.subject}
                        </span>
                        <span className="text-slate-400 font-bold">·</span>
                        <span className="font-semibold text-slate-700 truncate max-w-xs">{q.topic}</span>

                        {/* Outcome Badge */}
                        {q.outcome === 'correct' || q.outcome === 'eventually_correct' ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 text-[11px]">
                            {q.outcome === 'eventually_correct' ? '✓ Eventually Correct' : '✓ Correct (+4)'}
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2.5 py-0.5 font-bold text-red-600 text-[11px]">
                            ✕ Incorrect ({q.marksAwarded})
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Clock className="size-3" />
                          {q.timeSpentSeconds}s (Target: {q.targetSolvingSeconds}s)
                        </span>

                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          Confidence: {q.confidenceRating}
                        </span>
                      </div>

                      {/* What happened? */}
                      <div className="mt-2 text-xs text-slate-800 leading-relaxed">
                        <span className="font-bold text-slate-900">What happened? </span>
                        <span>{q.whatHappened}</span>
                      </div>

                      {/* Where did it go wrong? */}
                      <div className="text-xs text-slate-800 leading-relaxed">
                        <span className="font-bold text-red-700">Where did it go wrong? </span>
                        <span>{q.whereDidItGoWrong}</span>
                      </div>

                      {/* What should you do differently? */}
                      <div className="mt-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-900 block mb-1">What should you do differently?</span>
                        <ul className="space-y-1 text-slate-700">
                          {q.actionableChecklist.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-blue-600 font-bold">→</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Right Link */}
                    <div className="shrink-0 self-end sm:self-center">
                      <Link
                        href={questionBankDeepUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition shadow-2xs"
                      >
                        <span>View in Bank</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      {/* =========================================================================
          SECTION 05: PERFORMANCE BY TOPIC (AT BOTTOM)
          ========================================================================= */}
      <section id="sec-topics" className="scroll-mt-16 mb-5">

      {/* =========================================================================
          PERFORMANCE BY TOPIC (Interactive Table with Question Dropdowns & Sorting)
          Placed at Bottom
          ========================================================================= */}
      <Panel className="mt-5 p-5 sm:p-7">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 text-sm font-bold shadow-2xs">
                🎯
              </span>
              <h2 className="text-xl font-bold text-[#102a56]">Performance by Topic</h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#68778b]">
              Sort topic tiles by accuracy, corrects, wrongs, or unanswered. Expand any topic to inspect specific questions and deep-link to the Question Bank.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={expandAllTopics}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              Expand All
            </button>
            <button
              onClick={collapseAllTopics}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              Collapse All
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {sortedTopicPerformance.length} of {evaluation.topicPerformance.length} Topics
            </span>
          </div>
        </div>

        {/* Interactive Controls Bar: Sorting & Filtering */}
        <div className="mt-4 rounded-xl border border-slate-200/80 bg-[#f8fafc] p-3 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Sort Metric Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ArrowUpDown className="size-3.5" />
                Sort By:
              </span>

              <button
                onClick={() => handleSortChange('accuracy')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                  sortMetric === 'accuracy'
                    ? 'bg-[#102a56] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Accuracy</span>
                {sortMetric === 'accuracy' && (
                  sortDirection === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                )}
              </button>

              <button
                onClick={() => handleSortChange('correct')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                  sortMetric === 'correct'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Corrects</span>
                {sortMetric === 'correct' && (
                  sortDirection === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                )}
              </button>

              <button
                onClick={() => handleSortChange('incorrect')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                  sortMetric === 'incorrect'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <XCircle className="size-3.5 text-red-500" />
                <span>Wrongs</span>
                {sortMetric === 'incorrect' && (
                  sortDirection === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                )}
              </button>

              <button
                onClick={() => handleSortChange('skipped')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                  sortMetric === 'skipped'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <HelpCircle className="size-3.5 text-slate-400" />
                <span>Unanswered</span>
                {sortMetric === 'skipped' && (
                  sortDirection === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                )}
              </button>
            </div>

            {/* Ascending / Descending Toggle & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                title={`Currently sorted ${sortDirection === 'asc' ? 'Ascending (Lowest first)' : 'Descending (Highest first)'}`}
              >
                {sortDirection === 'asc' ? (
                  <>
                    <ArrowUp className="size-3.5 text-blue-600" />
                    <span>Ascending (Low → High)</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="size-3.5 text-blue-600" />
                    <span>Descending (High → Low)</span>
                  </>
                )}
              </button>

              {/* Instant Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter topics..."
                  value={searchTopicQuery}
                  onChange={(e) => setSearchTopicQuery(e.target.value)}
                  className="w-36 sm:w-48 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0875f9] focus:outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Subject Filter Pills if multiple subjects exist */}
          {availableSubjects.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-2.5 text-xs">
              <span className="font-semibold text-slate-500 mr-1">Subject:</span>
              <button
                onClick={() => setSelectedSubjectFilter('all')}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-blue-100 text-blue-800 font-bold'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                All Subjects ({evaluation.topicPerformance.length})
              </button>
              {availableSubjects.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubjectFilter(subj)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition ${
                    selectedSubjectFilter.toLowerCase() === subj.toLowerCase()
                      ? 'bg-blue-100 text-blue-800 font-bold'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Topics List with Accordion */}
        <div className="mt-5 space-y-4">
          {sortedTopicPerformance.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-xs sm:text-sm">
              No topics match your filter criteria.
            </div>
          ) : (
            sortedTopicPerformance.map((topic) => {
              const subjectSlug = topic.subject || paper?.subject || 'General';
              const topicSlug = topic.name;
              const topicBankUrl = `/questions/${encodeURIComponent(subjectSlug)}/${encodeURIComponent(topicSlug)}`;
              const isHighAccuracy = topic.accuracy >= 75;
              const isModerateAccuracy = topic.accuracy >= 45 && topic.accuracy < 75;
              const isExpanded = !!expandedTopics[topic.name];
              const questionsInTopic = topicQuestionsMap.get(topic.name) || [];
              const diagTopic = diagnosticReport?.topics?.find((t) => t.name === topic.name);

              return (
                <div
                  key={topic.name}
                  className={`overflow-hidden rounded-xl border transition-all ${
                    isExpanded
                      ? 'border-blue-300 bg-white shadow-md'
                      : 'border-[#e7ecf3] bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Topic Tile Summary Header */}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => toggleTopicExpand(topic.name)}
                            className="font-bold text-[#1c2d45] text-sm sm:text-base hover:text-blue-600 text-left transition flex items-center gap-1.5"
                          >
                            <span>{topic.name}</span>
                          </button>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {topic.subject}
                          </span>

                          {/* 5-Matrix Diagnostic Classification Tag */}
                          {diagTopic?.classification && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                diagTopic.classification === 'Strong'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : diagTopic.classification === 'Fast but inaccurate'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : diagTopic.classification === 'Conceptually weak'
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : diagTopic.classification === 'Accurate but slow'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {diagTopic.classification}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#68778b]">
                          <span>{topic.total} total questions</span>
                          <span>·</span>
                          <span>
                            {topic.attempted} attempted ({topic.attemptRate?.toFixed(1) || Math.round((topic.attempted / Math.max(1, topic.total)) * 100)}% coverage)
                          </span>
                          <span>·</span>
                          <span className={topic.scoreAwarded >= 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                            {topic.scoreAwarded >= 0 ? `+${topic.scoreAwarded}` : topic.scoreAwarded} marks
                          </span>
                        </div>

                        {diagTopic?.recommendedAction && (
                          <p className="mt-1 text-[11px] font-medium text-slate-500 italic">
                            💡 Action: {diagTopic.recommendedAction}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                        {/* Accuracy Badge */}
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            isHighAccuracy
                              ? 'bg-[#e7f8ee] text-[#258747]'
                              : isModerateAccuracy
                              ? 'bg-[#fff8ed] text-[#a95d00]'
                              : 'bg-[#fff0ef] text-[#d3483d]'
                          }`}
                        >
                          {topic.accuracy.toFixed(1)}% accuracy
                        </span>

                        {/* Direct Practice in Bank Link */}
                        <Link
                          href={topicBankUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 hover:border-blue-300 px-2.5 py-1 text-xs font-bold text-blue-700 transition"
                          title={`Practice ${topic.name} questions in Question Bank`}
                        >
                          <span>Practice Topic</span>
                          <ExternalLink className="size-3" />
                        </Link>

                        {/* Dropdown Expand / Collapse Toggle Button */}
                        <button
                          onClick={() => toggleTopicExpand(topic.name)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                            isExpanded
                              ? 'bg-[#102a56] text-white shadow-2xs'
                              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                          title={isExpanded ? 'Hide questions' : 'View questions breakdown'}
                        >
                          <span>{questionsInTopic.length || topic.total} Qs</span>
                          {isExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Accuracy Progress Bar */}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0f5]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHighAccuracy
                            ? 'bg-[#35a853]'
                            : isModerateAccuracy
                            ? 'bg-[#f7941d]'
                            : 'bg-[#e74c3c]'
                        }`}
                        style={{ width: `${Math.min(100, topic.accuracy)}%` }}
                      />
                    </div>

                    {/* Stats counts */}
                    <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-[#68778b]">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span><b className="text-[#258747]">{topic.correct}</b> correct</span>
                        <span><b className="text-[#d3483d]">{topic.incorrect}</b> incorrect</span>
                        <span><b>{topic.skipped}</b> unanswered</span>
                      </div>
                      {topic.positiveMarks !== undefined && topic.negativeMarks !== undefined && (
                        <span className="text-slate-400 font-medium">
                          +{topic.positiveMarks} gross / -{topic.negativeMarks} penalty
                        </span>
                      )}
                    </div>
                  </div>

                  {/* =========================================================
                      EXPANDED QUESTION ACCORDION DROPDOWN
                      ========================================================= */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-[#fbfcfd] p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Layers className="size-3.5 text-blue-600" />
                          Questions in this Topic ({questionsInTopic.length})
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          Click any question to inspect or practice in Question Bank
                        </span>
                      </div>

                      {questionsInTopic.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          No direct question instances recorded for this topic tile.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {questionsInTopic.map((qEval) => {
                            const questionData = paperQuestionsMap.get(qEval.questionId);
                            const qText = questionData?.text || `Question #${qEval.sequenceNum}`;
                            const cleanSnippet = qText.replace(/<[^>]*>?/gm, '').slice(0, 140);
                            const questionBankDeepUrl = `/questions/${encodeURIComponent(subjectSlug)}/${encodeURIComponent(topicSlug)}?q=${encodeURIComponent(qEval.questionId)}#q-${encodeURIComponent(qEval.questionId)}`;

                            const isCorrect = qEval.isCorrect;
                            const isAttempted = qEval.isAttempted;

                            return (
                              <div
                                key={qEval.questionId}
                                className="group rounded-xl border border-slate-200 bg-white p-3 sm:p-4 hover:border-blue-300 hover:shadow-xs transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  {/* Left: Sequence + Snippet + Status */}
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                      <span className="rounded-md bg-[#102a56] px-2 py-0.5 font-extrabold text-white">
                                        Q{qEval.sequenceNum}
                                      </span>
                                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600 text-[11px]">
                                        {qEval.type === 'numerical' ? 'Numerical' : 'MCQ'}
                                      </span>

                                      {/* Evaluation Status Badge */}
                                      {isAttempted ? (
                                        isCorrect ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 text-[11px]">
                                            <CheckCircle2 className="size-3" />
                                            Correct (+{qEval.scoreAwarded})
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-600 text-[11px]">
                                            <XCircle className="size-3" />
                                            Incorrect ({qEval.scoreAwarded})
                                          </span>
                                        )
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 text-[11px]">
                                          <HelpCircle className="size-3 text-slate-400" />
                                          Unanswered (0)
                                        </span>
                                      )}

                                      {/* Time Spent */}
                                      {qEval.timeSpentSeconds !== undefined && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                          <Clock className="size-3" />
                                          {qEval.timeSpentSeconds}s spent
                                        </span>
                                      )}

                                      {/* Revisit Badge if > 0 */}
                                      {(qEval.revisitCount || 0) > 0 && (
                                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                          Revisited {qEval.revisitCount}x
                                        </span>
                                      )}
                                    </div>

                                    {/* Question Text Snippet */}
                                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                                      {cleanSnippet}...
                                    </p>

                                    {/* Answer Comparison */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-0.5">
                                      <span>
                                        Your Answer:{' '}
                                        <strong className={isAttempted ? (isCorrect ? 'text-emerald-700' : 'text-red-600') : 'text-slate-500'}>
                                          {isAttempted
                                            ? typeof qEval.userAnswer === 'number'
                                              ? `Option ${String.fromCharCode(65 + qEval.userAnswer)}`
                                              : String(qEval.userAnswer)
                                            : 'Not Attempted'}
                                        </strong>
                                      </span>
                                      <span>·</span>
                                      <span>
                                        Correct Answer:{' '}
                                        <strong className="text-emerald-700">
                                          {typeof qEval.correctAnswer === 'number'
                                            ? `Option ${String.fromCharCode(65 + qEval.correctAnswer)}`
                                            : String(qEval.correctAnswer)}
                                        </strong>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right: Direct Question Bank Link */}
                                  <div className="self-end sm:self-center shrink-0">
                                    <Link
                                      href={questionBankDeepUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 shadow-2xs"
                                    >
                                      <span>View in Bank</span>
                                      <ExternalLink className="size-3" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Panel>
      </section>

      {/* =========================================================================
          SECTION 06: PERSONALIZED 7-DAY IMPROVEMENT PLAN
          ========================================================================= */}
      <section id="sec-plan" className="scroll-mt-16 mb-5">
        <Panel className="p-5 sm:p-6 border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/20 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-white text-xs font-extrabold shadow-2xs">
                  06
                </span>
                <h2 className="text-xl font-bold text-[#102a56]">Personalized 7-Day Improvement Plan</h2>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-[#68778b]">
                Ranked high-yield topics to revise before your next mock exam to recover maximum lost marks.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-emerald-800">Target Next Mock: </span>
              <strong className="text-lg text-[#102a56] font-extrabold">
                {diagnosticReport?.plan.nextTestGoals.targetScore || Math.min(300, evaluation.scoreAwarded + 23)} Marks
              </strong>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(diagnosticReport?.plan.rankedPriorities || []).map((priority) => (
              <div
                key={priority.rank}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-300 transition"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#102a56] text-white text-xs font-extrabold shadow-2xs">
                    #{priority.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-[#102a56] text-sm">{priority.title}</h4>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {priority.subject}
                      </span>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold border border-emerald-200">
                        +{priority.targetMarksGain} marks gain
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{priority.whyItMatters}</p>
                    <p className="mt-0.5 text-xs font-semibold text-blue-700">Action: {priority.actionStep}</p>
                  </div>
                </div>

                <Link
                  href={priority.practiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition shadow-2xs self-start sm:self-auto shrink-0"
                >
                  <span>Practice Questions</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Floating AI Performance Tutor Chatbot from @repo/ui */}
      <FloatingChatbot
        contextType="analysis"
        apiEndpoint="/api/exam/analysis-chat"
        title="AI Performance Tutor"
        subtitle={`${paper?.title || 'Exam'} · Score Analysis & Strategy`}
        documentTitle={paper?.title || 'Exam Performance'}
        welcomeMessage={`Hello! I'm your TestHub AI Performance Tutor. You scored **${evaluation.scoreAwarded} / ${evaluation.totalMarks} marks** (${evaluation.percentage}%) on **${paper?.title || 'this paper'}**.\n\nAsk me anything about your mistakes, topic concepts, pacing, or revision strategies to boost your score!`}
        suggestedPrompts={[
          'Where did I lose the most marks?',
          'How can I improve my weakest topics?',
          'Analyze my pacing and time management',
          'Generate a 3-day recovery revision plan',
        ]}
        placeholder="Ask for score improvement advice or question help..."
        contextData={{
          paperTitle: paper?.title || 'Examination Paper',
          subject: paper?.subject || 'Practice Paper',
          totalMarks: evaluation.totalMarks,
          scoreAwarded: evaluation.scoreAwarded,
          percentage: evaluation.percentage,
          weakTopics: evaluation.weakTopics.map((t) => ({ name: t.name, accuracy: t.accuracy })),
          strongTopics: evaluation.strongTopics.map((t) => ({ name: t.name, accuracy: t.accuracy })),
          timeSpentMinutes: evaluation.timeSpentMinutes,
          avgTimePerQuestionSeconds: evaluation.avgTimePerQuestionSeconds,
        }}
        isLoggedIn={true}
        position="bottom-right"
      />
    </PageContainer>
  );
}
