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

    // Send to Kafka via @repo/telemetry
    await sendTelemetryEvent(body as unknown as Record<string, unknown>);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in telemetry API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';