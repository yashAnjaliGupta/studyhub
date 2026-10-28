"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PaperProcessing } from "../../../../components/paper-processing";
import type { ProcessedPaper } from "../../../../lib/paper-service";
import {
  getCachedPaper,
  checkPaperMetadata,
  fetchFullPaper,
  preloadPaper,
  setCachedPaper,
} from "../../../../lib/paper-cache";

type ExamMode = "timed" | "practice";

export default function TestHubConfigurePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examParam = searchParams.get("exam") || undefined;
  const { data: session } = useSession();

  const [loadedPaper, setLoadedPaper] = useState<ProcessedPaper | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const [examMode, setExamMode] = useState<ExamMode>("timed");
  const [duration, setDuration] = useState("180");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  const handlePaperReady = useCallback((paper: ProcessedPaper) => {
    setLoadedPaper(paper);
    setCachedPaper(id, paper);
    if (paper.durationMin) {
      setDuration(String(paper.durationMin));
    }
  }, [id]);

  // Fast first check: use cached state first, or lightweight metadata check
  useEffect(() => {
    let isCancelled = false;

    async function checkPaper() {
      // 1. Check local memory / session storage cache
      const cached = getCachedPaper(id);
      if (cached && cached.questions?.length > 0) {
        if (!isCancelled) {
          setLoadedPaper(cached);
          if (cached.durationMin) {
            setDuration(String(cached.durationMin));
          }
          setIsChecking(false);
        }
        return;
      }

      // 2. Fast metadata-only check: avoids transferring massive question payload on first check
      try {
        const metaRes = await checkPaperMetadata(id, examParam);
        if (!isCancelled) {
          if (metaRes.status === "READY" && metaRes.metadata) {
            // Pre-fill configure form immediately with metadata
            if (metaRes.metadata.durationMin) {
              setDuration(String(metaRes.metadata.durationMin));
            }
            // Fetch full paper in the background so it's ready in state
            fetchFullPaper(id, examParam).then((fullRes) => {
              if (!isCancelled && fullRes.paper) {
                setLoadedPaper(fullRes.paper);
              }
            });
            setIsChecking(false);
            return;
          }
          setIsChecking(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("[ConfigurePage] Error checking paper metadata:", err);
          setIsChecking(false);
        }
      }
    }

    checkPaper();
    return () => {
      isCancelled = true;
    };
  }, [id, examParam]);

  const continueToInstructions = () => {
    const config = {
      paper: id,
      examMode,
      durationMinutes: examMode === "practice" ? null : Number(duration),
      shuffleQuestions,
      shuffleOptions,
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("testhub:exam-config", JSON.stringify(config));
    }

    // Ensure paper is preloaded for instant transition to instructions
    preloadPaper(id);

    router.push(`/exam/${encodeURIComponent(id)}/instructions?mode=${examMode}&duration=${duration}`);
  };

  const candidateName =
    session?.user?.name ||
    (session?.user?.email ? session.user.email.split("@")[0] : "Candidate");

  const paperTitle = loadedPaper?.title || decodeURIComponent(id).replaceAll("-", " ");
  const rawSubject = loadedPaper?.subject;
  const paperExam = loadedPaper?.examType?.replaceAll("_", " ") || examParam?.replaceAll("_", " ") || "Exam";
  const paperSubject = rawSubject?.replaceAll("_", " ") || paperExam;
  const questionCount = loadedPaper?.questions?.length || (loadedPaper as any)?.questionCount || 0;

  // If paper does not exist yet in database, show user the processing pipeline!
  if (isChecking || !loadedPaper) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] text-[#20324d] py-10">
        <PaperProcessing
          paperId={id}
          examName={examParam}
          onReady={handlePaperReady}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#20324d]">

      {/* Official Exam Navigation Ribbon Banner (Informational ribbon, NOT mode buttons) */}
      <div
        role="region"
        aria-label="Exam Ribbon Banner"
        className="relative border-y border-amber-600/30 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] shadow-xs"
      >
        <div className="mx-auto flex min-h-[48px] max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-10">
          {/* Left Ribbon Info */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-amber-950">
            {/* Ribbon Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-900/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-950 border border-amber-900/20 shadow-xs">
              <span className="size-2 rounded-full bg-amber-950 animate-pulse" />
              <span>{paperExam}</span>
            </div>

            {/* Informational Subject Badge (Clear metadata tag, NOT a button) */}
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-3 py-1 text-xs font-bold text-slate-800 shadow-2xs backdrop-blur-xs border border-amber-700/15">
              <span className="text-[11px] font-medium text-slate-500">Subject:</span>
              <span>{paperSubject}</span>
            </div>

            {/* Dynamic Mode Ribbon Indicator */}
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900/10 px-3 py-1 text-xs font-bold text-amber-950 border border-amber-900/15">
              <span className="text-[11px] font-medium text-amber-900/70">Mode:</span>
              <span>{examMode === 'timed' ? 'Timed Simulation' : 'Untimed Practice'}</span>
            </div>
          </div>

          {/* Right Ribbon Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-amber-950">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-amber-900/70">Language:</span>
              <span className="font-bold">
                {loadedPaper?.instructionsData?.availableLanguages?.join(' / ') || 'English'}
              </span>
            </span>
            <span className="hidden sm:inline text-amber-800/40">|</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/15 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-950">
              {questionCount} Questions
            </span>
          </div>
        </div>
      </div>

      {/* Page body */}
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-10">
        <div className="mb-5">
          <h1 className="text-[23px] font-bold leading-8 tracking-[-0.3px] sm:text-[26px]">
            Configure your test
          </h1>
          <p className="mt-0.5 text-[12px] text-[#20324d] sm:text-[13px]">
            Choose how you want to attempt this question paper.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(330px,1fr)] xl:gap-10">
          {/* Exam setup card */}
          <section className="rounded-[13px] border border-[#d6e0ee] bg-white px-5 pb-4 pt-3 sm:px-6">
            <h2 className="text-[16px] font-bold leading-6">Exam setup</h2>
            <p className="text-[11px] leading-5 font-semibold text-[#0875f9]">{paperTitle}</p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <span className="px-1 text-[13px] font-semibold">Question paper</span>
              <div className="rounded-[7px] border border-[#d6e0ee] bg-slate-50 px-3.5 py-2.5 text-[13px] font-medium text-[#1c2d45]">
                {paperTitle} ({loadedPaper?.questions?.length || 0} questions · {loadedPaper?.totalMarks || 120} marks)
              </div>
            </div>

            <fieldset className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
              <legend className="sr-only">Test mode</legend>
              <span className="px-1 text-[13px] font-semibold">Test mode</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExamMode("timed")}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition cursor-pointer ${
                    examMode === "timed"
                      ? "border-[#0878f9] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs"
                      : "border-[#d6e0ee] bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-[#102a56]">⏱️ Timed CBT Exam</span>
                    <span
                      className={`size-4 rounded-full border flex items-center justify-center ${
                        examMode === "timed"
                          ? "border-[#0878f9] bg-[#0878f9] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {examMode === "timed" && <span className="size-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Real exam simulation with official countdown timer and pacing analytics.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExamMode("practice")}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition cursor-pointer ${
                    examMode === "practice"
                      ? "border-[#0878f9] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs"
                      : "border-[#d6e0ee] bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-[#102a56]">🎯 Practice Mode</span>
                    <span
                      className={`size-4 rounded-full border flex items-center justify-center ${
                        examMode === "practice"
                          ? "border-[#0878f9] bg-[#0878f9] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {examMode === "practice" && <span className="size-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    No time limit. Solve questions at your own speed with relaxed navigation.
                  </p>
                </button>
              </div>
            </fieldset>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <label htmlFor="duration" className="px-1 text-[13px] font-semibold">
                Duration
              </label>
              <select
                id="duration"
                value={duration}
                disabled={examMode === "practice"}
                onChange={(e) => setDuration(e.target.value)}
                className="h-[44px] w-full rounded-[7px] border border-[#d6e0ee] bg-white px-3 text-[13px] outline-none focus:border-[#0878f9] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {loadedPaper?.durationMin && !["60", "90", "120", "180"].includes(String(loadedPaper.durationMin)) && (
                  <option value={String(loadedPaper.durationMin)}>
                    {loadedPaper.durationMin} minutes (Official Paper Duration)
                  </option>
                )}
                <option value="60">1 hour (60 minutes)</option>
                <option value="90">1.5 hours (90 minutes)</option>
                <option value="120">2 hours (120 minutes)</option>
                <option value="180">3 hours (180 minutes)</option>
              </select>
            </div>

            <div className="mt-5 border-t border-[#dbe3ed]">
              <ToggleRow
                title="Shuffle questions"
                description="Randomize the order of questions"
                checked={shuffleQuestions}
                onChange={setShuffleQuestions}
              />
              <ToggleRow
                title="Shuffle options"
                description="Randomize answer choices for each question"
                checked={shuffleOptions}
                onChange={setShuffleOptions}
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <a
                href="/"
                className="inline-flex h-[43px] min-w-[110px] items-center justify-center rounded-[6px] border border-[#d6e0ee] bg-white px-5 text-[12px] font-semibold text-[#20324d] transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                Back
              </a>
              <button
                onClick={continueToInstructions}
                type="button"
                className="inline-flex h-[43px] min-w-[140px] items-center justify-center rounded-[6px] bg-[#0878f9] px-6 text-[12px] font-semibold text-white transition hover:bg-[#0668dc] focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
              >
                Continue to Instructions <span className="ml-1">→</span>
              </button>
            </div>
          </section>

          {/* Before you begin card */}
          <aside className="flex flex-col rounded-[13px] border border-[#d6e0ee] bg-white px-5 pb-5 pt-3 sm:px-6">
            <h2 className="text-[16px] font-bold leading-6">Before you begin</h2>
            <p className="text-[11px] leading-5">A realistic computer-based test experience</p>

            <ol className="mt-5 space-y-7">
              {[
                "Questions, options, and topics loaded directly from verified database tables.",
                "Timer and deadline are enforced during timed sessions.",
                "Answers and reviews are recorded as you progress.",
                "AI explanations and performance breakdown appear after submission.",
              ].map((item, index) => (
                <li key={item} className="flex items-center gap-3 text-[12px] leading-5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eaf2ff] text-[11px] font-bold text-[#203b62]">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>

            <div className="mt-auto pt-8">
              <div className="rounded-[8px] border border-[#d2e2ff] bg-[#f0f6ff] px-5 py-3">
                <p className="text-[12px] font-semibold text-[#0875f9]">
                  Database populated & ready
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  {loadedPaper?.questions?.length || 0} questions ready for your attempt.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-[85px] items-center justify-between gap-4 border-b border-[#dbe3ed] py-4 last:border-b-0">
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-1 text-[11px]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-[49px] shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 ${checked ? "bg-[#0878f9]" : "bg-[#aeb8c6]"
          }`}
      >
        <span
          className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[27px]" : "translate-x-[4px]"
            }`}
        />
      </button>
    </div>
  );
}
