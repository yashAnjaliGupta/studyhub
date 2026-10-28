import type { ReactNode } from 'react';

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${className || 'max-w-[1440px]'}`}>{children}</main>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="max-w-3xl">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0875f9]">{eyebrow}</p>}
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#102a56] sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm leading-6 text-[#68778b] sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-[#d9e1ec] bg-white shadow-sm ${className}`}>{children}</section>;
}

const metricTone = {
  blue: 'text-[#0875f9]',
  green: 'text-[#258747]',
  orange: 'text-[#c66a00]',
  red: 'text-[#d3483d]',
} as const;

export function MetricCard({ label, value, detail, tone = 'blue' }: { label: string; value: ReactNode; detail?: string; tone?: keyof typeof metricTone }) {
  return (
    <Panel className="p-4 sm:p-5">
      <p className="text-xs font-semibold text-[#68778b] sm:text-sm">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${metricTone[tone]}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-[#68778b] sm:text-sm">{detail}</p>}
    </Panel>
  );
}
