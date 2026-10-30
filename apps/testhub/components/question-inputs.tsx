'use client';

import React from 'react';
import { Check, Delete, RotateCcw } from 'lucide-react';
import type { QuestionType } from '../lib/paper-service';
import { MathText } from '@repo/ui/math-text';

export type OptionItem =
  | string
  | { text: string; imageUrl?: string | null; diagramSvg?: string | null };

export interface QuestionInputProps {
  questionId: string;
  type: QuestionType;
  options: OptionItem[];
  answer: any; // number | number[] | string | undefined
  onChange: (value: any) => void;
  onOptionHover?: (optLabelOrId: string, isEntering: boolean) => void;
}

export function QuestionTypeBadge({ type }: { type: QuestionType }) {
  switch (type) {
    case 'mcq_multiple':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 ring-1 ring-purple-200">
          <span className="size-1.5 rounded-full bg-purple-600" />
          Multi-Correct MCQ · One or more options can be correct
        </span>
      );
    case 'numerical':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
          <span className="size-1.5 rounded-full bg-emerald-600" />
          Numerical Question · Non-negative integer or decimal
        </span>
      );
    case 'text_subjective':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
          <span className="size-1.5 rounded-full bg-amber-600" />
          Subjective / Descriptive Answer
        </span>
      );
    case 'mcq_single':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
          <span className="size-1.5 rounded-full bg-blue-600" />
          Single Choice MCQ · Only 1 option is correct
        </span>
      );
  }
}

export function QuestionInputRenderer({
  questionId,
  type,
  options,
  answer,
  onChange,
  onOptionHover,
}: QuestionInputProps) {
  switch (type) {
    case 'mcq_multiple':
      return (
        <MultiChoiceInput
          questionId={questionId}
          options={options}
          selectedIndices={Array.isArray(answer) ? answer : []}
          onChange={onChange}
          onOptionHover={onOptionHover}
        />
      );
    case 'numerical':
      return (
        <NumericalKeypadInput
          questionId={questionId}
          value={typeof answer === 'string' ? answer : typeof answer === 'number' ? String(answer) : ''}
          onChange={onChange}
        />
      );
    case 'text_subjective':
      return (
        <SubjectiveTextInput
          questionId={questionId}
          value={typeof answer === 'string' ? answer : ''}
          onChange={onChange}
        />
      );
    case 'mcq_single':
    default:
      return (
        <SingleChoiceInput
          questionId={questionId}
          options={options}
          selectedIndex={typeof answer === 'number' ? answer : undefined}
          onChange={onChange}
          onOptionHover={onOptionHover}
        />
      );
  }
}

/**
 * 1. Single Choice Radio Group (mcq_single)
 */
function SingleChoiceInput({
  questionId,
  options,
  selectedIndex,
  onChange,
  onOptionHover,
}: {
  questionId: string;
  options: OptionItem[];
  selectedIndex?: number;
  onChange: (index: number) => void;
  onOptionHover?: (optLabelOrId: string, isEntering: boolean) => void;
}) {
  const hasAnyVisual = options.some(
    (opt) => typeof opt === 'object' && Boolean(opt.imageUrl || opt.diagramSvg)
  );

  return (
    <fieldset
      className={`mt-6 ${
        hasAnyVisual ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5' : 'space-y-3'
      }`}
    >
      <legend className="sr-only">Single Choice Options</legend>
      {options.map((option, i) => {
        const isSelected = selectedIndex === i;
        const text = typeof option === 'string' ? option : option.text;
        const visual =
          typeof option === 'object' ? option.diagramSvg || option.imageUrl : null;

        const optLabel = String.fromCharCode(65 + i);

        return (
          <label
            key={`${questionId}_single_${i}`}
            onMouseEnter={() => onOptionHover?.(optLabel, true)}
            onMouseLeave={() => onOptionHover?.(optLabel, false)}
            className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all ${
              isSelected
                ? 'border-[#0875f9] bg-blue-50/70 shadow-sm ring-2 ring-[#0875f9]/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
            }`}
          >
            <input
              type="radio"
              name={questionId}
              checked={isSelected}
              onChange={() => onChange(i)}
              className="mt-0.5 size-4 accent-[#0875f9]"
            />
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                isSelected ? 'bg-[#0875f9] text-white shadow-sm' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <div className="flex-1 min-w-0">
              <MathText text={text} className="text-sm font-medium leading-6 text-[#1c2d45]" />
              {visual && (
                <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                  {visual.startsWith('<svg') ? (
                    <div
                      className="option-svg-container max-w-full overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: visual }}
                    />
                  ) : (
                    <img
                      src={visual}
                      alt={`Option ${String.fromCharCode(65 + i)}`}
                      className="max-h-48 w-auto max-w-full rounded object-contain"
                    />
                  )}
                </div>
              )}
            </div>
          </label>
        );
      })}
    </fieldset>
  );
}

/**
 * 2. Multi-Correct Checkboxes (mcq_multiple)
 */
function MultiChoiceInput({
  questionId,
  options,
  selectedIndices,
  onChange,
  onOptionHover,
}: {
  questionId: string;
  options: OptionItem[];
  selectedIndices: number[];
  onChange: (indices: number[]) => void;
  onOptionHover?: (optLabelOrId: string, isEntering: boolean) => void;
}) {
  const toggleOption = (idx: number) => {
    const next = selectedIndices.includes(idx)
      ? selectedIndices.filter((i) => i !== idx)
      : [...selectedIndices, idx].sort((a, b) => a - b);
    onChange(next);
  };

  const hasAnyVisual = options.some(
    (opt) => typeof opt === 'object' && Boolean(opt.imageUrl || opt.diagramSvg)
  );

  return (
    <fieldset className="mt-6">
      <legend className="sr-only">Multiple Choice Checkboxes</legend>
      <div className="mb-2 flex items-center justify-between text-xs text-purple-700">
        <span className="font-semibold">Select all correct options</span>
        <span className="font-medium">
          {selectedIndices.length} of {options.length} selected
        </span>
      </div>
      <div
        className={hasAnyVisual ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5' : 'space-y-3'}
      >
        {options.map((option, i) => {
          const isSelected = selectedIndices.includes(i);
          const text = typeof option === 'string' ? option : option.text;
          const visual =
            typeof option === 'object' ? option.diagramSvg || option.imageUrl : null;

          const optLabel = String.fromCharCode(65 + i);

          return (
            <label
              key={`${questionId}_multi_${i}`}
              onMouseEnter={() => onOptionHover?.(optLabel, true)}
              onMouseLeave={() => onOptionHover?.(optLabel, false)}
              className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50/60 shadow-sm ring-2 ring-purple-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOption(i)}
                className="mt-0.5 size-4 rounded accent-purple-600"
              />
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold transition ${
                  isSelected ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isSelected ? <Check className="size-3.5 stroke-[3]" /> : String.fromCharCode(65 + i)}
              </span>
              <div className="flex-1 min-w-0">
                <MathText text={text} className="text-sm font-medium leading-6 text-[#1c2d45]" />
                {visual && (
                  <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
                    {visual.startsWith('<svg') ? (
                      <div
                        className="option-svg-container max-w-full overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: visual }}
                      />
                    ) : (
                      <img
                        src={visual}
                        alt={`Option ${String.fromCharCode(65 + i)}`}
                        className="max-h-48 w-auto max-w-full rounded object-contain"
                      />
                    )}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * 3. Numerical Virtual Keypad & Input (numerical)
 */
function NumericalKeypadInput({
  value,
  onChange,
}: {
  questionId: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const handleKey = (char: string) => {
    if (char === 'clear') {
      onChange('');
      return;
    }
    if (char === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }
    if (char === '.') {
      if (value.includes('.')) return;
      onChange(value ? value + '.' : '0.');
      return;
    }
    if (char === '-') {
      if (value.startsWith('-')) {
        onChange(value.slice(1));
      } else {
        onChange('-' + value);
      }
      return;
    }
    if (value.length >= 12) return;
    onChange(value + char);
  };

  const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', '.'];

  return (
    <div className="mt-6 max-w-md rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm">
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Your Numerical Answer:
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              // allow valid numbers, decimal point, and leading negative sign
              const val = e.target.value.replace(/[^0-9.-]/g, '');
              onChange(val);
            }}
            placeholder="e.g. 4.25"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-[#102a56] shadow-inner focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              title="Clear entry"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="pt-2">
        <p className="mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          On-Screen Keypad (or type directly):
        </p>
        <div className="grid grid-cols-3 gap-2">
          {keypadKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKey(key)}
              className="flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white font-mono text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 active:scale-95"
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKey('backspace')}
            className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-100 active:scale-95"
          >
            <Delete className="size-4" /> Backspace
          </button>
          <button
            type="button"
            onClick={() => handleKey('clear')}
            className="flex h-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-100 active:scale-95"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. Subjective / Descriptive Text Area (text_subjective)
 */
function SubjectiveTextInput({
  value,
  onChange,
}: {
  questionId: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const chars = value.length;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-slate-700">Write your solution or response:</label>
        <div className="flex items-center gap-2 text-slate-400">
          <span>{words} words</span>
          <span>·</span>
          <span>{chars} characters</span>
        </div>
      </div>
      <textarea
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your detailed reasoning, steps, or answer here..."
        className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm font-medium leading-relaxed text-[#1c2d45] shadow-sm transition placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      />
      {value.trim().length > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <Check className="size-3.5 stroke-[3]" />
          <span>Response saved</span>
        </div>
      )}
    </div>
  );
}
