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
import { client } from "@repo/db/client";
import Link from "next/link";
import { GetSubjectIcon } from "../../../lib/getSubjectIcons";
import PreviousYearPapers from "../../../components/PreviousYearQP";
import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";

import type { Metadata } from "next";
type Props = {
  params: Promise<{
    Exam: string;
    Class: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { Exam: rawExam, Class: rawClass } = await params;
  const Exam = decodeURIComponent(rawExam);
  const className = decodeURIComponent(rawClass);

  const title = `${Exam} ${className} Previous Year Question Papers & Study Material | StudyHub`;
  const description = `Access free books, chapter notes, PYQs, and study resources for ${Exam} ${className}. Download previous year question paper PDFs on StudyHub.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.yashguptaiiit.in";
  const canonicalUrl = `${siteUrl}/${rawExam}/${rawClass}`;

  return {
    title,
    description,
    keywords: [
      `${Exam} ${className} previous year papers`,
      `${className} PYQ PDF`,
      `${Exam} ${className} books`,
      `${className} study materials`,
      "StudyHub learning"
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "StudyHub",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({ params }: Props) {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;
  const Exam = (await params).Exam
  const className = decodeURIComponent((await params).Class)

  const subjects: { subjectName: string }[] = await client.bookChapter.findMany({
    select: {
      subjectName: true,
    },
    distinct: ["subjectName"],
    where: {
      className: className,
    }
  });

  const dbPapers: {
    id: number;
    fileName: string;
    subject: string;
    year: number | null;
    s3Key: string;
  }[] = await client.file.findMany({
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
      id: paper.id,
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
    icon: GetSubjectIcon(subject.subjectName),
    color: pickGradient(subject.subjectName, idx),
  }));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.yashguptaiiit.in";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${siteUrl}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": Exam,
        "item": `${siteUrl}/${Exam}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": className,
        "item": `${siteUrl}/${Exam}/${encodeURIComponent(className)}`
      }
    ]
  };

  return (
    <main className="min-h-screen bg-slate-50 mb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: `${Exam} ${className} Preparation & Study Material`,
            description: `Comprehensive study materials, NCERT textbooks, and previous year question papers for ${Exam} ${className}.`,
            provider: {
              "@type": "EducationalOrganization",
              name: "StudyHub",
              sameAs: siteUrl,
            },
            hasCourseInstance: subjects.map((sub) => ({
              "@type": "CourseInstance",
              name: `${sub.subjectName} (${Exam} ${className})`,
              url: `${siteUrl}/${Exam}/${encodeURIComponent(className)}/${encodeURIComponent(sub.subjectName)}`,
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

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

      {/* ================= CONTENT ================= */}

      <section className="mx-auto mt-10 max-w-7xl px-4">
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
                  className="group overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between"
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

                  <div className="space-y-5 p-6 flex-1 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span>Textbooks, PYQs & AI Study Tools</span>
                    </div>

                    <Link href={`/${Exam}/${className}/${subject.name}`} className="block w-full">
                      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700">
                        Explore Subject
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <PreviousYearPapers papers={papers} isLoggedIn={isLoggedIn} />
        </div>
      </section>
    </main>
  );

}