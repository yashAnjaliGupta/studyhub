import PdfReaderLayout from "../../../../../components/PDFViewer/PdfReaderLayout";
import { ChevronRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../api/auth/[...nextauth]/route";

import { PrismaClient } from "@repo/db/client";
import Link from "next/link";
import { getPaperUrl, ensureBookChaptersInS3 } from "../../../../../lib/s3";
import { processDocumentEmbeddings } from "../../../../../lib/embeddings";

import type { Metadata } from "next";

const client = new PrismaClient();
type Props = {
  params: Promise<{
    Exam: string;
    Class: string;
    Subject: string;
    Book: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { Exam: rawExam, Class: rawClass, Subject: rawSubject, Book: rawBook } = await params;
  const Exam = decodeURIComponent(rawExam);
  const className = decodeURIComponent(rawClass);
  const subject = decodeURIComponent(rawSubject);
  const bookName = decodeURIComponent(rawBook);

  const title = `${bookName} - ${subject} (${Exam} ${className}) PDF | StudyHub`;
  const description = `Read and download ${bookName} for ${subject}, ${Exam} ${className}. Access full PDF, AI learning assistant, notes, and chapter summaries on StudyHub.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.com";
  const canonicalUrl = `${siteUrl}/${rawExam}/${rawClass}/${rawSubject}/${rawBook}`;

  return {
    title,
    description,
    keywords: [
      `${bookName} PDF download`,
      `${className} ${subject} ${bookName}`,
      `${Exam} ${subject} question paper`,
      "StudyHub PDF reader"
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "StudyHub",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ReaderPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;
  const { Exam, Class, Subject, Book } = await params;
  const breadcrumbs = [
    {
      label: "Home",
      href: "/",
    },
    {
      label: decodeURIComponent(Exam),
      href: `/${Exam}`,
    },
    {
      label: decodeURIComponent(Class),
      href: `/${Exam}/${Class}`,
    },
    {
      label: decodeURIComponent(Subject),
      href: `/${Exam}/${Class}/${Subject}`,
    },
    {
      label: decodeURIComponent(Book),
      href: `/${Exam}/${Class}/${Subject}/${Book}`,
    },
  ];

  // 1. Try to find chapters for a book
  const dbChapters = await client.bookChapter.findMany({
    select: {
      id: true,
      board: true,
      className: true,
      subjectName: true,
      bookName: true,
      chapterName: true,
      pdfUrl: true,
      status: true,
    },
    where: {
      className: decodeURIComponent(Class),
      subjectName: decodeURIComponent(Subject),
      bookName: decodeURIComponent(Book),
    },
    orderBy: {
      id: "asc",
    }
  });

  let book: { id?: number; chapterId?: number; fileId?: number; chapterName: string; pdfUrl: string; status?: string }[] = [];

  if (dbChapters.length > 0) {
    // Lazy cache chapters to S3 on first open and retrieve CDN URLs
    const s3Chapters = await ensureBookChaptersInS3(dbChapters, decodeURIComponent(Exam));
    book = dbChapters.map((ch, idx) => ({
      id: ch.id,
      chapterId: ch.id,
      chapterName: ch.chapterName,
      pdfUrl: s3Chapters[idx]?.pdfUrl || ch.pdfUrl,
      status: ch.status,
    }));
    console.log(book);

    // Check chapters for PENDING status and trigger vector embeddings page-by-page
    for (const ch of dbChapters) {
      console.log("document processing status:", ch.status);
      if (ch.status === "PENDING" || ch.status === "FAILED" || !ch.status) {
        await client.bookChapter.update({
          where: { id: ch.id },
          data: { status: "PROCESSING" },
        });
        console.log("processing...")
        const targetUrl = book.find((b) => b.chapterName === ch.chapterName)?.pdfUrl || ch.pdfUrl;
        console.log("document processing started [PDF URL]:", targetUrl);
        processDocumentEmbeddings({
          chapterId: ch.id,
          pdfUrl: targetUrl,
        }).catch((err) => {
          console.error(`[ReaderPage] Background embedding error for chapter ${ch.id}:`, err);
        });
      }
    }
  } else {
    // 2. If no chapters are found, check if it's a question paper (File)
    const paper = await client.file.findFirst({
      where: {
        exam: decodeURIComponent(Exam),
        className: decodeURIComponent(Class),
        subject: decodeURIComponent(Subject),
        fileName: decodeURIComponent(Book),
      },
      select: {
        id: true,
        fileName: true,
        s3Key: true,
        status: true,
      },
    });

    if (paper) {
      // Get CDN URL to view this PDF paper
      const pdfUrl = getPaperUrl(paper.s3Key);
      book = [
        {
          id: paper.id,
          fileId: paper.id,
          chapterName: paper.fileName,
          pdfUrl: pdfUrl,
          status: paper.status,
        },
      ];

      // Check if status is PENDING and trigger vector embedding generation page-by-page
      if (paper.status === "PENDING" || paper.status === "FAILED" || !paper.status) {
        await client.file.update({
          where: { id: paper.id },
          data: { status: "PROCESSING" },
        });

        processDocumentEmbeddings({
          fileId: paper.id,
          pdfUrl: pdfUrl,
        }).catch((err) => {
          console.error(`[ReaderPage] Background embedding error for paper ${paper.id}:`, err);
        });
      }
    }
  }

  if (book.length === 0) {
    return (
      <main className="flex min-h-[80dvh] items-center justify-center bg-slate-950 text-white flex-col gap-4">
        <h2 className="text-xl font-semibold">Document not found</h2>
        <p className="text-slate-400">We couldn't find the book or question paper you were looking for.</p>
        <Link href="/" className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700 transition">
          Go Home
        </Link>
      </main>
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.com";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": crumb.label,
      "item": crumb.href === "/" ? `${siteUrl}/` : `${siteUrl}${crumb.href}`
    }))
  };

  const documentJsonLd = {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    "name": decodeURIComponent(Book),
    "educationalLevel": decodeURIComponent(Class),
    "about": decodeURIComponent(Subject),
    "fileFormat": "application/pdf",
    "url": `${siteUrl}/${Exam}/${Class}/${Subject}/${Book}`
  };

  return (
    <main className="flex min-h-[80dvh] items-center justify-center bg-slate-950 pdf-reader-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(documentJsonLd) }}
      />
      <div className="h-[80dvh] w-full sm:h-auto">
        <div className="bg-blue-700 text-white flex items-center justify-between px-4 h-12 flex-shrink-0">
          <div className="flex items-center min-w-0 overflow-x-auto scrollbar-hide">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <div
                  key={crumb.href}
                  className="flex items-center whitespace-nowrap"
                >
                  {isLast ? (
                    <span className="font-medium">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="opacity-85 hover:opacity-100 hover:underline transition"
                    >
                      {crumb.label}
                    </Link>
                  )}

                  {!isLast && (
                    <ChevronRight
                      size={14}
                      className="mx-1.5 opacity-60 flex-shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <PdfReaderLayout Book={book} isLoggedIn={isLoggedIn} />
      </div>
    </main>
  );
}