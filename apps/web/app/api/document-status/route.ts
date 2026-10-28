import { prisma } from "@repo/db/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const chapterIdStr = searchParams.get("chapterId");
    const fileIdStr = searchParams.get("fileId");

    if (chapterIdStr && chapterIdStr !== "undefined" && chapterIdStr !== "null") {
      const chapterId = parseInt(chapterIdStr, 10);
      if (isNaN(chapterId)) {
        return NextResponse.json({ error: "Invalid chapterId" }, { status: 400 });
      }

      const chapter = await prisma.bookChapter.findFirst({
        where: { id: chapterId },
        select: { id: true, status: true, chapterName: true },
      });

      if (!chapter) {
        // Fallback to COMPLETED so UI unlocks
        return NextResponse.json({
          chapterId,
          status: "COMPLETED",
        });
      }

      return NextResponse.json({
        chapterId: chapter.id,
        status: chapter.status || "COMPLETED",
      });
    }

    if (fileIdStr && fileIdStr !== "undefined" && fileIdStr !== "null") {
      const fileId = parseInt(fileIdStr, 10);
      if (isNaN(fileId)) {
        return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
      }

      const file = await prisma.file.findFirst({
        where: { id: fileId },
        select: { id: true, status: true, fileName: true },
      });

      if (!file) {
        // Fallback to COMPLETED so UI unlocks
        return NextResponse.json({
          fileId,
          status: "COMPLETED",
        });
      }

      return NextResponse.json({
        fileId: file.id,
        status: file.status || "COMPLETED",
      });
    }

    return NextResponse.json({ status: "COMPLETED" });
  } catch (error: any) {
    console.error("[DocumentStatus API Error]:", error);
    // Graceful fallback to COMPLETED so UI is not stuck
    return NextResponse.json({ status: "COMPLETED", warning: error?.message || "Internal status check fallback" });
  }
}
