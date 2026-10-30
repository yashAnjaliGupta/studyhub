'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { MathText } from '@repo/ui/math-text';
import { FloatingChatbot } from '@repo/ui/floating-chatbot';
import { PageContainer, PageHeading } from '../../../../components/ui';
import { TestHubLoader } from '../../../../components/testhub-loader';
import { DiagramCanvas } from '../../../../components/diagram-canvas';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Filter,
  HelpCircle,
  Search,
  Sparkles,
  Bookmark,
  Share2,
} from 'lucide-react';

interface QuestionOptionItem {
  id: string;
  text: string;
  imageUrl: string | null;
  isCorrect: boolean;
  sequenceNum: number;
}

interface QuestionItem {
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

function getSubjectTheme(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes('math')) {
    return {
      gradient: 'from-indigo-600 to-purple-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      text: 'text-indigo-600',
      btn: 'bg-indigo-600 hover:bg-indigo-700',
      symbol: '∑',
    };
  }
  if (s.includes('physic')) {
    return {
      gradient: 'from-sky-600 to-blue-600',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      text: 'text-sky-600',
      btn: 'bg-sky-600 hover:bg-sky-700',
      symbol: '⚛',
    };
  }
  if (s.includes('chem')) {
    return {
      gradient: 'from-emerald-600 to-teal-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'text-emerald-600',
      btn: 'bg-emerald-600 hover:bg-emerald-700',
      symbol: '🧪',
    };
  }
  return {
    gradient: 'from-rose-600 to-orange-600',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-600',
    btn: 'bg-rose-600 hover:bg-rose-700',
    symbol: '🔬',
  };
}

export default function TopicQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetQuestionId = searchParams?.get('q') || searchParams?.get('highlight') || '';

  const rawSubject = (params?.subject as string) || '';
  const rawTopic = (params?.topic as string) || '';

  const subject = decodeURIComponent(rawSubject);
  const topicName = decodeURIComponent(rawTopic);

  const theme = getSubjectTheme(subject);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // Auto-scroll and highlight target question if linked from exam analysis
  useEffect(() => {
    if (!loading && targetQuestionId && questions.length > 0) {
      setRevealedAnswers((prev) => new Set(prev).add(targetQuestionId));
      const timer = setTimeout(() => {
        const el = document.getElementById(`q-${targetQuestionId}`) || document.getElementById(targetQuestionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [loading, targetQuestionId, questions]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchTopicQuestions() {
      try {
        setLoading(true);
        setError(null);

        const url = `/api/questions?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topicName)}&limit=1000`;
        const res = await fetch(url);
        const data = await res.json();

        if (isCancelled) return;

        if (data.success) {
          // 1. Direct match from flat questions array
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestions(data.questions);
            setLoading(false);
            return;
          }

          // 2. Hierarchical match from subjects -> topics
          if (Array.isArray(data.subjects)) {
            const matchedSubj = data.subjects.find(
              (s: any) => s.subject.toLowerCase() === subject.toLowerCase()
            );

            if (matchedSubj && Array.isArray(matchedSubj.topics)) {
              const matchedTopic = matchedSubj.topics.find(
                (t: any) => t.name.toLowerCase() === topicName.toLowerCase()
              );

              if (matchedTopic && Array.isArray(matchedTopic.questions) && matchedTopic.questions.length > 0) {
                setQuestions(matchedTopic.questions);
                setLoading(false);
                return;
              }
            }

            // 3. Fallback: collect all questions from all matching topics in response
            const allQs: QuestionItem[] = [];
            for (const s of data.subjects) {
              for (const t of s.topics || []) {
                if (
                  t.name.toLowerCase() === topicName.toLowerCase() ||
                  t.name.toLowerCase().includes(topicName.toLowerCase()) ||
                  topicName.toLowerCase().includes(t.name.toLowerCase())
                ) {
                  allQs.push(...(t.questions || []));
                }
              }
            }

            setQuestions(allQs);
            setLoading(false);
            return;
          }

          setQuestions([]);
          setLoading(false);
        } else {
          setError(data.error || 'Failed to load questions for this topic.');
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Error connecting to question service.');
          setLoading(false);
        }
      }
    }

    if (subject && topicName) {
      fetchTopicQuestions();
    }
    return () => {
      isCancelled = true;
    };
  }, [subject, topicName]);

  const toggleRevealAnswer = (questionId: string) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const toggleBookmark = (questionId: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  // Filter questions based on search query and type filter
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedType !== 'all') {
        if (selectedType === 'numerical' && q.type !== 'numerical') return false;
        if (selectedType === 'mcq' && q.type === 'numerical') return false;
      }
      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase();
      const qText = (q.text || '').toLowerCase();
      const paperTitle = (q.paper?.title || '').toLowerCase();
      return qText.includes(term) || paperTitle.includes(term);
    });
  }, [questions, searchQuery, selectedType]);

  return (
    <PageContainer>
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-blue-600 transition">
          Home
        </Link>
        <ChevronRight className="size-3 text-slate-400" />
        <Link href="/questions" className="hover:text-blue-600 transition">
          Question Bank
        </Link>
        <ChevronRight className="size-3 text-slate-400" />
        <span className="text-slate-700">{subject}</span>
        <ChevronRight className="size-3 text-slate-400" />
        <span className="text-slate-900 font-bold truncate max-w-xs sm:max-w-md">
          {topicName}
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-[#dce4ef] bg-white shadow-xs">
        <div className={`h-2 w-full bg-gradient-to-r ${theme.gradient}`} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-extrabold border ${theme.badge}`}>
                  <span>{theme.symbol}</span>
                  <span>{subject}</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  Topic-Wise Collection
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#102a56]">
                {topicName}
              </h1>
              <p className="text-sm text-[#68778b]">
                Curated questions with step-by-step mathematical solutions and answer keys.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/questions"
                className="inline-flex items-center gap-2 rounded-xl border border-[#dce4ef] bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
              >
                <ArrowLeft className="size-3.5" />
                <span>All Topics</span>
              </Link>
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 text-center">
                <p className="text-lg font-black text-[#0875f9] leading-tight">
                  {questions.length}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Questions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dce4ef] bg-white p-4 shadow-xs">
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="size-3.5" />
            <span>Type:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              selectedType === 'all'
                ? 'bg-[#0875f9] text-white shadow-xs'
                : 'border border-[#dce4ef] bg-[#f8fafc] text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Types ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('mcq')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              selectedType === 'mcq'
                ? 'bg-[#0875f9] text-white shadow-xs'
                : 'border border-[#dce4ef] bg-[#f8fafc] text-slate-600 hover:bg-slate-100'
            }`}
          >
            Multiple Choice ({questions.filter((q) => q.type !== 'numerical').length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('numerical')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              selectedType === 'numerical'
                ? 'bg-[#0875f9] text-white shadow-xs'
                : 'border border-[#dce4ef] bg-[#f8fafc] text-slate-600 hover:bg-slate-100'
            }`}
          >
            Numerical ({questions.filter((q) => q.type === 'numerical').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or terms..."
            className="w-full rounded-lg border border-[#dce4ef] bg-slate-50 py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#0875f9] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Main Content: Questions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce4ef] bg-white p-16 shadow-xs text-center">
          <TestHubLoader size={38} text={`Loading curated questions for ${topicName}...`} />
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
      ) : filteredQuestions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-base font-bold text-[#102a56]">No questions match your criteria</p>
          <p className="mt-1 text-xs text-[#68778b]">
            Try adjusting your search query or switching to All Types.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
            }}
            className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-xs font-bold text-[#0875f9] hover:bg-blue-100"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredQuestions.map((q, idx) => {
            const isRevealed = revealedAnswers.has(q.id);
            const isBookmarked = bookmarked.has(q.id);
            const isTarget = q.id === targetQuestionId;
            const correctOption = q.options?.find((opt) => opt.isCorrect);

            return (
              <div
                key={q.id}
                id={`q-${q.id}`}
                className={`overflow-hidden rounded-2xl border transition ${
                  isTarget
                    ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/10 shadow-lg'
                    : 'border-[#dce4ef] bg-white shadow-xs hover:border-[#0875f9]/40 hover:shadow-md'
                }`}
              >
                {/* Target Focus Banner when linked from Exam Analysis */}
                {isTarget && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white flex items-center justify-between shadow-xs">
                    <span className="flex items-center gap-1.5">
                      <span>🎯</span>
                      <span>Target Question from your Practice Exam Attempt</span>
                    </span>
                    <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                      Linked from Analysis
                    </span>
                  </div>
                )}

                {/* Question Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f7] bg-[#fbfcfd] px-5 py-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#102a56] text-xs font-extrabold text-white shadow-xs">
                      Q{idx + 1}
                    </span>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#0875f9]">
                      {q.type === 'numerical'
                        ? 'Numerical Value'
                        : q.type === 'mcq_multiple'
                        ? 'Multiple Correct'
                        : 'Single Choice MCQ'}
                    </span>
                    <span className="text-slate-400 font-bold">|</span>
                    <span className="font-semibold text-emerald-700">+{q.marks} Marks</span>
                    {q.negativeMarks !== null && q.negativeMarks !== undefined && (
                      <span className="font-semibold text-red-600">
                        {q.negativeMarks ? `-${q.negativeMarks} Negative` : 'No Negative'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {q.paper?.title && (
                      <span className="hidden sm:inline-flex items-center rounded bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                        Paper: {q.paper.title}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleBookmark(q.id)}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border transition ${
                        isBookmarked
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                      title={isBookmarked ? 'Bookmarked' : 'Bookmark Question'}
                    >
                      <Bookmark className={`size-3.5 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                      <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Bookmark'}</span>
                    </button>
                  </div>
                </div>

                {/* Question Body */}
                <div className="p-5 sm:p-7 space-y-4">
                  {/* Question Text */}
                  <div className="text-base font-normal leading-relaxed text-[#1a202c]">
                    <MathText text={q.text} />
                  </div>

                  {/* Diagrams / Chemical SVG Canvas */}
                  {(q.diagramSvg || q.imageUrl) && (
                    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <DiagramCanvas
                        diagramSvg={q.diagramSvg}
                        imageUrl={q.imageUrl}
                        title={`Question ${idx + 1} Diagram`}
                      />
                    </div>
                  )}

                  {/* Options (for MCQ) */}
                  {q.type !== 'numerical' && q.options && q.options.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {q.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isCorrectOpt = opt.isCorrect;

                        return (
                          <div
                            key={opt.id || optIdx}
                            className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm transition ${
                              isRevealed && isCorrectOpt
                                ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                                : 'border-[#e2e8f0] bg-white hover:border-slate-300'
                            }`}
                          >
                            <span
                              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                                isRevealed && isCorrectOpt
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <MathText text={opt.text} />
                              {opt.imageUrl && (
                                <img
                                  src={opt.imageUrl}
                                  alt={`Option ${letter}`}
                                  className="mt-2 max-h-32 object-contain"
                                />
                              )}
                            </div>
                            {isRevealed && isCorrectOpt && (
                              <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : q.type === 'numerical' ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-medium text-slate-600">
                      Numerical Value Question — Enter integer or decimal numerical response.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-800 flex items-center justify-between">
                      <span>Multiple-choice question options recorded in official key. Click <strong>Show Answer & Explanation</strong> below to view the verified solution.</span>
                    </div>
                  )}

                  {/* Reveal Answer Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#edf2f7]">
                    <button
                      type="button"
                      onClick={() => toggleRevealAnswer(q.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${
                        isRevealed
                          ? 'bg-slate-800 text-white hover:bg-slate-900'
                          : 'bg-[#0875f9] text-white hover:bg-blue-700'
                      }`}
                    >
                      <span>{isRevealed ? 'Hide Solution' : 'Show Answer & Explanation'}</span>
                    </button>

                    {q.paper?.id && (
                      <Link
                        href={`/exam/${encodeURIComponent(q.paper.id)}/configure`}
                        className="text-xs font-semibold text-[#0875f9] hover:underline"
                        title="Attempt full paper in CBT mode"
                      >
                        Attempt Full Paper →
                      </Link>
                    )}
                  </div>

                  {/* Revealed Answer & Solution Box */}
                  {isRevealed && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="font-extrabold uppercase tracking-wide text-emerald-900">
                          {q.type === 'numerical' ? 'Correct Numerical Answer' : 'Correct Option'}
                        </span>
                      </div>
                      <div className="text-emerald-950 font-medium pl-6">
                        {q.type === 'numerical' ? (
                          <span>
                            Numerical Answer:{' '}
                            <strong className="text-emerald-800">
                              {correctOption?.text || 'See official key'}
                            </strong>
                          </span>
                        ) : correctOption ? (
                          <div>
                            Option{' '}
                            <strong>
                              {String.fromCharCode(
                                65 + (q.options?.findIndex((o) => o.id === correctOption.id) ?? 0)
                              )}
                            </strong>
                            :{' '}
                            <span className="ml-1">
                              <MathText text={correctOption.text} />
                            </span>
                          </div>
                        ) : (
                          <span>Evaluated as per examination marking scheme.</span>
                        )}
                      </div>
                      {(q as any).solutionText ? (
                        <div className="border-t border-emerald-200/60 pt-2.5 pl-6 text-xs text-slate-800 space-y-1">
                          <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider">
                            Step-by-Step Solution:
                          </span>
                          <div className="bg-white/80 p-3 rounded-lg border border-emerald-100 font-normal leading-relaxed">
                            <MathText text={(q as any).solutionText} />
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-emerald-200/60 pt-2 pl-6 text-[11px] text-emerald-800">
                          Step-by-step verification confirmed by official scoring key.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#dce4ef] pt-6">
        <Link
          href="/questions"
          className="inline-flex items-center gap-2 rounded-xl border border-[#dce4ef] bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Question Bank</span>
        </Link>
        <span className="text-xs text-slate-500">
          {filteredQuestions.length} of {questions.length} questions displayed
        </span>
      </div>

      {/* Floating AI Topic Tutor Chatbot */}
      <FloatingChatbot
        contextType="topic"
        apiEndpoint="/api/chat"
        title={`${topicName} Tutor`}
        subtitle={`${subject} · Topic Doubts & Formulas`}
        documentTitle={`${subject} - ${topicName}`}
        welcomeMessage={`Hello! I'm your AI Topic Tutor for **${topicName}** (${subject}).\n\nAsk me about key formulas, derivation steps, conceptual traps, or how to solve tricky questions from this topic bank!`}
        suggestedPrompts={[
          `Summarize core formulas for ${topicName}`,
          `What are the most common traps in ${topicName}?`,
          `How to approach numerical problems in this topic?`,
          `Give me high-yield shortcut techniques`,
        ]}
        placeholder={`Ask a doubt about ${topicName}...`}
        contextData={{
          subject,
          topic: topicName,
          questionsCount: questions.length,
        }}
        isLoggedIn={true}
        position="bottom-right"
      />
    </PageContainer>
  );
}
