import { NextResponse, after } from 'next/server';
import { prisma } from '@repo/db/client';
import { redis } from '../../../../lib/redis';
import { getDynamicPaper } from '../../../../lib/dynamic-paper-provider';
import { JEE_MAIN_DEFAULT_PAPER } from '../../../../lib/jee-mock-paper';
import { classifyExamTelemetry } from '@repo/exam-core';
import type { Question } from '@repo/exam-core';
import { getServerSession, authOptions } from '@repo/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const payload = await req.json();
    const {
      attemptId,
      userId: clientUserId = 'anonymous',
      paperId,
      paperTitle,
      answers = {},
      review = [],
      visited = [],
      telemetry = {},
      subjectTimeSpent = {},
      durationSeconds = 10800,
      timeSpentSeconds = 3600,
      violationsCount = 0,
      autoSubmitted = false,
      autoSubmitReason,
    } = payload;

    // Use verified session identity when authenticated
    const sessionUserId = (session?.user as any)?.id ? String((session?.user as any).id) : session?.user?.email;
    const userId = sessionUserId || clientUserId;

    if (!paperId) {
      return NextResponse.json({ error: 'Missing paperId in submission payload' }, { status: 400 });
    }

    console.log(`[SubmitRoute] Processing exam submission: attemptId=${attemptId}, paperId=${paperId}, user=${userId}`);

    // 1. Fetch Paper and canonical Questions from PostgreSQL "Paper" table
    let dbPaper = null;
    try {
      dbPaper = await prisma.paper.findFirst({
        where: {
          OR: [
            { id: String(paperId) },
            { title: String(paperId) },
          ],
        },
        include: {
          questions: {
            include: { topic: true },
            orderBy: { sequenceNum: 'asc' },
          },
        },
      });
    } catch (dbErr: any) {
      console.warn('[SubmitRoute] Database paper lookup warning:', dbErr?.message || dbErr);
    }

    let questions: Question[] = [];
    let activePaperTitle = paperTitle || 'Examination Paper';

    if (dbPaper && dbPaper.questions && dbPaper.questions.length > 0) {
      console.log(`[SubmitRoute] Found canonical Paper in PostgreSQL: "${dbPaper.title}" with ${dbPaper.questions.length} questions`);
      activePaperTitle = dbPaper.title;
      questions = dbPaper.questions.map((q, idx) => {
        const rawOptions = Array.isArray(q.options) ? (q.options as any[]) : [];
        const correctIds = q.correctOptionIds || [];

        return {
          id: q.id,
          text: q.text || '',
          type: q.type || 'mcq_single',
          sequenceNum: q.sequenceNum ?? (idx + 1),
          subject: q.subject || dbPaper.subject,
          topicId: q.topic?.name || 'General Topic',
          marks: q.marks || 4,
          negativeMarks: q.negativeMarks ?? 1,
          options: rawOptions.map((opt: any) => ({
            id: opt.id,
            label: opt.label || '',
            text: opt.text || '',
            isCorrect: Boolean(opt.isCorrect || correctIds.includes(opt.id)),
          })),
          correctOptionId: correctIds[0] || rawOptions.find((o: any) => o.isCorrect)?.id,
          numericalAnswer: q.numericalAnswer,
        };
      });
    } else {
      // Fallback for mock papers or unseeded development tests
      const fallbackPaper = getDynamicPaper(paperId) || JEE_MAIN_DEFAULT_PAPER;
      activePaperTitle = fallbackPaper.title;
      questions = (fallbackPaper.questions || []).map((q: any, idx: number) => ({
        id: q.id || `q_${idx + 1}`,
        text: q.text || '',
        type: q.type || 'mcq_single',
        sequenceNum: q.sequenceNum ?? (idx + 1),
        subject: q.subject || fallbackPaper.subject,
        topicId: q.topic || 'General Topic',
        marks: q.marks || 4,
        negativeMarks: q.negativeMarks ?? 1,
        options: (q.options || []).map((opt: any) => ({
          id: opt.id,
          label: opt.label,
          text: opt.text,
          isCorrect: Boolean(opt.isCorrect),
        })),
        correctOptionId: q.options?.find((o: any) => o.isCorrect)?.id,
        numericalAnswer: q.numericalAnswer,
      }));
    }

    // 2. Run deterministic behavioral classification (< 15ms in-memory)
    const isUuid = Boolean(attemptId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId));
    const effectiveAttemptId = isUuid
      ? attemptId
      : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`);

    const { humanReadableReport, normalizedRecord } = classifyExamTelemetry({
      submission: {
        attemptId: effectiveAttemptId,
        userId: String(userId),
        paperId: String(paperId),
        paperTitle: activePaperTitle,
        submittedAt: Date.now(),
        durationSeconds,
        timeSpentSeconds,
        answers,
        telemetry,
        subjectTimeSpent,
        violationsCount,
        autoSubmitted,
        autoSubmitReason,
      },
      questions,
    });

    // 3. Synchronously persist into Redis AND PostgreSQL (ExamAttempt + AIGuidanceReport)
    try {
      const studentCacheKey = `student:${userId}:latest_exam_analysis`;
      const attemptCacheKey = `exam:${effectiveAttemptId}:analysis`;
      const paperCacheKey = `paper:${paperId}:latest_attempt`;

      // A) Hot Cache in Redis (TTL: 7 days)
      const sessionToCache = {
        attemptId: effectiveAttemptId,
        paperId: dbPaper?.id || paperId,
        paperTitle: activePaperTitle,
        answers,
        review,
        visited,
        telemetry,
        subjectTimeSpent,
        humanReadableReport,
      };
      const sessionJson = JSON.stringify(sessionToCache);
      await redis.set(studentCacheKey, sessionJson, 'EX', 86400 * 7);
      await redis.set(attemptCacheKey, sessionJson, 'EX', 86400 * 7);
      await redis.set(paperCacheKey, sessionJson, 'EX', 86400 * 7);
      console.log(`[SubmitRoute] Stored session and humanReadableReport in Redis: ${attemptCacheKey}`);

      // B) Persistent Storage in PostgreSQL (ExamAttempt + AIGuidanceReport)
      if (dbPaper) {
        try {
          await prisma.examAttempt.upsert({
            where: { id: effectiveAttemptId },
            create: {
              id: effectiveAttemptId,
              studentId: String(userId || 'anonymous'),
              paperId: dbPaper.id,
              status: 'SUBMITTED',
              startedAt: new Date(Date.now() - (timeSpentSeconds || 3600) * 1000),
              submittedAt: new Date(),
              evaluatedAt: new Date(),
              config: {
                score: humanReadableReport.scores.totalAwarded,
                maxScore: humanReadableReport.scores.maxPossible,
                accuracyRate: humanReadableReport.scores.accuracyRate,
                answers,
                review,
                visited,
                telemetry,
                subjectTimeSpent,
                humanReadableReport: humanReadableReport as any,
              } as any,
            },
            update: {
              status: 'SUBMITTED',
              submittedAt: new Date(),
              evaluatedAt: new Date(),
              config: {
                score: humanReadableReport.scores.totalAwarded,
                maxScore: humanReadableReport.scores.maxPossible,
                accuracyRate: humanReadableReport.scores.accuracyRate,
                answers,
                review,
                visited,
                telemetry,
                subjectTimeSpent,
                humanReadableReport: humanReadableReport as any,
              } as any,
            },
          });

          await prisma.aIGuidanceReport.upsert({
            where: {
              attemptId_reportVersion: {
                attemptId: effectiveAttemptId,
                reportVersion: 'v1.0-telemetry',
              },
            },
            create: {
              attemptId: effectiveAttemptId,
              reportVersion: 'v1.0-telemetry',
              inputVersion: 'v1',
              status: 'completed',
              reportJson: humanReadableReport as any,
            },
            update: {
              reportJson: humanReadableReport as any,
              status: 'completed',
            },
          });
          console.log(`[SubmitRoute] Successfully persisted ExamAttempt & GuidanceReport in PostgreSQL for attempt ${effectiveAttemptId}`);
        } catch (pgErr: any) {
          console.error('[SubmitRoute] PostgreSQL ExamAttempt upsert warning:', pgErr?.message || pgErr);
        }
      }
    } catch (cacheErr) {
      console.error('[SubmitRoute] Caching/persistence warning:', cacheErr);
    }

    // 4. Asynchronously pre-generate the 6-Section Diagnostic Report in background
    try {
      const origin = req.headers.get('origin') || 'http://localhost:3001';
      fetch(`${origin}/api/exam/diagnostic-report/${encodeURIComponent(effectiveAttemptId)}`, {
        method: 'POST',
      }).catch(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      attemptId: humanReadableReport.attemptId,
      score: humanReadableReport.scores.totalAwarded,
      accuracy: humanReadableReport.scores.accuracyRate,
      report: humanReadableReport,
    });
  } catch (error: any) {
    console.error('[SubmitRoute] Error processing exam submission:', error?.message || error);
    return NextResponse.json({ error: 'Failed to process exam submission', message: error?.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
