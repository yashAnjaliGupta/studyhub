import Link from "next/link";
import { GraduationCap, BookOpen, Atom, Sparkles, Shield, Heart, Mail, CheckCircle2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";

export const Footer = async () => {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
      {/* Top Banner / Feature Callout */}
      <div className="border-b border-slate-800/80 bg-slate-900/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-4 md:flex-row text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-300">StudyHub Platform Live</span>
            <span className="text-slate-600">•</span>
            <span>CBSE & JEE Textbooks & Previous Year Papers Updated</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              AI-Powered Study Assistant Included
            </span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-bold text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">StudyHub</span>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              India's smart, AI-driven learning platform for board and competitive exams.
              Access authentic NCERT textbooks, official previous year papers (PYQs), and
              instant AI explanations — distraction-free and free for every student.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 font-medium text-slate-300">
                📚 NCERT Books
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 font-medium text-slate-300">
                📝 Official PYQs
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 font-medium text-slate-300">
                🤖 AI Chat
              </span>
            </div>
          </div>

          {/* Column: Exams */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Target Exams
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/CBSE" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                  CBSE Board
                </Link>
              </li>
              <li>
                <Link href="/CBSE/Class%2010" className="hover:text-white transition-colors text-slate-400">
                  CBSE Class 10
                </Link>
              </li>
              <li>
                <Link href="/CBSE/Class%2012" className="hover:text-white transition-colors text-slate-400">
                  CBSE Class 12
                </Link>
              </li>
              <li>
                <Link href="/JEE" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Atom className="h-3.5 w-3.5 text-indigo-400" />
                  JEE Main & Advanced
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  NEET-UG
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                    Soon
                  </span>
                </span>
              </li>
            </ul>
          </div>

          {/* Column: Study Resources */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Resources
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/CBSE" className="hover:text-white transition-colors">
                  NCERT Textbooks
                </Link>
              </li>
              <li>
                <Link href="/JEE" className="hover:text-white transition-colors">
                  Previous Year Papers
                </Link>
              </li>
              <li>
                <Link
                  href={isLoggedIn ? "/CBSE" : "/signup"}
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  AI Study Assistant
                </Link>
              </li>
              <li>
                <Link href="/CBSE" className="hover:text-white transition-colors">
                  Chapter Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Company & Legal */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Platform & Legal
            </p>
            <ul className="space-y-2.5 text-sm">
              {!isLoggedIn && (
                <>
                  <li>
                    <Link href="/signup" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                      Create Account
                    </Link>
                  </li>
                  <li>
                    <Link href="/signin" className="hover:text-white transition-colors">
                      Sign In
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@yashguptaiiit.in"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-slate-400"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} StudyHub. Built for Indian learners.</p>

          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy
            </Link>
            <span className="flex items-center gap-1 text-slate-400">
              Made with <Heart className="h-3 w-3 text-red-500 fill-red-500 inline" /> for curious students
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};