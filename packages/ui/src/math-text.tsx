'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import { BookOpen } from 'lucide-react';

export interface MathTextProps {
  content?: string | null;
  text?: string | null; // Alias for content
  className?: string;
  onJumpToPage?: (page: number) => void;
}

/**
 * Safely renders LaTeX string via KaTeX.
 */
function renderKatexHtml(mathCode: string, displayMode: boolean): string {
  try {
    const normalized = mathCode
      .replace(/×/g, '\\times ')
      .replace(/[⋅·]/g, '\\cdot ')
      .replace(/¯/g, '-');
    return katex.renderToString(normalized, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch (err) {
    console.warn('[MathText] KaTeX render error:', err);
    return mathCode;
  }
}

/**
 * Splits table cells by pipe while strictly preserving math modulus |x| inside $...$
 */
function splitTableCells(rowText: string): string[] {
  const trimmed = rowText.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  let inMath = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '$') {
      inMath = !inMath;
      current += ch;
    } else if (ch === '|' && !inMath) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) {
    cells.push(current.trim());
  }
  return cells;
}

/**
 * Pre-processes text to ensure mathematical modulo |expr| and unwrapped LaTeX
 * formulas (vectors, unit vectors, fractions) outside $ are safely converted to KaTeX math.
 */
function preprocessMathText(text: string): string {
  if (!text) return '';

  const mathRegex = /(\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$\n])+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;

  // 1. Modulo normalization: convert unwrapped |expr| or |expr|^2 outside math to $|expr|^2$
  let parts = text.split(mathRegex);
  for (let i = 0; i < parts.length; i += 2) {
    let nonMath = parts[i];
    if (!nonMath) continue;
    nonMath = nonMath.replace(
      /\|\s*([a-zA-Z0-9_\-\+\*\/\s\\\(\)\{\}\^\u03c0\u03b1\u03b2\u03bb\u03bc\u0394\u03a9]+?)\s*\|\s*(\^?\{?\d+\}?)?/g,
      (match, inner, sup) => {
        if (inner.includes('---') || inner.length > 60) return match;
        const supStr = sup ? (sup.startsWith('^') ? sup : '^{' + sup.replace(/[\{\}]/g, '') + '}') : '';
        return '$|' + inner.trim() + '|' + supStr + '$';
      }
    );
    parts[i] = nonMath;
  }
  text = parts.join('');

  // 2. Unwrapped LaTeX tokens outside math: \vec{...}, \hat{...}, \bar{...}, \frac{...}{...}
  parts = text.split(mathRegex);
  for (let i = 0; i < parts.length; i += 2) {
    let nonMath = parts[i];
    if (!nonMath) continue;
    nonMath = nonMath.replace(
      /(\\vec\{[a-zA-Z0-9]+\}|\\hat\{[a-zA-Z0-9]+\}|\\bar\{[a-zA-Z0-9]+\}|\\frac\{[^{}]+\}\{[^{}]+\})/g,
      '$$$1$$'
    );
    parts[i] = nonMath;
  }
  text = parts.join('');

  return text;
}

/**
 * Parses inline content for citations [Page 12], bold **text**, and math $...$
 */
function renderInlineSegments(
  text: string,
  keyPrefix: string,
  onJumpToPage?: (page: number) => void
): React.ReactNode[] {
  // Tokenize:
  // 1. Display Math: $$...$$ or \[...\]
  // 2. Inline Math: $...$ or \(...\)
  // 3. Bold: **...**
  // 4. Markdown Images: ![alt](url)
  // 5. Page Citations: [Page X]
  const tokenRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\\$|[^$\n])+?\$|\\\([\s\S]*?\\\)|\*\*[^*]+\*\*|!\[[^\]]*\]\([^)]+\)|\[Page\s+\d+\])/g;

  const parts = text.split(tokenRegex);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // 1. Display math $$...$$
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      const code = part.slice(2, -2).trim();
      const html = renderKatexHtml(code, true);
      elements.push(
        <div
          key={`${keyPrefix}-math-block-${i}`}
          className="my-3 overflow-x-auto py-1 text-center"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
      continue;
    }

    // 2. Display math \[...\]
    if (part.startsWith('\\[') && part.endsWith('\\]') && part.length > 4) {
      const code = part.slice(2, -2).trim();
      const html = renderKatexHtml(code, true);
      elements.push(
        <div
          key={`${keyPrefix}-math-bracket-${i}`}
          className="my-3 overflow-x-auto py-1 text-center"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
      continue;
    }

    // 3. Inline math $...$
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const code = part.slice(1, -1).trim();
      const html = renderKatexHtml(code, false);
      elements.push(
        <span
          key={`${keyPrefix}-math-inline-${i}`}
          className="inline-math inline-block mx-0.5 align-baseline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
      continue;
    }

    // 4. Inline math \(...\)
    if (part.startsWith('\\(') && part.endsWith('\\)') && part.length > 4) {
      const code = part.slice(2, -2).trim();
      const html = renderKatexHtml(code, false);
      elements.push(
        <span
          key={`${keyPrefix}-math-paren-${i}`}
          className="inline-math inline-block mx-0.5 align-baseline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
      continue;
    }

    // 5. Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      elements.push(
        <strong
          key={`${keyPrefix}-bold-${i}`}
          className="font-bold text-inherit opacity-95"
        >
          {renderInlineSegments(inner, `${keyPrefix}-bold-inner-${i}`, onJumpToPage)}
        </strong>
      );
      continue;
    }

    // 6. Inline Image ![alt](url)
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      elements.push(
        <span key={`${keyPrefix}-img-${i}`} className="my-2.5 block text-center">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || 'Diagram'}
            className="max-h-80 max-w-full rounded border border-slate-200 bg-white p-1.5 shadow-sm inline-block"
            loading="lazy"
          />
        </span>
      );
      continue;
    }

    // 7. Page citation [Page X]
    const citationMatch = part.match(/^\[Page\s+(\d+)\]$/);
    if (citationMatch && citationMatch[1]) {
      const pageNum = parseInt(citationMatch[1], 10);
      if (onJumpToPage) {
        elements.push(
          <button
            key={`${keyPrefix}-citation-${i}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onJumpToPage(pageNum);
            }}
            className="inline-flex items-center gap-1 bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 font-semibold px-2 py-0.5 rounded text-xs transition cursor-pointer mx-1 align-baseline border border-blue-500/30 shadow-xs"
            title={`Jump to Page ${pageNum}`}
          >
            <BookOpen className="w-3 h-3 text-blue-300" />
            <span>Page {pageNum}</span>
          </button>
        );
      } else {
        elements.push(
          <span
            key={`${keyPrefix}-citation-${i}`}
            className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-medium px-1.5 py-0.5 rounded text-xs mx-0.5 ring-1 ring-slate-200"
          >
            <BookOpen className="w-2.5 h-2.5 opacity-70" />
            Page {pageNum}
          </span>
        );
      }
      continue;
    }

    // 7. Regular plain text chunk
    elements.push(<React.Fragment key={`${keyPrefix}-text-${i}`}>{part}</React.Fragment>);
  }

  return elements;
}

interface TableBlock {
  type: 'table';
  rows: string[][];
}

interface LineBlock {
  type: 'line';
  text: string;
}

type ParsedBlock = TableBlock | LineBlock;

/**
 * Universal Math, Markdown & Table Text Renderer
 * Supports LaTeX ($...$, $$...$$, \[...\], \(...\)), markdown bold (**...**),
 * tables (| Value | ... |), headings (###), citations ([Page X]), and clean paragraph formatting.
 */
export function MathText({
  content,
  text,
  className = '',
  onJumpToPage,
}: MathTextProps) {
  let rawText = content || text || '';
  rawText = preprocessMathText(rawText);

  // Auto-wrap unwrapped math expressions (with ^{ or _{) in $...$ if not already wrapped
  if (
    (rawText.includes('^{') || rawText.includes('_{') || rawText.includes('\\frac{')) &&
    !rawText.includes('$')
  ) {
    if (!/\b(the|is|are|of|in|that|which|when|then|from|with|between|statement)\b/i.test(rawText)) {
      rawText = `$${rawText.trim()}$`;
    }
  }

  const parsedContent = useMemo(() => {
    if (!rawText.trim()) return null;

    const lines = rawText.split('\n');
    const blocks: ParsedBlock[] = [];
    let i = 0;

    const isSeparatorRow = (l: string) =>
      /^\|?[\s-:]+(\|[\s-:]+)+\|?$/.test(l.trim());

    while (i < lines.length) {
      const line = lines[i]?.trim() || '';

      // Check if line starts a valid Markdown table:
      // A table MUST have a separator row as the second row (i + 1)
      if (
        i + 1 < lines.length &&
        isSeparatorRow(lines[i + 1] || '') &&
        (line.startsWith('|') || splitTableCells(line).length >= 2)
      ) {
        const tableRows: string[][] = [];
        tableRows.push(splitTableCells(line));
        i += 2; // skip header and separator

        // Collect subsequent table data rows
        while (i < lines.length) {
          const rowLine = lines[i]?.trim() || '';
          if (!rowLine || isSeparatorRow(rowLine)) {
            if (isSeparatorRow(rowLine)) {
              i++;
              continue;
            }
            break;
          }
          const cells = splitTableCells(rowLine);
          if (rowLine.startsWith('|') || cells.length >= 2) {
            tableRows.push(cells);
            i++;
          } else {
            break;
          }
        }

        blocks.push({ type: 'table', rows: tableRows });
        continue;
      }

      // Otherwise, it's a normal text line!
      blocks.push({ type: 'line', text: lines[i] || '' });
      i++;
    }

    return blocks.map((block, blockIdx) => {
      // 1. Table Block
      if (block.type === 'table') {
        const rows = block.rows;
        if (!rows.length) return null;

        const headerRow = rows[0] || [];
        const bodyRows = rows.slice(1);

        return (
          <div key={`table-${blockIdx}`} className="my-4 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-xl overflow-hidden border border-slate-200 bg-white text-sm shadow-xs">
              {headerRow.length > 0 && (
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-800">
                    {headerRow.map((cell, colIdx) => (
                      <th
                        key={`th-${blockIdx}-${colIdx}`}
                        className="border-r border-slate-200/80 px-3.5 py-2.5 text-center font-bold text-xs uppercase tracking-wide text-slate-700 last:border-r-0"
                      >
                        {renderInlineSegments(cell, `th-${blockIdx}-${colIdx}`, onJumpToPage)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              {bodyRows.length > 0 && (
                <tbody className="divide-y divide-slate-100">
                  {bodyRows.map((row, rowIdx) => (
                    <tr
                      key={`tr-${blockIdx}-${rowIdx}`}
                      className="transition-colors hover:bg-blue-50/30"
                    >
                      {row.map((cell, colIdx) => (
                        <td
                          key={`td-${blockIdx}-${rowIdx}-${colIdx}`}
                          className="border-r border-slate-100 px-3.5 py-2 text-center text-slate-800 last:border-r-0"
                        >
                          {renderInlineSegments(cell, `td-${blockIdx}-${rowIdx}-${colIdx}`, onJumpToPage)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        );
      }

      // 2. Standard Text Lines
      const line = block.text;
      const trimmed = line.trim();

      // Empty line -> paragraph spacer
      if (!trimmed) {
        return <div key={`spacer-${blockIdx}`} className="h-2.5" />;
      }

      // Heading ###
      if (trimmed.startsWith('### ')) {
        const headingText = trimmed.replace(/^###\s+/, '');
        return (
          <h3
            key={`h3-${blockIdx}`}
            className="text-base font-bold text-inherit mt-3 mb-1.5 opacity-95"
          >
            {renderInlineSegments(headingText, `h3-${blockIdx}`, onJumpToPage)}
          </h3>
        );
      }

      // Heading ####
      if (trimmed.startsWith('#### ')) {
        const headingText = trimmed.replace(/^####\s+/, '');
        return (
          <h4
            key={`h4-${blockIdx}`}
            className="text-sm font-semibold text-inherit mt-2 mb-1 opacity-90"
          >
            {renderInlineSegments(headingText, `h4-${blockIdx}`, onJumpToPage)}
          </h4>
        );
      }

      // Bullet points (- or *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.replace(/^[-*]\s+/, '');
        return (
          <div key={`bullet-${blockIdx}`} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-blue-500 font-bold select-none">•</span>
            <div className="flex-1 min-w-0">
              {renderInlineSegments(bulletText, `bullet-${blockIdx}`, onJumpToPage)}
            </div>
          </div>
        );
      }

      // Standard line
      return (
        <div key={`line-${blockIdx}`} className="my-0.5 leading-relaxed">
          {renderInlineSegments(line, `line-${blockIdx}`, onJumpToPage)}
        </div>
      );
    });
  }, [rawText, onJumpToPage]);

  if (!rawText.trim()) return null;

  return <div className={`math-text-container ${className}`}>{parsedContent}</div>;
}

export default MathText;
