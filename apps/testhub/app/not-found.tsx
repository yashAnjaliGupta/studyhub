import React from 'react';
import Link from 'next/link';
import { FileQuestion, FileText, HelpCircle, Home } from 'lucide-react';

export default function TestHubNotFound() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 bg-[#0c1427] text-slate-100">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#131d38] border border-slate-800 shadow-2xl text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <FileQuestion className="w-3.5 h-3.5" /> 404 Test Not Found
        </div>

        {/* Big Code */}
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 tracking-tight mb-3">
          404
        </h1>

        <h2 className="text-xl font-bold text-white mb-2">
          Examination Paper Not Found
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          The requested examination paper, question bank topic, or session ID could not be located in the database.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/papers"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
          >
            <FileText className="w-4 h-4" />
            Browse Papers
          </Link>

          <Link
            href="/questions"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors border border-slate-700"
          >
            <HelpCircle className="w-4 h-4" />
            Question Bank
          </Link>
        </div>
      </div>
    </div>
  );
}
