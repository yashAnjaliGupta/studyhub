export interface DiagnosticSectionOverview {
  totalScore: number;
  maxScore: number;
  percentage: number;
  accuracyRate: number;
  questionsAttempted: number;
  totalQuestions: number;
  timeUtilizationPercent: number;
  totalTimeMinutes: number;
  marksRecoverable: number; // e.g. +28 marks lost to unforced errors
  studentArchetype?: string;
  executiveSummary: string;
  topStrengths: string[];
  topOpportunities: string[];
  nextTestFocus: string[];
  threeGoldenRules: string[];
}

export interface DiagnosticSubjectBreakdown {
  subject: string;
  scoreAwarded: number;
  maxScore: number;
  accuracyPercent: number;
  timeSpentMinutes: number;
  medianSolvingSeconds: number;
  benchmarkSolvingSeconds: number;
  diagnosis: string;
  topicPriorities: Array<{
    name: string;
    correct: number;
    total: number;
    priority: 'Low' | 'Medium' | 'High' | 'Very High';
  }>;
  errorTaxonomy: {
    conceptualCount: number;
    calculationCount: number;
    strategyTimeOutCount: number;
  };
  actionItems: string[];
}

export type TopicDiagnosticClassification =
  | 'Strong'
  | 'Accurate but slow'
  | 'Fast but inaccurate'
  | 'Conceptually weak'
  | 'Insufficient evidence';

export interface DiagnosticTopicItem {
  name: string;
  subject: string;
  attempted: number;
  total: number;
  accuracyPercent: number;
  avgTimeSeconds: number;
  marksAwarded: number;
  maxMarks: number;
  classification: TopicDiagnosticClassification;
  recommendedAction: string;
  diagnosisReasoning: string;
  priorityScore: number; // For sorting & revision ordering
}

export interface DiagnosticQuestionDeepDive {
  questionId: string;
  sequenceNum: number;
  subject: string;
  topic: string;
  type: string;
  marksAwarded: number;
  timeSpentSeconds: number;
  targetSolvingSeconds: number;
  outcome: 'correct' | 'incorrect' | 'unattempted' | 'eventually_correct';
  userAnswerText: string;
  correctAnswerText: string;
  whatHappened: string; // "Submitted 2 incorrect options before selecting B"
  whereDidItGoWrong: string; // "Uncertainty around friction force direction before solving"
  confidenceRating: 'High' | 'Moderate' | 'Exploratory';
  actionableChecklist: string[]; // ["1. Draw FBD", "2. Check relative motion direction", ...]
  tags: string[];
}

export interface DiagnosticAttemptJourney {
  staminaCurve: Array<{
    timeBlockMinutes: string;
    accuracyPercent: number;
    avgSpeedSeconds: number;
  }>;
  fatigueInsight: string;
  switchAnalysis: {
    totalSwitches: number;
    goodSwitches: number; // wrong -> right (+4)
    badSwitches: number;  // right -> wrong (-5 net loss)
    netMarksImpact: number;
    summary: string;
  };
  behavioralTraps: {
    rushErrorsCount: number;
    timeSinksCount: number;
    secondGuessCount: number;
    hesitationCount: number;
  };
}

export interface DiagnosticImprovementPlan {
  rankedPriorities: Array<{
    rank: number;
    title: string;
    subject: string;
    targetMarksGain: number;
    whyItMatters: string;
    actionStep: string;
    practiceUrl: string;
  }>;
  nextTestGoals: {
    targetScore: number;
    targetTimeDistribution: Record<string, string>;
    pacingRule: string;
  };
}

export interface CompleteDiagnosticReport {
  attemptId: string;
  paperId: string;
  paperTitle: string;
  createdAt: number;
  overview: DiagnosticSectionOverview;
  subjects: DiagnosticSubjectBreakdown[];
  topics: DiagnosticTopicItem[];
  questions: DiagnosticQuestionDeepDive[];
  journey: DiagnosticAttemptJourney;
  plan: DiagnosticImprovementPlan;
}

