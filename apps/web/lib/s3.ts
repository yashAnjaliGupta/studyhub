
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@repo/db/client";

const prisma = new PrismaClient();

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export function getPaperUrl(s3Key: string): string {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL;
  const cleanKey = s3Key.replace(/^\/+/, "");

  if (cdnUrl) {
    const baseUrl = cdnUrl.replace(/\/+$/, "");
    return `${baseUrl}/${cleanKey}`;
  }

  // Fallback to S3 domain if CDN URL is not provided in env
  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION || "us-east-1";
  if (bucket) {
    return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
  }

  return `/${cleanKey}`;
}

export interface BookChapterRecord {
  id: number;
  board: string;
  className: string;
  subjectName: string;
  bookName: string;
  chapterName: string;
  pdfUrl: string;
}

export function isCdnOrS3Url(url: string): boolean {
  if (!url) return false;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL;
  if (cdnUrl && url.startsWith(cdnUrl)) return true;
  if (url.includes(".s3.") || url.includes(".amazonaws.com")) return true;
  return false;
}

export async function ensureBookChaptersInS3(
  chapters: BookChapterRecord[],
  exam: string
): Promise<{ chapterName: string; pdfUrl: string }[]> {
  const uncached = chapters.filter(
    (ch) => ch.pdfUrl && !isCdnOrS3Url(ch.pdfUrl)
  );

  // If there are chapters not yet uploaded to S3/CDN, trigger background sync without blocking page load
  if (uncached.length > 0) {
    syncChaptersToS3InBackground(uncached, exam).catch((err) => {
      console.error("[BookSync] Background sync error:", err);
    });
  }

  // Return immediate response with current addresses for instant page rendering
  return chapters.map((ch) => ({
    chapterName: ch.chapterName,
    pdfUrl: ch.pdfUrl,
  }));
}

async function syncChaptersToS3InBackground(
  chapters: BookChapterRecord[],
  exam: string
): Promise<void> {
  const bucket = process.env.AWS_BUCKET_NAME;
  if (!bucket) return;

  for (const chapter of chapters) {
    try {
      // Download PDF from external source (e.g. NCERT website)
      const res = await fetch(chapter.pdfUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      if (!res.ok) {
        console.warn(
          `[BookSync] Failed to fetch external PDF for ${chapter.chapterName}: ${res.status}`
        );
        continue;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const cleanBoard = (chapter.board || exam || "CBSE").replace(/[^a-zA-Z0-9_\-]/g, "_");
      const cleanClass = chapter.className.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const cleanSubject = chapter.subjectName.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const cleanBook = chapter.bookName.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const cleanChapter = chapter.chapterName.replace(/[^a-zA-Z0-9_\-.]/g, "_");

      const s3Key = `books/${cleanBoard}/${cleanClass}/${cleanSubject}/${cleanBook}/${cleanChapter}.pdf`;

      // Upload to S3
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: "application/pdf",
        })
      );

      // Compute CDN URL
      const cdnUrl = getPaperUrl(s3Key);

      // Update DB record so future accesses hit CDN directly
      await prisma.bookChapter.update({
        where: { id: chapter.id },
        data: { pdfUrl: cdnUrl },
      });

      console.log(
        `[BookSync] Background cached ${chapter.bookName} - ${chapter.chapterName} to S3 & updated DB to CDN URL: ${cdnUrl}`
      );
    } catch (err) {
      console.error(
        `[BookSync] Error background syncing chapter ${chapter.chapterName} to S3:`,
        err
      );
    }
  }
}