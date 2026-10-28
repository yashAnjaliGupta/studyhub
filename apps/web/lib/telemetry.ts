'use client';

// Re-export client-side telemetry utilities from @repo/telemetry
export {
  useTelemetry,
  TelemetryProvider,
  createBaseEvent,
  generateUUID,
} from '@repo/telemetry';

export type { TelemetryEvent, BaseTelemetryEvent } from '@repo/telemetry';