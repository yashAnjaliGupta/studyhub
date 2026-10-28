'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, FileText, HelpCircle, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TestHubError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[TestHub Application Error]:', error);
  }, [error]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 bg-[#0c1427] text-slate-100">
      <div className="max-w-lg w-full p-8 rounded-2xl bg-[#131d38] border border-amber-500/20 shadow-2xl text-center">
        {/* CBT Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Heading & description */}
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          Test Engine Encountered an Issue
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          An unexpected error occurred while communicating with the examination servers. Any recorded answers remain safely cached in your browser.
        </p>

        {/* Digest */}
        {error.digest && (
          <div className="mb-6 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-left font-mono text-xs text-slate-400 overflow-x-auto">
            <span className="text-slate-500 select-none">Digest: </span>
            <span className="text-amber-400">{error.digest}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Action
          </button>

          <Link
            href="/papers"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors border border-slate-700"
          >
            <FileText className="w-4 h-4" />
            Question Papers
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-6 text-xs text-slate-400">
          <Link href="/questions" className="hover:text-amber-400 transition-colors inline-flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Topic Question Bank
          </Link>
          <span>•</span>
          <Link href="/" className="hover:text-amber-400 transition-colors inline-flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> TestHub Home
          </Link>
        </div>
      </div>
    </div>
  );
}
