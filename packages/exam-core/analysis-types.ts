// Types for Exam Telemetry Accumulation & Behavioral Analysis

export interface QuestionTelemetryRecord {
  dwellSeconds: number;
  revisitCount: number;
  firstResponseSeconds?: number;
  switches: Array<{ from: string; to: string; at: number }>;
  hoverDurations: Record<string, number>; // { [optionId]: secondsSpentHovering }
}

export type ExamTelemetryMap = Record<string, QuestionTelemetryRecord>;

export interface ExamSubmissionPayload {
  attemptId: string;
  userId?: string;
  paperId: string;
  paperTitle?: string;
  submittedAt: number;
  durationSeconds: number;
  timeSpentSeconds: number;
  answers: Record<string, any>;
  telemetry: ExamTelemetryMap;
  subjectTimeSpent?: Record<string, number>;
  violationsCount?: number;
  autoSubmitted?: boolean;
  autoSubmitReason?: string;
}

export type BehavioralMistakeTag =
  | 'TIME_SINK'
  | 'RUSH_ERROR'
  | 'SECOND_GUESS_PENALTY'
  | 'GOOD_SECOND_THOUGHT'
  | 'OPTION_DILEMMA'
  | 'CARELESS_OMISSION';

export interface CriticalQuestionAnalysis {
  questionId: string;
  sequenceNum: number;
  subject: string;
  topic: string;
  questionSnippet: string;
  studentAnswer: string;
  correctAnswer: string;
  timeSpentSeconds: number;
  revisitCount: number;
  tags: BehavioralMistakeTag[];
  behaviorSummary: string;
}

export interface SubjectPacingMetric {
  subject: string;
  timeSpentMinutes: number;
  targetTimeMinutes: number;
  questionsAttempted: number;
  totalQuestions: number;
  accuracyRate: number;
  marksAwarded: number;
  status: 'BALANCED' | 'TIME_STARVED' | 'OVER_INVESTED';
}

export interface HumanReadableExamReport {
  attemptId: string;
  paperId: string;
  paperTitle: string;
  submittedAt: string;
  scores: {
    totalAwarded: number;
    maxPossible: number;
    percentage: number;
    accuracyRate: number;
    totalTimeSpentMinutes: number;
    avgSecondsPerQuestion: number;
  };
  subjectBreakdown: Record<string, SubjectPacingMetric>;
  staminaCurve: {
    phase1_FirstThird: { accuracy: number; avgTimePerQSec: number };
    phase2_SecondThird: { accuracy: number; avgTimePerQSec: number };
    phase3_FinalThird: { accuracy: number; avgTimePerQSec: number };
    fatigueDetected: boolean;
  };
  weakTopics: Array<{ topic: string; subject: string; accuracy: number; marksLost: number }>;
  strongTopics: Array<{ topic: string; subject: string; accuracy: number; marksEarned: number }>;
  behavioralTags: {
    timeSinksCount: number;
    rushErrorsCount: number;
    secondGuessPenaltiesCount: number;
    goodSecondThoughtsCount: number;
    optionDilemmasCount: number;
  };
  criticalQuestions: CriticalQuestionAnalysis[];
}

export interface NormalizedAttemptRecord {
  attemptId: string;
  userId: string;
  paperId: string;
  submittedAt: number;
  totalScore: number;
  maxScore: number;
  totalTimeSeconds: number;
  questionRecords: Array<{
    questionId: string;
    sequenceNum: number;
    selectedOption: any;
    isCorrect: boolean;
    dwellSeconds: number;
    revisitCount: number;
    tags: BehavioralMistakeTag[];
  }>;
}

