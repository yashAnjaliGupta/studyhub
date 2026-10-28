'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { TestHubFooter } from './testhub-footer';

const mainLinks = [
  { href: '/', label: 'Overview', mobileLabel: 'Home' },
  { href: '/papers', label: 'Question papers', mobileLabel: 'Papers' },
  { href: '/questions', label: 'Questions bank', mobileLabel: 'Questions' },
];

const examLinks = [
  { suffix: '/configure', label: 'Setup' },
  { suffix: '/instructions', label: 'Instructions' },
  { suffix: '', label: 'Practice' },
  { suffix: '/submit-confirmation', label: 'Submit' },
  { suffix: '/results', label: 'Results' },
  { suffix: '/detailed-analysis', label: 'Analysis' },
  { suffix: '/ai-guidance', label: 'Study plan' },
];

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
}

function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
        <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
        <div className="size-9 animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  if (!session || !session.user) {
    return (
      <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
        <Link
          href="/signin"
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-[#0875f9] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const user = session.user;
  const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Student');
  const initials = getInitials(user.name, user.email);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-3 border-l border-slate-200 pl-4 text-left transition hover:opacity-80 focus:outline-none"
      >
        <div className="hidden text-right md:block">
          <p className="max-w-[140px] truncate text-xs font-semibold text-[#1c2d45]">
            {displayName}
          </p>
          <p className="text-[11px] text-[#68778b]">Student account</p>
        </div>
        {user.image && !imgError ? (
          <img
            src={user.image}
            alt={displayName}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="size-9 rounded-full object-cover ring-2 ring-blue-100"
          />
        ) : (
          <span
            className="grid size-9 place-items-center rounded-full bg-[#eaf2ff] text-xs font-bold text-[#0875f9] ring-2 ring-blue-100"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-xs font-bold text-[#1c2d45]">{displayName}</p>
            {user.email && (
              <p className="truncate text-[11px] text-[#68778b]">{user.email}</p>
            )}
            <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0875f9]">
              Verified Candidate
            </span>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                const data = await signOut({ redirect: false, callbackUrl: '/' });
                window.location.href = data?.url || '/';
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TestHubLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const examPrefix = pathname.match(/^\/exam\/([^/]+)/)?.[0];
  const isExamFlow = Boolean(examPrefix);
  const isExamTaking = Boolean(pathname.match(/^\/exam\/[^/]+$/));

  if (isExamTaking) {
    return <div className="min-h-screen bg-[#f5f7fb] text-[#1c2d45]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#1c2d45]">
      <header className="sticky top-0 z-40 border-b border-[#d9e1ec] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#0875f9] text-lg font-black text-white">
              T
            </span>
            <span>
              <span className="block text-base font-bold leading-tight text-[#102a56]">TestHub</span>
              <span className="hidden text-[11px] text-[#68778b] sm:block">Practice with purpose</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-0 sm:gap-2">
            {mainLinks.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-1.5 py-2 text-[11px] font-semibold transition sm:px-3 sm:text-sm ${
                    active
                      ? 'bg-blue-50 text-[#0875f9]'
                      : 'text-[#68778b] hover:bg-slate-50 hover:text-[#102a56]'
                  }`}
                >
                  <span className="sm:hidden">{link.mobileLabel}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={process.env.NEXT_PUBLIC_STUDYHUB_URL || "https://studyhub.yashguptaiiit.in"}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              StudyHub Portal ↗
            </a>

            <UserMenu />
          </div>
        </div>

        {isExamFlow && examPrefix && (
          <div className="bg-[#f7941d] text-white">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 overflow-x-auto px-4 sm:px-6 lg:px-8">
              <p className="shrink-0 py-2.5 text-xs font-extrabold tracking-[0.12em] sm:text-sm">
                PRACTICE SESSION
              </p>
              <nav aria-label="Exam stages" className="flex min-w-max items-center gap-1 py-1.5">
                {examLinks.map((link) => {
                  const href = `${examPrefix}${link.suffix}`;
                  const active = link.suffix
                    ? pathname.endsWith(link.suffix)
                    : pathname === examPrefix;
                  return (
                    <Link
                      key={link.label}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                        active
                          ? 'bg-white text-[#c66a00]'
                          : 'text-white/90 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <TestHubFooter />
    </div>
  );
}
