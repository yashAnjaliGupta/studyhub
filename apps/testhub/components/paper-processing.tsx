'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProcessedPaper } from '../lib/paper-service';
import { checkPaperMetadata, fetchFullPaper, setCachedPaper, getCachedPaper } from '../lib/paper-cache';
import { TestHubLoader } from './testhub-loader';

interface PaperProcessingProps {
  paperId: string;
  examName?: string;
  onReady: (paper: ProcessedPaper) => void;
}

const steps = [
  { id: 1, label: 'Checking database records', desc: 'Verifying if paper exists in tables' },
  { id: 2, label: 'Loading paper text & embeddings', desc: 'Fetching PDF pages and content' },
  { id: 3, label: 'AI Question Extraction', desc: 'Parsing questions, answer options & topics' },
  { id: 4, label: 'Populating Exam Tables', desc: 'Structuring database tables for practice session' },
];

export function PaperProcessing({ paperId, examName, onReady }: PaperProcessingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const decodedTitle = decodeURIComponent(paperId).replaceAll('-', ' ');

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let isCancelled = false;

    async function processPipeline() {
      try {
        // Step 1: Fast metadata check (avoids transferring huge question JSON on initial verify)
        setCurrentStep(1);

        // Check client cache first
        const cached = getCachedPaper(paperId);
        if (cached && cached.questions?.length > 0) {
          if (!isCancelled) {
            setCurrentStep(4);
            setTimeout(() => onReadyRef.current(cached), 300);
          }
          return;
        }

        const metaResult = await checkPaperMetadata(paperId, examName);

        if (metaResult.status === 'READY' && metaResult.metadata) {
          // Metadata confirmed, now fetch/cache full paper
          const fullRes = await fetchFullPaper(paperId, examName);
          if (fullRes.status === 'READY' && fullRes.paper) {
            if (!isCancelled) {
              setCurrentStep(4);
              setTimeout(() => onReadyRef.current(fullRes.paper!), 400);
            }
            return;
          }
        }

        // Step 2 & 3: Trigger Extraction Pipeline
        if (!isCancelled) setCurrentStep(2);
        const stepTimer = setTimeout(() => {
          if (!isCancelled) setCurrentStep(3);
        }, 1800);

        const examQuery = examName ? `?exam=${encodeURIComponent(examName)}` : '';
        const processRes = await fetch(`/api/exam/paper/${encodeURIComponent(paperId)}${examQuery}`, {
          method: 'POST',
        });
        clearTimeout(stepTimer);

        const processData = await processRes.json().catch(() => null);

        if (!processRes.ok || !processData || processData.status !== 'READY' || !processData.paper) {
          const errMsg = processData?.message || `Processing pipeline error (HTTP ${processRes.status})`;
          throw new Error(errMsg);
        }

        setCachedPaper(paperId, processData.paper);

        if (!isCancelled) {
          setCurrentStep(4);
          setTimeout(() => {
            onReadyRef.current(processData.paper);
          }, 800);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[PaperProcessing] Pipeline error:', err);
          setError(err?.message || 'We had trouble extracting this paper automatically. Please retry.');
        }
      }
    }

    processPipeline();

    return () => {
      isCancelled = true;
    };
  }, [paperId]);

  return (
    <div className="mx-auto my-12 max-w-2xl px-4 text-center sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
        {/* TestHub Star Loader */}
        <div className="flex justify-center mb-2">
          <TestHubLoader size={38} />
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-[#0875f9]">
          AI Processing Pipeline
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#102a56] sm:text-3xl">
          Preparing your practice paper
        </h2>
        <p className="mt-2 text-sm text-[#68778b] capitalize">
          {decodedTitle}
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              Retry Pipeline
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-3 text-left">
            {steps.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                    isCurrent
                      ? 'border-[#0875f9] bg-blue-50/50 shadow-sm ring-1 ring-[#0875f9]'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-slate-100 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="flex shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <span className="grid size-7 place-items-center rounded-full bg-[#35a853] text-xs font-bold text-white">
                        ✓
                      </span>
                    ) : isCurrent ? (
                      <span className="grid size-7 place-items-center rounded-full bg-[#0875f9] text-xs font-bold text-white animate-pulse">
                        {step.id}
                      </span>
                    ) : (
                      <span className="grid size-7 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                        {step.id}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold ${
                        isCurrent
                          ? 'text-[#0875f9]'
                          : isCompleted
                          ? 'text-[#258747]'
                          : 'text-slate-600'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-500">{step.desc}</p>
                  </div>
                  {isCurrent && (
                    <span className="shrink-0 text-xs font-semibold text-[#0875f9]">
                      In progress…
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800">
          <p className="font-semibold">Did you know?</p>
          <p className="mt-0.5">
            TestHub extracts questions, options, topics, and worked explanations directly into your personal practice database so you can track topic-wise accuracy.
          </p>
        </div>
      </div>
    </div>
  );
}
