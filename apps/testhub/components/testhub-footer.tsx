'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function TestHubFooter() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return (
    <footer className="border-t border-slate-800 bg-[#0c192c] text-slate-400">
      {/* Top Banner */}
      <div className="border-b border-slate-800/80 bg-[#081220]/60">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 py-3 sm:px-6 md:flex-row lg:px-8 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">TestHub Assessment Engine Online</span>
            <span className="text-slate-600">•</span>
            <span>Authentic CBT Exam Interface & Analytics Active</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Powered by StudyHub Educational Repository</span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#0875f9] text-lg font-black text-white shadow-md shadow-blue-500/20">
                T
              </span>
              <div>
                <span className="block text-xl font-bold leading-tight text-white">TestHub</span>
                <span className="block text-xs text-slate-400">Practice with purpose</span>
              </div>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              Authentic computer-based test (CBT) preparation platform for JEE, NEET, and CBSE.
              Practice with real timer conditions, negative marking, instant scorecards, and
              AI-driven weakness diagnosis.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 font-medium text-slate-300">
                🖥️ Real CBT UI
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 font-medium text-slate-300">
                📊 Scorecard Analytics
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 font-medium text-slate-300">
                🤖 AI Guidance
              </span>
            </div>
          </div>

          {/* Column: Target Exams */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Exam Practice
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/papers" className="hover:text-white transition-colors">
                  JEE Main Papers
                </Link>
              </li>
              <li>
                <Link href="/papers" className="hover:text-white transition-colors">
                  JEE Advanced Papers
                </Link>
              </li>
              <li>
                <Link href="/papers" className="hover:text-white transition-colors">
                  NEET Mock Tests
                </Link>
              </li>
              <li>
                <Link href="/papers" className="hover:text-white transition-colors">
                  CBSE Board Question Sets
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Practice Tools */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Practice Tools
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/papers" className="hover:text-white transition-colors">
                  Question Papers Archive
                </Link>
              </li>
              <li>
                <Link href="/questions" className="hover:text-white transition-colors">
                  Question Bank & Filters
                </Link>
              </li>
              <li>
                <Link href="/papers" className="hover:text-white transition-colors">
                  Timed Practice Simulator
                </Link>
              </li>
              <li>
                <a
                  href="http://localhost:3000"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-blue-400"
                >
                  StudyHub Textbooks & PYQs ↗
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Platform & Auth */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Candidate Portal
            </p>
            <ul className="space-y-2.5 text-sm">
              {!isLoggedIn && (
                <>
                  <li>
                    <Link
                      href="/signup"
                      className="font-medium text-[#0875f9] hover:text-blue-400 transition-colors"
                    >
                      Create Candidate Account
                    </Link>
                  </li>
                  <li>
                    <Link href="/signin" className="hover:text-white transition-colors">
                      Candidate Sign In
                    </Link>
                  </li>
                </>
              )}
              <li>
                <a
                  href="http://localhost:3000/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3000/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@yashguptaiiit.in"
                  className="hover:text-white transition-colors text-slate-400"
                >
                  Candidate Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TestHub by StudyHub. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <a href="http://localhost:3000/terms" className="hover:text-slate-300 transition-colors">
              Terms
            </a>
            <a href="http://localhost:3000/privacy" className="hover:text-slate-300 transition-colors">
              Privacy
            </a>
            <span className="text-slate-400">
              Built for serious exam aspirants
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
