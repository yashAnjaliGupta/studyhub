import { prisma } from '@repo/db/client';
import { invokeExamModel } from '@repo/ai';
import { getTopicsForSubject, normalizeTopic } from '@repo/exam-core';

export interface SolutionGenerationResult {
  questionId: string;
  success: boolean;
  correctOptionIds?: string[];
  numericalAnswer?: any;
  solutionText?: string;
  topic?: string;
  error?: string;
}

/**
 * Generate step-by-step solution and identify correct answer for a single question using AI.
 */
export async function enrichQuestionSolution(questionId: string, force: boolean = false): Promise<SolutionGenerationResult> {
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        topic: true,
      },
    });

    if (!question) {
      return { questionId, success: false, error: 'Question not found' };
    }

    const hasAnswer = (question.correctOptionIds && question.correctOptionIds.length > 0) || question.numericalAnswer;
    if (question.solutionText && hasAnswer && !force) {
      return {
        questionId,
        success: true,
        correctOptionIds: question.correctOptionIds,
        numericalAnswer: question.numericalAnswer,
        solutionText: question.solutionText,
        topic: question.topic?.name,
      };
    }

    const rawOptions = (Array.isArray(question.options) ? (question.options as any[]) : []);
    const optionsText = rawOptions
      .map((opt, i) => {
        const label = opt.label || String.fromCharCode(65 + i);
        return `Option [${label}] (ID: "${opt.id}"): ${opt.text || ''}`;
      })
      .join('\n');

    const candidateTopics = getTopicsForSubject(question.subject);
    const topicsListStr = candidateTopics.map((t, i) => `${i + 1}. ${t}`).join('\n');

    const prompt = `You are a master academic subject expert and exam evaluator.
Carefully solve this question step-by-step.

Subject: ${question.subject || 'General STEM'}
Current Topic: ${question.topic?.name || 'General Concepts'}
Question Type: ${question.type || 'mcq_single'}
Question Stem:
${question.text}

${rawOptions.length > 0 ? `Available Options:\n${optionsText}` : ''}

OFFICIAL SYLLABUS CHAPTERS FOR ${question.subject || 'STEM'}:
Choose the exact "topic" strictly from this approved list of chapters:
${topicsListStr}

INSTRUCTIONS:
1. Provide a rigorous, step-by-step mathematical or conceptual explanation in "solutionText" using KaTeX LaTeX ($...$).
2. Identify the correct option ID(s) for multiple-choice questions from the provided Option IDs.
3. For numerical questions, calculate the exact numerical value in "numericalAnswer".
4. Identify the specific academic "topic" strictly from the OFFICIAL SYLLABUS CHAPTERS listed above. You MUST pick the exact chapter title from the list. Do NOT invent new chapter names.

Return ONLY valid JSON matching this schema:
{
  "correctOptionIds": ["<id of the correct option>"],
  "numericalAnswer": { "value": 42.0, "tolerance": 0.05, "range": [41.95, 42.05] },
  "solutionText": "Step 1: ... \\nStep 2: ...",
  "topic": "${candidateTopics[0] || 'Topic Name'}"
}`;

    const rawResponse = await invokeExamModel(prompt, {
      modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      maxTokens: 2000,
      temperature: 0.1,
      topP: 0.9,
    });

    // Parse JSON from response
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse JSON from AI model response');
      }
    }

    const correctOptionIds: string[] = Array.isArray(parsed.correctOptionIds)
      ? parsed.correctOptionIds
      : (parsed.correctOptionId ? [parsed.correctOptionId] : question.correctOptionIds || []);

    const numericalAnswer = parsed.numericalAnswer || question.numericalAnswer || null;
    const solutionText = parsed.solutionText || null;
    const rawTopic = parsed.topic || question.topic?.name;
    const resolvedTopicName = normalizeTopic(rawTopic, question.subject);

    // Check or update topic if resolved topic is informative
    let topicId = question.topicId;
    if (resolvedTopicName && resolvedTopicName !== 'General Concepts' && question.subject) {
      const topic = await prisma.topic.upsert({
        where: {
          subject_name: {
            subject: question.subject,
            name: resolvedTopicName,
          },
        },
        create: {
          subject: question.subject,
          name: resolvedTopicName,
        },
        update: {},
      });
      topicId = topic.id;
    }

    await prisma.question.update({
      where: { id: questionId },
      data: {
        solutionText: solutionText || question.solutionText,
        correctOptionIds,
        numericalAnswer,
        ...(topicId ? { topicId } : {}),
      },
    });

    return {
      questionId,
      success: true,
      correctOptionIds,
      numericalAnswer,
      solutionText: solutionText || undefined,
      topic: resolvedTopicName,
    };
  } catch (error: any) {
    console.error(`[SolutionGenerator] Error enriching question ${questionId}:`, error);
    return {
      questionId,
      success: false,
      error: error.message || 'Unknown error during solution enrichment',
    };
  }
}

/**
 * Enrich a batch of questions concurrently with a safety worker limit.
 */
export async function enrichQuestionsBatch(
  questionIds: string[],
  concurrency: number = 3,
  force: boolean = false
): Promise<SolutionGenerationResult[]> {
  const results: SolutionGenerationResult[] = [];
  const queue = [...questionIds];

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const qId = queue.shift();
      if (!qId) break;
      const res = await enrichQuestionSolution(qId, force);
      results.push(res);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Asynchronously triggers solution & answer key enrichment for an entire paper in the background.
 * Processes questions in chunks of 5 with gentle rate-limit pacing so paper ingestion returns immediately.
 */
export function enrichPaperSolutionsInBackground(paperId: string, limit: number = 100): void {
  // Fire-and-forget in Node.js event loop
  setImmediate(async () => {
    try {
      console.log(`[SolutionGenerator] Starting background solution enrichment for paper: ${paperId}...`);
      const pendingQuestions = await prisma.question.findMany({
        where: {
          paperId,
          OR: [
            { solutionText: null },
            { correctOptionIds: { equals: [] } },
          ],
        },
        select: { id: true, sequenceNum: true },
        orderBy: { sequenceNum: 'asc' },
        take: limit,
      });

      if (pendingQuestions.length === 0) {
        console.log(`[SolutionGenerator] All questions already have solutions and answers for paper: ${paperId}`);
        return;
      }

      const total = pendingQuestions.length;
      const batchSize = 5;
      const totalBatches = Math.ceil(total / batchSize);
      console.log(`[SolutionGenerator] Dispatched background enrichment for ${total} questions across ${totalBatches} batches for paper: ${paperId}`);

      let totalSucceeded = 0;
      for (let b = 0; b < totalBatches; b++) {
        const batch = pendingQuestions.slice(b * batchSize, (b + 1) * batchSize);
        const batchIds = batch.map((q) => q.id);
        console.log(`[SolutionGenerator] [Paper ${paperId}] Running Batch ${b + 1}/${totalBatches} (${batchIds.length} questions)...`);

        const batchResults = await enrichQuestionsBatch(batchIds, 2);
        const batchSucceeded = batchResults.filter((r) => r.success).length;
        totalSucceeded += batchSucceeded;

        console.log(
          `[SolutionGenerator] [Paper ${paperId}] Batch ${b + 1}/${totalBatches} done: ${batchSucceeded}/${batchIds.length} succeeded. Overall: ${totalSucceeded}/${total}`
        );

        // Gentle pause between batches to protect API rate limits
        if (b < totalBatches - 1) {
          await new Promise((res) => setTimeout(res, 500));
        }
      }

      console.log(`[SolutionGenerator] Finished background enrichment for paper ${paperId}: ${totalSucceeded}/${total} questions successfully enriched.`);
    } catch (err) {
      console.error(`[SolutionGenerator] Background enrichment error for paper ${paperId}:`, err);
    }
  });
}
