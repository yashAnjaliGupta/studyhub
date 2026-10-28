// Exam-specific telemetry hooks
// Builds upon the existing StudyHub useTelemetry hook

import { useTelemetry } from './client';
import { useCallback } from 'react';
import {
  ExamTelemetryEventType,
  ExamTelemetryEvent
} from './event-types';
import { createBaseEvent } from './telemetry-event';

export interface ExamTelemetryContext {
  paperId?: string;
  attemptId?: string;
  userId?: string;
}

export interface TrackExamEventOptions {
  eventType: ExamTelemetryEventType;
  questionId?: string;
  optionId?: string;
  subject?: string;
  topic?: string;
  timeSpentSeconds?: number;
  payload?: any;
  metadata?: Record<string, unknown>;
  user_id?: string;
  session_id?: string;
  page_url?: string;
}

/**
 * Hook to manage exam-specific telemetry
 * Provides trackExamEvent function and automatically publishes to the telemetry pipeline
 */
export function useExamTelemetry(context?: ExamTelemetryContext) {
  const { trackEvent: trackBaseEvent, sessionId } = useTelemetry({ userId: context?.userId });

  const trackExamEvent = useCallback((options: TrackExamEventOptions) => {
    const uid = options.user_id || context?.userId;
    const attId = context?.attemptId;
    const papId = context?.paperId;
    const qId = options.questionId;
    const optId = options.optionId;

    const baseEvent = createBaseEvent({
      event_type: options.eventType,
      user_id: uid,
      session_id: options.session_id || sessionId,
      page_url: options.page_url || (typeof window !== 'undefined' ? window.location.pathname : ''),
      metadata: options.metadata
    });

    const examEvent: ExamTelemetryEvent = {
      ...baseEvent,
      eventType: options.eventType,
      userId: uid,
      user_id: uid,
      attemptId: attId,
      attempt_id: attId,
      paperId: papId,
      paper_id: papId,
      questionId: qId,
      question_id: qId,
      optionId: optId,
      option_id: optId,
      subject: options.subject,
      topic: options.topic,
      timeSpentSeconds: options.timeSpentSeconds,
      time_spent_seconds: options.timeSpentSeconds,
      payload: options.payload || {},
      metadata: options.metadata
    };

    // Forward to client telemetry dispatch (POST /api/telemetry)
    trackBaseEvent(examEvent as any);
  }, [sessionId, trackBaseEvent, context?.userId, context?.attemptId, context?.paperId]);

  const trackAttemptStarted = useCallback((metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ATTEMPT_STARTED,
      payload: { timestamp: Date.now() },
      metadata
    });
  }, [trackExamEvent]);

  // Specific exam telemetry tracking functions
  const trackQuestionViewed = useCallback((questionId: string, metadata?: Record<string, unknown> & { subject?: string; topic?: string; sequenceNum?: number }) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.QUESTION_VIEWED,
      questionId,
      subject: metadata?.subject,
      topic: metadata?.topic,
      payload: { timestamp: Date.now(), sequenceNum: metadata?.sequenceNum },
      metadata
    });
  }, [trackExamEvent]);

  const trackAnswerSelected = useCallback((questionId: string, optionId: string, metadata?: Record<string, unknown> & { subject?: string; topic?: string; timeSpentSeconds?: number }) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ANSWER_SELECTED,
      questionId,
      optionId,
      subject: metadata?.subject,
      topic: metadata?.topic,
      timeSpentSeconds: metadata?.timeSpentSeconds,
      payload: { optionId },
      metadata
    });
  }, [trackExamEvent]);

  const trackAnswerChanged = useCallback((questionId: string, previousOptionId: string, newOptionId: string, metadata?: Record<string, unknown> & { subject?: string; topic?: string; timeSpentSeconds?: number }) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ANSWER_CHANGED,
      questionId,
      optionId: newOptionId,
      subject: metadata?.subject,
      topic: metadata?.topic,
      timeSpentSeconds: metadata?.timeSpentSeconds,
      payload: { previousOptionId, newOptionId },
      metadata
    });
  }, [trackExamEvent]);

  const trackAnswerCleared = useCallback((questionId: string, metadata?: Record<string, unknown> & { subject?: string; topic?: string }) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ANSWER_CLEARED,
      questionId,
      subject: metadata?.subject,
      topic: metadata?.topic,
      payload: {},
      metadata
    });
  }, [trackExamEvent]);

  const trackQuestionNavigated = useCallback((fromQuestionId: string, toQuestionId: string, metadata?: Record<string, unknown> & { subject?: string; topic?: string; fromIndex?: number; toIndex?: number }) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.QUESTION_NAVIGATED,
      questionId: toQuestionId, // Destination question
      subject: metadata?.subject,
      topic: metadata?.topic,
      payload: { fromQuestionId, toQuestionId },
      metadata
    });
  }, [trackExamEvent]);

  const trackMarkedForReview = useCallback((questionId: string, metadata?: Record<string, unknown> & { subject?: string; topic?: string }) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.MARKED_FOR_REVIEW,
      questionId,
      subject: metadata?.subject,
      topic: metadata?.topic,
      payload: {},
      metadata
    });
  }, [trackExamEvent]);

  const trackSolutionOpened = useCallback((questionId: string, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.SOLUTION_OPENED,
      questionId,
      payload: {},
      metadata
    });
  }, [trackExamEvent]);

  const trackFocusChanged = useCallback((isHidden: boolean, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.FOCUS_CHANGED,
      payload: { isHidden },
      metadata
    });
  }, [trackExamEvent]);

  const trackNetworkInterrupted = useCallback((status: 'disconnected' | 'reconnected', metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.NETWORK_INTERRUPTED,
      payload: { status },
      metadata
    });
  }, [trackExamEvent]);

  const trackAttemptSubmitted = useCallback((attemptId?: string, metadata?: Record<string, unknown> & { paperId?: string; answersCount?: number; totalQuestions?: number; score?: number; timeSpentSeconds?: number }) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ATTEMPT_SUBMITTED,
      payload: { timestamp: Date.now(), ...(metadata || {}) },
      metadata: { attemptId: attemptId || context?.attemptId, ...(metadata || {}) }
    });
  }, [trackExamEvent, context?.attemptId]);

  const trackExamCompleted = useCallback((examId: string, metadata?: Record<string, unknown>) => {
    trackAttemptSubmitted(examId, metadata);
  }, [trackAttemptSubmitted]);

  return {
    trackExamEvent,
    trackAttemptStarted,
    trackQuestionViewed,
    trackAnswerSelected,
    trackAnswerChanged,
    trackAnswerCleared,
    trackQuestionNavigated,
    trackMarkedForReview,
    trackSolutionOpened,
    trackFocusChanged,
    trackNetworkInterrupted,
    trackAttemptSubmitted,
    trackExamCompleted,
    sessionId
  };
}
