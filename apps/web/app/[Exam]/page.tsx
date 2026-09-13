
import {
  Search,
  GraduationCap,
  Home,
  ChevronRight,
  ArrowRight,
  BookMarked,
  BookOpen,
  Target,
  Rocket,
} from "lucide-react";

import { PrismaClient } from "@repo/db/client";
import Link from "next/link";
import { notFound } from "next/navigation";

const client = new PrismaClient();
type Props = {
  params: Promise<{
    Exam: string;
  }>;
};
export default async function Page({ params }: Props) {
  const Exam = (await params).Exam;

  if (Exam.includes(".") || Exam === "favicon.ico" || Exam === "robots.txt") {
    notFound();
  }

  const classes: { className: string }[] = await client.bookChapter.findMany({
    select: {
      className: true
    },
    distinct: ["className"],
    where: {
      board: Exam,
    },
    orderBy: {
      id: "asc",
    }
  });

  const papers: { className: string }[] = await client.file.findMany({
    select: {
      className: true
    },
    distinct: ["className"],
    where: {
      exam: Exam,
    },
  });
  console.log(classes)
  const combined = Array.from(
    new Map(
      classes.concat(papers).map(item => [item.className, item])
    ).values()
  );

  // console.log(combined);
  // console.log(params);
  // console.log(Exam);
  return (
    <main className="min-h-screen bg-slate-50 mb-16">

      {/* ---------------- Breadcrumb ---------------- */}

      <section className="mx-auto mt-6 max-w-7xl px-4 md:px-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Home className="h-4 w-4" />
          <Link href="/">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-blue-600">
            <Link href={`/${Exam}`} >
              {Exam}
            </Link>
          </span>
        </div>
      </section>

      {/* ---------------- Leaderboard Ad ---------------- */}

      <section className="mx-auto mt-5 max-w-7xl px-4 md:px-6">
        <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-center text-white shadow-lg">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-70">
              Advertisement
            </p>

            <p className="font-semibold">
              Sponsored Content • 728 × 90
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Main ---------------- */}

      <section className="mx-auto mt-10 grid max-w-7xl gap-8 px-4 md:px-6 lg:grid-cols-[1fr_220px]">
        {/* Left */}

        <div>
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900">
              Select Your Class
            </h1>

            <p className="mt-2 text-gray-500">
              Choose the class you are preparing for.
            </p>
          </div>

          {/* Cards */}

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {combined.map((item) => {
              const Icon = BookOpen;

              return (
                <Link key={item.className} href={`/${Exam}/${item.className}`} passHref>
                  <div
                    className="group rounded-2xl border-2 border-blue-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl"
                  >
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-7 w-7" />
                    </div>

                    <h2 className="text-2xl font-bold text-blue-700">
                      {item.className}
                    </h2>

                    <button className="mt-8 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700">
                      View Subjects

                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Bottom Ad */}

          <div className="mt-12 flex justify-center">
            <div className="flex h-[250px] w-[300px] items-center justify-center rounded-xl border border-blue-200 bg-blue-100 text-blue-700 shadow">
              300 × 250 Advertisement
            </div>
          </div>
        </div>

        {/* Sidebar */}

        <aside className="hidden lg:block">
          <div className="sticky top-24 flex h-[600px] items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest">
                Ad Space
              </p>

              <p className="mt-2 font-semibold">
                160 × 600
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
