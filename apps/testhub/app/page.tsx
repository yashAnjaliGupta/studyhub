import Link from 'next/link';
import { PageContainer } from '../components/ui';
import { getAuthSession } from '../lib/auth';

const examTracks = [
  {
    name: 'JEE Main',
    badge: 'Official CBT Format',
    badgeColor: 'bg-blue-50 text-[#0875f9] border-blue-200',
    description:
      'Standard 3-hour examination format with Physics, Chemistry, and Mathematics. Includes Single Choice MCQs and Numerical response sections with negative marking.',
    link: '/papers',
    ctaText: 'Practice JEE Main',
    features: ['75 Questions Format', '+4/-1 Marking Scheme', 'Numerical Value Inputs'],
  },
  {
    name: 'JEE Advanced',
    badge: 'Advanced Multi-Type',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description:
      'Challenging problem sets featuring multiple correct options, matching list matrices, and integer answer types with partial marking support.',
    link: '/papers',
    ctaText: 'Practice JEE Advanced',
    features: ['Multi-Correct Choice', 'Negative & Partial Marks', 'Paper 1 & 2 Sets'],
  },
  {
    name: 'NEET-UG',
    badge: 'Medical Entrance',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description:
      'Comprehensive medical entrance mock tests covering Physics, Chemistry, Botany, and Zoology with 200 questions selection interface.',
    link: '/papers',
    ctaText: 'Practice NEET-UG',
    features: ['Section A & B Choice', 'Biology Focus Sets', 'Speed & Accuracy Metrics'],
  },
  {
    name: 'CBSE Board Papers',
    badge: 'Board Question Bank',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description:
      'Official Class 10 & 12 board examination papers with question-by-question breakdown, high-resolution vector diagrams, and marking schemes.',
    link: '/papers',
    ctaText: 'Practice Board Papers',
    features: ['Class 10 & 12 Sets', 'Diagram-Rich Questions', 'Step-by-Step Marking'],
  },
];

const cbtFeatures = [
  {
    title: 'Authentic CBT Test Engine',
    description:
      'Official NTA color palette (Answered, Not Answered, Marked for Review), countdown clock, section navigation, and question palettes.',
    badge: 'NTA Exam Standard',
    icon: (
      <svg className="size-6 text-[#0875f9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Extensive Question Bank',
    description:
      'Thousands of genuine questions categorized by subject, topic, exam year, and difficulty for targeted revision.',
    badge: 'Search & Filter',
    icon: (
      <svg className="size-6 text-[#0875f9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: 'Deep Scorecard Analytics',
    description:
      'Instant post-test evaluation detailing accuracy percentages, negative mark penalties, time wasted on unattempted questions, and topic mastery.',
    badge: 'Instant Results',
    icon: (
      <svg className="size-6 text-[#0875f9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'AI Diagnostic Reports',
    description:
      'Machine learning model analyzes your response patterns to isolate conceptual misconceptions and suggest targeted study materials.',
    badge: 'Personalized Plan',
    icon: (
      <svg className="size-6 text-[#0875f9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export default async function Home() {
  const session = await getAuthSession();
  const isLoggedIn = !!session?.user;
  const userName = session?.user?.name || (session?.user?.email ? session.user.email.split('@')[0] : null);
  const siteUrl =
    process.env.NEXT_PUBLIC_TESTHUB_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://testhub.studyhub.yashguptaiiit.in';

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TestHub',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/papers?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'TestHub',
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description: 'Authentic CBT Exam Practice Platform for JEE, NEET & CBSE Board Exams',
  };

  const tracksJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'CBT Examination Tracks',
    itemListElement: examTracks.map((track, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: track.name,
      url: `${siteUrl}${track.link}`,
      description: track.description,
    })),
  };

  return (
    <PageContainer className="py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(tracksJsonLd) }}
      />
      <div className="mx-auto max-w-6xl space-y-16">
        {/* ================= HERO SECTION ================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2340] via-[#103b70] to-[#0875f9] px-8 py-14 text-white shadow-xl sm:px-12 sm:py-16">
          <div className="absolute -top-24 right-0 size-96 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-1/3 size-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-blue-100 backdrop-blur-md mb-4">
              <span>Authentic CBT Exam Practice Platform</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl sm:leading-tight">
              {isLoggedIn && userName ? (
                <>
                  Welcome back, {userName}. <br />
                  <span className="text-blue-200">Ready for your next test?</span>
                </>
              ) : (
                <>
                  Practice Real Exams in the{' '}
                  <span className="bg-gradient-to-r from-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
                    Official CBT Interface
                  </span>
                </>
              )}
            </h1>

            <p className="mt-4 text-base sm:text-lg leading-relaxed text-blue-100/90">
              Simulate JEE Main, JEE Advanced, NEET, and CBSE tests under realistic timer conditions
              with negative marking, instant scorecards, and AI-powered performance diagnostics.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/papers"
                className="rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#0c2340] shadow-md transition hover:bg-blue-50 active:scale-95"
              >
                Browse Question Papers
              </Link>

              <Link
                href="/questions"
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                Explore Question Bank
              </Link>

              {!isLoggedIn && (
                <Link
                  href="/signup"
                  className="rounded-xl bg-[#00c853] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 active:scale-95"
                >
                  Create Free Account
                </Link>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-blue-200">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" />
                Verified Previous Year Papers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" />
                Real NTA Color Palettes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" />
                Instant Scorecard & Solutions
              </span>
            </div>
          </div>
        </section>

        {/* ================= EXAM TRACKS ================= */}
        <section aria-labelledby="exam-tracks-heading">
          <div className="mb-8">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0875f9]">
              Target Examinations
            </span>
            <h2 id="exam-tracks-heading" className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Select Your Test Category
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose an exam track to access authentic paper sets with timed CBT practice.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {examTracks.map((track) => (
              <div
                key={track.name}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-bold text-slate-900 group-hover:text-[#0875f9] transition">
                      {track.name}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${track.badgeColor}`}>
                      {track.badge}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-600">
                    {track.description}
                  </p>

                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                    {track.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <span className="size-1.5 rounded-full bg-[#0875f9]" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href={track.link}
                    className="flex w-full items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0875f9] transition hover:bg-[#0875f9] hover:text-white"
                  >
                    <span>{track.ctaText}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= PLATFORM FEATURES ================= */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Built for Test Day Success
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              Why Aspirants Practice on TestHub
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Solve full-length tests in the same interface used on exam day to eliminate panic,
              master pacing, and minimize negative marking.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cbtFeatures.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6 transition hover:bg-white hover:shadow-md hover:border-slate-200"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-100/80">
                  {feat.icon}
                </div>
                <span className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {feat.badge}
                </span>
                <h3 className="mt-3 text-base font-bold text-slate-900">{feat.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section>
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              How CBT Practice Works
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A seamless, three-step rehearsal loop for peak exam performance.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#0875f9] text-sm font-bold text-white mb-4">
                1
              </span>
              <h3 className="text-base font-bold text-slate-900">Configure Your Session</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Choose a year paper or customize question count, duration, and section options to match your practice goals.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white mb-4">
                2
              </span>
              <h3 className="text-base font-bold text-slate-900">Attempt with CBT Controls</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Navigate the question palette, mark for review, enter numerical answers, and monitor live remaining time.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white mb-4">
                3
              </span>
              <h3 className="text-base font-bold text-slate-900">Instant Score & Solutions</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Review your marks, see step-by-step mathematical solutions, and consult the AI tutor on questions you missed.
              </p>
            </div>
          </div>
        </section>

        {/* ================= CALL TO ACTION ================= */}
        <section className="rounded-3xl bg-gradient-to-r from-[#0c2340] via-[#103b70] to-[#0875f9] p-8 sm:p-12 text-white shadow-xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isLoggedIn
                ? 'Ready for Your Next Practice Session?'
                : 'Accelerate Your Exam Score with TestHub'}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-blue-100">
              {isLoggedIn
                ? 'Browse through the full library of official JEE and NEET papers to begin your next timed CBT rehearsal.'
                : 'Create your free account today to save your scorecard history, track negative marking trends, and review detailed answer explanations.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/papers"
                    className="rounded-xl bg-white px-6 py-3 text-xs sm:text-sm font-bold text-[#0c2340] shadow transition hover:bg-blue-50 active:scale-95"
                  >
                    Browse Question Papers
                  </Link>
                  <Link
                    href="/questions"
                    className="rounded-xl border border-white/40 px-6 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
                  >
                    Explore Question Bank
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="rounded-xl bg-white px-6 py-3 text-xs sm:text-sm font-bold text-[#0c2340] shadow transition hover:bg-blue-50 active:scale-95"
                  >
                    Sign Up for Free
                  </Link>
                  <Link
                    href="/signin"
                    className="rounded-xl border border-white/40 px-6 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
                  >
                    Candidate Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
