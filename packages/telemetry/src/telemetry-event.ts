// Base telemetry event structure
// Based on the existing StudyHub telemetry event from apps/web/lib/telemetry.ts

export interface TelemetryEvent {
  event_id: string;
  timestamp: number;
  event_type: string;
  user_id?: string;
  userId?: string;
  session_id?: string;
  sessionId?: string;
  page_url?: string;
  topic?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

// Utility function to generate UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper to create a base telemetry event
export function createBaseEvent(options: {
  event_type: string;
  user_id?: string;
  userId?: string;
  session_id?: string;
  sessionId?: string;
  page_url?: string;
  topic?: string;
  metadata?: Record<string, unknown>;
}): TelemetryEvent {
  const uid = options.user_id || options.userId;
  const sid = options.session_id || options.sessionId;
  return {
    event_id: generateUUID(),
    timestamp: Date.now(),
    event_type: options.event_type,
    user_id: uid,
    userId: uid,
    session_id: sid,
    sessionId: sid,
    page_url: options.page_url,
    topic: options.topic,
    metadata: options.metadata
  };
}