import React from 'react';

export interface TestHubLoaderProps {
  size?: number; // base size in px (defaults to 36)
  variant?: 'brand' | 'gold' | 'blue';
  text?: string;
  className?: string;
}

export function TestHubLoader({
  size = 36,
  variant = 'brand',
  text,
  className = '',
}: TestHubLoaderProps) {
  const variantClass = variant === 'gold' ? 'loader-gold' : variant === 'blue' ? 'loader-blue' : '';

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-6 ${className}`}>
      <div
        className={`loader ${variantClass}`}
        style={{ '--s': `${size}px` } as React.CSSProperties}
        role="status"
        aria-label="Loading..."
      />
      {text && (
        <p className="text-xs font-semibold tracking-wide text-slate-500 animate-pulse text-center">
          {text}
        </p>
      )}
    </div>
  );
}

export default TestHubLoader;
