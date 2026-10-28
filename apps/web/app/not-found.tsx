import React from 'react';
import Link from 'next/link';
import { Search, Home, BookOpen, Compass } from 'lucide-react';

export default function WebNotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Compass className="w-3.5 h-3.5" /> 404 Not Found
        </div>

        {/* 404 Large Display */}
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 tracking-tight mb-3">
          404
        </h1>

        <h2 className="text-xl font-bold text-white mb-2">
          Page or Textbook Not Found
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          The requested document, chapter, or URL could not be located in our educational repository.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-600/20"
          >
            <Home className="w-4 h-4" />
            StudyHub Home
          </Link>

          <Link
            href="/CBSE"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors border border-slate-700/60"
          >
            <BookOpen className="w-4 h-4" />
            Browse Books
          </Link>
        </div>
      </div>
    </div>
  );
}
