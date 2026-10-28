import { NextRequest } from "next/server";
import { prisma } from "@repo/db/client";
import { PDFDocument } from "pdf-lib";

const getChapterNumber = (name: string): number => {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const className = searchParams.get("className");
  const subjectName = searchParams.get("subjectName");
  const bookName = searchParams.get("bookName");

  if (!className || !subjectName || !bookName) {
    return new Response("Missing query parameters (className, subjectName, bookName)", { status: 400 });
  }

  try {
    // 1. Fetch all chapters for the specified book
    const chapters: { chapterName: string; pdfUrl: string }[] = await prisma.bookChapter.findMany({
      where: {
        className,
        subjectName,
        bookName,
      },
      select: {
        chapterName: true,
        pdfUrl: true,
      },
    });

    if (chapters.length === 0) {
      return new Response("No chapters found for the specified book", { status: 404 });
    }
    // 3. Fetch all PDFs concurrently
    const fetchedPdfs = await Promise.all(
      chapters.map(async (chapter) => {
        try {
          const res = await fetch(chapter.pdfUrl);
          if (!res.ok) {
            throw new Error(`Status: ${res.status}`);
          }
          const buffer = await res.arrayBuffer();
          return { chapter, bytes: new Uint8Array(buffer), success: true };
        } catch (err) {
          console.error(`Failed to fetch chapter "${chapter.chapterName}" from URL: ${chapter.pdfUrl}`, err);
          return { chapter, bytes: null, success: false };
        }
      })
    );

    // 4. Merge all fetched PDFs into one document
    const mergedPdf = await PDFDocument.create();
    let mergedCount = 0;

    for (const item of fetchedPdfs) {
      if (item.success && item.bytes) {
        try {
          const pdfDoc = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
          mergedCount++;
        } catch (err) {
          console.error(`Failed to parse/merge PDF for "${item.chapter.chapterName}"`, err);
        }
      }
    }

    if (mergedCount === 0) {
      return new Response("Failed to load and merge any chapters", { status: 500 });
    }

    // 5. Serialize the merged PDF
    const mergedPdfBytes = await mergedPdf.save();

    // 6. Return response with pdf headers
    const sanitizedFilename = encodeURIComponent(bookName).replace(/['()]/g, escape);
    return new Response(mergedPdfBytes as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizedFilename}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });

  } catch (error) {
    console.error("Error merging book chapters:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
