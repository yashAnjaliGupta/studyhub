import fs from 'fs';
import path from 'path';
import { prisma } from '@repo/db/client';
import {
  generateCustomInstructions,
  type PaperInstructionsData,
} from './instruction-service';
import { parsePdfWithService } from './pdf-parser-client';
import { enrichPaperSolutionsInBackground } from './solution-generator';
import { normalizeTopic } from '@repo/exam-core';

export interface ProcessedQuestionOption {
  id?: string;
  label?: string;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
  sequenceNum: number;
}

export type QuestionType = 'mcq_single' | 'mcq_multiple' | 'numerical' | 'text_subjective';

export interface ProcessedQuestion {
  id?: string;
  sequenceNum: number;
  text: string;
  type?: QuestionType;
  imageUrl?: string | null;
  diagramSvg?: string | null;
  pageNumber?: number | null;
  marks: number;
  negativeMarks?: number | null;
  topic: string;
  subject?: string;
  options: ProcessedQuestionOption[];
  correctOptionIds?: string[];
  numericalAnswer?: any;
  solutionText?: string | null;
  solutionSvg?: string | null;
}

export interface ProcessedPaper {
  id: string;
  title: string;
  subject: string;
  examType: string;
  year: number;
  totalMarks: number;
  durationMin: number;
  sourcePdfUrl?: string | null;
  instructionsData?: PaperInstructionsData | null;
  questions: ProcessedQuestion[];
}

export interface PaperMetadata {
  id: string;
  title: string;
  subject: string;
  examType: string;
  year: number;
  totalMarks: number;
  durationMin: number;
  questionCount: number;
  sourcePdfUrl?: string | null;
  instructionsData?: PaperInstructionsData | null;
}

/**
 * Fast metadata-only check: verifies if paper exists and returns counts without loading questions.
 */
export async function getPaperMetadataFromDatabase(idOrRef: string): Promise<PaperMetadata | null> {
  try {
    const decoded = decodeURIComponent(idOrRef).trim();
    const isNumeric = /^\d+$/.test(decoded);

    // 0. High performance check for documentJson BSON/JSONB
    try {
      const rawRows: any[] = await prisma.$queryRawUnsafe(
        'SELECT id, title, subject, "examType", year, "totalMarks", "durationMin", instructions, "documentJson" FROM "Paper" WHERE id = $1 LIMIT 1',
        decoded
      );
      if (rawRows && rawRows.length > 0 && rawRows[0].documentJson) {
        const row = rawRows[0];
        const doc = typeof row.documentJson === 'string' ? JSON.parse(row.documentJson) : row.documentJson;
        const qCount = doc?.questions?.length || 0;
        if (qCount > 0) {
          let parsedInstructions: any = null;
          if (row.instructions) {
            try { parsedInstructions = JSON.parse(row.instructions); } catch { }
          }
          return {
            id: row.id,
            title: doc?.exam?.name || row.title,
            subject: row.subject,
            examType: doc?.exam?.examType || row.examType,
            year: doc?.exam?.year || row.year,
            totalMarks: doc?.exam?.maximumMarks || row.totalMarks,
            durationMin: doc?.exam?.durationMinutes || row.durationMin,
            questionCount: qCount,
            instructionsData: parsedInstructions,
          };
        }
      }
    } catch { }

    // 1. Direct Paper.id check
    let paper: any = await prisma.paper.findUnique({
      where: { id: decoded },
      select: {
        id: true,
        title: true,
        subject: true,
        examType: true,
        year: true,
        totalMarks: true,
        durationMin: true,
        instructions: true,
        _count: { select: { questions: true } },
      },
    });

    if (paper && paper._count.questions > 0) {
      let parsedInstructions: any = null;
      if (paper.instructions) {
        try {
          parsedInstructions = JSON.parse(paper.instructions);
        } catch {
          parsedInstructions = null;
        }
      }
      return {
        id: paper.id,
        title: paper.title,
        subject: paper.subject,
        examType: paper.examType,
        year: paper.year,
        totalMarks: paper.totalMarks,
        durationMin: paper.durationMin,
        questionCount: paper._count.questions,
        instructionsData: parsedInstructions,
      };
    }

    // 2. Numeric file ID check
    if (isNumeric) {
      const fileId = Number(decoded);
      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (file) {
        const cleanName = file.fileName.replace(/\.pdf$/i, '').replaceAll('_', ' ').trim();
        paper = await prisma.paper.findFirst({
          where: {
            OR: [
              { id: String(file.id) },
              { title: { equals: file.fileName, mode: 'insensitive' } },
              { title: { equals: cleanName, mode: 'insensitive' } },
              { title: { contains: cleanName, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            title: true,
            subject: true,
            examType: true,
            year: true,
            totalMarks: true,
            durationMin: true,
            instructions: true,
            _count: { select: { questions: true } },
          },
        });

        if (paper && paper._count.questions > 0) {
          let parsedInstructions: any = null;
          if (paper.instructions) {
            try {
              parsedInstructions = JSON.parse(paper.instructions);
            } catch {
              parsedInstructions = null;
            }
          }
          return {
            id: paper.id,
            title: paper.title,
            subject: paper.subject,
            examType: paper.examType,
            year: paper.year,
            totalMarks: paper.totalMarks,
            durationMin: paper.durationMin,
            questionCount: paper._count.questions,
            instructionsData: parsedInstructions,
          };
        }
      }
    }

    // 3. Fallback search by title
    const urlFilenameMeta = decoded.includes('/') ? decoded.split('/').pop()?.split('?')[0] : null;
    const cleanFilenameMeta = urlFilenameMeta?.replace(/\.pdf$/i, '');
    paper = await prisma.paper.findFirst({
      where: {
        OR: [
          { title: { contains: decoded.replaceAll('-', ' '), mode: 'insensitive' as const } },
          ...(cleanFilenameMeta ? [
            { id: cleanFilenameMeta },
            { title: { equals: cleanFilenameMeta, mode: 'insensitive' as const } },
            { title: { contains: cleanFilenameMeta, mode: 'insensitive' as const } },
          ] : []),
        ],
      },
      select: {
        id: true,
        title: true,
        subject: true,
        examType: true,
        year: true,
        totalMarks: true,
        durationMin: true,
        instructions: true,
        _count: { select: { questions: true } },
      },
    });

    if (paper && paper._count.questions > 0) {
      let parsedInstructions: any = null;
      if (paper.instructions) {
        try {
          parsedInstructions = JSON.parse(paper.instructions);
        } catch {
          parsedInstructions = null;
        }
      }
      return {
        id: paper.id,
        title: paper.title,
        subject: paper.subject,
        examType: paper.examType,
        year: paper.year,
        totalMarks: paper.totalMarks,
        durationMin: paper.durationMin,
        questionCount: paper._count.questions,
        instructionsData: parsedInstructions,
      };
    }

    return null;
  } catch (err) {
    console.error('[PaperService] Error checking metadata:', err);
    return null;
  }
}

/**
 * Format canonical ExamPaper JSON (stored as JSONB/BSON in Postgres) directly into ProcessedPaper
 * preserving all questions, KaTeX math stems, options, marking schemes, and subject tabs.
 */
export function formatPaperFromDocumentJson(
  paperRecord: any,
  docJsonRaw: any,
  sourcePdfUrl?: string | null
): ProcessedPaper {
  const doc = typeof docJsonRaw === 'string' ? JSON.parse(docJsonRaw) : docJsonRaw;
  const exam = doc?.exam || {};
  const canonicalQuestions = doc?.questions || [];

  const assetMap = new Map<string, string>();
  for (const a of doc?.assets || []) {
    if (a.id && a.url) assetMap.set(a.id, a.url);
  }

  const mappedQuestions: ProcessedQuestion[] = canonicalQuestions.map((q: any, idx: number) => {
    const qTypeStr = (q.type || 'SINGLE_CHOICE').toUpperCase();
    let type: QuestionType = 'mcq_single';
    if (qTypeStr.includes('MULTIPLE')) {
      type = 'mcq_multiple';
    } else if (qTypeStr.includes('NUMERICAL') || qTypeStr.includes('INTEGER') || qTypeStr.includes('DECIMAL')) {
      type = 'numerical';
    } else if (qTypeStr.includes('TEXT') || qTypeStr.includes('DESCRIPTIVE') || qTypeStr.includes('SUBJECTIVE')) {
      type = 'text_subjective';
    }

    let imgUrl: string | null = null;
    if (q.images && q.images.length > 0) {
      const firstId = q.images[0].assetId;
      if (firstId && assetMap.has(firstId)) {
        imgUrl = assetMap.get(firstId) || null;
      }
    }

    const questionSubject = q.subject || q.metadata?.subject || paperRecord.subject || 'Practice';

    return {
      id: q.id || `q_${q.number || idx + 1}`,
      sequenceNum: typeof q.number === 'number' ? q.number : idx + 1,
      text: q.question || '',
      type,
      imageUrl: imgUrl,
      diagramSvg: null,
      pageNumber: q.sourcePages && q.sourcePages.length > 0 ? q.sourcePages[0] : null,
      marks: q.marks !== undefined && q.marks !== null ? q.marks : 4,
      negativeMarks: q.negativeMarks !== undefined && q.negativeMarks !== null ? q.negativeMarks : 1,
      topic: q.metadata?.topic || 'General Concepts',
      subject: questionSubject,
      options: (q.options || []).map((opt: any, oIdx: number) => {
        let optImgUrl: string | null = null;
        if (opt.images && opt.images.length > 0) {
          const firstId = opt.images[0].assetId || opt.images[0].id;
          if (firstId && assetMap.has(firstId)) {
            optImgUrl = assetMap.get(firstId) || null;
          } else if (opt.images[0].url) {
            optImgUrl = opt.images[0].url;
          }
        } else if (opt.image) {
          if (assetMap.has(opt.image)) {
            optImgUrl = assetMap.get(opt.image) || null;
          } else if (typeof opt.image === 'string' && (opt.image.startsWith('http') || opt.image.startsWith('/') || opt.image.startsWith('data:'))) {
            optImgUrl = opt.image;
          }
        }

        // Spatial anchor fallback for option diagrams
        if (!optImgUrl) {
          const optLabel = typeof opt.label === 'string' ? opt.label.trim().toUpperCase() : String.fromCharCode(65 + oIdx);
          const qNum = typeof q.number === 'number' ? q.number : idx + 1;
          for (const a of doc?.assets || []) {
            if (a.metadata?.assignedQuestion === qNum && a.metadata?.assignedOption === optLabel && a.url) {
              optImgUrl = a.url;
              break;
            }
          }
        }

        return {
          id: opt.id || `opt_${idx}_${oIdx}`,
          text: opt.text || '',
          imageUrl: optImgUrl,
          isCorrect: Boolean(opt.isCorrect),
          sequenceNum: oIdx,
        };
      }),
    };
  });

  let instructionsData: PaperInstructionsData | null = null;
  if (paperRecord.instructions) {
    try {
      instructionsData =
        typeof paperRecord.instructions === 'string'
          ? JSON.parse(paperRecord.instructions)
          : paperRecord.instructions;
    } catch {
      instructionsData = null;
    }
  }

  return {
    id: String(paperRecord.id),
    title: exam.name || paperRecord.title,
    subject: paperRecord.subject,
    examType: exam.examType || paperRecord.examType,
    year: exam.year || paperRecord.year,
    totalMarks: exam.maximumMarks || paperRecord.totalMarks || mappedQuestions.length * 4,
    durationMin: exam.durationMinutes || paperRecord.durationMin || 180,
    sourcePdfUrl: sourcePdfUrl || null,
    instructionsData,
    questions: mappedQuestions,
  };
}

/**
 * Check if a paper already exists in the Paper table (full questions + diagrams).
 */
export async function getPaperFromDatabase(idOrRef: string): Promise<ProcessedPaper | null> {
  try {
    const decoded = decodeURIComponent(idOrRef).trim();
    const isNumeric = /^\d+$/.test(decoded);

    // 0. High performance BSON/JSONB check directly from PostgreSQL Paper table
    try {
      const rawRow: any[] = await prisma.$queryRawUnsafe(
        'SELECT id, title, subject, "examType", year, "totalMarks", "durationMin", instructions, "documentJson" FROM "Paper" WHERE id = $1 LIMIT 1',
        decoded
      );
      if (rawRow && rawRow.length > 0 && rawRow[0].documentJson) {
        console.log(`[PaperService] Loading paper ${decoded} directly from Postgres BSON/JSONB documentJson...`);
        return formatPaperFromDocumentJson(rawRow[0], rawRow[0].documentJson);
      }
    } catch (e) {
      // Fallback to standard query
    }

    // 1. Try finding by direct Paper.id (UUID or custom ID)
    let paper: any = await prisma.paper.findUnique({
      where: { id: decoded },
      include: {
        questions: {
          include: {
            topic: true,
          },
          orderBy: { sequenceNum: 'asc' },
        },
      },
    });

    if (paper && paper.questions.length > 0) {
      return await enrichPaperWithDiagramFields(paper, decoded);
    }

    // 2. If id is numeric (e.g. File.id from StudyHub)
    if (isNumeric) {
      const fileId = Number(decoded);
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (file) {
        try {
          const rawRow: any[] = await prisma.$queryRawUnsafe(
            'SELECT id, title, subject, "examType", year, "totalMarks", "durationMin", instructions, "documentJson" FROM "Paper" WHERE id = $1 OR title ILIKE $2 LIMIT 1',
            String(file.id),
            `%${file.fileName.replace(/\.pdf$/i, '').replaceAll('_', ' ')}%`
          );
          if (rawRow && rawRow.length > 0 && rawRow[0].documentJson) {
            console.log(`[PaperService] Loading file #${file.id} directly from Postgres BSON/JSONB documentJson...`);
            return formatPaperFromDocumentJson(rawRow[0], rawRow[0].documentJson);
          }
        } catch { }

        const cleanName = file.fileName.replace(/\.pdf$/i, '').replaceAll('_', ' ').trim();
        paper = await prisma.paper.findFirst({
          where: {
            OR: [
              { id: String(file.id) },
              { title: { equals: file.fileName, mode: 'insensitive' } },
              { title: { equals: cleanName, mode: 'insensitive' } },
              { title: { contains: cleanName, mode: 'insensitive' } },
            ],
          },
          include: {
            questions: {
              include: {
                topic: true,
              },
              orderBy: { sequenceNum: 'asc' },
            },
          },
        });

        if (paper && paper.questions.length > 0) {
          return await enrichPaperWithDiagramFields(paper, decoded, file);
        }
      }
    }

    // 3. Try matching by title pattern (for non-numeric slugs)
    if (!isNumeric) {
      const urlFilename = decoded.includes('/') ? decoded.split('/').pop()?.split('?')[0] : null;
      const cleanFilename = urlFilename?.replace(/\.pdf$/i, '');
      paper = await prisma.paper.findFirst({
        where: {
          OR: [
            { id: decoded },
            { title: { contains: decoded.replaceAll('-', ' '), mode: 'insensitive' as const } },
            ...(cleanFilename ? [
              { id: cleanFilename },
              { title: { equals: cleanFilename, mode: 'insensitive' as const } },
              { title: { contains: cleanFilename, mode: 'insensitive' as const } },
            ] : []),
          ],
        },
        include: {
          questions: {
            include: {
              topic: true,
            },
            orderBy: { sequenceNum: 'asc' },
          },
        },
      });

      if (paper && paper.questions.length > 0) {
        return await enrichPaperWithDiagramFields(paper, decoded);
      }
    }

    return null;
  } catch (error) {
    console.error('[PaperService] Error fetching paper:', error);
    return null;
  }
}

async function enrichPaperWithDiagramFields(paper: any, decodedId?: string, fileObj?: any): Promise<ProcessedPaper> {
  const paperId = paper.id;
  try {
    let rawQuestions: any[] = [];
    try {
      rawQuestions = await prisma.$queryRawUnsafe(
        'SELECT id, "diagramSvg", "imageUrl", "pageNumber", type, subject FROM "Question" WHERE "paperId" = $1',
        paperId
      );
    } catch {
      // Fallback query if subject column is not yet present in PostgreSQL schema
      rawQuestions = await prisma.$queryRawUnsafe(
        'SELECT id, "diagramSvg", "imageUrl", "pageNumber", type FROM "Question" WHERE "paperId" = $1',
        paperId
      );
    }

    const qMap = new Map<string, any>();
    for (const rq of rawQuestions) {
      qMap.set(rq.id, rq);
    }

    for (const q of paper.questions) {
      const rq = qMap.get(q.id);
      if (rq) {
        if (rq.diagramSvg) q.diagramSvg = rq.diagramSvg;
        if (rq.imageUrl) q.imageUrl = rq.imageUrl;
        if (rq.pageNumber) q.pageNumber = rq.pageNumber;
        if (rq.type) q.type = rq.type;
        if (rq.subject) q.subject = rq.subject;
        if (rq.solutionText) q.solutionText = rq.solutionText;
        if (rq.solutionSvg) q.solutionSvg = rq.solutionSvg;
      }
    }
    // Enrich instructions from Paper table or dynamically synthesize if missing
    try {
      const rawPaper: any[] = await prisma.$queryRawUnsafe(
        'SELECT instructions FROM "Paper" WHERE id = $1',
        paper.id
      );
      if (rawPaper?.[0]?.instructions) {
        (paper as any).instructions = rawPaper[0].instructions;
      } else if (paper.questions && paper.questions.length > 0) {
        const instructionsData = await generateCustomInstructions({
          paperTitle: paper.title,
          examType: paper.examType,
          subject: paper.subject,
          year: paper.year,
          durationMin: paper.durationMin,
          totalMarks: paper.totalMarks,
          questions: paper.questions,
        });
        (paper as any).instructions = JSON.stringify(instructionsData);
        prisma.$executeRawUnsafe(
          'UPDATE "Paper" SET instructions = $1 WHERE id = $2',
          JSON.stringify(instructionsData),
          paper.id
        ).catch((err) => console.warn('[PaperService] Save instructions error:', err));
      }
    } catch (iErr) {
      console.warn('[PaperService] Paper instructions fetch note:', iErr);
    }
  } catch (err) {
    console.warn('[PaperService] Raw SQL diagram field enrichment note:', err);
  }

  let sourcePdfUrl: string | null = null;
  try {
    let file = fileObj;
    if (!file) {
      const isNum = decodedId && /^\d+$/.test(decodedId);
      const isPaperIdNum = /^\d+$/.test(paperId);
      const orClauses: any[] = [
        { fileName: { contains: decodedId || paper.title, mode: 'insensitive' } },
      ];
      if (isPaperIdNum) {
        orClauses.push({ id: Number(paperId) });
      }

      file = await prisma.file.findFirst({
        where: isNum ? { id: Number(decodedId) } : { OR: orClauses },
        select: { s3Key: true },
      });
    }
    if (file?.s3Key) {
      const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.studyhub.yashguptaiiit.in/';
      const cleanKey = file.s3Key.replace(/^\/+/, '');
      const cleanCdn = cdnUrl.endsWith('/') ? cdnUrl : `${cdnUrl}/`;
      sourcePdfUrl = `${cleanCdn}${cleanKey}`;
    }
  } catch (fErr) {
    console.warn('[PaperService] File lookup note:', fErr);
  }

  return formatPaperResponse(paper, sourcePdfUrl);
}

/**
 * Robust JSON parser that handles raw unescaped LaTeX backslashes from LLM mathematical outputs
 * (e.g. \frac, \sqrt, \alpha, \theta), markdown code fences, and trailing commas.
 */
export function safeJsonParse<T = any>(raw: string): T | null {
  try {
    return JSON.parse(raw);
  } catch {
    let cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    // Fix unescaped backslashes inside JSON strings (e.g. \frac, \alpha, \sqrt in LaTeX math)
    cleaned = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    try {
      return JSON.parse(cleaned);
    } catch {
      // If truncated mid-stream, repair by testing multiple valid closing configurations
      const lastObjEnd = cleaned.lastIndexOf('}');
      if (lastObjEnd !== -1) {
        const repaired = cleaned.slice(0, lastObjEnd + 1);
        try {
          return JSON.parse(repaired);
        } catch {
          try {
            return JSON.parse(repaired + ']}');
          } catch {
            try {
              return JSON.parse(repaired + '}');
            } catch { }
          }
        }
      }
      return null;
    }
  }
}

function inferQuestionType(q: any): QuestionType {
  const opts = q.options || [];
  const text = q.text || '';
  const hasNumericalSignals =
    opts.length <= 1 ||
    /is\s*_{2,}|value\s+of\b.*?\bis\b|amount\s+.*?\bis\b|in\s+grams\s+.*?\bis\b|ratio\s+.*?\bis\b|enter\s+the\s+correct\s+numerical\s+value|nearest\s+integer|truncated\s+to\s+two\s+decimal\s+places/i.test(
      text
    );

  if (q.type === 'numerical' || (hasNumericalSignals && opts.length <= 1)) {
    return 'numerical';
  }
  if (opts.length === 0) return hasNumericalSignals ? 'numerical' : 'text_subjective';
  if (opts.length === 1) return 'numerical';

  const correctCount = opts.filter((o: any) => o.isCorrect).length;
  if (q.type === 'mcq_multiple' || correctCount > 1) return 'mcq_multiple';
  if (q.type && ['mcq_single', 'mcq_multiple', 'numerical', 'text_subjective'].includes(q.type)) {
    return q.type as QuestionType;
  }
  return 'mcq_single';
}

export const VALID_ACADEMIC_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Science',
  'Social Science',
  'English',
  'Hindi',
  'Computer Science',
];

/**
 * Checks whether a given string is an exam identifier rather than a subject.
 */
export function isExamName(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return false;
  const s = name.trim().toLowerCase();
  return (
    s === 'jee_advanced' ||
    s === 'jee advanced' ||
    s === 'jee_main' ||
    s === 'jee main' ||
    s === 'jee' ||
    s === 'neet' ||
    s === 'bitsat' ||
    s.startsWith('jee_') ||
    s.startsWith('jee ')
  );
}

/**
 * Sanitizes any input subject string to ensure it is a valid academic subject or exam name,
 * ensuring exam types like 'JEE_Advanced', 'JEE Main', 'NEET' resolve to clean exam titles
 * and NEVER default to 'Physics'.
 */
export function sanitizeAcademicSubject(subject?: string | null, fallback: string = 'General'): string {
  if (!subject || typeof subject !== 'string') return fallback;
  const trimmed = subject.trim().replaceAll('_', ' ');
  return trimmed || fallback;
}

/**
 * Infer or extract the subject for a question based on authentic metadata and extracted sections,
 * avoiding inaccurate keyword lexicon guessing and artificial partitioning.
 */
export function inferQuestionSubject(
  q: any,
  defaultSubject?: string,
  _index?: number,
  _totalQuestions?: number
): string {
  // 1. If question already has an authentic academic subject from parsing, preserve it
  if (q.subject && typeof q.subject === 'string' && q.subject.trim()) {
    return q.subject.trim().replaceAll('_', ' ');
  }

  // 2. If topic subject is an authentic academic subject
  if (q.topic?.subject && typeof q.topic.subject === 'string' && q.topic.subject.trim()) {
    return q.topic.subject.trim().replaceAll('_', ' ');
  }

  // 3. Fallback to authentic paper default subject or exam name
  return (defaultSubject || 'General').trim().replaceAll('_', ' ');
}

/**
 * Format Prisma Paper model into ProcessedPaper structure
 */
function formatPaperResponse(paper: any, sourcePdfUrl?: string | null): ProcessedPaper {
  let instructionsData: PaperInstructionsData | null = null;
  if (paper.instructions) {
    try {
      instructionsData =
        typeof paper.instructions === 'string'
          ? JSON.parse(paper.instructions)
          : paper.instructions;
    } catch {
      instructionsData = null;
    }
  }

  return {
    id: paper.id,
    title: paper.title,
    subject: paper.subject,
    examType: paper.examType,
    year: paper.year,
    totalMarks: paper.totalMarks,
    durationMin: paper.durationMin,
    sourcePdfUrl: sourcePdfUrl || null,
    instructionsData,
    questions: paper.questions.map((q: any, idx: number) => {
      const qType = inferQuestionType(q);
      const subject = inferQuestionSubject(q, paper.subject);
      const isNegativeZero = (paper.examType || '').toUpperCase().includes('CBSE');
      const negativeMarks = q.negativeMarks !== undefined && q.negativeMarks !== null
        ? q.negativeMarks
        : (isNegativeZero ? 0 : 1);

      return {
        id: q.id,
        sequenceNum: q.sequenceNum || idx + 1,
        text: q.text,
        type: qType,
        imageUrl: q.imageUrl || null,
        diagramSvg: q.diagramSvg || null,
        pageNumber: q.pageNumber || null,
        marks: q.marks,
        negativeMarks,
        topic: q.topic?.name || 'General',
        subject,
        options: (q.options || []).map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          imageUrl: opt.imageUrl || null,
          isCorrect: opt.isCorrect,
          sequenceNum: opt.sequenceNum,
        })),
      };
    }),
  };
}

/**
 * Dynamically extracts the exam or test type from the URL, S3 key, or directory structure
 * without hardcoding any specific exam name.
 */
export function extractExamTypeFromContext(
  contextPathOrUrl: string,
  fileRecord?: { exam?: string | null; subject?: string | null; s3Key?: string | null; fileName?: string | null } | null,
  fallback: string = 'Exam'
): string {
  const combined = `${fileRecord?.s3Key || ''} ${contextPathOrUrl || ''}`.trim();
  if (combined) {
    const clean = combined.split('?')[0].split('#')[0].replace(/\\/g, '/');
    const parts = clean.split('/').map((p) => p.trim()).filter(Boolean);
    // Remove filename with extension
    const dirParts = parts.filter((p) => !p.includes('.') && !p.includes(':'));
    const genericWords = new Set(['common', 'papers', 'paper', 'files', 'file', 'uploads', 'upload', 'static', 'media', 'data', 'input', 'pdf']);
    const meaningful = dirParts.filter((p) => !genericWords.has(p.toLowerCase()) && !/^\d+$/.test(p));
    if (meaningful.length > 0) {
      // The most specific directory closest to the file
      return meaningful[meaningful.length - 1];
    }
  }

  if (fileRecord?.subject && !['General', 'Physics', 'Chemistry', 'Mathematics', 'Biology'].includes(fileRecord.subject)) {
    return fileRecord.subject.replaceAll(' ', '_');
  }
  if (fileRecord?.exam) {
    return fileRecord.exam.replaceAll(' ', '_');
  }

  return fallback;
}

export function inferYear(str: string): number {
  const match = str.match(/\b(20[0-3]\d|19[89]\d)\b/);
  return match ? Number(match[1]) : 2025;
}

/**
 * Processing pipeline: uses the Planner-Worker microservice to parse the PDF,
 * stores the canonical ExamPaper JSON as native BSON/JSONB into PostgreSQL,
 * and populates the database tables.
 */
export async function extractAndPopulatePaper(
  idOrRef: string,
  force: boolean = false,
  examParam?: string | null
): Promise<ProcessedPaper> {
  const decoded = decodeURIComponent(idOrRef).trim();
  const isNumeric = /^\d+$/.test(decoded);

  // 1. Locate the source paper record in File table
  let sourceFile: any = null;
  if (isNumeric) {
    sourceFile = await prisma.file.findUnique({
      where: { id: Number(decoded) },
    });
  }

  // Extract clean filename stem from URL or path (e.g. "2025_1_English" from ".../2025_1_English.pdf")
  const urlFilename = decoded.includes('/') ? decoded.split('/').pop()?.split('?')[0] : decoded;
  const cleanFilename = urlFilename?.replace(/\.pdf$/i, '');

  if (!sourceFile) {
    sourceFile = await prisma.file.findFirst({
      where: {
        OR: [
          { fileName: { contains: decoded.replaceAll('-', ' '), mode: 'insensitive' as const } },
          { fileName: { contains: decoded, mode: 'insensitive' as const } },
          ...(cleanFilename ? [
            { fileName: { contains: cleanFilename, mode: 'insensitive' as const } },
            { s3Key: { contains: cleanFilename, mode: 'insensitive' as const } },
          ] : []),
        ],
      },
    });
  }

  const contextStr = `${sourceFile?.s3Key || ''} ${sourceFile?.fileName || ''} ${decoded}`;

  // Dynamically resolve examType without hardcoding
  const resolvedExam =
    (examParam && !['practice', 'timed'].includes(examParam.toLowerCase()) ? examParam : null) ||
    extractExamTypeFromContext(contextStr, sourceFile, sourceFile?.exam || 'Exam');
  const examType = resolvedExam;

  let subject: string;
  if (sourceFile?.subject) {
    subject = sourceFile.subject.replaceAll('_', ' ').trim();
  } else {
    subject = examType.replaceAll('_', ' ').trim() || 'General';
  }

  const yearMatch = contextStr.match(/\b(20\d\d)\b/);
  const year = sourceFile?.year || (yearMatch ? Number(yearMatch[1]) : inferYear(decoded)) || 2025;
  const rawStem = sourceFile?.fileName
    ? sourceFile.fileName.replace(/\.pdf$/i, '')
    : (cleanFilename || decoded.replaceAll('-', ' '));
  const paperTitle = rawStem || 'Paper';
  const paperIdToSave = isNumeric ? String(sourceFile?.id || decoded) : (cleanFilename || rawStem || decoded);

  let sourcePdfUrl: string | null = null;
  if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
    sourcePdfUrl = decoded;
  } else if (sourceFile?.s3Key) {
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.studyhub.yashguptaiiit.in/';
    const cleanKey = sourceFile.s3Key.replace(/^\/+/, '');
    const cleanCdn = cdnUrl.endsWith('/') ? cdnUrl : `${cdnUrl}/`;
    sourcePdfUrl = `${cleanCdn}${encodeURI(cleanKey)}`;
  }

  let localPdfPath: string | null = null;
  const candidateScratch = path.resolve(process.cwd(), `scratch/${sourceFile?.fileName || decoded}`);
  const candidateWithPdf = path.resolve(process.cwd(), `scratch/${sourceFile?.fileName || decoded}.pdf`);
  const candidateDirect = path.resolve(process.cwd(), `scratch/${decoded}.pdf`);
  if (fs.existsSync(candidateWithPdf)) {
    localPdfPath = candidateWithPdf;
  } else if (fs.existsSync(candidateScratch) && candidateScratch.endsWith('.pdf')) {
    localPdfPath = candidateScratch;
  } else if (fs.existsSync(candidateDirect)) {
    localPdfPath = candidateDirect;
  }

  if (!sourcePdfUrl && !localPdfPath) {
    throw new Error(`Cannot parse paper "${paperTitle}": No valid source PDF URL or local path found.`);
  }

  console.log(`[PaperService] Executing Planner-Worker pipeline via microservice (http://localhost:8001)...`);
  const serviceRes = await parsePdfWithService({
    pdfUrl: sourcePdfUrl || undefined,
    pdfPath: localPdfPath || undefined,
    paperId: paperIdToSave,
    paperTitle,
    examType,
    year,
    subject,
  });

  if (!serviceRes.success || !serviceRes.paper || serviceRes.paper.questions.length === 0) {
    const errMsg = serviceRes.errors?.join(', ') || 'Planner-Worker pipeline did not return questions';
    throw new Error(`Failed to parse paper "${paperTitle}" with Planner-Worker pipeline: ${errMsg}`);
  }

  const canonicalPaper = serviceRes.paper;
  console.log(`[PaperService] Planner-Worker pipeline successfully parsed ${canonicalPaper.questions.length} questions in ${serviceRes.processingTimeMs}ms!`);

  // Build asset map for quick image lookup
  const assetMap = new Map<string, string>();
  for (const a of canonicalPaper.assets || []) {
    if (a.id && a.url) assetMap.set(a.id, a.url);
  }

  const mappedQuestions = canonicalPaper.questions.map((q, idx) => {
    const qNum = typeof q.number === 'number' ? q.number : idx + 1;
    let imgUrl: string | null = null;
    if (q.images && q.images.length > 0) {
      const firstId = q.images[0].assetId;
      if (firstId && assetMap.has(firstId)) {
        imgUrl = assetMap.get(firstId) || null;
      }
    }

    if (!imgUrl) {
      for (const a of canonicalPaper.assets || []) {
        if (a.metadata?.assignedQuestion === qNum && !a.metadata?.assignedOption && a.url) {
          imgUrl = a.url;
          break;
        }
      }
    }

    const qTypeStr = (q.type || 'SINGLE_CHOICE').toUpperCase();
    const isNumerical = qTypeStr.includes('NUMERICAL') || qTypeStr.includes('INTEGER') || qTypeStr.includes('DECIMAL');
    const questionSubject = (q as any).subject || (q.metadata && q.metadata.subject) || subject;

    const mappedOptions = (q.options || []).map((opt, oIdx) => {
      let optImgUrl: string | null = null;
      if (opt.images && opt.images.length > 0 && opt.images[0].assetId) {
        optImgUrl = assetMap.get(opt.images[0].assetId) || null;
      }

      // Fallback: check if an asset was physically anchored to this option label
      const optLabel = typeof opt.label === 'string' ? opt.label.trim().toUpperCase() : String.fromCharCode(65 + oIdx);
      if (!optImgUrl) {
        for (const a of canonicalPaper.assets || []) {
          if (a.metadata?.assignedQuestion === qNum && a.metadata?.assignedOption === optLabel && a.url) {
            optImgUrl = a.url;
            break;
          }
        }
      }

      const isUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
      const optId = isUuid((opt as any).id) ? (opt as any).id : crypto.randomUUID();
      return {
        id: optId,
        label: optLabel,
        text: opt.text || '',
        imageUrl: optImgUrl,
        isCorrect: Boolean(opt.isCorrect),
        sequenceNum: oIdx,
      };
    });

    const correctOptionIds = (q as any).correctOptionIds && (q as any).correctOptionIds.length > 0
      ? (q as any).correctOptionIds
      : mappedOptions.filter((o) => o.isCorrect).map((o) => o.id);

    let numericalAnswer = (q as any).numericalAnswer || null;
    if (!numericalAnswer && isNumerical && q.answer !== undefined) {
      const parsedNum = parseFloat(String(q.answer));
      if (!isNaN(parsedNum)) {
        numericalAnswer = { value: parsedNum, tolerance: 0.05, range: [parsedNum - 0.05, parsedNum + 0.05] };
      }
    }

    const isUuidStr = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    const qId = isUuidStr(q.id) ? q.id : crypto.randomUUID();
    const extractedTopic = String(
      (q as any).suggestedTopic || (q as any).topic || q.metadata?.topic || 'General Concepts'
    ).trim();

    return {
      id: qId,
      sequenceNum: qNum,
      text: q.question || '',
      type: isNumerical ? 'numerical' : 'mcq_single',
      imageUrl: imgUrl,
      diagramSvg: null,
      subject: questionSubject,
      topic: extractedTopic || 'General Concepts',
      marks: q.marks || 4,
      negativeMarks: q.negativeMarks ?? 1,
      options: mappedOptions,
      correctOptionIds,
      numericalAnswer,
      solutionText: (q as any).solutionText || (q as any).solution || null,
      solutionSvg: (q as any).solutionSvg || null,
    };
  });

  // Use the canonical exam metadata extracted by the parser as source of truth.
  // This ensures the Paper DB table stores the real exam name (e.g. "JEE Advanced 2023 Paper 1")
  // and the correct examType / year rather than a generic fallback from the filename.
  const finalTitle = canonicalPaper.exam?.name || paperTitle;
  const finalExamType = canonicalPaper.exam?.examType || examType;
  const finalYear = canonicalPaper.exam?.year || year;

  const parsedData = {
    title: finalTitle,
    subject,
    examType: finalExamType,
    year: finalYear,
    totalMarks: canonicalPaper.exam?.maximumMarks || mappedQuestions.length * 4,
    durationMin: canonicalPaper.exam?.durationMinutes || 180,
    questions: mappedQuestions,
  };

  // Clean up any stale/partial paper with this ID if it exists
  const existingPaper = await prisma.paper.findUnique({
    where: { id: paperIdToSave },
    include: { questions: { take: 1 } },
  });

  if (existingPaper && existingPaper.questions.length > 0 && !force) {
    const existingResult = await getPaperFromDatabase(paperIdToSave);
    if (existingResult) return existingResult;
  } else if (existingPaper) {
    await prisma.question.deleteMany({
      where: { paperId: paperIdToSave },
    });
    await prisma.paper.delete({
      where: { id: paperIdToSave },
    });
  }

  // Normalize topics and pre-resolve or create distinct topics per subject
  const topicMap: Record<string, string> = {};
  for (const q of parsedData.questions) {
    const qSubj = q.subject || sanitizeAcademicSubject(parsedData.subject, parsedData.examType || 'JEE Main');
    const rawTopic = q.topic || (q as any).metadata?.topic;
    const normalizedTopic = normalizeTopic(rawTopic, qSubj);
    q.topic = normalizedTopic;

    const key = `${qSubj}:::${normalizedTopic}`;
    if (!topicMap[key]) {
      const existing = await prisma.topic.findFirst({
        where: { name: normalizedTopic, subject: qSubj },
      });
      if (existing) {
        topicMap[key] = existing.id;
      } else {
        const created = await prisma.topic.create({
          data: { name: normalizedTopic, subject: qSubj },
        });
        topicMap[key] = created.id;
      }
    }
  }

  const defaultTopic = await prisma.topic.findFirst({
    where: { subject: parsedData.subject || subject },
  });
  const defaultTopicId = defaultTopic?.id || (await prisma.topic.create({
    data: { name: 'General Concepts', subject: parsedData.subject || subject },
  })).id;

  const savedPaper = await prisma.paper.create({
    data: {
      id: paperIdToSave,
      title: finalTitle,
      subject: parsedData.subject,
      examType: finalExamType,
      year: finalYear,
      totalMarks: parsedData.totalMarks,
      durationMin: parsedData.durationMin,
      questions: {
        create: parsedData.questions.map((q: any, i: number) => {
          const qSubj = q.subject || sanitizeAcademicSubject(parsedData.subject, parsedData.examType || 'JEE Main');
          const topicId = topicMap[`${qSubj}:::${q.topic}`] || defaultTopicId;
          return {
            id: q.id || undefined,
            sequenceNum: q.sequenceNum || i + 1,
            text: q.text,
            type: q.type || 'mcq_single',
            imageUrl: q.imageUrl || null,
            diagramSvg: q.diagramSvg || null,
            subject: qSubj,
            marks: q.marks || 4,
            negativeMarks: q.negativeMarks ?? 1,
            topicId,
            options: q.options || [],
            correctOptionIds: q.correctOptionIds || [],
            numericalAnswer: q.numericalAnswer || null,
            solutionText: q.solutionText || null,
            solutionSvg: q.solutionSvg || null,
          };
        }),
      },
    },
  });

  // Synthesize exam instructions
  try {
    const instructionsData = await generateCustomInstructions({
      paperTitle: finalTitle || paperTitle,
      examType: finalExamType || examType,
      subject: parsedData.subject || subject,
      year: finalYear || year,
      durationMin: parsedData.durationMin || 180,
      totalMarks: parsedData.totalMarks || parsedData.questions.length * 4,
      questions: parsedData.questions,
      rawPreambleText: (serviceRes.plannerBlueprint?.instructions || []).join('\n'),
    });

    if (instructionsData) {
      await prisma.$executeRawUnsafe(
        'UPDATE "Paper" SET instructions = $1 WHERE id = $2',
        JSON.stringify(instructionsData),
        savedPaper.id
      );
    }
  } catch (insErr) {
    console.warn('[PaperService] Instruction generation note:', insErr);
  }

  // Save canonical documentJson as native BSON / JSONB in PostgreSQL
  try {
    await prisma.$executeRawUnsafe(
      'UPDATE "Paper" SET "documentJson" = $1::jsonb WHERE id = $2',
      JSON.stringify(canonicalPaper),
      savedPaper.id
    );
    console.log(`[PaperService] Stored canonical ExamPaper BSON/JSONB into Postgres Paper table for ID: ${savedPaper.id}`);
  } catch (saveJsonErr) {
    console.warn('[PaperService] Warning saving documentJson to Postgres:', saveJsonErr);
  }

  // Non-blocking background solution & answer key enrichment
  try {
    enrichPaperSolutionsInBackground(savedPaper.id);
  } catch (enrichErr) {
    console.warn('[PaperService] Background solution enrichment notice:', enrichErr);
  }

  const finalPaper = await getPaperFromDatabase(savedPaper.id);
  if (!finalPaper) {
    throw new Error('Failed to retrieve newly populated paper');
  }

  return finalPaper;
}
