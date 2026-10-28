'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, BookOpen } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function WebError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to monitoring service
    console.error('[StudyHub Application Error]:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-950 text-slate-100">
      <div className="max-w-lg w-full p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Heading & description */}
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          We encountered an unexpected error while loading this resource. Your reading progress has been preserved.
        </p>

        {/* Technical Digest if available */}
        {error.digest && (
          <div className="mb-6 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-left font-mono text-xs text-slate-400 overflow-x-auto">
            <span className="text-slate-500 select-none">Error Reference: </span>
            <span className="text-amber-400">{error.digest}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors border border-slate-700/60"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
        </div>

        {/* Quick Nav */}
        <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-center gap-6 text-xs text-slate-500">
          <Link href="/CBSE" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> CBSE Library
          </Link>
          <span>•</span>
          <Link href="/JEE" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> JEE Resources
          </Link>
        </div>
      </div>
    </div>
  );
}
