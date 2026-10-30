import { NextResponse } from 'next/server';
import { prisma } from '@repo/db/client';
import { redis } from '../../../../../lib/redis';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing attempt or paper id' }, { status: 400 });
    }

    const decodedId = decodeURIComponent(id).trim();
    const url = new URL(request.url);
    const forcePseudo = url.searchParams.get('pseudo') === 'true';

    // Helper to check for rich pseudo attempt file
    const getPseudoAttempt = () => {
      const fs = require('fs');
      const path = require('path');
      const possiblePaths = [
        path.resolve(process.cwd(), `../../pseudo_attempt_${decodedId}.json`),
        path.resolve(process.cwd(), `pseudo_attempt_${decodedId}.json`),
        path.resolve(process.cwd(), `scratch_pseudo_attempt_${decodedId}.json`),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          try {
            return JSON.parse(fs.readFileSync(p, 'utf8'));
          } catch {}
        }
      }
      return null;
    };

    if (forcePseudo) {
      const pseudo = getPseudoAttempt();
      if (pseudo) {
        return NextResponse.json({
          status: 'SUCCESS',
          source: 'pseudo_file',
          attemptId: pseudo.attemptId || decodedId,
          paperId: decodedId,
          paperTitle: pseudo.paperTitle,
          durationSeconds: pseudo.durationSeconds || 10800,
          timeSpentSeconds: pseudo.timeSpentSeconds || 4136,
          answers: pseudo.answers || {},
          review: pseudo.review || [],
          visited: pseudo.visited || [],
          telemetry: pseudo.telemetry || {},
          subjectTimeSpent: pseudo.subjectTimeSpent || {},
        });
      }
    }

    // 1. Try Redis cache first (both by paperId and attemptId)
    try {
      const cached = (await redis.get(`paper:${decodedId}:latest_attempt`)) || (await redis.get(`exam:${decodedId}:analysis`));
      if (cached) {
        const parsed = JSON.parse(cached);
        const ansCount = Object.keys(parsed.answers || {}).length;
        
        // If Redis only has a partial attempt (<= 4 answers) but a rich pseudo attempt exists, check if user requested fallback
        const pseudo = ansCount <= 4 ? getPseudoAttempt() : null;
        const target = (pseudo && Object.keys(pseudo.answers || {}).length > ansCount) ? pseudo : parsed;

        return NextResponse.json({
          status: 'SUCCESS',
          source: target === pseudo ? 'pseudo_fallback' : 'redis',
          attemptId: target.attemptId || decodedId,
          paperId: target.paperId || decodedId,
          paperTitle: target.paperTitle,
          durationSeconds: target.durationSeconds || 10800,
          timeSpentSeconds: target.timeSpentSeconds || (target.humanReadableReport?.scores?.totalTimeSpentMinutes ? target.humanReadableReport.scores.totalTimeSpentMinutes * 60 : 3600),
          answers: target.answers || {},
          review: target.review || [],
          visited: target.visited || [],
          telemetry: target.telemetry || {},
          subjectTimeSpent: target.subjectTimeSpent || {},
          humanReadableReport: target.humanReadableReport || target.report || target,
        });
      }
    } catch {}

    // 2. Query PostgreSQL
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { paperId: decodedId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        guidanceReports: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ status: 'NOT_FOUND', message: 'No attempt found' }, { status: 404 });
    }

    const config = (attempt.config as any) || {};
    const guidance = attempt.guidanceReports?.[0];

    return NextResponse.json({
      status: 'SUCCESS',
      source: 'database',
      attemptId: attempt.id,
      paperId: attempt.paperId,
      startedAt: attempt.startedAt.getTime(),
      submittedAt: attempt.submittedAt?.getTime() || Date.now(),
      score: config.score,
      maxScore: config.maxScore,
      accuracyRate: config.accuracyRate,
      answers: config.answers || {},
      review: config.review || [],
      visited: config.visited || [],
      telemetry: config.telemetry || {},
      subjectTimeSpent: config.subjectTimeSpent || {},
      humanReadableReport: config.humanReadableReport || guidance?.reportJson || null,
      aiReport: (guidance as any)?.coachingPlan || (guidance as any)?.reportJson?.coachingPlan || null,
    });
  } catch (error: any) {
    console.error('[AttemptAPI] Error loading attempt:', error);
    return NextResponse.json({ error: 'Failed to load attempt', message: error?.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
