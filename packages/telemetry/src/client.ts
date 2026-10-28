'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { type TelemetryEvent, generateUUID } from './telemetry-event';

export interface TelemetryOptions {
  userId?: string;
}

/**
 * Hook to manage telemetry in browser/client
 * Provides a trackEvent function and automatically tracks page views
 */
export function useTelemetry(options?: TelemetryOptions) {
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

  const currentUserId = options?.userId;

  const trackPageView = useCallback(() => {
    const event: TelemetryEvent = {
      event_id: generateUUID(),
      timestamp: Date.now(),
      event_type: 'page_view',
      session_id: sessionId,
      sessionId: sessionId,
      user_id: currentUserId,
      userId: currentUserId,
      page_url: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    sendEvent(event);
  }, [sessionId, currentUserId, sendEvent]);

  // Track page view on pathname change
  useEffect(() => {
    trackPageView();
  }, [pathname, trackPageView]);

  const trackEvent = useCallback((event: (Omit<Partial<TelemetryEvent>, 'event_id' | 'timestamp'> & { event_type?: string; eventType?: string }) | Record<string, any>) => {
    const uid = (typeof event.user_id === 'string' ? event.user_id : undefined) ||
                (typeof event.userId === 'string' ? event.userId : undefined) ||
                currentUserId;
    const eventType = (event.event_type || event.eventType || 'custom') as string;
    const enriched: TelemetryEvent = {
      event_id: generateUUID(),
      timestamp: Date.now(),
      event_type: eventType,
      session_id: sessionId,
      sessionId: sessionId,
      user_id: uid,
      userId: uid,
      ...event,
    };
    sendEvent(enriched);
  }, [sessionId, currentUserId, sendEvent]);

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

  return { trackEvent, sessionId, sendEvent };
}

/**
 * Provider component to initialize telemetry in the application
 */
export function TelemetryProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  useTelemetry({ userId });
  return React.createElement(React.Fragment, null, children);
}
