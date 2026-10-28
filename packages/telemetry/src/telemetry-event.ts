// Base telemetry event structure
// Based on the existing StudyHub telemetry event from apps/web/lib/telemetry.ts

export interface TelemetryEvent {
  event_id: string;
  timestamp: number;
  event_type: string;
  user_id?: string;
  session_id?: string;
  page_url?: string;
  metadata?: Record<string, unknown>;
}

// Utility function to generate UUID (same as in existing StudyHub telemetry)
export function generateUUID(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper to create a base telemetry event
export function createBaseEvent(options: {
  event_type: string;
  user_id?: string;
  session_id?: string;
  page_url?: string;
  metadata?: Record<string, unknown>;
}): TelemetryEvent {
  return {
    event_id: generateUUID(),
    timestamp: Date.now(),
    event_type: options.event_type,
    user_id: options.user_id,
    session_id: options.session_id,
    page_url: options.page_url,
    metadata: options.metadata
  };
}