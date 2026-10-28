// Telemetry Event Types for TestHub
// Extends the existing StudyHub telemetry event structure

import { TelemetryEvent as StudyHubTelemetryEvent } from './telemetry-event';

// Exam-specific telemetry event types
export enum ExamTelemetryEventType {
  ATTEMPT_STARTED = 'attempt_started',
  QUESTION_VIEWED = 'question_viewed',
  ANSWER_SELECTED = 'answer_selected',
  ANSWER_CHANGED = 'answer_changed',
  ANSWER_CLEARED = 'answer_cleared',
  QUESTION_NAVIGATED = 'question_navigated',
  MARKED_FOR_REVIEW = 'marked_for_review',
  SOLUTION_OPENED = 'solution_opened',
  FOCUS_CHANGED = 'focus_changed',
  NETWORK_INTERRUPTED = 'network_interrupted',
  ATTEMPT_SUBMITTED = 'attempt_submitted'
}

// Base exam telemetry event interface
export interface ExamTelemetryEvent extends StudyHubTelemetryEvent {
  eventType: ExamTelemetryEventType;
  // Core exam insight identifiers
  attemptId?: string;
  attempt_id?: string;
  paperId?: string;
  paper_id?: string;
  questionId?: string;
  question_id?: string;
  optionId?: string;
  option_id?: string;
  subject?: string;
  topic?: string;
  timeSpentSeconds?: number;
  time_spent_seconds?: number;
  topic_name?: string;

  // Exam-specific payload based on event type
  payload?:
    | { timestamp: number } // For ATTEMPT_STARTED
    | { timestamp: number; sequenceNum?: number } // For QUESTION_VIEWED
    | { optionId: string } // For ANSWER_SELECTED
    | { previousOptionId: string; newOptionId: string } // For ANSWER_CHANGED
    | { } // For ANSWER_CLEARED
    | { fromQuestionId: string; toQuestionId: string } // For QUESTION_NAVIGATED
    | { } // For MARKED_FOR_REVIEW
    | { } // For SOLUTION_OPENED
    | { isHidden: boolean; reason?: string } // For FOCUS_CHANGED
    | { status: 'disconnected' | 'reconnected' } // For NETWORK_INTERRUPTED
    | { timestamp: number; answersCount?: number; totalQuestions?: number; score?: number } // For ATTEMPT_SUBMITTED
    | Record<string, any>;
}

// Union type for all possible telemetry events (StudyHub + Exam)
export type TelemetryEvent = StudyHubTelemetryEvent | ExamTelemetryEvent;

// Type guards for exam-specific events
export const isExamTelemetryEvent = (event: Record<string, any>): boolean => {
  if (!event) return false;
  const eventType = event.eventType || event.event_type;
  if (eventType && Object.values(ExamTelemetryEventType).includes(eventType as ExamTelemetryEventType)) {
    return true;
  }
  return Boolean(
    event.attemptId ||
    event.attempt_id ||
    event.questionId ||
    event.question_id ||
    event.paperId ||
    event.paper_id
  );
};

// Payload type helpers
export type AttemptStartedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.ATTEMPT_STARTED }>['payload'];
export type QuestionViewedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.QUESTION_VIEWED }>['payload'];
export type AnswerSelectedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.ANSWER_SELECTED }>['payload'];
export type AnswerChangedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.ANSWER_CHANGED }>['payload'];
export type AnswerClearedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.ANSWER_CLEARED }>['payload'];
export type QuestionNavigatedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.QUESTION_NAVIGATED }>['payload'];
export type MarkedForReviewPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.MARKED_FOR_REVIEW }>['payload'];
export type SolutionOpenedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.SOLUTION_OPENED }>['payload'];
export type FocusChangedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.FOCUS_CHANGED }>['payload'];
export type NetworkInterruptedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.NETWORK_INTERRUPTED }>['payload'];
export type AttemptSubmittedPayload = Extract<ExamTelemetryEvent, { eventType: ExamTelemetryEventType.ATTEMPT_SUBMITTED }>['payload'];