import { NextResponse } from 'next/server';
import { prisma } from '@repo/db/client';

export const dynamic = 'force-dynamic';

function cleanSubjectName(rawSubject?: string | null): string {
  if (!rawSubject) return '';
  return rawSubject.trim().replace(/_/g, ' ');
}

function extractYearFromPath(s3Key: string, fileName: string): number {
  const combined = `${s3Key || ''} ${fileName || ''}`;
  const match = combined.match(/\b(20[0-2][0-9])\b/);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (parsed >= 2000 && parsed <= 2030) return parsed;
  }
  return 2024;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.toLowerCase();

    // Query ALL official question papers from File table (STRICTLY EXCLUDE BOOKS)
    const files = await prisma.file.findMany({
      where: {
        NOT: [
          { exam: { equals: 'books', mode: 'insensitive' } },
          { s3Key: { contains: 'books', mode: 'insensitive' } },
          { fileName: { startsWith: 'Chapter_', mode: 'insensitive' } },
          { fileName: { startsWith: 'Prelims', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        fileName: true,
        exam: true,
        className: true,
        subject: true,
        year: true,
        s3Key: true,
        fileSize: true,
        status: true,
      },
      orderBy: [
        { year: 'desc' },
        { id: 'desc' },
      ],
    });

    // Fetch existing extracted papers from Paper table to match question counts
    const extractedPapers = await prisma.paper.findMany({
      select: {
        id: true,
        title: true,
        subject: true,
        examType: true,
        year: true,
        totalMarks: true,
        durationMin: true,
        _count: {
          select: { questions: true },
        },
      },
    });

    const papersByTitle = new Map<string, typeof extractedPapers[0]>();
    for (const p of extractedPapers) {
      papersByTitle.set(p.title.trim().toLowerCase(), p);
    }

    // Enrich files with clean subject, real year, and StudyHub PDF viewer URL
    const enrichedFiles = files.map((f) => {
      const match = papersByTitle.get(f.fileName.trim().toLowerCase());

      // Extract specific exam category dynamically from S3 key or folder structure
      const dirParts = (f.s3Key || '').split('/').filter((p) => !p.includes('.') && !p.includes(':'));
      const genericWords = new Set(['common', 'papers', 'paper', 'files', 'file', 'uploads', 'upload', 'static', 'media', 'data', 'input', 'pdf']);
      const meaningful = dirParts.filter((p) => !genericWords.has(p.toLowerCase()) && !/^\d+$/.test(p));

      // The specific exam name from folder (e.g. JEE_Advanced, NEET, UPSC, GATE) or file.exam
      const specificExam = meaningful.length > 0 ? meaningful[meaningful.length - 1] : (f.exam || 'Exam');
      const examName = specificExam.replace(/_/g, ' ');

      // Subject from file.subject or folder
      let cleanSubject = cleanSubjectName(f.subject);
      if (!cleanSubject || cleanSubject === 'General') {
        cleanSubject = examName;
      }

      const year =
        f.year && f.year >= 2000 && f.year <= 2030
          ? f.year
          : match?.year
          ? match.year
          : extractYearFromPath(f.s3Key, f.fileName);

      const className = f.className || 'Class X';
      const rawSubject = f.subject || cleanSubject;
      const pdfViewerUrl = `http://localhost:3000/${encodeURIComponent(examName)}/${encodeURIComponent(className)}/${encodeURIComponent(rawSubject)}/${encodeURIComponent(f.fileName)}`;

      return {
        id: f.id,
        fileName: f.fileName,
        cleanTitle: f.fileName.replace(/\.pdf$/i, '').replace(/_/g, ' '),
        exam: examName,
        className,
        subject: cleanSubject,
        rawSubject,
        year,
        fileSize: f.fileSize,
        status: f.status,
        isExtracted: Boolean(match && match._count.questions > 0),
        questionCount: match ? match._count.questions : 0,
        totalMarks: match?.totalMarks || (cleanSubject === 'Mathematics' ? 80 : 100),
        durationMin: match?.durationMin || 180,
        paperId: match?.id || null,
        pdfViewerUrl,
      };
    });

    // Group by Subject -> then Year -> Papers
    const subjectMap = new Map<
      string,
      {
        subject: string;
        exams: Set<string>;
        classes: Set<string>;
        yearsMap: Map<number, typeof enrichedFiles>;
        totalPapers: number;
      }
    >();

    const distinctClasses = new Set<string>();

    for (const file of enrichedFiles) {
      distinctClasses.add(file.className);

      if (search) {
        const matchSearch =
          file.cleanTitle.toLowerCase().includes(search) ||
          file.fileName.toLowerCase().includes(search) ||
          file.subject.toLowerCase().includes(search) ||
          file.exam.toLowerCase().includes(search) ||
          file.className.toLowerCase().includes(search);
        if (!matchSearch) continue;
      }

      if (!subjectMap.has(file.subject)) {
        subjectMap.set(file.subject, {
          subject: file.subject,
          exams: new Set(),
          classes: new Set(),
          yearsMap: new Map(),
          totalPapers: 0,
        });
      }

      const entry = subjectMap.get(file.subject)!;
      entry.exams.add(file.exam);
      entry.classes.add(file.className);
      entry.totalPapers += 1;

      if (!entry.yearsMap.has(file.year)) {
        entry.yearsMap.set(file.year, []);
      }
      entry.yearsMap.get(file.year)!.push(file);
    }

    // Convert map to clean array structure
    const groupedSubjects = Array.from(subjectMap.values())
      .map((entry) => {
        const sortedYears = Array.from(entry.yearsMap.entries())
          .map(([year, papersList]) => ({
            year,
            paperCount: papersList.length,
            papers: papersList.sort((a, b) => a.cleanTitle.localeCompare(b.cleanTitle)),
          }))
          .sort((a, b) => b.year - a.year);

        return {
          subject: entry.subject,
          exams: Array.from(entry.exams),
          classes: Array.from(entry.classes),
          totalPapers: entry.totalPapers,
          availableYearsCount: sortedYears.length,
          years: sortedYears,
        };
      })
      // Sort subjects by total papers count descending
      .sort((a, b) => b.totalPapers - a.totalPapers);

    // Collect all distinct years available across all papers
    const allDistinctYears = Array.from(
      new Set(enrichedFiles.map((f) => f.year).filter(Boolean))
    ).sort((a, b) => b - a);

    return NextResponse.json({
      success: true,
      totalQuestionPapers: enrichedFiles.length,
      totalSubjects: groupedSubjects.length,
      availableYears: allDistinctYears,
      availableClasses: Array.from(distinctClasses).sort(),
      subjects: groupedSubjects,
    });
  } catch (err: any) {
    console.error('[PapersAPI] Error fetching grouped papers:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch question papers' },
      { status: 500 }
    );
  }
}
