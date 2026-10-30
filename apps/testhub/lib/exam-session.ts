import type { ProcessedPaper, ProcessedQuestion } from './paper-service';

export interface ExamSessionData {
  attemptId?: string;
  userId?: string;
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
  telemetry?: Record<string, {
    dwellSeconds: number;
    revisitCount: number;
    firstResponseSeconds?: number;
    switches: Array<{ from: string; to: string; at: number }>;
    hoverDurations: Record<string, number>;
  }>;
  subjectTimeSpent?: Record<string, number>;
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
  revisitCount?: number;
  tags?: string[];
  behaviorSummary?: string;
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
  attemptRate: number;
  scoreAwarded: number;
  positiveMarks: number;
  negativeMarks: number;
  maxScore: number;
  avgTimeSeconds: number;
}

export interface SubjectPerformanceItem {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  score: number;
  positiveMarks: number;
  negativeMarks: number;
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
  subjectPerformance: Record<string, SubjectPerformanceItem>;
  topicPerformance: TopicPerformance[];
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  questionEvaluations: QuestionEvaluation[];
  hesitationCount: number;
}

const STORAGE_KEY_PREFIX = 'testhub_exam_session_';

/**
 * Persist student's live attempt in browser sessionStorage and localStorage fallback
 */
export function saveExamSession(paperId: string, data: ExamSessionData): void {
  if (typeof window === 'undefined' || !paperId) return;
  const key = `${STORAGE_KEY_PREFIX}${decodeURIComponent(paperId).trim()}`;
  const serialized = JSON.stringify(data);
  try {
    sessionStorage.setItem(key, serialized);
  } catch (err: any) {
    console.warn('[ExamSession] Storage write warning:', err?.message || err);
    if (data.telemetryEvents && data.telemetryEvents.length > 0) {
      try {
        const leanData = { ...data, telemetryEvents: [] };
        sessionStorage.setItem(key, JSON.stringify(leanData));
      } catch { }
    }
  }
  try {
    localStorage.setItem(key, serialized);
  } catch { }
}

/**
 * Retrieve saved exam attempt from browser sessionStorage with localStorage fallback
 */
export function getExamSession(paperId: string): ExamSessionData | null {
  if (typeof window === 'undefined' || !paperId) return null;
  const key = `${STORAGE_KEY_PREFIX}${decodeURIComponent(paperId).trim()}`;
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ExamSessionData;
  } catch (err) {
    console.warn('[ExamSession] Failed to load exam session:', err);
    return null;
  }
}

/**
 * Safely clear saved exam attempt from browser sessionStorage and localStorage
 */
export function clearExamSession(paperId: string): void {
  if (typeof window === 'undefined' || !paperId) return;
  const key = `${STORAGE_KEY_PREFIX}${decodeURIComponent(paperId).trim()}`;
  try {
    sessionStorage.removeItem(key);
  } catch { }
  try {
    localStorage.removeItem(key);
  } catch { }
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
    positiveMarks: number;
    negativeMarks: number;
    maxScore: number;
    totalTime: number;
  }> = {};

  const subjectMap: Record<string, SubjectPerformanceItem> = {};

  const questionEvaluations: QuestionEvaluation[] = [];

  questions.forEach((q, idx) => {
    const qMarks = q.marks || 4;
    const qNeg = q.negativeMarks ?? 1;
    totalMarks += qMarks;

    const topicName = q.topic || 'General';
    const subjectName = extractSubjectFromTopicOrPaper(
      q.topic,
      paper.subject,
      q.subject,
      q.sequenceNum || idx + 1,
      questions.length
    );

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
        positiveMarks: 0,
        negativeMarks: 0,
        maxScore: 0,
        totalTime: 0,
      };
    }
    topicMap[topicName].total += 1;
    topicMap[topicName].maxScore += qMarks;

    // Initialize subject tracker
    if (!subjectMap[subjectName]) {
      subjectMap[subjectName] = {
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        accuracy: 0,
        score: 0,
        positiveMarks: 0,
        negativeMarks: 0,
      };
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
      correctAnswerDisplay = correctIdx !== -1 ? (q.options[correctIdx]?.label || correctIdx) : 0;
      if (isAttempted) {
        const selectedIndex = typeof userAnswer === 'number' ? userAnswer : q.options.findIndex(o => o.id === userAnswer);
        isCorrect =
          (correctIdx !== -1 && selectedIndex === correctIdx) ||
          (correctIdx !== -1 && String(userAnswer) === q.options[correctIdx]?.id) ||
          Boolean(q.options[selectedIndex]?.isCorrect);
      }
    }

    let questionScore = 0;
    if (!isAttempted) {
      unansweredCount++;
      topicMap[topicName].skipped += 1;
      subjectMap[subjectName].skipped += 1;
    } else if (isCorrect) {
      correctCount++;
      questionScore = qMarks;
      scoreAwarded += qMarks;
      topicMap[topicName].attempted += 1;
      topicMap[topicName].correct += 1;
      topicMap[topicName].scoreAwarded += qMarks;
      topicMap[topicName].positiveMarks += qMarks;
      subjectMap[subjectName].attempted += 1;
      subjectMap[subjectName].correct += 1;
      subjectMap[subjectName].score += qMarks;
      subjectMap[subjectName].positiveMarks += qMarks;
    } else {
      incorrectCount++;
      questionScore = -qNeg;
      scoreAwarded -= qNeg;
      topicMap[topicName].attempted += 1;
      topicMap[topicName].incorrect += 1;
      topicMap[topicName].scoreAwarded -= qNeg;
      topicMap[topicName].negativeMarks += qNeg;
      subjectMap[subjectName].attempted += 1;
      subjectMap[subjectName].incorrect += 1;
      subjectMap[subjectName].score -= qNeg;
      subjectMap[subjectName].negativeMarks += qNeg;
    }

    const qTele = sessionData.telemetry?.[q.id || `q_${idx + 1}`];
    const actualTimeSpent = qTele?.dwellSeconds ?? Math.round((sessionData.timeSpentSeconds || 3600) / Math.max(1, questions.length));

    // Quick behavioral tags
    const qTags: string[] = [];
    if (actualTimeSpent >= 240 && !isCorrect && isAttempted) qTags.push('TIME_SINK');
    if (actualTimeSpent < 35 && !isCorrect && isAttempted && q.type !== 'numerical') qTags.push('RUSH_ERROR');
    if (qTele && qTele.switches && qTele.switches.length > 0) {
      const firstSw = qTele.switches[0];
      const lastSw = qTele.switches[qTele.switches.length - 1];
      const correctIdx = q.options?.findIndex((opt) => opt.isCorrect) ?? -1;
      const correctOptLetter = correctIdx !== -1 ? (q.options[correctIdx]?.label || String.fromCharCode(65 + correctIdx)) : '';
      const wasInitiallyCorrect = firstSw.from === correctOptLetter || firstSw.from === String(correctIdx) || (correctIdx !== -1 && firstSw.from === q.options[correctIdx]?.id);
      const isFinallyIncorrect = lastSw.to !== correctOptLetter && lastSw.to !== String(correctIdx) && (correctIdx === -1 || lastSw.to !== q.options[correctIdx]?.id);
      if (wasInitiallyCorrect && isFinallyIncorrect) {
        qTags.push('SECOND_GUESS_PENALTY');
      }
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
      timeSpentSeconds: actualTimeSpent,
      revisitCount: qTele?.revisitCount ?? 1,
      tags: qTags,
    });
  });

  // Calculate subject accuracies (with 1-decimal-place precision)
  Object.keys(subjectMap).forEach((subj) => {
    const s = subjectMap[subj];
    s.accuracy = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 1000) / 10 : 0;
  });

  // Calculate topic performances (with 1-decimal-place accuracy and attempt rate)
  const topicPerformance: TopicPerformance[] = Object.values(topicMap).map((t) => {
    const acc = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 1000) / 10 : 0;
    const attemptRate = t.total > 0 ? Math.round((t.attempted / t.total) * 1000) / 10 : 0;
    return {
      name: t.name,
      subject: t.subject,
      total: t.total,
      attempted: t.attempted,
      correct: t.correct,
      incorrect: t.incorrect,
      skipped: t.skipped,
      accuracy: acc,
      attemptRate,
      scoreAwarded: t.scoreAwarded,
      positiveMarks: t.positiveMarks || 0,
      negativeMarks: t.negativeMarks || 0,
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

/**
 * Accurately resolve the question's academic subject from question metadata, topic, or paper.
 * Prevents exam titles like "JEE Main" or "NEET" from leaking as subject names.
 */
export function extractSubjectFromTopicOrPaper(
  topic?: string,
  defaultSubject?: string,
  questionSubject?: string,
  sequenceNum?: number,
  totalQuestions?: number
): string {
  // 1. Highest priority: if the question already has an explicit academic subject
  if (questionSubject && typeof questionSubject === 'string' && questionSubject.trim()) {
    const norm = normalizeSubject(questionSubject);
    if (norm) return norm;
  }

  // 2. Derive from syllabus topic taxonomy if available
  const t = (topic || '').trim().toLowerCase();
  if (t) {
    // Check specific chemistry topics first (including Biomolecules which is chemistry in JEE)
    if (
      t.includes('biomolecule') ||
      t.includes('polymer') ||
      t.includes('chem') ||
      t.includes('organic') ||
      t.includes('inorganic') ||
      t.includes('bonding') ||
      t.includes('equilibrium') ||
      t.includes('solution') ||
      t.includes('redox') ||
      t.includes('kinetics') ||
      t.includes('electrochem') ||
      t.includes('period') ||
      t.includes('block') ||
      t.includes('coordination') ||
      t.includes('hydrocarbon') ||
      t.includes('haloalkane') ||
      t.includes('alcohol') ||
      t.includes('aldehyde') ||
      t.includes('ketone') ||
      t.includes('carboxylic') ||
      t.includes('amine') ||
      t.includes('metallurgy') ||
      t.includes('surface') ||
      t.includes('stoichiometry')
    ) {
      return 'Chemistry';
    }

    // Check physics topics
    if (
      t.includes('phys') ||
      t.includes('mechanic') ||
      t.includes('kinematic') ||
      t.includes('motion') ||
      t.includes('gravitat') ||
      t.includes('rotat') ||
      t.includes('oscillat') ||
      t.includes('wave') ||
      t.includes('thermodynamic') ||
      t.includes('optic') ||
      t.includes('electro') ||
      t.includes('magnet') ||
      t.includes('capacit') ||
      t.includes('current') ||
      t.includes('induction') ||
      t.includes('semiconductor') ||
      t.includes('atom') ||
      t.includes('nuclei') ||
      t.includes('radiation') ||
      t.includes('fluid') ||
      t.includes('solid') ||
      t.includes('work, energy') ||
      t.includes('work energy')
    ) {
      return 'Physics';
    }

    // Check mathematics topics
    if (
      t.includes('math') ||
      t.includes('algebra') ||
      t.includes('calculus') ||
      t.includes('trig') ||
      t.includes('matrix') ||
      t.includes('matrices') ||
      t.includes('determinant') ||
      t.includes('vector') ||
      t.includes('coordinate') ||
      t.includes('straight line') ||
      t.includes('circle') ||
      t.includes('conic') ||
      t.includes('parabola') ||
      t.includes('ellipse') ||
      t.includes('hyperbola') ||
      t.includes('probab') ||
      t.includes('permutation') ||
      t.includes('combination') ||
      t.includes('binomial') ||
      t.includes('sequence') ||
      t.includes('series') ||
      t.includes('relation') ||
      t.includes('function') ||
      t.includes('limit') ||
      t.includes('differenti') ||
      t.includes('integral') ||
      t.includes('differential equation') ||
      t.includes('geometry') ||
      t.includes('statistic')
    ) {
      return 'Mathematics';
    }

    // Check genuine biology topics (for medical / NEET exams)
    if (
      t.includes('botany') ||
      t.includes('zoology') ||
      t.includes('plant') ||
      t.includes('animal') ||
      t.includes('genetics') ||
      t.includes('anatomy') ||
      t.includes('physiology') ||
      t.includes('ecology') ||
      t.includes('cell:') ||
      t.includes('living world') ||
      (t.includes('bio') && !t.includes('biomolecule'))
    ) {
      return 'Biology';
    }
  }

  // 3. Check defaultSubject (only if it is a genuine academic subject, not an exam name like 'JEE Main')
  if (defaultSubject && typeof defaultSubject === 'string' && defaultSubject.trim()) {
    const norm = normalizeSubject(defaultSubject);
    if (norm) return norm;
  }

  // 4. If this is a standard 3-subject test (e.g. JEE Main) and we know the sequence number
  if (sequenceNum !== undefined && totalQuestions && totalQuestions >= 60) {
    const third = Math.ceil(totalQuestions / 3);
    if (sequenceNum <= third) {
      return 'Physics';
    } else if (sequenceNum <= third * 2) {
      return 'Chemistry';
    } else {
      return 'Mathematics';
    }
  }

  return 'General';
}

function normalizeSubject(name?: string): string | null {
  if (!name) return null;
  const s = name.trim().toLowerCase();

  // Filter out exam types / general test titles that are NOT subjects
  const isGenericExam =
    s.includes('jee main') ||
    s.includes('jee-main') ||
    s.includes('jee_main') ||
    s.includes('jee advanced') ||
    s.includes('jee-advanced') ||
    s.includes('neet') ||
    s.includes('cbse') ||
    s.includes('upsc') ||
    s.includes('gate') ||
    s.includes('practice') ||
    s.includes('mock') ||
    s === 'general';

  if (s.includes('phys')) return 'Physics';
  if (s.includes('chem')) return 'Chemistry';
  if (s.includes('math')) return 'Mathematics';
  if (s.includes('bio') || s.includes('botan') || s.includes('zool')) return 'Biology';

  if (isGenericExam) {
    return null;
  }

  // Clean and format valid custom subjects (e.g. "Computer Science", "English")
  return name.trim().replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
