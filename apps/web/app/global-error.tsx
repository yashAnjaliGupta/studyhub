'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[StudyHub Global Root Error]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#020617', color: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2rem', borderRadius: '1rem', background: '#0f172a', border: '1px solid #1e293b' }}>
            <div style={{ width: '48px', height: '48px', margin: '0 auto 1.5rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#ffffff' }}>
              System Interruption
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              A critical application error occurred. We are working to resolve this as quickly as possible.
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
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
