'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck, RotateCcw, Send, AlertTriangle, FileText } from 'lucide-react';
import { getExamSession } from '../../../lib/exam-session';

interface ExamErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ExamSessionError({ error, reset }: ExamErrorProps) {
  const params = useParams();
  const router = useRouter();
  const paperId = typeof params?.id === 'string' ? params.id : '';

  useEffect(() => {
    console.error(`[TestHub Exam Session Error - Paper: ${paperId}]:`, error);
  }, [error, paperId]);

  const savedSession = paperId ? getExamSession(paperId) : null;
  const answeredCount = savedSession?.answers ? Object.keys(savedSession.answers).length : 0;

  const handleEmergencySubmit = () => {
    if (paperId) {
      router.push(`/exam/${encodeURIComponent(paperId)}/results`);
    } else {
      router.push('/papers');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0f1d] text-slate-100">
      <div className="max-w-xl w-full p-8 rounded-2xl bg-[#11182c] border border-amber-500/30 shadow-2xl">
        {/* Header with reassuring badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Exam Session Interrupted</h1>
            <p className="text-xs text-slate-400">Computer Based Test (CBT) Protective Recovery</p>
          </div>
        </div>

        {/* Protection reassurance banner */}
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-300">Your Exam Answers Are Safe</p>
            <p className="text-emerald-400/80 text-xs mt-1 leading-relaxed">
              All question answers and telemetry recorded up to this moment are preserved in your browser session storage.
              {answeredCount > 0 && (
                <span className="block mt-1 font-mono text-emerald-300">
                  Total saved responses: {answeredCount}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Digest / technical details */}
        {error.digest && (
          <div className="mb-6 p-3 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-400">
            <span className="text-slate-500 select-none">Error Reference: </span>
            <span className="text-amber-400">{error.digest}</span>
          </div>
        )}

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Click <strong className="text-white">Resume Exam</strong> to immediately restore the test player without losing your timer or responses.
        </p>

        {/* Recovery Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            Resume Exam
          </button>

          <button
            onClick={handleEmergencySubmit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors border border-slate-700"
          >
            <Send className="w-4 h-4" />
            Submit Saved Answers
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <button
            onClick={() => router.push('/papers')}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Return to Examination Papers
          </button>
        </div>
      </div>
    </div>
  );
}
