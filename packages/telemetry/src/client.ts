'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { type TelemetryEvent, generateUUID } from './telemetry-event';

/**
 * Hook to manage telemetry in browser/client
 * Provides a trackEvent function and automatically tracks page views
 */
export function useTelemetry() {
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('studyhub_telemetry_session');
        if (stored) return stored;
        const id = generateUUID();
        localStorage.setItem('studyhub_telemetry_session', id);
        return id;
      } catch {
        // Storage disabled or SecurityError
      }
    }
    // SSR fallback or memory session ID
    return generateUUID();
  });

  // On client mount, sync persisted session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('studyhub_telemetry_session');
        if (stored && stored !== sessionId) {
          setSessionId(stored);
        }
      } catch {
        // Storage blocked or inaccessible
      }
    }
  }, [sessionId]);

  let pathname = '';
  try {
    pathname = usePathname() || '';
  } catch {
    // If used outside of Next.js router context
    pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  }

  const sendEvent = useCallback(async (event: TelemetryEvent) => {
    if (typeof window === 'undefined') return;
    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (err) {
      console.warn('Failed to send telemetry event:', err);
    }
  }, []);

  const trackPageView = useCallback(() => {
    const event: TelemetryEvent = {
      event_id: generateUUID(),
      timestamp: Date.now(),
      event_type: 'page_view',
      session_id: sessionId,
      page_url: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    sendEvent(event);
  }, [sessionId, sendEvent]);

  // Track page view on pathname change
  useEffect(() => {
    trackPageView();
  }, [pathname, trackPageView]);

  const trackEvent = useCallback((event: Omit<TelemetryEvent, 'event_id' | 'timestamp'> & Partial<Pick<TelemetryEvent, 'event_id' | 'timestamp'>>) => {
    const enriched: TelemetryEvent = {
      event_id: generateUUID(),
      timestamp: Date.now(),
      session_id: sessionId,
      ...event,
    };
    sendEvent(enriched);
  }, [sessionId, sendEvent]);

  // Optional global click tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const metadata: Record<string, unknown> = {
        tagName: target.tagName,
        id: target.id || undefined,
        className: target.className || undefined,
      };
      Object.keys(metadata).forEach((key) => metadata[key] === undefined && delete metadata[key]);

      trackEvent({
        event_type: 'click',
        metadata,
      });
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [trackEvent]);

  return { trackEvent, sessionId };
}

/**
 * Provider component to initialize telemetry in the application
 */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  useTelemetry();
  return React.createElement(React.Fragment, null, children);
}
