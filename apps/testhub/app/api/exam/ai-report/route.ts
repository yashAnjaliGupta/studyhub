import { NextResponse } from 'next/server';
import { prisma } from '@repo/db/client';
import { redis } from '../../../../lib/redis';
import { getBedrockClient } from '@repo/ai';
import { ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import type { HumanReadableExamReport } from '@repo/exam-core';
import { getServerSession, authOptions } from '@repo/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const { attemptId, userId: clientUserId } = body;
    const sessionUserId = (session?.user as any)?.id ? String((session?.user as any).id) : session?.user?.email;
    const userId = sessionUserId || clientUserId;

    if (!attemptId && !userId) {
      return NextResponse.json({ error: 'Missing attemptId or userId parameter' }, { status: 400 });
    }

    // 1. Fetch pre-baked analysis report from Redis (< 2ms) or PostgreSQL fallback
    let rawReport = null;
    if (attemptId) {
      rawReport = await redis.get(`exam:${attemptId}:analysis`);
    }
    if (!rawReport && userId) {
      rawReport = await redis.get(`student:${userId}:latest_exam_analysis`);
    }

    let report: HumanReadableExamReport | null = null;
    if (rawReport) {
      try {
        const parsed = JSON.parse(rawReport);
        report = (parsed.humanReadableReport || parsed.report || parsed) as HumanReadableExamReport;
      } catch {}
    }

    if (!report && attemptId) {
      // Fallback to PostgreSQL
      try {
        const dbReport = await prisma.aIGuidanceReport.findFirst({
          where: { attemptId },
          orderBy: { createdAt: 'desc' },
        });
        if (dbReport?.reportJson) {
          report = dbReport.reportJson as any;
        } else {
          const dbAttempt = await prisma.examAttempt.findFirst({
            where: { OR: [{ id: attemptId }, { paperId: attemptId }] },
            orderBy: { createdAt: 'desc' },
          });
          const config = (dbAttempt?.config as any) || {};
          report = config.humanReadableReport || null;
        }
      } catch {}
    }

    if (!report || !report.scores) {
      return NextResponse.json({ error: 'Exam analysis record not found or expired' }, { status: 404 });
    }

    // 2. Format a highly compact, signal-rich prompt for Bedrock
    const prompt = `
You are a master competitive exam strategist and mentor for JEE / NEET / Board exams.
Review this student's actual exam behavioral diagnosis:

EXAM PERFORMANCE:
- Exam: ${report.paperTitle}
- Score: ${report.scores.totalAwarded} / ${report.scores.maxPossible} (${report.scores.percentage}%)
- Accuracy: ${Math.round(report.scores.accuracyRate * 100)}%
- Time Spent: ${report.scores.totalTimeSpentMinutes} minutes (Average ${report.scores.avgSecondsPerQuestion}s per question)

SUBJECT & PACING BREAKDOWN:
${Object.values(report.subjectBreakdown)
  .map(
    (s) =>
      `- ${s.subject}: ${s.timeSpentMinutes} mins spent (Status: ${s.status}, Accuracy: ${Math.round(s.accuracyRate * 100)}%, Marks: ${s.marksAwarded})`
  )
  .join('\n')}

STAMINA & FATIGUE:
- Phase 1 (1st hour): ${Math.round(report.staminaCurve.phase1_FirstThird.accuracy * 100)}% accuracy
- Phase 2 (2nd hour): ${Math.round(report.staminaCurve.phase2_SecondThird.accuracy * 100)}% accuracy
- Phase 3 (3rd hour): ${Math.round(report.staminaCurve.phase3_FinalThird.accuracy * 100)}% accuracy
- Fatigue Detected: ${report.staminaCurve.fatigueDetected ? 'YES (Significant accuracy crash in final third)' : 'NO (Consistent stamina)'}

BEHAVIORAL TRAPS IDENTIFIED:
- Time Sinks (>4m spent & incorrect): ${report.behavioralTags.timeSinksCount} questions
- Rush Errors (<35s spent & incorrect): ${report.behavioralTags.rushErrorsCount} questions
- Second-Guess Penalties (Switched from Correct -> Wrong): ${report.behavioralTags.secondGuessPenaltiesCount} questions
- 50/50 Hover Dilemmas: ${report.behavioralTags.optionDilemmasCount} questions

KEY STRUGGLE QUESTIONS:
${report.criticalQuestions
  .map(
    (q) =>
      `• Q${q.sequenceNum} [${q.subject} - ${q.topic}]: ${q.behaviorSummary}. Selected ${q.studentAnswer}, correct was ${q.correctAnswer}.`
  )
  .join('\n')}

TASK:
Write a sharp, empathetic, and highly personalized Diagnostic Coaching Report in markdown with:
1. 🎯 **Exam Temperament Archetype**: Diagnose their specific test-taker archetype (e.g., The Methodical Strategist, The Impulsive Sprinter, The Hesitant Second-Guesser, or The Over-Investor). Explain their exam psychology and decision-making patterns.
2. 📊 **Cognitive Performance & Pacing Audit**: Analyze their clock distribution, average dwell time vs target benchmark (~120s), and subject time balance.
3. ⚠️ **The Unforced Mark Bleed Breakdown**: Quantify exact marks lost to rush errors (<35s), second-guess answer switches (correct -> incorrect), and time traps (>4m). State their recoverable marks potential clearly.
4. ⏱️ **Cross-Subject Tactical Balance**: Compare Physics, Chemistry, and Mathematics conversion efficiency and time allocation.
5. 🚀 **Non-Negotiable Execution Protocols for Next Mock**: 3 crystal-clear rules they must follow in their next mock exam.
Keep it direct, professional, motivating, structured, and free of fluff.
`;

    // 3. Invoke Claude / Bedrock with streaming response (trying active Bedrock models)
    const client = getBedrockClient();
    const candidateModels = [
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0',
      'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      'amazon.nova-lite-v1:0'
    ];

    let response = null;
    let selectedModel = '';

    for (const mId of candidateModels) {
      try {
        const cmd = new ConverseStreamCommand({
          modelId: mId,
          messages: [{ role: 'user', content: [{ text: prompt }] }],
          inferenceConfig: {
            maxTokens: 1200,
            temperature: 0.4,
            topP: 0.9,
          },
        });
        response = await client.send(cmd);
        selectedModel = mId;
        break;
      } catch (mErr: any) {
        console.warn(`[AIReportAPI] Model ${mId} failed:`, mErr?.message || mErr);
      }
    }

    if (!response) {
      return NextResponse.json({ error: 'Failed to find active Bedrock model in current region' }, { status: 500 });
    }

    console.log(`[AIReportAPI] Streaming AI report using Bedrock model: ${selectedModel}`);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.stream) {
          controller.close();
          return;
        }
        let fullAiText = '';
        for await (const chunk of response.stream) {
          if (chunk.contentBlockDelta?.delta?.text) {
            const piece = chunk.contentBlockDelta.delta.text;
            fullAiText += piece;
            controller.enqueue(encoder.encode(piece));
          }
        }
        controller.close();

        // Persist AI coaching report into PostgreSQL AIGuidanceReport table
        const targetAttemptId = attemptId || report.attemptId;
        if (fullAiText && targetAttemptId) {
          try {
            await prisma.aIGuidanceReport.upsert({
              where: {
                attemptId_reportVersion: {
                  attemptId: targetAttemptId,
                  reportVersion: 'v1.0-ai-coaching',
                },
              },
              create: {
                attemptId: targetAttemptId,
                reportVersion: 'v1.0-ai-coaching',
                inputVersion: 'v1',
                status: 'completed',
                reportJson: { aiReportText: fullAiText, generatedAt: new Date().toISOString() },
              },
              update: {
                status: 'completed',
                reportJson: { aiReportText: fullAiText, generatedAt: new Date().toISOString() },
              },
            });
            console.log(`[AIReportAPI] Successfully stored AI coaching report in PostgreSQL for attempt ${targetAttemptId}`);
          } catch (e: any) {
            console.warn('[AIReportAPI] Background PostgreSQL save error:', e?.message || e);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('[AIReportAPI] Failed to stream AI report:', err?.message || err);
    return NextResponse.json({ error: 'Failed to generate AI report', message: err?.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

