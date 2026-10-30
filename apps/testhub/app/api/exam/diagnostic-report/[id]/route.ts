import { NextResponse } from 'next/server';
import { prisma } from '@repo/db/client';
import { redis } from '../../../../../lib/redis';
import { getBedrockClient } from '@repo/ai';
import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { evaluateAttempt } from '../../../../../lib/exam-session';
import { getPaperFromDatabase } from '../../../../../lib/paper-service';
import { getDynamicPaper } from '../../../../../lib/dynamic-paper-provider';
import { buildDeterministicDiagnosticReport } from '../../../../../lib/diagnostic-engine';
import type { CompleteDiagnosticReport } from '../../../../../lib/diagnostic-types';
import fs from 'fs';
import path from 'path';

/**
 * Helper to fetch attempt session data
 */
async function getAttemptSession(id: string) {
  const decodedId = decodeURIComponent(id).trim();

  // 1. Check local pseudo attempt if available first for rich testing
  const possiblePaths = [
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), `../pseudo_attempt_${decodedId}.json`),
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), `../../pseudo_attempt_${decodedId}.json`),
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), `pseudo_attempt_${decodedId}.json`),
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), `scratch_pseudo_attempt_${decodedId}.json`),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.answers && Object.keys(parsed.answers).length > 0) {
          return parsed;
        }
      } catch { }
    }
  }

  // 2. Try Redis cache
  try {
    const raw = (await redis.get(`exam:${decodedId}:analysis`)) || (await redis.get(`paper:${decodedId}:latest_attempt`));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.answers && Object.keys(parsed.answers).length > 0) {
        return parsed;
      }
    }
  } catch { }

  // 3. Fallback to PostgreSQL
  try {
    const attempt = await prisma.examAttempt.findFirst({
      where: { OR: [{ id: decodedId }, { paperId: decodedId }] },
      orderBy: { createdAt: 'desc' },
    });
    if (attempt && attempt.config) {
      const config = attempt.config as any;
      return {
        attemptId: attempt.id,
        paperId: attempt.paperId,
        startedAt: attempt.startedAt.getTime(),
        submittedAt: attempt.submittedAt?.getTime() || Date.now(),
        answers: config.answers || {},
        review: config.review || [],
        visited: config.visited || [],
        telemetry: config.telemetry || {},
        subjectTimeSpent: config.subjectTimeSpent || {},
      };
    }
  } catch { }

  return null;
}

/**
 * Enrich baseline report using Bedrock LLM with structured JSON output
 */
async function enrichDiagnosticReportWithLLM(
  baseReport: CompleteDiagnosticReport
): Promise<CompleteDiagnosticReport> {
  try {
    const client = getBedrockClient();
    const candidateModels = [
      'anthropic.claude-3-5-sonnet-20240620-v1:0',
      'anthropic.claude-3-haiku-20240307-v1:0',
      'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      'amazon.nova-lite-v1:0',
    ];

    const criticalQsSnippet = baseReport.questions
      .slice(0, 10)
      .map(
        (q) =>
          `Q${q.sequenceNum} [${q.subject} - ${q.topic}]: ${q.outcome}, ${q.timeSpentSeconds}s dwell. Selected: ${q.userAnswerText}, Correct: ${q.correctAnswerText}. Tags: ${q.tags.join(', ')}`
      )
      .join('\n');

    const prompt = `
You are a master JEE/NEET competitive exam strategist and cognitive mentor.
Synthesize an elite diagnostic evaluation in valid JSON matching this exact structure:

EXAM PERFORMANCE:
- Exam: ${baseReport.paperTitle}
- Score: ${baseReport.overview.totalScore} / ${baseReport.overview.maxScore} (${baseReport.overview.percentage}%)
- Accuracy: ${baseReport.overview.accuracyRate}%
- Time Spent: ${baseReport.overview.totalTimeMinutes} mins (Utilization: ${baseReport.overview.timeUtilizationPercent}%)
- Estimated Marks Recoverable from unforced errors: +${baseReport.overview.marksRecoverable} marks
- Net Answer Switch Impact: ${baseReport.journey.switchAnalysis.netMarksImpact} marks across ${baseReport.journey.switchAnalysis.totalSwitches} switches

CRITICAL MISTAKE QUESTIONS:
${criticalQsSnippet}

SUBJECT BREAKDOWNS:
${baseReport.subjects.map((s) => `- ${s.subject}: ${s.scoreAwarded}/${s.maxScore} marks, ${s.accuracyPercent}% accuracy, ${s.timeSpentMinutes}m spent`).join('\n')}

OUTPUT FORMAT: Return ONLY valid JSON with this shape (no markdown fences, no extra text):
{
  "studentArchetype": "E.g., The Methodical Solver with Second-Guess Vulnerability",
  "executiveSummary": "Comprehensive, multi-paragraph personalized diagnosis detailing: 1) Cognitive archetype & temperament analysis, 2) Exact mark leak breakdown (lost to rush errors, second-guessing switches, and time traps), 3) Pacing and subject efficiency comparison, 4) Immediate 3-rule protocol for the next mock.",
  "topStrengths": ["Strength 1", "Strength 2", "Strength 3"],
  "topOpportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "threeGoldenRules": ["Rule 1 for next exam", "Rule 2 for next exam", "Rule 3 for next exam"],
  "subjectDiagnoses": {
    "Physics": "Strategic diagnosis paragraph for Physics",
    "Chemistry": "Strategic diagnosis paragraph for Chemistry",
    "Mathematics": "Strategic diagnosis paragraph for Mathematics"
  },
  "questionInsights": [
    {
      "sequenceNum": 12,
      "whatHappened": "What specifically occurred during the solving attempt",
      "whereDidItGoWrong": "Root cause concept or calculation trap",
      "actionableChecklist": ["Action 1 specific to this question and error pattern", "Action 2", "Action 3"]
    }
  ]
}
`;

    for (const mId of candidateModels) {
      try {
        const cmd = new ConverseCommand({
          modelId: mId,
          messages: [{ role: 'user', content: [{ text: prompt }] }],
          inferenceConfig: {
            maxTokens: 1800,
            temperature: 0.3,
            topP: 0.9,
          },
        });
        const res = await client.send(cmd);
        const text = res.output?.message?.content?.[0]?.text;
        if (text) {
          const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);

          // Merge LLM insights into base report
          if (parsed.studentArchetype) baseReport.overview.studentArchetype = parsed.studentArchetype;
          if (parsed.executiveSummary) baseReport.overview.executiveSummary = parsed.executiveSummary;
          if (Array.isArray(parsed.topStrengths) && parsed.topStrengths.length > 0) baseReport.overview.topStrengths = parsed.topStrengths;
          if (Array.isArray(parsed.topOpportunities) && parsed.topOpportunities.length > 0) baseReport.overview.topOpportunities = parsed.topOpportunities;
          if (Array.isArray(parsed.threeGoldenRules) && parsed.threeGoldenRules.length > 0) baseReport.overview.threeGoldenRules = parsed.threeGoldenRules;

          if (parsed.subjectDiagnoses) {
            baseReport.subjects.forEach((subj) => {
              if (parsed.subjectDiagnoses[subj.subject]) {
                subj.diagnosis = parsed.subjectDiagnoses[subj.subject];
              }
            });
          }

          if (Array.isArray(parsed.questionInsights)) {
            parsed.questionInsights.forEach((insight: any) => {
              const matchedQ = baseReport.questions.find((q) => q.sequenceNum === insight.sequenceNum);
              if (matchedQ) {
                if (insight.whatHappened) matchedQ.whatHappened = insight.whatHappened;
                if (insight.whereDidItGoWrong) matchedQ.whereDidItGoWrong = insight.whereDidItGoWrong;
                if (Array.isArray(insight.actionableChecklist)) matchedQ.actionableChecklist = insight.actionableChecklist;
              }
            });
          }

          console.log(`[DiagnosticReportAPI] Successfully enriched diagnostic report with LLM model ${mId}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[DiagnosticReportAPI] Model ${mId} failed:`, err?.message || err);
      }
    }
  } catch (err) {
    console.error('[DiagnosticReportAPI] LLM enrichment error:', err);
  }

  return baseReport;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id || '2448').trim();

    // 1. Instant check in Redis (< 3ms)
    try {
      const cached = await redis.get(`exam:${decodedId}:diagnostic_report`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const hasInvalidSubject = (parsed?.subjects || []).some((s: any) =>
          s.subject === 'JEE Main' || s.subject?.includes('JEE') || s.subject === 'General'
        );
        const hasOldHardcodedChecklist = (parsed?.questions || []).some(
          (q: any) => q?.actionableChecklist?.[0] === 'Diagram and write given values with standard SI units before calculating.'
        );
        if (parsed?.overview?.questionsAttempted > 0 && !hasInvalidSubject && !hasOldHardcodedChecklist && parsed?.overview?.studentArchetype) {
          return NextResponse.json({
            status: 'SUCCESS',
            source: 'redis_cache',
            report: parsed,
          });
        }
      }
    } catch { }

    // 2. Check PostgreSQL AIGuidanceReport
    try {
      const dbGuidance = await prisma.aIGuidanceReport.findFirst({
        where: {
          OR: [{ attemptId: decodedId }, { attempt: { paperId: decodedId } }],
          reportVersion: 'v2.2-personalized',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (dbGuidance?.reportJson) {
        const parsed = typeof dbGuidance.reportJson === 'string' ? JSON.parse(dbGuidance.reportJson) : dbGuidance.reportJson;
        const hasInvalidSubject = (parsed?.subjects || []).some((s: any) =>
          s.subject === 'JEE Main' || s.subject?.includes('JEE') || s.subject === 'General'
        );
        const hasOldHardcodedChecklist = (parsed?.questions || []).some(
          (q: any) => q?.actionableChecklist?.[0] === 'Diagram and write given values with standard SI units before calculating.'
        );
        if (!hasInvalidSubject && !hasOldHardcodedChecklist && parsed?.overview?.studentArchetype) {
          return NextResponse.json({
            status: 'SUCCESS',
            source: 'postgres_db',
            report: dbGuidance.reportJson,
          });
        }
      }
    } catch { }

    // 3. If not cached, assemble baseline report from session & paper
    const sessionData = await getAttemptSession(decodedId);
    let paper = await getPaperFromDatabase(decodedId);
    if (!paper || !paper.questions || paper.questions.length === 0) {
      paper = getDynamicPaper(decodedId);
    }

    if (!sessionData) {
      return NextResponse.json({ error: 'Attempt data not found' }, { status: 404 });
    }

    const evaluation = evaluateAttempt(paper, sessionData);
    let diagnosticReport = buildDeterministicDiagnosticReport(evaluation, paper, sessionData);

    // Cache the baseline report in Redis immediately for fast subsequent access
    const reportJson = JSON.stringify(diagnosticReport);
    try {
      await redis.set(`exam:${decodedId}:diagnostic_report`, reportJson, 'EX', 86400 * 14);
      await redis.set(`paper:${decodedId}:diagnostic_report`, reportJson, 'EX', 86400 * 14);
    } catch { }

    return NextResponse.json({
      status: 'SUCCESS',
      source: 'deterministic_engine',
      report: diagnosticReport,
    });
  } catch (err: any) {
    console.error('[DiagnosticReportAPI] GET error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate diagnostic report' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id || '2448').trim();

    const sessionData = await getAttemptSession(decodedId);
    let paper = await getPaperFromDatabase(decodedId);
    if (!paper || !paper.questions || paper.questions.length === 0) {
      paper = getDynamicPaper(decodedId);
    }
    if (!sessionData) {
      return NextResponse.json({ error: 'Attempt data not found' }, { status: 404 });
    }

    const evaluation = evaluateAttempt(paper, sessionData);
    let diagnosticReport = buildDeterministicDiagnosticReport(evaluation, paper, sessionData);

    // Enrich with Bedrock LLM
    diagnosticReport = await enrichDiagnosticReportWithLLM(diagnosticReport);

    // Save to Redis & PostgreSQL
    const reportJson = JSON.stringify(diagnosticReport);
    try {
      await redis.set(`exam:${decodedId}:diagnostic_report`, reportJson, 'EX', 86400 * 14);
      await redis.set(`paper:${decodedId}:diagnostic_report`, reportJson, 'EX', 86400 * 14);

      const targetAttemptId = sessionData.attemptId || decodedId;
      await prisma.aIGuidanceReport.upsert({
        where: {
          attemptId_reportVersion: {
            attemptId: targetAttemptId,
            reportVersion: 'v2.2-personalized',
          },
        },
        create: {
          attemptId: targetAttemptId,
          reportVersion: 'v2.2-personalized',
          inputVersion: 'v2',
          status: 'completed',
          reportJson: diagnosticReport as any,
        },
        update: {
          reportJson: diagnosticReport as any,
          status: 'completed',
        },
      });
    } catch (persistErr) {
      console.warn('[DiagnosticReportAPI] Persistence warning:', persistErr);
    }

    return NextResponse.json({
      status: 'SUCCESS',
      source: 'llm_synthesized',
      report: diagnosticReport,
    });
  } catch (err: any) {
    console.error('[DiagnosticReportAPI] POST error:', err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
