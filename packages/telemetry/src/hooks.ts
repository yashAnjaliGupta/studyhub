// Exam-specific telemetry hooks
// Builds upon the existing StudyHub useTelemetry hook

// Note: In a real implementation, we'd need to adjust the import path
// For now, we'll create a mock version that demonstrates the concept
// In practice, this would be adapted to work with the actual telemetry infrastructure
import { useTelemetry } from './client';
import { useCallback } from 'react';
import {
  ExamTelemetryEventType,
  ExamTelemetryEvent
} from './event-types';
import { createBaseEvent } from './telemetry-event';

// Note: In a real implementation, we'd need to adjust the import path
// For now, we'll create a mock version that demonstrates the concept
// In practice, this would be adapted to work with the actual telemetry infrastructure

/**
 * Hook to manage exam-specific telemetry
 * Provides trackExamEvent function and automatically integrates with base telemetry
 */
export function useExamTelemetry() {
  const { trackEvent: trackBaseEvent, sessionId } = useTelemetry();

  const trackExamEvent = useCallback((options: Omit<ExamTelemetryEvent, 'event_id' | 'timestamp' | 'event_type'> & Partial<Pick<ExamTelemetryEvent, 'event_id' | 'timestamp'>>) => {
    const baseEvent = createBaseEvent({
      event_type: options.eventType,
      user_id: options.user_id,
      session_id: options.session_id || sessionId,
      page_url: options.page_url,
      metadata: options.metadata
    });

    const examEvent: ExamTelemetryEvent = {
      ...baseEvent,
      eventType: options.eventType,
      questionId: options.questionId,
      payload: options.payload as any
    };

    // In a real implementation, we would send this to the telemetry endpoint
    // For now, we'll just log it (in production, this would go through the proper telemetry pipeline)
    console.log('Exam telemetry event:', examEvent);

    // TODO: Send to actual telemetry endpoint
    // trackBaseEvent(examEvent as TelemetryEvent);
  }, [sessionId, trackBaseEvent]);

  // Specific exam telemetry tracking functions
  const trackQuestionViewed = useCallback((questionId: string, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.QUESTION_VIEWED,
      questionId,
      payload: { timestamp: Date.now() },
      metadata
    });
  }, [trackExamEvent]);

  const trackAnswerSelected = useCallback((questionId: string, optionId: string, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ANSWER_SELECTED,
      questionId,
      payload: { optionId },
      metadata
    });
  }, [trackExamEvent]);

  const trackAnswerChanged = useCallback((questionId: string, previousOptionId: string, newOptionId: string, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ANSWER_CHANGED,
      questionId,
      payload: { previousOptionId, newOptionId },
      metadata
    });
  }, [trackExamEvent]);

  const trackAnswerCleared = useCallback((questionId: string, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ANSWER_CLEARED,
      questionId,
      payload: {},
      metadata
    });
  }, [trackExamEvent]);

  const trackQuestionNavigated = useCallback((fromQuestionId: string, toQuestionId: string, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.QUESTION_NAVIGATED,
      questionId: toQuestionId, // Track with the destination question
      payload: { fromQuestionId, toQuestionId },
      metadata
    });
  }, [trackExamEvent]);

  const trackMarkedForReview = useCallback((questionId: string, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.MARKED_FOR_REVIEW,
      questionId,
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

  const trackAttemptSubmitted = useCallback((attemptId: string, metadata?: Record<string, unknown>) => {
    trackExamEvent({
      eventType: ExamTelemetryEventType.ATTEMPT_SUBMITTED,
      payload: { timestamp: Date.now() },
      metadata: { attemptId, ...(metadata || {}) }
    });
  }, [trackExamEvent]);

  const trackExamCompleted = useCallback((examId: string, metadata?: Record<string, unknown>) => {
    // Tracking exam completion is the same as tracking attempt submission
    trackAttemptSubmitted(examId, metadata);
  }, [trackAttemptSubmitted]);

  return {
    trackExamEvent,
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
