'use client';

import React, { useState, useMemo } from 'react';
import type { SubjectPerformanceItem } from '../lib/exam-session';

interface InteractivePerformanceChartProps {
  subjectPerformance: Record<string, SubjectPerformanceItem>;
}

type MetricMode =
  | 'score'
  | 'attempted'
  | 'correct'
  | 'incorrect'
  | 'positive_negative';

const SUBJECT_COLORS: Record<string, { fill: string; light: string; border: string; text: string }> = {
  Physics: {
    fill: '#0284c7', // Sky 600
    light: '#e0f2fe',
    border: '#7dd3fc',
    text: '#0369a1',
  },
  Chemistry: {
    fill: '#10b981', // Emerald 500
    light: '#d1fae5',
    border: '#6ee7b7',
    text: '#047857',
  },
  Mathematics: {
    fill: '#6366f1', // Indigo 500
    light: '#e0e7ff',
    border: '#a5b4fc',
    text: '#4338ca',
  },
  Biology: {
    fill: '#ec4899', // Pink 500
    light: '#fce7f3',
    border: '#f472b6',
    text: '#be185d',
  },
  General: {
    fill: '#f59e0b', // Amber 500
    light: '#fef3c7',
    border: '#fcd34d',
    text: '#b45309',
  },
};

export function InteractivePerformanceChart({
  subjectPerformance,
}: InteractivePerformanceChartProps) {
  const [mode, setMode] = useState<MetricMode>('score');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const subjects = useMemo(() => {
    return Object.entries(subjectPerformance).map(([name, data]) => ({
      name,
      ...data,
      color: SUBJECT_COLORS[name] || {
        fill: '#8b5cf6',
        light: '#ede9fe',
        border: '#c4b5fd',
        text: '#6d28d9',
      },
    }));
  }, [subjectPerformance]);

  // Compute slices based on selected metric mode
  const { slices, totalValue, unit, modeTitle, modeSubtitle } = useMemo(() => {
    let rawSlices: Array<{ name: string; value: number; color: string; label: string }> = [];
    let u = '';
    let title = '';
    let sub = '';

    switch (mode) {
      case 'score': {
        title = 'Net Score Distribution';
        sub = 'Share of net marks contributed by each subject';
        u = 'marks';
        rawSlices = subjects.map((s) => ({
          name: s.name,
          value: Math.max(0, s.score),
          color: s.color.fill,
          label: `${s.score} marks (${s.accuracy}% accuracy)`,
        }));
        break;
      }
      case 'attempted': {
        title = 'Questions Attempted Distribution';
        sub = 'How your attempts were distributed across subjects';
        u = 'questions';
        rawSlices = subjects.map((s) => ({
          name: s.name,
          value: s.attempted,
          color: s.color.fill,
          label: `${s.attempted} of ${s.total} attempted`,
        }));
        break;
      }
      case 'correct': {
        title = 'Correct Answers Breakdown';
        sub = 'Questions answered correctly across sections';
        u = 'correct';
        rawSlices = subjects.map((s) => ({
          name: s.name,
          value: s.correct,
          color: s.color.fill,
          label: `${s.correct} correct (${s.accuracy}%)`,
        }));
        break;
      }
      case 'incorrect': {
        title = 'Dropped Marks & Inaccuracies';
        sub = 'Questions answered incorrectly leading to negative marking';
        u = 'incorrect';
        rawSlices = subjects.map((s) => ({
          name: s.name,
          value: s.incorrect,
          color: s.color.fill,
          label: `${s.incorrect} incorrect (-${s.negativeMarks || s.incorrect} marks)`,
        }));
        break;
      }
      case 'positive_negative': {
        title = 'Positive Marks vs Negative Penalties';
        sub = 'Gross positive marks earned (+4) vs negative penalties lost (-1)';
        u = 'marks';
        const totalPos = subjects.reduce((a, b) => a + (b.positiveMarks || Math.max(0, b.score)), 0);
        const totalNeg = subjects.reduce((a, b) => a + (b.negativeMarks || 0), 0);
        rawSlices = [
          {
            name: 'Gross Positive Marks',
            value: totalPos,
            color: '#10b981',
            label: `+${totalPos} marks earned`,
          },
          {
            name: 'Negative Marking Penalty',
            value: totalNeg,
            color: '#ef4444',
            label: `-${totalNeg} marks lost to errors`,
          },
        ];
        break;
      }
    }

    const total = rawSlices.reduce((acc, curr) => acc + curr.value, 0);

    // Calculate arc segments for SVG donut
    let currentAngle = 0;
    const computedSlices = rawSlices.map((s) => {
      const percentage = total > 0 ? (s.value / total) * 100 : 0;
      const angle = total > 0 ? (s.value / total) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      return {
        ...s,
        percentage: Math.round(percentage * 10) / 10,
        startAngle,
        endAngle,
      };
    });

    return {
      slices: computedSlices,
      totalValue: total,
      unit: u,
      modeTitle: title,
      modeSubtitle: sub,
    };
  }, [subjects, mode]);

  // Convert polar coordinates to Cartesian for SVG path arcs
  const createArc = (startAngle: number, endAngle: number, radius: number, innerRadius: number) => {
    // Edge case: full circle
    const isFull = endAngle - startAngle >= 359.9;
    const end = isFull ? startAngle + 359.99 : endAngle;

    const rad = (deg: number) => ((deg - 90) * Math.PI) / 180.0;
    const x1 = 150 + radius * Math.cos(rad(startAngle));
    const y1 = 150 + radius * Math.sin(rad(startAngle));
    const x2 = 150 + radius * Math.cos(rad(end));
    const y2 = 150 + radius * Math.sin(rad(end));

    const x3 = 150 + innerRadius * Math.cos(rad(end));
    const y3 = 150 + innerRadius * Math.sin(rad(end));
    const x4 = 150 + innerRadius * Math.cos(rad(startAngle));
    const y4 = 150 + innerRadius * Math.sin(rad(startAngle));

    const largeArc = end - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-blue-50 text-blue-600 text-xs font-bold">
              📊
            </span>
            <h2 className="text-lg font-bold text-[#102a56]">{modeTitle}</h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#68778b]">{modeSubtitle}</p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
          <button
            onClick={() => {
              setMode('score');
              setHoveredIndex(null);
            }}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === 'score'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Score Share
          </button>
          <button
            onClick={() => {
              setMode('attempted');
              setHoveredIndex(null);
            }}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === 'attempted'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Attempted
          </button>
          <button
            onClick={() => {
              setMode('correct');
              setHoveredIndex(null);
            }}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === 'correct'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Correct
          </button>
          <button
            onClick={() => {
              setMode('incorrect');
              setHoveredIndex(null);
            }}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === 'incorrect'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Inaccurate
          </button>
          <button
            onClick={() => {
              setMode('positive_negative');
              setHoveredIndex(null);
            }}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === 'positive_negative'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            + vs - Marks
          </button>
        </div>
      </div>

      {/* Chart & Legend Grid */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr] items-center">
        {/* SVG Interactive Donut */}
        <div className="relative flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 300 300"
            className="size-64 sm:size-72 drop-shadow-sm select-none transition-transform duration-300"
          >
            {totalValue === 0 ? (
              <circle
                cx="150"
                cy="150"
                r="110"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="45"
              />
            ) : (
              slices.map((slice, i) => {
                const isHovered = hoveredIndex === i;
                const path = createArc(
                  slice.startAngle,
                  slice.endAngle,
                  isHovered ? 122 : 115,
                  isHovered ? 68 : 75
                );

                return (
                  <path
                    key={slice.name}
                    d={path}
                    fill={slice.color}
                    className="cursor-pointer transition-all duration-200 hover:opacity-90"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      transformOrigin: '150px 150px',
                    }}
                  />
                );
              })
            )}

            {/* Central Badge / Tooltip */}
            <circle cx="150" cy="150" r="64" fill="#ffffff" className="drop-shadow-xs" />
          </svg>

          {/* Central Information Overlay */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            {activeSlice ? (
              <div className="animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate max-w-[130px]">
                  {activeSlice.name}
                </p>
                <p className="text-2xl font-extrabold text-[#102a56]">
                  {activeSlice.value}
                </p>
                <p className="text-xs font-bold text-blue-600">
                  {activeSlice.percentage}%
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-2xl font-extrabold text-[#102a56]">
                  {totalValue}
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  {unit}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Legend and Metrics Breakdown List */}
        <div className="flex flex-col gap-3">
          {slices.map((slice, i) => {
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={slice.name}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all cursor-pointer ${
                  isHovered
                    ? 'border-blue-300 bg-blue-50/50 shadow-xs'
                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-[#1c2d45]">
                      {slice.name}
                    </h3>
                    <p className="text-xs text-slate-500">{slice.label}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right sm:justify-end">
                  <div className="w-24 sm:w-32 hidden sm:block">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, slice.percentage)}%`,
                          backgroundColor: slice.color,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-slate-800 shrink-0">
                    {slice.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

