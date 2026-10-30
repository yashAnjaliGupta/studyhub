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

    // Send to Kafka asynchronously without blocking the client HTTP connection
    try {
      sendTelemetryEvent(body as Record<string, unknown>).catch((err) => {
        console.warn('[TestHub Telemetry API] Non-blocking Kafka send warning:', err?.message || err);
      });
    } catch (err: any) {
      console.warn('[TestHub Telemetry API] Non-blocking dispatch warning:', err?.message || err);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.warn('[TestHub Telemetry API] Error processing telemetry event:', error?.message || error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

export const dynamic = 'force-dynamic';
