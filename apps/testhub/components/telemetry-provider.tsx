'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { TelemetryProvider } from '@repo/telemetry';

export function TestHubTelemetryProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : session?.user?.email || undefined;

  return (
    <TelemetryProvider userId={userId}>
      {children}
    </TelemetryProvider>
  );
}
