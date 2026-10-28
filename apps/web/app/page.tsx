import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";
import {
  BookOpen,
  Atom,
  HeartPulse,
  ArrowRight,
  Sparkles,
  FileText,
  Download,
  BrainCircuit,
  CheckCircle2,
  GraduationCap,
  Layers,
  Search,
} from "lucide-react";

const exams = [
  {
    name: "CBSE",
    title: "Central Board of Secondary Education",
    icon: BookOpen,
    description:
      "Complete NCERT textbooks, chapter summaries, notes, and official board exam question papers for classes 9 through 12.",
    status: "Active",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gradient: "from-blue-600 via-indigo-600 to-blue-700",
    classes: ["Class 10", "Class 11", "Class 12"],
    href: "/CBSE",
    features: ["NCERT Textbooks", "Board Question Papers", "AI Chapter Summaries"],
  },
  {
    name: "JEE",
    title: "Joint Entrance Examination",
    icon: Atom,
    description:
      "Authentic previous year question papers (PYQs) for JEE Main and JEE Advanced with official question sets across Physics, Chemistry, and Mathematics.",
    status: "Active",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    gradient: "from-indigo-600 via-purple-600 to-indigo-800",
    classes: ["JEE Main", "JEE Advanced"],
    href: "/JEE",
    features: ["Year-wise PYQs", "Physics, Chem & Math", "PDF Viewer & AI Tutor"],
  },
  {
    name: "NEET",
    title: "National Eligibility cum Entrance Test",
    icon: HeartPulse,
    description:
      "Medical entrance preparation resources, Biology diagrams, and past papers currently undergoing curation and digitization.",
    status: "In Curation",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    gradient: "from-rose-500 via-pink-600 to-rose-700",
    classes: ["Biology", "Chemistry", "Physics"],
    href: "/CBSE", // fallbacks gracefully to CBSE science
    isUpcoming: true,
    features: ["NCERT Biology Align", "Question Bank", "Launching Soon"],
  },
];

const features = [
  {
    icon: BrainCircuit,
    title: "In-PDF AI Study Tutor",
    description:
      "Ask conceptual questions directly inside any textbook or exam paper. Get instant step-by-step mathematical derivations and concise summaries.",
    badge: "AI Powered",
  },
  {
    icon: FileText,
    title: "Authentic PYQ Archive",
    description:
      "Access real, verified previous year question papers for JEE and CBSE, organized neatly by year and subject without clutter.",
    badge: "Verified Papers",
  },
  {
    icon: Layers,
    title: "NCERT & Board Structure",
    description:
      "Organized chapter by chapter with high-quality extracted diagrams, formula tables, and clean digital reading formatting.",
    badge: "Curated Content",
  },
  {
    icon: Download,
    title: "Instant Offline Downloads",
    description:
      "One-click high-speed PDF downloads so you can continue practicing and reviewing offline on any device.",
    badge: "Free & Fast",
  },
];

const quickClasses = [
  { label: "CBSE Class 10", href: "/CBSE/Class%2010" },
  { label: "CBSE Class 12", href: "/CBSE/Class%2012" },
  { label: "JEE Main PYQs", href: "/JEE" },
  { label: "Science & Math", href: "/CBSE" },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.yashguptaiiit.in";

  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "StudyHub",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/CBSE?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "StudyHub",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description: "AI-Powered Exam Preparation, NCERT Textbooks & Previous Year Question Papers",
  };

  const jsonLdExams = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Exam Preparation Tracks",
    itemListElement: exams.map((exam, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${exam.name} - ${exam.title}`,
      url: `${siteUrl}${exam.href}`,
      description: exam.description,
    })),
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdExams) }}
      />
      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900 px-6 pt-16 pb-24 text-white sm:pt-20 lg:pb-32">
        {/* Glow orbs & subtle pattern */}
        <div className="absolute inset-0 pointer-events-none -z-0">
          <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-1/2 right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-blue-200 backdrop-blur-md mb-6">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <span>Smart Learning & Previous Year Papers Platform</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl sm:leading-tight">
            Master CBSE & JEE with{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
              Authentic Resources & AI
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-blue-100/90 leading-relaxed">
            Read complete NCERT textbooks, practice verified previous year question papers
            (PYQs), and resolve doubts instantly with our interactive in-PDF study tutor.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#exams"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-blue-800 shadow-lg shadow-blue-900/30 transition hover:bg-blue-50 hover:shadow-xl active:scale-95"
            >
              Select Your Exam
              <ArrowRight className="h-4 w-4" />
            </a>

            {!isLoggedIn && (
              <Link
                href="/signup"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                Create Free Account
              </Link>
            )}
          </div>

          {/* Key Value Points */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-blue-200/80">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              100% Free For Students
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Official Question Papers
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              In-PDF AI Question Answering
            </span>
          </div>
        </div>
      </section>

      {/* ================= QUICK JUMP BAR ================= */}
      <section className="-mt-8 relative z-20 mx-auto max-w-5xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg md:gap-4">
          <span className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Popular:
          </span>
          {quickClasses.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ================= EXAM DIRECTORY ================= */}
      <section id="exams" className="mx-auto mt-16 max-w-7xl px-6 py-8">
        <div className="text-center md:text-left mb-10">
          <div className="inline-flex items-center gap-2 rounded-lg bg-blue-100/60 px-3 py-1 text-xs font-semibold text-blue-800 mb-2">
            <GraduationCap className="h-4 w-4" />
            <span>Target Exams</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Choose Your Examination
          </h2>
          <p className="mt-2 text-slate-500 max-w-2xl">
            Select your syllabus to access textbooks, chapter notes, previous year question
            papers, and AI learning tools.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const Icon = exam.icon;

            return (
              <div
                key={exam.name}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-400 hover:shadow-2xl"
              >
                <div>
                  {/* Top Bar with Icon and Status */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border border-blue-200/60 shadow-sm transition group-hover:scale-105">
                      <Icon className="h-7 w-7" />
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${exam.badgeColor}`}
                    >
                      {exam.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {exam.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mb-3">
                    {exam.title}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {exam.description}
                  </p>

                  {/* Highlights */}
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                    {exam.features.map((feat) => (
                      <div
                        key={feat}
                        className="flex items-center gap-2 text-xs font-medium text-slate-600"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  {exam.isUpcoming ? (
                    <div className="flex items-center justify-between text-xs text-slate-500 py-2">
                      <span>Curating Syllabus & Questions</span>
                      <span className="font-semibold text-rose-600">Coming Soon</span>
                    </div>
                  ) : (
                    <Link
                      href={exam.href}
                      className="flex w-full items-center justify-between rounded-xl bg-blue-50 px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                    >
                      <span>Explore {exam.name} Materials</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= PLATFORM FEATURES ================= */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-16 px-6 mt-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="rounded-full bg-blue-100 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
              Why StudyHub
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Everything You Need to Ace Your Exams
            </h2>
            <p className="mt-3 text-slate-600">
              Traditional PDFs are static and difficult to navigate. StudyHub turns textbooks
              and past papers into interactive, AI-enhanced learning resources.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            How to Study on StudyHub
          </h2>
          <p className="mt-2 text-slate-500">
            Three simple steps to maximize your preparation efficiency.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white mb-4">
              1
            </span>
            <h3 className="text-xl font-bold text-slate-900">Choose Exam & Class</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Navigate directly to CBSE or JEE, choose your class (10, 11, or 12), and select
              the subject you need.
            </p>
          </div>

          <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white mb-4">
              2
            </span>
            <h3 className="text-xl font-bold text-slate-900">Read & Solve PYQs</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Access genuine question papers and official textbook chapters with high-res
              diagrams and answer keys.
            </p>
          </div>

          <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-lg font-bold text-white mb-4">
              3
            </span>
            <h3 className="text-xl font-bold text-slate-900">Ask the AI Tutor</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Get stuck on a problem? Open the AI assistant side-by-side with your PDF for
              instant explanations and derivations.
            </p>
          </div>
        </div>
      </section>

      {/* ================= CALL TO ACTION ================= */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 p-8 sm:p-12 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {isLoggedIn
                ? "Continue Your Exam Preparation"
                : "Ready to Upgrade Your Exam Preparation?"}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-blue-100">
              {isLoggedIn
                ? "Access full NCERT textbooks, chapter notes, solutions, and official previous year question papers."
                : "Create your free StudyHub account today to unlock personalized bookmarks, in-depth AI explanations, and full access to our question paper library."}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/CBSE"
                    className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-blue-800 shadow-md transition hover:bg-blue-50 active:scale-95"
                  >
                    Browse CBSE Textbooks & PYQs
                  </Link>
                  <Link
                    href="/JEE"
                    className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
                  >
                    Browse JEE Papers
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-blue-800 shadow-md transition hover:bg-blue-50 active:scale-95"
                  >
                    Sign Up for Free
                  </Link>
                  <Link
                    href="/signin"
                    className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
                  >
                    Sign In to Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
