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

// In-memory tracker to prevent duplicate concurrent runs for the same paper
const activePaperEnrichmentJobs = new Set<string>();

/**
 * Robust JSON parser that handles arrays, multiple concatenated JSON objects, markdown fences, and LaTeX escapes.
 */
function parseMultipleJsonObjects(raw: string): any[] {
  if (!raw || typeof raw !== 'string') return [];

  // Strip markdown code fence if present
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const textToScan = (codeBlockMatch ? codeBlockMatch[1] : raw).trim();

  // 1. Direct array parse
  try {
    const parsed = JSON.parse(textToScan);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
  } catch {}

  // 2. Try wrapping concatenated objects: { ... } { ... } -> [ { ... }, { ... } ]
  try {
    const arrayStr = '[' + textToScan.replace(/^\[\s*/, '').replace(/\s*\]$/, '').replace(/\}\s*\{/g, '},{') + ']';
    const parsed = JSON.parse(arrayStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  // 3. Brace-counting parser to safely extract each top-level { ... } object
  const results: any[] = [];
  let depth = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < textToScan.length; i++) {
    const char = textToScan[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const objStr = textToScan.substring(startIdx, i + 1);
        try {
          results.push(JSON.parse(objStr));
        } catch {
          try {
            const sanitized = objStr.replace(/\\(?![/"\\bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
            results.push(JSON.parse(sanitized));
          } catch {}
        }
        startIdx = -1;
      }
    }
  }

  return results;
}

/**
 * Check if a paper is currently undergoing background solution enrichment.
 */
export function isPaperEnrichmentActive(paperId: string): boolean {
  return activePaperEnrichmentJobs.has(paperId);
}

/**
 * Fallback to solve questions one-by-one if a batch JSON parsing fails.
 */
async function fallbackSingleQuestions(
  questions: any[],
  force: boolean = false
): Promise<SolutionGenerationResult[]> {
  const results: SolutionGenerationResult[] = [];
  for (const q of questions) {
    try {
      const rawOptions = Array.isArray(q.options) ? (q.options as any[]) : [];
      const optionsText = rawOptions
        .map((opt, i) => {
          const label = opt.label || String.fromCharCode(65 + i);
          return `Option [${label}] (ID: "${opt.id}"): ${opt.text || ''}`;
        })
        .join('\n');

      const candidateTopics = getTopicsForSubject(q.subject || 'Physics');
      const prompt = `You are a master academic subject expert.
Carefully solve this question step-by-step.
Subject: ${q.subject || 'General STEM'}
Question Stem:
${q.text}

${rawOptions.length > 0 ? `Available Options:\n${optionsText}` : ''}

Approved Syllabus Chapters:
${candidateTopics.slice(0, 20).join(', ')}

Return ONLY valid JSON matching this schema:
{
  "correctOptionIds": ["<id of the correct option>"],
  "numericalAnswer": { "value": 42.0, "tolerance": 0.05, "range": [41.95, 42.05] },
  "solutionText": "Step 1: ... \\nStep 2: ...",
  "topic": "${candidateTopics[0] || 'Topic Name'}"
}`;

      const rawResponse = await invokeExamModel(prompt, {
        modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        maxTokens: 2000,
        temperature: 0.1,
        topP: 0.9,
      });

      const parsedList = parseMultipleJsonObjects(rawResponse);
      const parsed = parsedList[0];
      if (!parsed) throw new Error('Failed to parse AI response');

      const correctOptionIds: string[] = Array.isArray(parsed.correctOptionIds)
        ? parsed.correctOptionIds
        : parsed.correctOptionId
        ? [parsed.correctOptionId]
        : q.correctOptionIds || [];

      const numericalAnswer = parsed.numericalAnswer || q.numericalAnswer || null;
      const solutionText = parsed.solutionText || q.solutionText || null;
      const rawTopic = parsed.topic || q.topic?.name;
      const resolvedTopicName = normalizeTopic(rawTopic, q.subject);

      const updatedOptions = rawOptions.map((opt: any) => ({
        ...opt,
        isCorrect: correctOptionIds.includes(opt.id),
      }));

      let topicId = q.topicId;
      if (resolvedTopicName && resolvedTopicName !== 'General Concepts' && q.subject) {
        try {
          const topic = await prisma.topic.upsert({
            where: {
              subject_name: { subject: q.subject, name: resolvedTopicName },
            },
            create: { subject: q.subject, name: resolvedTopicName },
            update: {},
          });
          topicId = topic.id;
        } catch { }
      }

      await prisma.question.update({
        where: { id: q.id },
        data: {
          solutionText,
          correctOptionIds,
          numericalAnswer,
          options: updatedOptions,
          ...(topicId ? { topicId } : {}),
        },
      });

      results.push({
        questionId: q.id,
        success: true,
        correctOptionIds,
        numericalAnswer,
        solutionText: solutionText || undefined,
        topic: resolvedTopicName,
      });
    } catch (err: any) {
      results.push({
        questionId: q.id,
        success: false,
        error: err.message || 'Error during fallback enrichment',
      });
    }
  }
  return results;
}

/**
 * Solve a batch of questions (e.g. 5) in a single LLM invocation and batch-update the database in a transaction.
 */
export async function batchEnrichAndSaveQuestions(
  questions: any[],
  force: boolean = false
): Promise<SolutionGenerationResult[]> {
  if (!questions || questions.length === 0) return [];

  // Filter out questions that already have full solutions unless force is requested
  const questionsToSolve = force
    ? questions
    : questions.filter((q) => {
        const hasSol = Boolean(q.solutionText && q.solutionText.trim());
        const hasAns =
          (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) ||
          q.numericalAnswer !== null;
        return !hasSol || !hasAns;
      });

  if (questionsToSolve.length === 0) {
    return questions.map((q) => ({
      questionId: q.id,
      success: true,
      correctOptionIds: q.correctOptionIds || [],
      numericalAnswer: q.numericalAnswer,
      solutionText: q.solutionText,
      topic: q.topic?.name,
    }));
  }

  try {
    // Build combined prompt for the batch
    const formattedQuestions = questionsToSolve
      .map((q, idx) => {
        const rawOptions = Array.isArray(q.options) ? (q.options as any[]) : [];
        const optionsText = rawOptions
          .map((opt, i) => {
            const label = opt.label || String.fromCharCode(65 + i);
            return `  - Option [${label}] (ID: "${opt.id}"): ${opt.text || ''}`;
          })
          .join('\n');

        const candidateTopics = getTopicsForSubject(q.subject || 'Physics');
        return `QUESTION ${idx + 1} (ID: "${q.id}"):
Subject: ${q.subject || 'General STEM'}
Current Topic: ${q.topic?.name || 'General Concepts'}
Type: ${q.type || 'mcq_single'}
Stem:
${q.text}

${rawOptions.length > 0 ? `Available Options:\n${optionsText}` : 'No Options (Numerical / Text Answer)'}
Approved Syllabus Chapters:
${candidateTopics.slice(0, 15).join(', ')}`;
      })
      .join('\n\n========================================\n\n');

    const prompt = `You are a master academic STEM subject expert and exam evaluator.
Carefully solve the following ${questionsToSolve.length} questions step-by-step.

${formattedQuestions}

INSTRUCTIONS:
1. Provide a rigorous, step-by-step mathematical or conceptual explanation in "solutionText" using KaTeX LaTeX ($...$).
2. Identify the correct option ID(s) for multiple-choice questions strictly from the provided Option IDs.
3. For numerical questions, calculate the exact numerical value in "numericalAnswer" ({ "value": 42.0, "tolerance": 0.05, "range": [41.95, 42.05] }).
4. Identify the specific academic "topic" strictly from the approved syllabus chapters listed.
5. In LaTeX strings, double-escape backslashes for valid JSON (e.g. \\\\frac, \\\\sqrt, \\\\alpha).

Return ONLY a valid JSON array with an element for each question matching this exact schema:
[
  {
    "questionId": "<exact question ID>",
    "correctOptionIds": ["<id of the correct option>"],
    "numericalAnswer": { "value": 42.0, "tolerance": 0.05, "range": [41.95, 42.05] },
    "solutionText": "Step 1: ... \\nStep 2: ...",
    "topic": "<Chapter Name>"
  }
]`;

    const rawResponse = await invokeExamModel(prompt, {
      modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      maxTokens: 4000,
      temperature: 0.1,
    });

    const parsedList = parseMultipleJsonObjects(rawResponse);
    if (parsedList.length === 0) {
      throw new Error(`Failed to extract valid JSON objects from model response: ${rawResponse.slice(0, 150)}...`);
    }

    const resultMap = new Map<string, any>();
    for (const item of parsedList) {
      if (item && item.questionId) {
        resultMap.set(item.questionId, item);
      }
    }

    // Prepare database transactions and results
    const dbUpdates: any[] = [];
    const results: SolutionGenerationResult[] = [];

    for (const question of questionsToSolve) {
      const solved = resultMap.get(question.id);
      if (!solved) {
        results.push({
          questionId: question.id,
          success: false,
          error: 'Missing solution in AI response',
        });
        continue;
      }

      const correctOptionIds: string[] = Array.isArray(solved.correctOptionIds)
        ? solved.correctOptionIds
        : solved.correctOptionId
        ? [solved.correctOptionId]
        : question.correctOptionIds || [];

      const numericalAnswer = solved.numericalAnswer || question.numericalAnswer || null;
      const solutionText = solved.solutionText || question.solutionText || null;
      const rawTopic = solved.topic || question.topic?.name;
      const resolvedTopicName = normalizeTopic(rawTopic, question.subject);

      // Synchronize options array with isCorrect flags
      const rawOptions = Array.isArray(question.options) ? (question.options as any[]) : [];
      const updatedOptions = rawOptions.map((opt: any) => ({
        ...opt,
        isCorrect: correctOptionIds.includes(opt.id),
      }));

      // Check or resolve topic ID
      let topicId = question.topicId;
      if (resolvedTopicName && resolvedTopicName !== 'General Concepts' && question.subject) {
        try {
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
        } catch {
          // ignore topic upsert error
        }
      }

      dbUpdates.push(
        prisma.question.update({
          where: { id: question.id },
          data: {
            solutionText,
            correctOptionIds,
            numericalAnswer,
            options: updatedOptions,
            ...(topicId ? { topicId } : {}),
          },
        })
      );

      results.push({
        questionId: question.id,
        success: true,
        correctOptionIds,
        numericalAnswer,
        solutionText: solutionText || undefined,
        topic: resolvedTopicName,
      });
    }

    // Execute batch update in a single transaction
    if (dbUpdates.length > 0) {
      await prisma.$transaction(dbUpdates);
    }

    return results;
  } catch (error: any) {
    console.error(`[SolutionGenerator] Batch solution error:`, error);
    // Fall back to question-by-question if batch fails
    return await fallbackSingleQuestions(questionsToSolve, force);
  }
}

/**
 * Generate step-by-step solution and identify correct answer for a single question using AI.
 */
export async function enrichQuestionSolution(
  questionId: string,
  force: boolean = false
): Promise<SolutionGenerationResult> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { topic: true },
  });

  if (!question) {
    return { questionId, success: false, error: 'Question not found' };
  }

  const results = await batchEnrichAndSaveQuestions([question], force);
  return results[0] || { questionId, success: false, error: 'Enrichment failed' };
}

/**
 * Enrich a batch of questions concurrently using chunked batch solving.
 */
export async function enrichQuestionsBatch(
  questionIds: string[],
  _concurrency: number = 3,
  force: boolean = false
): Promise<SolutionGenerationResult[]> {
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { topic: true },
  });

  const results: SolutionGenerationResult[] = [];
  const batchSize = 3;
  for (let i = 0; i < questions.length; i += batchSize) {
    const chunk = questions.slice(i, i + batchSize);
    const chunkResults = await batchEnrichAndSaveQuestions(chunk, force);
    results.push(...chunkResults);
  }
  return results;
}

/**
 * Asynchronously triggers solution & answer key batch generation for a paper in the background.
 * Processes questions in batches of 5 with atomic database updates.
 */
export function enrichPaperSolutionsInBackground(paperId: string, limit: number = 100): void {
  if (activePaperEnrichmentJobs.has(paperId)) {
    console.log(`[SolutionGenerator] Paper ${paperId} is already being enriched. Skipping duplicate job.`);
    return;
  }

  activePaperEnrichmentJobs.add(paperId);

  // Fire-and-forget in Node.js event loop
  setImmediate(async () => {
    try {
      console.log(`[SolutionGenerator] Starting background batch solution enrichment for paper: ${paperId}...`);
      const pendingQuestions = await prisma.question.findMany({
        where: {
          paperId,
          OR: [
            { solutionText: null },
            { correctOptionIds: { equals: [] } },
          ],
        },
        include: {
          topic: true,
        },
        orderBy: { sequenceNum: 'asc' },
        take: limit,
      });

      if (pendingQuestions.length === 0) {
        console.log(`[SolutionGenerator] All questions already have solutions and answers for paper: ${paperId}`);
        return;
      }

      const total = pendingQuestions.length;
      const batchSize = 3;
      const totalBatches = Math.ceil(total / batchSize);
      console.log(
        `[SolutionGenerator] Dispatched background batch enrichment for ${total} questions across ${totalBatches} batches for paper: ${paperId}`
      );

      let totalSucceeded = 0;
      for (let b = 0; b < totalBatches; b++) {
        const batch = pendingQuestions.slice(b * batchSize, (b + 1) * batchSize);
        console.log(
          `[SolutionGenerator] [Paper ${paperId}] Running Batch ${b + 1}/${totalBatches} (${batch.length} questions)...`
        );

        const batchResults = await batchEnrichAndSaveQuestions(batch, false);
        const batchSucceeded = batchResults.filter((r) => r.success).length;
        totalSucceeded += batchSucceeded;

        console.log(
          `[SolutionGenerator] [Paper ${paperId}] Batch ${b + 1}/${totalBatches} committed to DB: ${batchSucceeded}/${batch.length} succeeded. Overall: ${totalSucceeded}/${total}`
        );

        // Pacing between batches to protect API rate limits
        if (b < totalBatches - 1) {
          await new Promise((res) => setTimeout(res, 300));
        }
      }

      console.log(
        `[SolutionGenerator] Finished background enrichment for paper ${paperId}: ${totalSucceeded}/${total} questions successfully enriched.`
      );
    } catch (err) {
      console.error(`[SolutionGenerator] Background enrichment error for paper ${paperId}:`, err);
    } finally {
      activePaperEnrichmentJobs.delete(paperId);
    }
  });
}
