import type {
  ExamSubmissionPayload,
  HumanReadableExamReport,
  NormalizedAttemptRecord,
  CriticalQuestionAnalysis,
  BehavioralMistakeTag,
  SubjectPacingMetric
} from './analysis-types';
import type { Question } from './models';

export interface ClassifyExamInput {
  submission: ExamSubmissionPayload;
  questions: Question[];
}

export interface ClassifyExamResult {
  humanReadableReport: HumanReadableExamReport;
  normalizedRecord: NormalizedAttemptRecord;
}

/**
 * Deterministic classifier: runs in-memory in ~5-15ms with 0 external LLM costs.
 */
export function classifyExamTelemetry(input: ClassifyExamInput): ClassifyExamResult {
  const { submission, questions } = input;
  const { attemptId, userId = 'anonymous', paperId, paperTitle = 'Examination Paper', answers, telemetry, subjectTimeSpent = {} } = submission;

  let totalAwarded = 0;
  let maxPossible = 0;
  let correctCount = 0;
  let attemptedCount = 0;

  const topicStats: Record<string, { subject: string; correct: number; total: number; marksLost: number; marksEarned: number }> = {};
  const subjectStats: Record<string, { attempted: number; total: number; correct: number; score: number }> = {};
  const criticalQuestions: CriticalQuestionAnalysis[] = [];

  let timeSinksCount = 0;
  let rushErrorsCount = 0;
  let secondGuessPenaltiesCount = 0;
  let goodSecondThoughtsCount = 0;
  let optionDilemmasCount = 0;

  const questionEvaluations: Array<{
    question: Question;
    sequenceNum: number;
    dwellSec: number;
    revisitCount: number;
    isAttempted: boolean;
    isCorrect: boolean;
    studentAnswerDisplay: string;
    correctAnswerDisplay: string;
    tags: BehavioralMistakeTag[];
    behaviorSummary: string;
  }> = [];

  // Calculate average question dwell time
  const totalTelemetryDwell = Object.values(telemetry).reduce((acc, curr) => acc + (curr.dwellSeconds || 0), 0);
  const avgDwellSec = questions.length > 0 ? Math.round(totalTelemetryDwell / questions.length) : 120;
  const timeSinkThreshold = Math.max(240, avgDwellSec * 2); // 4+ mins or 2x average

  questions.forEach((q, idx) => {
    const seqNum = q.sequenceNum ?? (idx + 1);
    const marks = q.marks || 4;
    const negMarks = q.negativeMarks ?? 1;
    maxPossible += marks;

    const subject = q.subject || 'General';
    const topic = q.topicId || (q as any).topic || 'General Topic';

    if (!topicStats[topic]) {
      topicStats[topic] = { subject, correct: 0, total: 0, marksLost: 0, marksEarned: 0 };
    }
    topicStats[topic].total += 1;

    if (!subjectStats[subject]) {
      subjectStats[subject] = { attempted: 0, total: 0, correct: 0, score: 0 };
    }
    subjectStats[subject].total += 1;

    const qTele = telemetry[q.id] || { dwellSeconds: 0, revisitCount: 1, switches: [], hoverDurations: {} };
    const dwellSec = qTele.dwellSeconds || 0;
    const revisitCount = qTele.revisitCount || 1;
    const switches = qTele.switches || [];
    const hovers = qTele.hoverDurations || {};

    const rawUserAnswer = answers[q.id];
    const isAttempted = rawUserAnswer !== undefined && rawUserAnswer !== null && rawUserAnswer !== '';

    let isCorrect = false;
    let correctAnswerDisplay = '';
    let studentAnswerDisplay = isAttempted ? String(rawUserAnswer) : 'Unanswered';

    if (q.type === 'numerical') {
      const expectedText = q.options[0]?.text?.trim() || String(q.numericalAnswer ?? '');
      correctAnswerDisplay = expectedText;
      if (isAttempted) {
        const userNum = parseFloat(String(rawUserAnswer).trim());
        const expectedNum = parseFloat(expectedText);
        if (!isNaN(userNum) && !isNaN(expectedNum)) {
          isCorrect = Math.abs(userNum - expectedNum) < 0.05;
        } else {
          isCorrect = String(rawUserAnswer).trim().toLowerCase() === expectedText.toLowerCase();
        }
      }
    } else {
      // Single / Multiple MCQ
      const correctOption = q.options.find(opt => opt.isCorrect);
      const correctOptionId = correctOption?.id || q.correctOptionId || '';
      correctAnswerDisplay = correctOption?.label ? `Option ${correctOption.label}` : correctOption?.text?.slice(0, 50) || 'Correct Option';

      if (isAttempted) {
        const selectedOpt = q.options.find(opt => opt.id === rawUserAnswer);
        studentAnswerDisplay = selectedOpt?.label ? `Option ${selectedOpt.label}` : String(rawUserAnswer);
        isCorrect = String(rawUserAnswer) === String(correctOptionId);
      }
    }

    if (isAttempted) {
      attemptedCount += 1;
      subjectStats[subject].attempted += 1;
      if (isCorrect) {
        correctCount += 1;
        totalAwarded += marks;
        topicStats[topic].correct += 1;
        topicStats[topic].marksEarned += marks;
        subjectStats[subject].correct += 1;
        subjectStats[subject].score += marks;
      } else {
        totalAwarded -= negMarks;
        topicStats[topic].marksLost += negMarks;
        subjectStats[subject].score -= negMarks;
      }
    }

    // Deterministic behavioral rule classifications
    const tags: BehavioralMistakeTag[] = [];
    const summaries: string[] = [];

    // 1. Time Sink
    if (dwellSec >= timeSinkThreshold && !isCorrect) {
      tags.push('TIME_SINK');
      timeSinksCount += 1;
      summaries.push(`Spent ${Math.round(dwellSec / 60 * 10) / 10}m (>2.5x benchmark) and did not gain marks`);
    }

    // 2. Rush Error
    if (isAttempted && !isCorrect && dwellSec < 35 && q.type !== 'factual') {
      tags.push('RUSH_ERROR');
      rushErrorsCount += 1;
      summaries.push(`Rushed through in ${dwellSec}s; likely missed key question constraint or calculation step`);
    }

    // 3. Option Switches (Second-Guess vs Good Second Thought)
    if (switches.length > 0) {
      const firstSwitch = switches[0];
      const lastSwitch = switches[switches.length - 1];
      const correctOptionId = q.options.find(o => o.isCorrect)?.id || q.correctOptionId;

      if (firstSwitch.from === correctOptionId && lastSwitch.to !== correctOptionId) {
        tags.push('SECOND_GUESS_PENALTY');
        secondGuessPenaltiesCount += 1;
        summaries.push(`Changed answer from the correct option to an incorrect one`);
      } else if (firstSwitch.from !== correctOptionId && lastSwitch.to === correctOptionId) {
        tags.push('GOOD_SECOND_THOUGHT');
        goodSecondThoughtsCount += 1;
        summaries.push(`Successfully corrected answer during review`);
      }
    }

    // 4. Option Hover Dilemma
    const hoveredOptions = Object.entries(hovers).filter(([_, sec]) => sec >= 8);
    if (hoveredOptions.length >= 2 && isAttempted && !isCorrect) {
      tags.push('OPTION_DILEMMA');
      optionDilemmasCount += 1;
      summaries.push(`Hesitated between 2+ options (${hoveredOptions.map(([id, s]) => `${id}: ${Math.round(s)}s`).join(', ')}) before picking wrong`);
    }

    const behaviorSummary = summaries.length > 0
      ? summaries.join('; ')
      : isCorrect
      ? 'Clean execution within pacing benchmark'
      : isAttempted
      ? 'Conceptual or arithmetic error'
      : 'Skipped';

    questionEvaluations.push({
      question: q,
      sequenceNum: seqNum,
      dwellSec,
      revisitCount,
      isAttempted,
      isCorrect,
      studentAnswerDisplay,
      correctAnswerDisplay,
      tags,
      behaviorSummary
    });

    // Collect Critical Questions (Top struggles)
    if (tags.length > 0 || (!isCorrect && isAttempted && dwellSec > 150)) {
      criticalQuestions.push({
        questionId: q.id,
        sequenceNum: seqNum,
        subject,
        topic,
        questionSnippet: (q.text || 'Question snippet').slice(0, 140) + '...',
        studentAnswer: studentAnswerDisplay,
        correctAnswer: correctAnswerDisplay,
        timeSpentSeconds: dwellSec,
        revisitCount,
        tags,
        behaviorSummary
      });
    }
  });

  // Calculate Subject Pacing Metrics
  const subjectBreakdown: Record<string, SubjectPacingMetric> = {};
  for (const [subName, stats] of Object.entries(subjectStats)) {
    const timeSpentSec = subjectTimeSpent[subName] || 0;
    const timeSpentMinutes = Math.round(timeSpentSec / 60);
    const targetTimeMinutes = Math.round(((submission.durationSeconds || 10800) / 60) / Object.keys(subjectStats).length);
    const accuracyRate = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) / 100 : 0;

    let status: 'BALANCED' | 'TIME_STARVED' | 'OVER_INVESTED' = 'BALANCED';
    if (timeSpentMinutes < targetTimeMinutes * 0.6) status = 'TIME_STARVED';
    else if (timeSpentMinutes > targetTimeMinutes * 1.35) status = 'OVER_INVESTED';

    subjectBreakdown[subName] = {
      subject: subName,
      timeSpentMinutes,
      targetTimeMinutes,
      questionsAttempted: stats.attempted,
      totalQuestions: stats.total,
      accuracyRate,
      marksAwarded: stats.score,
      status
    };
  }

  // Calculate Stamina / Fatigue Curve (Divided into Thirds of Paper)
  const thirdSize = Math.max(1, Math.floor(questionEvaluations.length / 3));
  const calcPhaseStats = (slice: typeof questionEvaluations) => {
    const attempted = slice.filter(i => i.isAttempted);
    const correct = slice.filter(i => i.isCorrect);
    const accuracy = attempted.length > 0 ? Math.round((correct.length / attempted.length) * 100) / 100 : 0;
    const avgDwell = slice.length > 0 ? Math.round(slice.reduce((acc, curr) => acc + curr.dwellSec, 0) / slice.length) : 0;
    return { accuracy, avgTimePerQSec: avgDwell };
  };

  const p1 = calcPhaseStats(questionEvaluations.slice(0, thirdSize));
  const p2 = calcPhaseStats(questionEvaluations.slice(thirdSize, thirdSize * 2));
  const p3 = calcPhaseStats(questionEvaluations.slice(thirdSize * 2));
  const fatigueDetected = p1.accuracy - p3.accuracy >= 0.22; // 22%+ drop in final third

  // Topic mastery rankings
  const topicEntries = Object.entries(topicStats).map(([topic, s]) => ({
    topic,
    subject: s.subject,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) / 100 : 0,
    marksLost: s.marksLost,
    marksEarned: s.marksEarned,
  }));

  const weakTopics = topicEntries
    .filter(t => t.accuracy < 0.5)
    .sort((a, b) => b.marksLost - a.marksLost)
    .slice(0, 5);

  const strongTopics = topicEntries
    .filter(t => t.accuracy >= 0.7)
    .sort((a, b) => b.marksEarned - a.marksEarned)
    .slice(0, 5);

  const totalTimeSpentMinutes = Math.round((submission.timeSpentSeconds || totalTelemetryDwell) / 60);

  const humanReadableReport: HumanReadableExamReport = {
    attemptId,
    paperId,
    paperTitle,
    submittedAt: new Date(submission.submittedAt || Date.now()).toISOString(),
    scores: {
      totalAwarded,
      maxPossible,
      percentage: maxPossible > 0 ? Math.round((totalAwarded / maxPossible) * 1000) / 10 : 0,
      accuracyRate: attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) / 100 : 0,
      totalTimeSpentMinutes,
      avgSecondsPerQuestion: avgDwellSec
    },
    subjectBreakdown,
    staminaCurve: {
      phase1_FirstThird: p1,
      phase2_SecondThird: p2,
      phase3_FinalThird: p3,
      fatigueDetected
    },
    weakTopics,
    strongTopics,
    behavioralTags: {
      timeSinksCount,
      rushErrorsCount,
      secondGuessPenaltiesCount,
      goodSecondThoughtsCount,
      optionDilemmasCount
    },
    criticalQuestions: criticalQuestions.slice(0, 8)
  };

  const normalizedRecord: NormalizedAttemptRecord = {
    attemptId,
    userId,
    paperId,
    submittedAt: submission.submittedAt || Date.now(),
    totalScore: totalAwarded,
    maxScore: maxPossible,
    totalTimeSeconds: submission.timeSpentSeconds || totalTelemetryDwell,
    questionRecords: questionEvaluations.map(qe => ({
      questionId: qe.question.id,
      sequenceNum: qe.sequenceNum,
      selectedOption: answers[qe.question.id] ?? null,
      isCorrect: qe.isCorrect,
      dwellSeconds: qe.dwellSec,
      revisitCount: qe.revisitCount,
      tags: qe.tags
    }))
  };

  return { humanReadableReport, normalizedRecord };
}

