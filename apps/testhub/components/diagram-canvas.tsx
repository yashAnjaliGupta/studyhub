'use client';

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Image as ImageIcon } from 'lucide-react';

export interface DiagramCanvasProps {
  diagramSvg?: string | null;
  imageUrl?: string | null;
  title?: string;
}

export function DiagramCanvas({
  diagramSvg,
  imageUrl,
  title = 'Question Diagram',
}: DiagramCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hasDiagram = Boolean(diagramSvg || imageUrl);
  if (!hasDiagram) return null;

  const zoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)));
  const resetZoom = () => setZoom(1);

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white shadow-xs transition hover:shadow-md">
      {/* Header bar with controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-100/60 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded bg-blue-100 text-[#0875f9]">
            <ImageIcon className="size-3" />
          </span>
          <span className="font-bold text-[#102a56]">{title}</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
            {imageUrl && !diagramSvg ? 'Authentic Diagram' : 'Vector Diagram'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 0.6}
            title="Zoom Out"
            className="grid size-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="min-w-[42px] text-center font-mono text-[11px] font-semibold text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 3}
            title="Zoom In"
            className="grid size-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            title="Reset Zoom"
            className="grid size-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
          >
            <RotateCcw className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            className="grid size-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Diagram Canvas Area */}
      <div className="relative flex min-h-[220px] max-h-[480px] items-center justify-center overflow-auto p-6 bg-white">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="w-full flex items-center justify-center transition-transform duration-150 ease-out"
        >
          {diagramSvg ? (
            <div
              className="diagram-svg-container w-full max-w-[480px] flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(diagramSvg) }}
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="max-h-[360px] w-auto max-w-full rounded-lg object-contain shadow-xs"
            />
          ) : null}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-150">
          <div className="relative flex max-h-[90vh] max-w-5xl flex-col rounded-3xl border border-white/20 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">{title} (Fullscreen High-Res)</h3>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Close ✕
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
              {diagramSvg ? (
                <div
                  className="diagram-svg-container w-full max-w-3xl flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(diagramSvg) }}
                />
              ) : imageUrl ? (
                <img src={imageUrl} alt={title} className="max-h-[75vh] w-auto object-contain" />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sanitizeSvg(svg: string): string {
  let clean = svg.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '').trim();
  if (!clean.includes('style=')) {
    clean = clean.replace(/<svg\b/i, '<svg style="width: 100%; max-width: 460px; height: auto; min-height: 200px; display: block; margin: 0 auto;"');
  }
  return clean;
}
