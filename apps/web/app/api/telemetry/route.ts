import { NextResponse } from 'next/server'
import { sendTelemetryEvent } from '../../../lib/kafkaProducer'

// Define the shape of a telemetry event
interface TelemetryEvent {
  [key: string]: unknown
  event_id: string
  timestamp: number
  event_type: string
  user_id?: string
  session_id?: string
  page_url?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Basic validation
    if (!body.event_id || typeof body.timestamp !== 'number' || !body.event_type) {
      return NextResponse.json(
        { error: 'Invalid telemetry event: missing required fields' },
        { status: 400 }
      )
    }

    // Send to Kafka
    await sendTelemetryEvent(body as TelemetryEvent)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in telemetry API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'