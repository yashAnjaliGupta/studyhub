// Exam Core Domain Models
// Based on the TestHub architecture proposal

export interface Question {
  id: string;
  paperId?: string | null;
  sequenceNum?: number | null;
  topicId?: string | null;
  subject?: string | null;
  text: string;
  imageUrl?: string | null;
  diagramSvg?: string | null;
  type?: string;
  options: QuestionOption[];
  correctOptionIds?: string[];
  correctOptionId?: string;
  numericalAnswer?: any;
  solutionText?: string | null;
  solutionSvg?: string | null;
  marks: number;
  negativeMarks: number;
}

export interface QuestionOption {
  id: string;
  questionId?: string;
  label?: string;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
  sequenceNum?: number;
}

export interface QuestionTopic {
  id: string;
  name: string;
  subject: string; // e.g., "Physics", "Chemistry", "Mathematics", "Biology"
}

export interface ExamAttempt {
  id: string;
  studentId: string;
  paperId: string;
  status: 'CREATED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATED' | 'INSIGHTS_AVAILABLE';
  startedAt: Date;
  submittedAt?: Date;
  evaluatedAt?: Date;
  config: ExamConfig;
}

export interface ExamConfig {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  durationMinutes: number;
  isTimedSimulation: boolean;
}

export interface ExamAnswer {
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  markedForReview: boolean;
  updatedAt: Date;
}

export interface ExamResult {
  attemptId: string;
  score: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  evaluatedAt: Date;
}

// Enums for better type safety
export const ExamAttemptStatus = {
  CREATED: 'CREATED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EVALUATED: 'EVALUATED',
  INSIGHTS_AVAILABLE: 'INSIGHTS_AVAILABLE'
} as const;

export type ExamAttemptStatusType = typeof ExamAttemptStatus[keyof typeof ExamAttemptStatus];