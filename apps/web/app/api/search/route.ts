import { PrismaClient } from "@repo/db/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    const cleanQ = q.trim();

    if (!cleanQ || cleanQ.length < 2) {
      return NextResponse.json({
        exams: [],
        classes: [],
        subjects: [],
        books: [],
        chapters: [],
      });
    }

    const lowerQuery = cleanQ.toLowerCase();

    // 1. Match static exams
    const allExams = [
      { name: "CBSE", href: "/CBSE", desc: "Central Board of Secondary Education" },
      { name: "JEE", href: "/JEE", desc: "Joint Entrance Examination" },
      { name: "NEET", href: "/NEET", desc: "National Eligibility cum Entrance Test" },
    ];
    const matchedExams = allExams.filter((ex) =>
      ex.name.toLowerCase().includes(lowerQuery)
    );

    // 2. Perform parallel DB lookups
    const [dbClasses, dbSubjects, dbBooks, dbChapters] = await Promise.all([
      // Distinct Classes
      prisma.bookChapter.findMany({
        where: {
          className: { contains: cleanQ, mode: "insensitive" },
        },
        select: { board: true, className: true },
        distinct: ["board", "className"],
        take: 5,
      }),

      // Distinct Subjects
      prisma.bookChapter.findMany({
        where: {
          subjectName: { contains: cleanQ, mode: "insensitive" },
        },
        select: { board: true, className: true, subjectName: true },
        distinct: ["board", "className", "subjectName"],
        take: 5,
      }),

      // Distinct Books
      prisma.bookChapter.findMany({
        where: {
          bookName: { contains: cleanQ, mode: "insensitive" },
        },
        select: { board: true, className: true, subjectName: true, bookName: true },
        distinct: ["board", "className", "subjectName", "bookName"],
        take: 5,
      }),

      // Chapters matching query
      prisma.bookChapter.findMany({
        where: {
          chapterName: { contains: cleanQ, mode: "insensitive" },
        },
        select: { board: true, className: true, subjectName: true, bookName: true, chapterName: true },
        take: 5,
      }),
    ]);

    // Format mappings
    const classes = dbClasses.map((c) => ({
      name: c.className,
      board: c.board,
      href: `/${c.board}/${c.className}`,
    }));

    const subjects = dbSubjects.map((s) => ({
      name: s.subjectName,
      className: s.className,
      board: s.board,
      href: `/${s.board}/${s.className}/${s.subjectName}`,
    }));

    const books = dbBooks.map((b) => ({
      name: b.bookName,
      subjectName: b.subjectName,
      className: b.className,
      board: b.board,
      href: `/${b.board}/${b.className}/${b.subjectName}/${b.bookName}`,
    }));

    const chapters = dbChapters.map((ch) => ({
      name: ch.chapterName,
      bookName: ch.bookName,
      subjectName: ch.subjectName,
      className: ch.className,
      board: ch.board,
      href: `/${ch.board}/${ch.className}/${ch.subjectName}/${ch.bookName}`,
    }));

    return NextResponse.json({
      exams: matchedExams,
      classes,
      subjects,
      books,
      chapters,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
