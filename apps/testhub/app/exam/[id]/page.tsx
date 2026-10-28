'use client';

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useExamTelemetry } from '@repo/telemetry/hooks';
import { MathText } from '@repo/ui/math-text';
import { DiagramCanvas } from '../../../components/diagram-canvas';
import { QuestionInputRenderer } from '../../../components/question-inputs';
import { TestHubLoader } from '../../../components/testhub-loader';
import type { ProcessedPaper, ProcessedQuestion, QuestionType } from '../../../lib/paper-service';
import { getCachedPaper, fetchFullPaper, setCachedPaper, clearCachedPaper } from '../../../lib/paper-cache';
import { saveExamSession, getExamSession } from '../../../lib/exam-session';
import {
  Bookmark,
  Info,
  ArrowDown,
  User,
  ShieldAlert,
  AlertTriangle,
  ZoomIn,
  Accessibility as AccessibilityIcon,
  Maximize2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export type QuestionStatus =
  | 'not_visited'
  | 'not_answered'
  | 'answered'
  | 'marked_for_review'
  | 'answered_marked_for_review';

interface SubjectTab {
  id: string;
  name: string;
  startIndex: number;
  indices: number[];
  maxMarks: number;
  questionCount: number;
}

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const {
    trackQuestionViewed,
    trackAnswerSelected,
    trackAnswerChanged,
    trackAnswerCleared,
    trackQuestionNavigated,
    trackMarkedForReview,
    trackAttemptSubmitted,
  } = useExamTelemetry();

  // Paper & Questions State
  const [paper, setPaper] = useState<ProcessedPaper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [review, setReview] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // Timer State: starts from paper duration or 180 minutes
  const [seconds, setSeconds] = useState(180 * 60);

  // Restore existing session on mount if user was already taking this exam
  useEffect(() => {
    const existing = getExamSession(id);
    if (existing) {
      if (existing.answers && Object.keys(existing.answers).length > 0) {
        setAnswers(existing.answers);
      }
      if (existing.review && existing.review.length > 0) {
        setReview(new Set(existing.review));
      }
      if (existing.visited && existing.visited.length > 0) {
        setVisited(new Set(existing.visited));
      }
      if (existing.durationSeconds && existing.timeSpentSeconds) {
        const remaining = Math.max(0, existing.durationSeconds - existing.timeSpentSeconds);
        setSeconds(remaining);
      }
    }
  }, [id]);

  // Accessibility & Magnifier State
  const [zoomScale, setZoomScale] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Proctoring & Safety Handler State
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationsCount, setViolationsCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [activeTooltipSubjId, setActiveTooltipSubjId] = useState<string | null>(null);
  const lastViolationTimeRef = useRef<number>(0);
  const isSubmittingRef = useRef<boolean>(false);

  const questionContentRef = useRef<HTMLDivElement>(null);

  // Load Paper from Database API (with auto-extraction fallback if not yet populated)
  useEffect(() => {
    let isCancelled = false;

    async function loadPaperData() {
      const shouldForce = searchParams?.get('refresh') === 'true' || searchParams?.get('force') === 'true';
      if (shouldForce) {
        clearCachedPaper(id);
      }

      // 1. Instant check: read from cached client state
      const cached = shouldForce ? null : getCachedPaper(id);
      if (cached && cached.questions?.length > 0) {
        setPaper(cached);
        if (cached.durationMin) {
          setSeconds(cached.durationMin * 60);
        }
        setIsLoading(false);
        return;
      }

      // 2. Fetch full paper and cache it
      setIsLoading(true);
      setLoadError(null);
      try {
        const fullRes = await fetchFullPaper(id);
        if (isCancelled) return;

        if (fullRes.status === 'READY' && fullRes.paper && fullRes.paper.questions?.length > 0) {
          setPaper(fullRes.paper);
          setCachedPaper(id, fullRes.paper);
          if (fullRes.paper.durationMin) {
            setSeconds(fullRes.paper.durationMin * 60);
          }
          setIsLoading(false);
          return;
        }

        // If paper not yet populated in database, trigger auto-extraction via POST
        if (fullRes.status === 'NOT_FOUND') {
          console.log('[ExamPage] Paper not found in DB. Triggering AI extraction pipeline...');
          const postRes = await fetch(`/api/exam/paper/${encodeURIComponent(id)}`, {
            method: 'POST',
          });
          const postData = await postRes.json();
          if (isCancelled) return;

          if (postData.status === 'READY' && postData.paper && postData.paper.questions?.length > 0) {
            setPaper(postData.paper);
            setCachedPaper(id, postData.paper);
            if (postData.paper.durationMin) {
              setSeconds(postData.paper.durationMin * 60);
            }
            setIsLoading(false);
            return;
          } else {
            setLoadError(postData.message || 'Paper could not be generated from database.');
            setIsLoading(false);
            return;
          }
        }

        setLoadError(fullRes.message || 'Unable to retrieve paper from database.');
        setIsLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[ExamPage] Error loading paper:', err);
          setLoadError(err.message || 'Failed to connect to exam paper service.');
          setIsLoading(false);
        }
      }
    }

    loadPaperData();
    return () => {
      isCancelled = true;
    };
  }, [id]);

  const questions: ProcessedQuestion[] = useMemo(() => {
    return paper?.questions || [];
  }, [paper]);

  // Derive Dynamic Subject Tabs with exact question counts for each subject
  const subjectTabs: SubjectTab[] = useMemo(() => {
    if (!questions.length) return [];

    const subjectMap = new Map<string, number[]>();
    questions.forEach((q, idx) => {
      const subj = q.subject || paper?.subject || 'Practice';
      const list = subjectMap.get(subj) || [];
      list.push(idx);
      subjectMap.set(subj, list);
    });

    const tabs: SubjectTab[] = [];
    subjectMap.forEach((indices, subjName) => {
      tabs.push({
        id: subjName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        name: subjName,
        startIndex: indices[0],
        indices,
        maxMarks: indices.reduce((sum, idx) => sum + (questions[idx]?.marks || 4), 0),
        questionCount: indices.length,
      });
    });

    return tabs;
  }, [questions, paper]);

  // Determine current active subject tab
  const currentSubjectTab = useMemo(() => {
    const found = subjectTabs.find((s) => s.indices.includes(currentIndex));
    return (
      found ||
      subjectTabs[0] || {
        id: 'default',
        name: paper?.subject || 'Practice',
        startIndex: 0,
        indices: questions.map((_, i) => i),
        maxMarks: questions.length * 4,
        questionCount: questions.length,
      }
    );
  }, [currentIndex, subjectTabs, paper, questions]);

  const currentQuestion = questions[currentIndex] || questions[0];

  // Record question view telemetry & visited state
  useEffect(() => {
    if (currentQuestion?.id) {
      trackQuestionViewed(currentQuestion.id);
      setVisited((prev) => {
        if (prev.has(currentQuestion.id)) return prev;
        const next = new Set(prev);
        next.add(currentQuestion.id);
        return next;
      });
    }
  }, [currentIndex, currentQuestion?.id, trackQuestionViewed]);

  // Timer countdown
  useEffect(() => {
    if (!isTestStarted || autoSubmitted) return;
    const interval = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          handleFinalSubmit('time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTestStarted, autoSubmitted]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ==========================================
  // SAFETY HANDLER: FULLSCREEN & PROCTORING
  // ==========================================
  const triggerViolation = useCallback(
    (reason: string) => {
      if (!isTestStarted || autoSubmitted || isSubmittingRef.current) return;

      const now = Date.now();
      // Debounce violations within 2.5s (e.g. blur + visibilitychange firing together)
      if (now - lastViolationTimeRef.current < 2500) return;
      lastViolationTimeRef.current = now;

      setViolationsCount((prev) => {
        const nextCount = prev + 1;
        if (nextCount < 3) {
          // Warning 1 and 2: Show warning modal
          setShowWarningModal(true);
        } else if (nextCount >= 3) {
          // Violation 3: Auto Submit!
          setShowWarningModal(false);
          setAutoSubmitted(true);
          isSubmittingRef.current = true;
          handleFinalSubmit('proctoring_violation');
        }
        return nextCount;
      });
    },
    [isTestStarted, autoSubmitted]
  );

  // Fullscreen change listener
  useEffect(() => {
    function handleFullscreenChange() {
      const isNowFull = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setIsFullscreen(isNowFull);

      if (isTestStarted && !isNowFull && !autoSubmitted && !isSubmittingRef.current) {
        triggerViolation('exited_fullscreen');
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isTestStarted, autoSubmitted, triggerViolation]);

  // Tab switch & visibility change listener
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden || document.visibilityState === 'hidden') {
        if (isTestStarted && !autoSubmitted && !isSubmittingRef.current) {
          triggerViolation('tab_switch');
        }
      }
    }

    function handleWindowBlur() {
      if (isTestStarted && !autoSubmitted && !isSubmittingRef.current) {
        triggerViolation('window_blur');
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isTestStarted, autoSubmitted, triggerViolation]);

  // Prevent keyboard shortcuts (F11, Escape, Alt+Tab, etc.) & Context Menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isTestStarted) return;

      // Prevent F11 or Esc attempt
      if (e.key === 'F11') {
        e.preventDefault();
        triggerViolation('f11_pressed');
      }
      if (e.key === 'Escape' && isFullscreen) {
        // Escape is handled by fullscreenchange, but we can detect intent
      }
      if (e.altKey && e.key === 'Tab') {
        triggerViolation('alt_tab_attempt');
      }
    }

    function handleContextMenu(e: MouseEvent) {
      if (isTestStarted) {
        e.preventDefault();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isTestStarted, isFullscreen, triggerViolation]);

  const requestFullscreenMode = async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setIsTestStarted(true);
      setShowWarningModal(false);
    } catch (err) {
      console.warn('[SafetyHandler] Fullscreen request rejected or unavailable:', err);
      // Still start test in fallback mode
      setIsTestStarted(true);
      setShowWarningModal(false);
    }
  };

  // Helper: check if a value is answered
  const isAnsweredValue = (val: any): boolean => {
    if (val === undefined || val === null) return false;
    if (typeof val === 'number') return true;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'string') return val.trim().length > 0;
    return false;
  };

  // Determine individual question status
  const getQuestionStatus = useCallback(
    (qId: string): QuestionStatus => {
      const hasAnswer = isAnsweredValue(answers[qId]);
      const isReview = review.has(qId);
      const isVis = visited.has(qId);

      if (hasAnswer && isReview) return 'answered_marked_for_review';
      if (isReview) return 'marked_for_review';
      if (hasAnswer) return 'answered';
      if (isVis) return 'not_answered';
      return 'not_visited';
    },
    [answers, review, visited]
  );

  // Status Summary Counts
  const statusCounts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let notVisited = 0;
    let markedForReview = 0;
    let answeredMarkedForReview = 0;

    questions.forEach((q) => {
      const status = getQuestionStatus(q.id || '');
      switch (status) {
        case 'answered':
          answered++;
          break;
        case 'not_answered':
          notAnswered++;
          break;
        case 'not_visited':
          notVisited++;
          break;
        case 'marked_for_review':
          markedForReview++;
          break;
        case 'answered_marked_for_review':
          answeredMarkedForReview++;
          break;
      }
    });

    return {
      answered,
      notAnswered,
      notVisited,
      markedForReview,
      answeredMarkedForReview,
    };
  }, [questions, getQuestionStatus]);

  // Actions
  const handleAnswerChange = (val: any) => {
    if (!currentQuestion) return;
    const previous = answers[currentQuestion.id];
    if (previous === undefined) {
      trackAnswerSelected(currentQuestion.id, JSON.stringify(val));
    } else if (JSON.stringify(previous) !== JSON.stringify(val)) {
      trackAnswerChanged(currentQuestion.id, JSON.stringify(previous), JSON.stringify(val));
    }
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
  };

  const clearCurrentResponse = () => {
    if (!currentQuestion) return;
    trackAnswerCleared(currentQuestion.id);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
  };

  const toggleBookmark = () => {
    if (!currentQuestion) return;
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  const handleSaveAndNext = () => {
    if (!currentQuestion) return;
    // If next question exists, navigate to it
    if (currentIndex < questions.length - 1) {
      navigateToQuestion(currentIndex + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion) return;
    setReview((prev) => {
      const next = new Set(prev);
      next.add(currentQuestion.id);
      return next;
    });
    trackMarkedForReview(currentQuestion.id);

    if (currentIndex < questions.length - 1) {
      navigateToQuestion(currentIndex + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const navigateToQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= questions.length || targetIndex === currentIndex) return;
    trackQuestionNavigated(currentQuestion.id, questions[targetIndex].id);
    setCurrentIndex(targetIndex);
    // Mark target as visited
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(questions[targetIndex].id);
      return next;
    });
  };

  const scrollToBottom = () => {
    if (questionContentRef.current) {
      questionContentRef.current.scrollTo({
        top: questionContentRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleFinalSubmit = (reason?: string) => {
    trackAttemptSubmitted(id);
    const totalSecs = (paper?.durationMin || 180) * 60;
    const timeSpent = Math.max(0, totalSecs - seconds);
    saveExamSession(id, {
      paperId: id,
      paperTitle: paper?.title || 'Practice Paper',
      startedAt: Date.now() - timeSpent * 1000,
      submittedAt: Date.now(),
      durationSeconds: totalSecs,
      timeSpentSeconds: timeSpent,
      answers,
      review: Array.from(review),
      visited: Array.from(visited),
      autoSubmitted: Boolean(reason && reason !== 'user_submitted'),
      autoSubmitReason: reason,
      violationsCount,
    });
    const param = reason ? `?autoSubmitted=true&reason=${reason}` : '';
    router.push(`/exam/${id}/submit-confirmation${param}`);
  };

  // Candidate display name & roll number mapped from session
  const candidateName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Candidate';
  const candidateRoll = (session?.user as any)?.id ? `250310${String((session?.user as any).id).padStart(4, '0')}` : '2503100842';

  // Subject questions list for palette
  const currentSubjectQuestions = useMemo(() => {
    return currentSubjectTab.indices.map((idx) => ({
      question: questions[idx],
      globalIndex: idx,
    }));
  }, [questions, currentSubjectTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f6f9] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <TestHubLoader size={38} text="Retrieving paper questions and diagrams from the database..." />
          <div>
            <h2 className="text-lg font-extrabold text-[#1f2229]">Loading Examination Paper</h2>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200 text-left">
            <p className="font-semibold text-slate-800">Exam Session ID:</p>
            <p className="font-mono text-[11px] truncate">{id}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !questions.length) {
    return (
      <div className="min-h-screen bg-[#f3f6f9] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="mx-auto size-16 rounded-full bg-red-50 border border-red-200 grid place-items-center text-red-600">
            <AlertTriangle className="size-8" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#1f2229]">Unable to Load Paper</h2>
            <p className="mt-1 text-xs text-slate-600">
              {loadError || 'No questions found for this examination paper.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#1b6db7] text-white text-xs font-bold hover:bg-blue-700 transition"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/papers')}
              className="px-5 py-2.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition"
            >
              Back to Papers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#f3f6f9] text-[#212529] font-sans select-none ${
        highContrast ? 'contrast-125 brightness-95' : ''
      }`}
      style={{
        zoom: `${zoomScale}%`,
      }}
    >
      {/* =========================================================================
          TOP LEVEL 1: CBT STATUS BANNER
          ========================================================================= */}
      <header className="bg-[#1f2229] text-white px-4 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-black">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-xs sm:text-sm font-bold tracking-wider text-[#ffeb3b] uppercase">
              {paper?.examType
                ? `${paper.examType.toUpperCase()} CBT MOCK TEST UPDATED AS PER LATEST PATTERN`
                : 'CBT MOCK TEST UPDATED AS PER LATEST PATTERN'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          {/* Security Status Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${
              isFullscreen
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'bg-amber-950 text-amber-300 border border-amber-700'
            }`}
          >
            <ShieldAlert className="size-3.5" />
            <span>{isFullscreen ? 'PROCTORING ACTIVE' : 'FULLSCREEN OFF'}</span>
            {violationsCount > 0 && (
              <span className="ml-1 bg-red-600 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                Violation: {violationsCount}/3
              </span>
            )}
          </div>

          {/* Accessibility Button */}
          <button
            onClick={() => setHighContrast((prev) => !prev)}
            className="flex items-center gap-1.5 hover:text-[#ffeb3b] transition"
            title="Toggle High Contrast Mode"
          >
            <span className="grid size-5 place-items-center rounded-full bg-[#4caf50] text-white">
              <AccessibilityIcon className="size-3.5" />
            </span>
            <span>Accessibility</span>
          </button>

          {/* Screen Magnifier Button */}
          <button
            onClick={() => setZoomScale((prev) => (prev === 100 ? 115 : prev === 115 ? 130 : 100))}
            className="flex items-center gap-1.5 hover:text-[#ffeb3b] transition"
            title="Toggle Screen Magnifier"
          >
            <span className="grid size-5 place-items-center rounded-full bg-[#fbc02d] text-black">
              <ZoomIn className="size-3.5" />
            </span>
            <span>Screen Magnifier ({zoomScale}%)</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          TOP LEVEL 2: EXAM BADGE & SECTION TABS & TIMER
          ========================================================================= */}
      <div className="relative z-30 bg-white border-b border-[#d8e0ea] px-4 py-2 sm:px-6">
        {/* Exam Title Pill */}
        <div className="mb-2">
          <span className="inline-block bg-[#1b6db7] text-white font-bold text-xs sm:text-sm px-4 py-1 rounded shadow-xs">
            {paper?.title || 'Practice Examination'}
          </span>
        </div>

        {/* Subject Tabs Row with Tooltip on Info Icon */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-visible pb-1 max-w-full">
            <span className="text-xs font-bold text-[#555] uppercase tracking-wide mr-1 shrink-0">
              Subjects
            </span>
            {subjectTabs.map((subj) => {
              const isActive = currentSubjectTab.id === subj.id;

              // Compute real-time status for this subject
              let subjAnswered = 0;
              let subjNotAnswered = 0;
              let subjMarkedReview = 0;
              let subjAnsweredReview = 0;
              let subjNotVisited = 0;

              for (const idx of subj.indices) {
                const q = questions[idx];
                if (!q) continue;
                const isAns =
                  answers[q.id] !== undefined &&
                  answers[q.id] !== '' &&
                  (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true);
                const isRev = review.has(q.id);
                const isVis = visited.has(q.id);

                if (isAns && isRev) subjAnsweredReview++;
                else if (isAns) subjAnswered++;
                else if (isRev) subjMarkedReview++;
                else if (isVis) subjNotAnswered++;
                else subjNotVisited++;
              }

              return (
                <div key={subj.id} className="relative z-40 inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => navigateToQuestion(subj.startIndex)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition shrink-0 ${
                      isActive
                        ? 'bg-[#1b6db7] text-white shadow-sm ring-1 ring-blue-700'
                        : 'bg-white border border-[#b8c9dc] text-[#1b6db7] hover:bg-blue-50'
                    }`}
                  >
                    <span>{subj.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-blue-100 text-[#1b6db7]'
                      }`}
                    >
                      {subj.questionCount}
                    </span>

                    {/* Interactive Info Tooltip */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltipSubjId((prev) => (prev === subj.id ? null : subj.id));
                      }}
                      onMouseEnter={() => setActiveTooltipSubjId(subj.id)}
                      onMouseLeave={() => setActiveTooltipSubjId(null)}
                      className="group/info relative z-50 inline-flex items-center ml-0.5 cursor-pointer rounded p-0.5 hover:bg-black/10"
                    >
                      <Info className="size-3.5 shrink-0 opacity-80 hover:opacity-100 hover:scale-110 transition" />
                      {/* Tooltip Card */}
                      <div
                        className={`absolute left-0 sm:left-1/2 top-full z-[1000] mt-2 -translate-x-4 sm:-translate-x-1/2 w-52 rounded-xl border border-slate-700 bg-[#1f2229] p-3 text-white shadow-2xl transition-all duration-150 ${
                          activeTooltipSubjId === subj.id
                            ? 'opacity-100 pointer-events-auto visible'
                            : 'opacity-0 pointer-events-none invisible'
                        }`}
                      >
                        <p className="border-b border-slate-700 pb-1.5 text-xs font-bold text-[#ffeb3b]">
                          {subj.name} Status
                        </p>
                        <div className="mt-2 space-y-1.5 text-[11px] font-medium text-left">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-[#449d44]" />
                              <span>Answered:</span>
                            </span>
                            <span className="font-bold text-[#449d44]">{subjAnswered}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-[#d9534f]" />
                              <span>Not Answered:</span>
                            </span>
                            <span className="font-bold text-[#d9534f]">{subjNotAnswered}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-[#7b5294]" />
                              <span>Review:</span>
                            </span>
                            <span className="font-bold text-[#c084fc]">
                              {subjMarkedReview + subjAnsweredReview}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-slate-400" />
                              <span>Not Visited:</span>
                            </span>
                            <span className="font-bold text-slate-300">{subjNotVisited}</span>
                          </div>
                          <div className="border-t border-slate-700 pt-1 text-[10px] text-slate-400">
                            Total: {subj.questionCount} Qs · {subj.maxMarks} Marks
                          </div>
                        </div>
                      </div>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-[#444]">Time Left :</span>
            <span className="font-mono text-base font-extrabold text-[#d32f2f] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              {formatTimer(seconds)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN CBT WORKSPACE: QUESTION AREA + RIGHT PALETTE
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] items-start border-b border-[#d8e0ea]">
        {/* LEFT PANE: QUESTION & CONTROLS */}
        <div className="flex flex-col min-h-[calc(100vh-175px)] bg-white border-r border-[#d8e0ea]">
          {/* Question Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5ebf2] px-4 py-2 sm:px-6 bg-[#fbfcfd] text-xs font-bold">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 rounded bg-[#1b6db7]/10 px-2.5 py-0.5 text-xs font-extrabold text-[#1b6db7]">
                <span className="font-medium text-slate-500">Subject:</span>
                {currentQuestion.subject || currentSubjectTab.name}
              </span>
              <span className="text-[#333]">
                Type:{' '}
                <span className="font-semibold text-slate-700">
                  {currentQuestion.type === 'numerical'
                    ? 'Numerical Value'
                    : currentQuestion.type === 'text_subjective'
                    ? 'Descriptive / Subjective'
                    : currentQuestion.type === 'mcq_multiple'
                    ? 'Multiple Correct MCQ'
                    : 'Multiple Choice'}
                </span>
              </span>
              {currentQuestion.topic && (
                <span className="hidden md:inline-flex text-[#555]">
                  Topic: <span className="font-semibold text-slate-700">{currentQuestion.topic}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#333]">Marks for correct answer:</span>
              <span className="text-[#2e7d32] font-extrabold">+{currentQuestion.marks}</span>
              <span className="text-slate-400">|</span>
              <span className="text-[#333]">Negative Marks:</span>
              <span className="text-[#c62828] font-extrabold">
                {currentQuestion.negativeMarks ? `-${currentQuestion.negativeMarks}` : '0'}
              </span>
            </div>
          </div>

          {/* Question Title & Bookmark Bar */}
          <div className="flex items-center justify-between border-b border-[#e5ebf2] px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-extrabold text-[#111]">
                Question No. {currentIndex + 1}
              </h2>
              <button
                onClick={toggleBookmark}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border transition ${
                  bookmarked.has(currentQuestion.id)
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-[#cfd8dc] bg-white text-[#555] hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`size-3.5 ${bookmarked.has(currentQuestion.id) ? 'fill-amber-500' : ''}`} />
                <span>Bookmark</span>
              </button>
            </div>

            <button
              onClick={scrollToBottom}
              className="grid size-8 place-items-center rounded-full bg-[#1b6db7] text-white hover:bg-blue-700 transition shadow-sm"
              title="Scroll to Options"
            >
              <ArrowDown className="size-4" />
            </button>
          </div>

          {/* Question Text, Chemical Diagrams & Options Body */}
          <div
            ref={questionContentRef}
            className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 max-h-[calc(100vh-270px)] space-y-4"
          >
            {/* Question Text */}
            <MathText
              text={currentQuestion.text}
              className="text-base font-normal leading-relaxed text-[#1a1a1a]"
            />

            {/* Chemical Structure / Diagrams */}
            {(currentQuestion.diagramSvg || currentQuestion.imageUrl) && (
              <div className="my-3 overflow-hidden rounded border border-slate-200 bg-white p-3">
                <DiagramCanvas
                  diagramSvg={currentQuestion.diagramSvg}
                  imageUrl={currentQuestion.imageUrl}
                  title={`Question ${currentIndex + 1} Diagram`}
                />
              </div>
            )}

            {/* Input Options / Keypad */}
            <div className="pt-2">
              <QuestionInputRenderer
                questionId={currentQuestion.id}
                type={currentQuestion.type || 'mcq_single'}
                options={currentQuestion.options}
                answer={answers[currentQuestion.id]}
                onChange={handleAnswerChange}
              />
            </div>
          </div>

          {/* Bottom Action Footer Bar */}
          <div className="border-t border-[#d8e0ea] bg-[#f8fafc] px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkForReviewAndNext}
                className="px-4 py-2 rounded bg-white border border-[#cfd8dc] text-[#333] hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-xs transition"
              >
                Mark for Review & Next
              </button>
              <button
                onClick={clearCurrentResponse}
                disabled={!isAnsweredValue(answers[currentQuestion.id])}
                className="px-4 py-2 rounded bg-white border border-[#cfd8dc] text-[#333] hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-40"
              >
                Clear Response
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAndNext}
                className="px-6 py-2 rounded bg-[#2b78c5] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition"
              >
                Save & Next
              </button>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-6 py-2 rounded bg-[#2b78c5] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT SIDEBAR: CANDIDATE INFO + CBT STATUS LEGEND + QUESTION PALETTE
            ========================================================================= */}
        <aside className="bg-white p-4 border-l border-[#d8e0ea] flex flex-col gap-4 text-xs">
          {/* User Profile Card */}
          <div className="flex items-center gap-3 pb-3 border-b border-[#e2e8f0]">
            <div className="size-14 rounded bg-slate-200 border border-slate-300 grid place-items-center overflow-hidden shrink-0">
              {session?.user?.image ? (
                <img src={session.user.image} alt={candidateName} className="size-full object-cover" />
              ) : (
                <User className="size-9 text-slate-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#111]">{candidateName}</p>
              <p className="text-[11px] text-slate-500">Roll No: {candidateRoll}</p>
            </div>
          </div>

          {/* CBT Status Legend Counters */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 pb-3 border-b border-[#e2e8f0]">
            {/* 1. Answered */}
            <div className="flex items-center gap-2">
              <span
                className="grid size-6 place-items-center text-white text-[11px] font-bold shrink-0"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)',
                  backgroundColor: '#449d44',
                }}
              >
                {statusCounts.answered}
              </span>
              <span className="text-[11px] text-[#444] font-medium leading-tight">Answered</span>
            </div>

            {/* 2. Not Answered */}
            <div className="flex items-center gap-2">
              <span
                className="grid size-6 place-items-center text-white text-[11px] font-bold shrink-0"
                style={{
                  clipPath: 'polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)',
                  backgroundColor: '#d9534f',
                }}
              >
                {statusCounts.notAnswered}
              </span>
              <span className="text-[11px] text-[#444] font-medium leading-tight">Not Answered</span>
            </div>

            {/* 3. Not Visited */}
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded bg-[#e0e0e0] border border-slate-300 text-[#333] text-[11px] font-bold shrink-0">
                {statusCounts.notVisited}
              </span>
              <span className="text-[11px] text-[#444] font-medium leading-tight">Not Visited</span>
            </div>

            {/* 4. Marked for Review */}
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-[#7b5294] text-white text-[11px] font-bold shrink-0">
                {statusCounts.markedForReview}
              </span>
              <span className="text-[11px] text-[#444] font-medium leading-tight">Marked for Review</span>
            </div>

            {/* 5. Answered & Marked for Review */}
            <div className="col-span-2 flex items-center gap-2">
              <span className="relative grid size-6 place-items-center rounded-full bg-[#7b5294] text-white text-[11px] font-bold shrink-0">
                {statusCounts.answeredMarkedForReview}
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#449d44] border-2 border-white" />
              </span>
              <span className="text-[11px] text-[#444] font-medium leading-tight">
                Answered & Marked for Review (will be evaluated)
              </span>
            </div>
          </div>

          {/* Subject Heading Banner */}
          <div className="bg-[#337ab7] text-white font-bold px-3 py-1.5 rounded-xs text-xs tracking-wide flex items-center justify-between">
            <span>{currentSubjectTab.name}</span>
            <span className="text-[11px] font-medium opacity-90">
              {currentSubjectTab.questionCount} Questions
            </span>
          </div>

          {/* Palette Label */}
          <div>
            <p className="font-bold text-[#333] text-xs">Choose a Question</p>
          </div>

          {/* Question Grid Buttons (4 Columns) */}
          <div className="grid grid-cols-4 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {currentSubjectQuestions.map(({ question: q, globalIndex }) => {
              const isSelected = globalIndex === currentIndex;
              const status = getQuestionStatus(q.id);

              return (
                <button
                  key={q.id || globalIndex}
                  onClick={() => navigateToQuestion(globalIndex)}
                  className={`relative grid size-10 place-items-center text-xs font-bold transition-transform hover:scale-105 ${
                    isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                  }`}
                  style={getNtaButtonShapeStyle(status)}
                >
                  <span>{globalIndex + 1}</span>
                  {status === 'answered_marked_for_review' && (
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#449d44] border-1.5 border-white" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* =========================================================================
          MODAL 1: FULLSCREEN ENTRY GATE (REQUIRED BEFORE STARTING TEST)
          ========================================================================= */}
      {!isTestStarted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-[#1f2229] p-5 text-white flex items-center gap-3 border-b border-black">
              <ShieldAlert className="size-7 text-[#ffeb3b]" />
              <div>
                <h3 className="font-bold text-base text-[#ffeb3b]">TestHub CBT Examination System</h3>
                <p className="text-xs text-slate-300">Mandatory Fullscreen Security Protocol</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm text-[#2d3748]">
              <p className="font-semibold text-slate-900">
                To guarantee full test integrity and simulate an authentic examination hall environment:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                <li>This test <strong>must be taken in Full Screen mode</strong>.</li>
                <li>Switching browser tabs or applications (Alt+Tab) is strictly forbidden.</li>
                <li><strong>Security Warnings:</strong> You will receive a warning up to 3 times for tab/screen switches.</li>
                <li><strong>3rd Violation:</strong> Your test will be <strong>AUTOMATICALLY TERMINATED & SUBMITTED</strong> immediately.</li>
              </ul>

              <div className="pt-3">
                <button
                  onClick={requestFullscreenMode}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1b6db7] px-5 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition"
                >
                  <Maximize2 className="size-4" />
                  <span>Enter Fullscreen & Begin Test</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: PROCTORING ALERT (VIOLATIONS 1 & 2: WARNING)
          ========================================================================= */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-950/80 backdrop-blur-md p-4">
          <div className="max-w-lg w-full bg-white rounded-xl shadow-2xl overflow-hidden border-2 border-red-600 animate-in fade-in zoom-in-95">
            <div className="bg-red-600 text-white p-4 flex items-center gap-3">
              <AlertTriangle className="size-8 text-white animate-bounce shrink-0" />
              <div>
                <h3 className="font-black text-base uppercase tracking-wide">
                  ⚠️ Security Violation Warning (Warning {violationsCount} of 3)
                </h3>
                <p className="text-xs text-red-100">Screen Change / Fullscreen Exit Detected!</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm text-[#1a202c]">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-900 text-xs sm:text-sm space-y-2">
                <p className="font-bold">
                  You attempted to switch tabs, change windows, or exit full screen mode.
                </p>
                <p>
                  This practice exam requires undivided screen focus under proctoring rules.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-semibold">
                🚨 <strong>CRITICAL WARNING:</strong> You have {Math.max(0, 3 - violationsCount)} warning(s) remaining. On the 3rd violation, your test will be <strong>AUTOMATICALLY SUBMITTED</strong> immediately with your current answers!
              </div>

              <button
                onClick={requestFullscreenMode}
                className="w-full rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-red-700 transition"
              >
                Return to Fullscreen & Resume Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: AUTO-SUBMITTED NOTIFICATION (VIOLATION 3: AUTO SUBMIT)
          ========================================================================= */}
      {autoSubmitted && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-red-700 text-center p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-red-600">
              <XCircle className="size-10" />
            </div>

            <h3 className="text-xl font-extrabold text-red-700">Test Auto-Submitted!</h3>
            <p className="text-sm text-slate-700">
              Multiple screen changes or fullscreen exit attempts were detected.
              In accordance with security rules, your session has been terminated and auto-submitted.
            </p>

            <div className="p-3 bg-slate-100 rounded text-xs text-slate-600 font-mono">
              Redirecting to submission results...
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: REGULAR SUBMIT CONFIRMATION SUMMARY
          ========================================================================= */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-[#1b6db7] text-white p-4">
              <h3 className="font-bold text-base">Submit Examination Summary</h3>
              <p className="text-xs text-blue-100">Please review your responses before final submission.</p>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <table className="w-full text-left border-collapse border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-medium text-slate-600">Answered Questions</td>
                    <td className="p-2.5 font-bold text-[#449d44] text-right">{statusCounts.answered}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-medium text-slate-600">Not Answered</td>
                    <td className="p-2.5 font-bold text-[#d9534f] text-right">{statusCounts.notAnswered}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-medium text-slate-600">Marked for Review</td>
                    <td className="p-2.5 font-bold text-[#7b5294] text-right">{statusCounts.markedForReview}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-medium text-slate-600">Answered & Marked for Review</td>
                    <td className="p-2.5 font-bold text-[#7b5294] text-right">{statusCounts.answeredMarkedForReview}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-600">Not Visited</td>
                    <td className="p-2.5 font-bold text-slate-500 text-right">{statusCounts.notVisited}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                >
                  Resume Exam
                </button>
                <button
                  onClick={() => handleFinalSubmit('user_submitted')}
                  className="px-5 py-2 rounded bg-[#449d44] hover:bg-green-700 text-white font-bold text-xs"
                >
                  Yes, Submit Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Returns authentic CBT button polygon shapes and colors
 */
function getNtaButtonShapeStyle(status: QuestionStatus): React.CSSProperties {
  switch (status) {
    case 'answered':
      return {
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)',
        backgroundColor: '#449d44',
        color: '#ffffff',
      };
    case 'not_answered':
      return {
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)',
        backgroundColor: '#d9534f',
        color: '#ffffff',
      };
    case 'marked_for_review':
      return {
        borderRadius: '9999px',
        backgroundColor: '#7b5294',
        color: '#ffffff',
      };
    case 'answered_marked_for_review':
      return {
        borderRadius: '9999px',
        backgroundColor: '#7b5294',
        color: '#ffffff',
      };
    case 'not_visited':
    default:
      return {
        borderRadius: '4px',
        backgroundColor: '#e0e0e0',
        border: '1px solid #cbd5e1',
        color: '#333333',
      };
  }
}
