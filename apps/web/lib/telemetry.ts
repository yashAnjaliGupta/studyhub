'use client'
import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Define the shape of a telemetry event (matches what we send to API)
interface TelemetryEvent {
  event_id: string
  timestamp: number
  event_type: string
  user_id?: string
  session_id?: string
  page_url?: string
  metadata?: Record<string, unknown>
}

/**
 * Generates a random UUID (simplified version)
 */
function generateUUID(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Hook to manage telemetry
 * Provides a trackEvent function and automatically tracks page views
 */
export function useTelemetry() {
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('studyhub_telemetry_session')
      if (stored) return stored
      const id = generateUUID()
      localStorage.setItem('studyhub_telemetry_session', id)
      return id
    }
    // If we're on the server, generate a random ID (won't be persisted across SSR requests)
    return generateUUID()
  })

  // On the client, ensure we use the persisted sessionId from localStorage if it differs from the current one
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('studyhub_telemetry_session')
      if (stored && stored !== sessionId) {
        setSessionId(stored)
      }
    }
  }, [])

  const pathname = usePathname()
  const router = useRouter()

  // Track page views on mount and on route change
  useEffect(() => {
    trackPageView()
  }, [pathname])

  const trackPageView = useCallback(() => {
    const event: TelemetryEvent = {
      event_id: generateUUID(),
      timestamp: Date.now(),
      event_type: 'page_view',
      session_id: sessionId,
      page_url: typeof window !== 'undefined' ? window.location.pathname : '',
    }
    sendEvent(event)
  }, [sessionId])

  const trackEvent = useCallback((event: Omit<TelemetryEvent, 'event_id' | 'timestamp'> & Partial<Pick<TelemetryEvent, 'event_id' | 'timestamp'>>) => {
    const enriched: TelemetryEvent = {
      event_id: generateUUID(),
      timestamp: Date.now(),
      session_id: sessionId,
      ...event,
    }
    sendEvent(enriched)
  }, [sessionId])

  const sendEvent = useCallback(async (event: TelemetryEvent) => {
    if (typeof window === 'undefined') return // Only run on client
    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
    } catch (err) {
      console.warn('Failed to send telemetry event:', err)
    }
  }, [])

  // Optional: track clicks globally (can be heavy, so we make it optional)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: MouseEvent) => {
      // Optionally filter by attribute or ignore certain elements
      // For simplicity, we send a click event with minimal metadata
      const target = e.target as HTMLElement
      const metadata: Record<string, unknown> = {
        tagName: target.tagName,
        id: target.id || undefined,
        className: target.className || undefined,
      }
      // Remove undefined values
      Object.keys(metadata).forEach((key) => metadata[key] === undefined && delete metadata[key])

      trackEvent({
        event_type: 'click',
        metadata,
      })
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [trackEvent])

  return { trackEvent, sessionId }
}

/**
 * Provider component to make telemetry available to the app
 */
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  useTelemetry() // This initializes the hook and starts tracking page views
  return children
}