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

import { client } from "@repo/db/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  params: Promise<{
    Exam: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { Exam: rawExam } = await params;
  const Exam = decodeURIComponent(rawExam);

  if (Exam.includes(".") || Exam === "favicon.ico" || Exam === "robots.txt") {
    return {};
  }

  const title = `${Exam} Preparation, NCERT Textbooks & PYQs | StudyHub`;
  const description = `Access comprehensive study material, official previous year question papers (PYQs), and NCERT books for ${Exam} preparation across all classes on StudyHub.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.yashguptaiiit.in";
  const canonicalUrl = `${siteUrl}/${rawExam}`;

  return {
    title,
    description,
    keywords: [
      `${Exam} study material`,
      `${Exam} previous year question papers`,
      `${Exam} books PDF`,
      `${Exam} NCERT solutions`,
      "StudyHub learning",
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
  const Exam = (await params).Exam;

  if (Exam.includes(".") || Exam === "favicon.ico" || Exam === "robots.txt") {
    notFound();
  }

  const classes: { className: string }[] = await client.bookChapter.findMany({
    select: {
      className: true,
    },
    distinct: ["className"],
    where: {
      board: Exam,
    },
    orderBy: {
      id: "asc",
    },
  });

  const papers: { className: string }[] = await client.file.findMany({
    select: {
      className: true,
    },
    distinct: ["className"],
    where: {
      exam: Exam,
    },
  });

  const combined = Array.from(
    new Map(
      classes.concat(papers).map((item) => [item.className, item])
    ).values()
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.yashguptaiiit.in";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: Exam,
        item: `${siteUrl}/${Exam}`,
      },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${Exam} Preparation Material`,
    description: `Official textbooks, question papers, and study resources for ${Exam}.`,
    url: `${siteUrl}/${Exam}`,
    hasPart: combined.map((c) => ({
      "@type": "Course",
      name: `${Exam} ${c.className}`,
      url: `${siteUrl}/${Exam}/${encodeURIComponent(c.className)}`,
    })),
  };

  return (
    <main className="min-h-screen bg-slate-50 mb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      {/* ---------------- Breadcrumb ---------------- */}
      <section className="mx-auto mt-6 max-w-7xl px-4 md:px-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500">
          <Home className="h-4 w-4" />
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-blue-600">
            <Link href={`/${Exam}`}>{Exam}</Link>
          </span>
        </nav>
      </section>

      {/* ---------------- Main ---------------- */}
      <section className="mx-auto mt-10 max-w-7xl px-4 md:px-6">
        <div>
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
              {Exam} Study Material & Question Papers - Select Your Class
            </h1>

            <p className="mt-2 text-gray-600">
              Choose the class you are preparing for in {Exam} to access textbooks, chapter notes, and previous year papers.
            </p>
          </div>

          {/* Cards */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {combined.map((item) => {
              const Icon = BookOpen;

              return (
                <Link key={item.className} href={`/${Exam}/${encodeURIComponent(item.className)}`} passHref>
                  <div className="group rounded-2xl border-2 border-blue-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-7 w-7" />
                    </div>

                    <h2 className="text-2xl font-bold text-blue-700">
                      {item.className}
                    </h2>

                    <div className="mt-8 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 w-fit">
                      <span>View Subjects</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
