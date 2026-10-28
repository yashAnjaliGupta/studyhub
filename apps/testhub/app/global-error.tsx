'use client';

import React, { useEffect } from 'react';

export default function TestHubGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[TestHub Global Root Error]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#0c1427', color: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2rem', borderRadius: '1rem', background: '#131d38', border: '1px solid #1e293b' }}>
            <div style={{ width: '48px', height: '48px', margin: '0 auto 1.5rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#ffffff' }}>
              CBT Engine Interrupted
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              A critical error occurred in the examination framework. Please reload to resume your test session.
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#f59e0b', margin: '0 0 1.5rem', wordBreak: 'break-all' }}>
                Ref: {error.digest}
              </p>
            )}
            <button
              onClick={() => reset()}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                background: '#f59e0b',
                color: '#020617',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Resume Test Session
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
