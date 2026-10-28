import type { ProcessedPaper, ProcessedQuestion } from './paper-service';

export interface ExamSessionData {
  paperId: string;
  paperTitle: string;
  startedAt: number;
  submittedAt: number;
  durationSeconds: number;
  timeSpentSeconds: number;
  answers: Record<string, any>;
  review: string[];
  visited: string[];
  autoSubmitted?: boolean;
  autoSubmitReason?: string;
  violationsCount?: number;
  telemetryEvents?: any[];
}

export interface QuestionEvaluation {
  questionId: string;
  sequenceNum: number;
  topic: string;
  subject: string;
  type: string;
  marks: number;
  negativeMarks: number;
  userAnswer: any;
  correctAnswer: any;
  isAttempted: boolean;
  isCorrect: boolean;
  scoreAwarded: number;
  timeSpentSeconds: number;
}

export interface TopicPerformance {
  name: string;
  subject: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  scoreAwarded: number;
  maxScore: number;
  avgTimeSeconds: number;
}

export interface ExamEvaluationResult {
  paperId: string;
  paperTitle: string;
  totalQuestions: number;
  totalMarks: number;
  scoreAwarded: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeSpentMinutes: number;
  avgTimePerQuestionSeconds: number;
  subjectPerformance: Record<string, { total: number; correct: number; incorrect: number; accuracy: number; score: number }>;
  topicPerformance: TopicPerformance[];
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  questionEvaluations: QuestionEvaluation[];
  hesitationCount: number;
}

const STORAGE_KEY_PREFIX = 'testhub_exam_session_';

/**
 * Persist student's live attempt in browser sessionStorage
 */
export function saveExamSession(paperId: string, data: ExamSessionData): void {
  if (typeof window === 'undefined' || !paperId) return;
  try {
    sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${paperId}`, JSON.stringify(data));
  } catch (err: any) {
    console.warn('[ExamSession] Storage write warning:', err?.message || err);
    // If QuotaExceededError occurred, try saving without telemetry events to keep answers safe
    if (data.telemetryEvents && data.telemetryEvents.length > 0) {
      try {
        const leanData = { ...data, telemetryEvents: [] };
        sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${paperId}`, JSON.stringify(leanData));
      } catch (leanErr) {
        console.error('[ExamSession] Critical: Failed to save answers even after pruning telemetry:', leanErr);
      }
    }
  }
}

/**
 * Retrieve saved exam attempt from browser sessionStorage
 */
export function getExamSession(paperId: string): ExamSessionData | null {
  if (typeof window === 'undefined' || !paperId) return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${paperId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ExamSessionData;
  } catch (err) {
    console.warn('[ExamSession] Failed to load exam session:', err);
    return null;
  }
}

/**
 * Safely clear saved exam attempt from browser sessionStorage
 */
export function clearExamSession(paperId: string): void {
  if (typeof window === 'undefined' || !paperId) return;
  try {
    sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${paperId}`);
  } catch (err) {
    console.warn('[ExamSession] Failed to clear exam session:', err);
  }
}

/**
 * Evaluates a student's attempt against the real questions in the paper
 */
export function evaluateAttempt(
  paper: ProcessedPaper,
  sessionData: ExamSessionData
): ExamEvaluationResult {
  const safePaper = paper || { id: 'unknown', title: 'Exam Paper', questions: [] };
  const safeSession = sessionData || { answers: {} };
  const questions = safePaper.questions || [];
  const answers = sessionData.answers || {};

  let totalMarks = 0;
  let scoreAwarded = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const topicMap: Record<string, {
    name: string;
    subject: string;
    total: number;
    attempted: number;
    correct: number;
    incorrect: number;
    skipped: number;
    scoreAwarded: number;
    maxScore: number;
    totalTime: number;
  }> = {};

  const subjectMap: Record<string, { total: number; correct: number; incorrect: number; accuracy: number; score: number }> = {};

  const questionEvaluations: QuestionEvaluation[] = [];

  questions.forEach((q, idx) => {
    const qMarks = q.marks || 4;
    const qNeg = q.negativeMarks ?? 1;
    totalMarks += qMarks;

    const topicName = q.topic || 'General';
    const subjectName = extractSubjectFromTopicOrPaper(q.topic, paper.subject);

    // Initialize topic tracker
    if (!topicMap[topicName]) {
      topicMap[topicName] = {
        name: topicName,
        subject: subjectName,
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        scoreAwarded: 0,
        maxScore: 0,
        totalTime: 0,
      };
    }
    topicMap[topicName].total += 1;
    topicMap[topicName].maxScore += qMarks;

    // Initialize subject tracker
    if (!subjectMap[subjectName]) {
      subjectMap[subjectName] = { total: 0, correct: 0, incorrect: 0, accuracy: 0, score: 0 };
    }
    subjectMap[subjectName].total += 1;

    const userAnswer = answers[q.id || `q_${idx + 1}`];
    const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';

    // Determine correct answer
    let isCorrect = false;
    let correctAnswerDisplay: any = null;

    if (q.type === 'numerical') {
      const expectedText = q.options[0]?.text?.trim() || '';
      correctAnswerDisplay = expectedText;
      if (isAttempted) {
        const userNum = parseFloat(String(userAnswer).trim());
        const expectedNum = parseFloat(expectedText);
        if (!isNaN(userNum) && !isNaN(expectedNum)) {
          isCorrect = Math.abs(userNum - expectedNum) < 0.05;
        } else {
          isCorrect = String(userAnswer).trim().toLowerCase() === expectedText.toLowerCase();
        }
      }
    } else if (q.type === 'mcq_multiple') {
      const correctIndices = q.options
        .map((opt, i) => (opt.isCorrect ? i : -1))
        .filter((i) => i !== -1);
      correctAnswerDisplay = correctIndices;
      if (isAttempted && Array.isArray(userAnswer)) {
        isCorrect =
          userAnswer.length === correctIndices.length &&
          userAnswer.every((val) => correctIndices.includes(val));
      }
    } else {
      // mcq_single
      const correctIdx = q.options.findIndex((opt) => opt.isCorrect);
      correctAnswerDisplay = correctIdx !== -1 ? correctIdx : 0;
      if (isAttempted) {
        isCorrect = Number(userAnswer) === correctIdx;
      }
    }

    let questionScore = 0;
    if (!isAttempted) {
      unansweredCount++;
      topicMap[topicName].skipped += 1;
    } else if (isCorrect) {
      correctCount++;
      questionScore = qMarks;
      scoreAwarded += qMarks;
      topicMap[topicName].attempted += 1;
      topicMap[topicName].correct += 1;
      topicMap[topicName].scoreAwarded += qMarks;
      subjectMap[subjectName].correct += 1;
      subjectMap[subjectName].score += qMarks;
    } else {
      incorrectCount++;
      questionScore = -qNeg;
      scoreAwarded -= qNeg;
      topicMap[topicName].attempted += 1;
      topicMap[topicName].incorrect += 1;
      topicMap[topicName].scoreAwarded -= qNeg;
      subjectMap[subjectName].incorrect += 1;
      subjectMap[subjectName].score -= qNeg;
    }

    questionEvaluations.push({
      questionId: q.id || `q_${idx + 1}`,
      sequenceNum: q.sequenceNum || idx + 1,
      topic: topicName,
      subject: subjectName,
      type: q.type || 'mcq_single',
      marks: qMarks,
      negativeMarks: qNeg,
      userAnswer,
      correctAnswer: correctAnswerDisplay,
      isAttempted,
      isCorrect,
      scoreAwarded: questionScore,
      timeSpentSeconds: Math.round((sessionData.timeSpentSeconds || 3600) / Math.max(1, questions.length)),
    });
  });

  // Calculate subject accuracies
  Object.keys(subjectMap).forEach((subj) => {
    const s = subjectMap[subj];
    const totalAttempted = s.correct + s.incorrect;
    s.accuracy = totalAttempted > 0 ? Math.round((s.correct / totalAttempted) * 100) : 0;
  });

  // Calculate topic performances
  const topicPerformance: TopicPerformance[] = Object.values(topicMap).map((t) => {
    const acc = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0;
    return {
      name: t.name,
      subject: t.subject,
      total: t.total,
      attempted: t.attempted,
      correct: t.correct,
      incorrect: t.incorrect,
      skipped: t.skipped,
      accuracy: acc,
      scoreAwarded: t.scoreAwarded,
      maxScore: t.maxScore,
      avgTimeSeconds: Math.round(
        (sessionData.timeSpentSeconds || 3600) / Math.max(1, questions.length)
      ),
    };
  });

  const weakTopics = topicPerformance
    .filter((t) => t.accuracy < 70 || (t.total > 1 && t.incorrect > t.correct))
    .sort((a, b) => a.accuracy - b.accuracy);

  const strongTopics = topicPerformance
    .filter((t) => t.accuracy >= 70 && t.correct > 0)
    .sort((a, b) => b.accuracy - a.accuracy);

  const percentage = totalMarks > 0 ? Math.max(0, Math.round((scoreAwarded / totalMarks) * 100)) : 0;
  const timeSpentMinutes = Math.round((sessionData.timeSpentSeconds || 0) / 60);
  const avgTimePerQuestionSeconds =
    questions.length > 0 ? Math.round((sessionData.timeSpentSeconds || 0) / questions.length) : 0;

  return {
    paperId: paper.id,
    paperTitle: paper.title,
    totalQuestions: questions.length,
    totalMarks,
    scoreAwarded,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    timeSpentMinutes,
    avgTimePerQuestionSeconds,
    subjectPerformance: subjectMap,
    topicPerformance,
    weakTopics,
    strongTopics,
    questionEvaluations,
    hesitationCount: 0,
  };
}

function extractSubjectFromTopicOrPaper(topic?: string, defaultSubject?: string): string {
  const t = (topic || '').toLowerCase();
  if (t.includes('chem') || t.includes('organic') || t.includes('inorganic') || t.includes('physical')) {
    return 'Chemistry';
  }
  if (t.includes('phys') || t.includes('mechanics') || t.includes('optics') || t.includes('electro')) {
    return 'Physics';
  }
  if (t.includes('math') || t.includes('algebra') || t.includes('calculus') || t.includes('vector')) {
    return 'Mathematics';
  }
  if (t.includes('bio') || t.includes('botany') || t.includes('zoology')) {
    return 'Biology';
  }
  return defaultSubject || 'General';
}
