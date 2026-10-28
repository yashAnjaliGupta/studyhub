import { NextResponse } from 'next/server';
import { sendTelemetryEvent, sendTelemetryBatch, isExamTelemetryEvent } from '@repo/telemetry/producer';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support both single event and batch of events
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }
      await sendTelemetryBatch(body as Record<string, unknown>[]);
      return NextResponse.json({ success: true, count: body.length }, { status: 200 });
    }

    // Basic validation for single event
    if (!body.event_id || typeof body.timestamp !== 'number' || (!body.event_type && !body.eventType)) {
      return NextResponse.json(
        { error: 'Invalid telemetry event: missing required event_id, timestamp, or event_type' },
        { status: 400 }
      );
    }

    // Send to Kafka:
    // If it's an exam event (has attemptId, questionId, or ExamTelemetryEventType),
    // sendTelemetryEvent automatically routes it to KAFKA_EXAM_TOPIC (default: 'exam-telemetry').
    // Otherwise routes to KAFKA_TOPIC (default: 'web_telemetry').
    await sendTelemetryEvent(body as Record<string, unknown>);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[TestHub Telemetry API] Error processing telemetry event:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal telemetry error', message: error?.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
