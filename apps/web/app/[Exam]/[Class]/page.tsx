import {
  Home,
  ChevronRight,
  BookOpen,
  FileText,
  ClipboardList,
  ArrowRight,
  Search,
  GraduationCap,
  FlaskConical,
  Sigma,
  Atom,
} from "lucide-react";
import { PrismaClient } from "@repo/db/client";
import Link from "next/link";
import { GetSubjectIcon } from "../../../lib/getSubjectIcons";
import PreviousYearPapers from "../../../components/PreviousYearQP";

const client = new PrismaClient();
type Props = {
  params: Promise<{
    Exam: string;
    Class: string;
  }>;
};


export default async function Page({ params }: Props) {
  const Exam = (await params).Exam
  const className = decodeURIComponent((await params).Class)

  const subjects = await client.bookChapter.findMany({
    select: {
      subjectName: true,
    },
    distinct: ["subjectName"],
    where: {
      className: className,
    }
  });

  const dbPapers = await client.file.findMany({
    where: {
      exam: Exam,
      className: className,
    },
    orderBy: {
      year: "desc",
    }
  })

  const papers = dbPapers
    .filter(paper => !subjects.some(subject => subject.subjectName === paper.subject))
    .map(paper => ({
      title: paper.fileName,
      subject: paper.subject,
      year: paper.year,
      key: paper.s3Key,
    }))
  // nice palette of gradients to pick from
  const gradientList = [
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-green-600",
    "from-violet-500 to-indigo-600",
    "from-pink-500 via-red-500 to-yellow-500",
    "from-amber-400 to-orange-600",
    "from-cyan-400 to-blue-500",
    "from-rose-400 to-fuchsia-600",
    "from-slate-500 to-slate-700",
  ];

  // deterministic hash to pick a gradient per subject name
  function pickGradient(name: string, idx: number) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return gradientList[Math.abs(hash) % gradientList.length];
  }

  const subjectCards = subjects.map((subject, idx) => ({
    name: subject.subjectName,
    notes: 0,
    icon: GetSubjectIcon(subject.subjectName),
    color: pickGradient(subject.subjectName, idx),
  }));
  return (
    <main className="min-h-screen bg-slate-50 mb-16">

      {/* ================= BREADCRUMB ================= */}

      <section className="mx-auto mt-6 max-w-7xl px-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Home className="h-4 w-4" />
          <Link href="/" >
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/${Exam}`} >
            {Exam}
          </Link>
          <ChevronRight className="h-4 w-4" />

          <span className="font-semibold text-blue-600">
            <Link href={`/${Exam}/${className}`} >
              {className}
            </Link>
          </span>
        </div>
      </section>

      {/* ================= HERO AD ================= */}

      <section className="mx-auto mt-6 max-w-7xl px-4">
        <div className="flex h-28 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 shadow-xl">
          <div className="text-center text-white">
            <p className="text-xs uppercase tracking-widest opacity-70">
              Advertisement
            </p>

            <p className="text-xl font-semibold">
              Leaderboard Banner (728 × 90)
            </p>
          </div>
        </div>
      </section>

      {/* ================= CONTENT ================= */}

      <section className="mx-auto mt-10 grid max-w-7xl gap-8 px-4 lg:grid-cols-[1fr_260px]">
        {/* Left */}

        <div>
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900">
              Subjects for {Exam} – {className}
            </h1>

            <p className="mt-2 text-slate-500">
              Choose a subject to access books, chapter notes,
              summaries, PYQs and AI learning.
            </p>
          </div>

          {/* Subject Cards */}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {subjectCards.map((subject) => {
              const Icon = subject.icon;

              return (
                <div
                  key={subject.name}
                  className="group overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Header */}

                  <div
                    className={`bg-gradient-to-r ${subject.color} p-6 text-white`}
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                      <Icon className="h-7 w-7" />
                    </div>

                    <h2 className="text-2xl font-bold">
                      {subject.name}
                    </h2>
                  </div>

                  {/* Body */}

                  <div className="space-y-5 p-6">
                    {/* <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      ✓ PYQs Available
                    </span> */}

                    <div className="space-y-3 text-sm">
                      {/* <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        {subject.chapters} Chapters
                      </div> */}

                      {subject.notes > 0 ? <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-blue-600" />
                        {subject.notes} Notes
                      </div> : null}

                      {/* <div className="flex items-center gap-3">
                        <ClipboardList className="h-4 w-4 text-blue-600" />
                        {subject.pyqs} PYQs
                      </div> */}
                    </div>
                    <Link href={`/${Exam}/${className}/${subject.name}`}>
                      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700">
                        Explore

                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </Link>
                    {/* <button className="w-full rounded-xl border border-blue-600 py-3 font-semibold text-blue-600 transition hover:bg-blue-50">
                      Previous Year Papers
                    </button> */}
                  </div>
                </div>
              );
            })}
          </div>
          <PreviousYearPapers papers={papers} />
          {/* Bottom Advertisement */}

          <div className="mt-12 flex justify-center">
            <div className="flex h-[250px] w-[300px] items-center justify-center rounded-2xl border bg-white shadow">
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Advertisement
                </p>

                <p className="mt-2 font-semibold">
                  Medium Rectangle
                </p>

                <p className="text-sm text-slate-500">
                  300 × 250
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border bg-white p-4 shadow">
            <div className="flex h-[600px] items-center justify-center rounded-xl bg-gradient-to-b from-blue-100 to-cyan-50">
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Advertisement
                </p>

                <p className="mt-2 font-semibold">
                  Skyscraper
                </p>

                <p className="text-sm text-slate-500">
                  160 × 600
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );

}