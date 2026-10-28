import {
  Home,
  ChevronRight,
  Search,
  Filter,
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  Sparkles,
  Star,
} from "lucide-react";

import { client } from "@repo/db/client";
import Link from "next/link";
import DownloadButton from "../../../../components/DownloadButton";
import PreviousYearPapers from "../../../../components/PreviousYearQP";
import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";

import type { Metadata } from "next";
type Props = {
  params: Promise<{
    Exam: string;
    Class: string;
    Subject: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { Exam: rawExam, Class: rawClass, Subject: rawSubject } = await params;
  const Exam = decodeURIComponent(rawExam);
  const className = decodeURIComponent(rawClass);
  const subject = decodeURIComponent(rawSubject);

  const title = `${subject} Books, PYQs & Notes for ${Exam} ${className} | StudyHub`;
  const description = `Download free ${subject} books, previous year question paper PDFs, chapter notes, and learning resources for ${Exam} ${className} on StudyHub.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.yashguptaiiit.in";
  const canonicalUrl = `${siteUrl}/${rawExam}/${rawClass}/${rawSubject}`;

  return {
    title,
    description,
    keywords: [
      `${className} ${subject} PYQ PDF`,
      `${Exam} ${className} ${subject} books`,
      `${subject} notes ${className}`,
      `${Exam} ${subject} question papers`,
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
  const subject = decodeURIComponent((await params).Subject)
  const books: {
    id: bigint;
    bookName: string;
    language: string;
    CoverURL: string | null;
    chapters: bigint;
  }[] = await client.$queryRaw`
    SELECT
        bcv."id",
        bc."bookName",
        bc."language",
        bcv."CoverURL",
        COUNT(*) FILTER (
            WHERE LOWER(bc."chapterName") LIKE 'chapter%'
        ) AS chapters
    FROM "BookChapter" bc
    LEFT JOIN "BookCover" bcv ON
        bc."className" = bcv."class_name"
        AND bc."subjectName" = bcv."subject_name"
        AND bc."bookName" = bcv."book_name"
    WHERE
        bc."className" = ${className}
        AND bc."subjectName" = ${subject}
    GROUP BY
        bcv."id",
        bc."bookName",
        bc."language",
        bcv."CoverURL"
    ORDER BY
        bcv."id"
    `;

  const papersData: {
    id: number;
    fileName: string;
    subject: string;
    year: number | null;
    s3Key: string;
  }[] = await client.file.findMany({
    where: {
      exam: Exam,
      className: className,
      subject: subject,
    },
    select: {
      id: true,
      fileName: true,
      subject: true,
      year: true,
      s3Key: true,
    },
    orderBy: {
      year: "desc",
    },
  });
  const papers = papersData.map((paper) => {
    return {
      id: paper.id,
      title: paper.fileName,
      subject: paper.subject,
      year: paper.year,
      key: paper.s3Key,
    }
  })
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
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": subject,
        "item": `${siteUrl}/${Exam}/${encodeURIComponent(className)}/${encodeURIComponent(subject)}`
      }
    ]
  };

  return (
    <main className="min-h-screen bg-slate-50 pl-10 pr-10 mb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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

          <Link href={`/${Exam}/${className}`} >
            {className}
          </Link>
          <ChevronRight className="h-4 w-4" />

          <span className="font-semibold text-blue-600">
            <Link href={`/${Exam}/${className}/${subject}`} >
              {subject}
            </Link>
          </span>
        </div>
      </section>
      {/* Header */}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            {subject} Books & Resources
          </h1>

          <p className="mt-2 text-slate-500">
            Browse books, notes, PDFs, summaries and AI-powered learning
            resources.
          </p>
        </div>
      </div>

      {/* Layout */}
      <div className="mt-10">
        {/* Books */}

        <section>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {books.map((book) => (
              <div
                key={book.id}
                className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  {book.CoverURL ? (
                    <img
                      src={book.CoverURL}
                      alt={book.bookName}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
                      <span className="px-4 text-center text-sm">No cover available</span>
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <div className="text-white">
                      <p className="text-xs">
                        {book.chapters} Chapters
                      </p>
                      <Link href={`/${Exam}/${className}/${subject}/${book.bookName}`}>
                        <button className="mt-2 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-900">
                          View PDF
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-2 font-semibold text-slate-800">
                      {book.bookName}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-700">
                      NCERT Textbook
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-medium text-indigo-700">
                      PDF
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2">
                    <Link href={`/${Exam}/${className}/${subject}/${book.bookName}`} className="col-span-1">
                      <button className="w-full rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 transition" title="Read Textbook">
                        <BookOpen className="mx-auto h-4 w-4" />
                      </button>
                    </Link>
                    <div className="col-span-3">
                      <DownloadButton
                        className={className}
                        subjectName={subject}
                        bookName={book.bookName}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <PreviousYearPapers papers={papers} isLoggedIn={isLoggedIn} />
        </section>
      </div>
    </main>
  );
}