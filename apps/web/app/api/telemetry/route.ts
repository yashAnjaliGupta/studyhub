import { NextResponse } from 'next/server';
import { sendTelemetryEvent, type TelemetryEvent } from '@repo/telemetry/producer';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.event_id || typeof body.timestamp !== 'number' || (!body.event_type && !body.eventType)) {
      return NextResponse.json(
        { error: 'Invalid telemetry event: missing required fields' },
        { status: 400 }
      );
    }

    // Send to Kafka asynchronously without blocking the client HTTP thread
    sendTelemetryEvent(body as unknown as Record<string, unknown>).catch((err) => {
      console.warn('[Web Telemetry API] Non-blocking Kafka dispatch warning:', err?.message || err);
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.warn('[Web Telemetry API] Error processing event:', error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

export const dynamic = 'force-dynamic';
