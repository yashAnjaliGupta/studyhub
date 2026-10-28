import { NextRequest, NextResponse } from 'next/server';
import {
  enrichQuestionSolution,
  enrichQuestionsBatch,
  enrichPaperSolutionsInBackground,
} from '../../../../lib/solution-generator';
import { prisma } from '@repo/db/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { questionId, questionIds, paperId, isBackground = false, force = false, limit = 20 } = body;

    // 1. Single question enrichment
    if (questionId) {
      const result = await enrichQuestionSolution(questionId, force);
      return NextResponse.json({
        success: result.success,
        result,
      });
    }

    // 2. Explicit question IDs batch
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      const results = await enrichQuestionsBatch(questionIds, 3, force);
      const succeeded = results.filter((r) => r.success).length;
      return NextResponse.json({
        success: true,
        total: results.length,
        succeeded,
        results,
      });
    }

    // 3. Paper questions enrichment
    if (paperId) {
      if (isBackground) {
        enrichPaperSolutionsInBackground(paperId, limit);
        return NextResponse.json({
          success: true,
          message: `Background solution enrichment dispatched for paper: ${paperId}`,
        });
      }

      // Synchronous batch for paper
      const questions = await prisma.question.findMany({
        where: {
          paperId,
          ...(force ? {} : { OR: [{ solutionText: null }, { correctOptionIds: { equals: [] } }] }),
        },
        select: { id: true },
        take: limit,
      });

      const qIds = questions.map((q) => q.id);
      const results = await enrichQuestionsBatch(qIds, 3, force);
      return NextResponse.json({
        success: true,
        paperId,
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        results,
      });
    }

    return NextResponse.json(
      { error: 'Please provide questionId, questionIds array, or paperId' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API /api/questions/enrich-solution] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
