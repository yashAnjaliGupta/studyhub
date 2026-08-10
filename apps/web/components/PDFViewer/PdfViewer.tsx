"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { PdfDocumentProps } from "./reader";

// next/dynamic with ssr:false is what actually excludes pdf.js (and its
// DOMMatrix/canvas/Promise.withResolvers usage) from the server bundle.
// Marking PdfDocument.tsx "use client" alone is not enough — Next would
// still try to render it during the SSR pass unless it's loaded this way.
const PdfDocument = dynamic<PdfDocumentProps>(() => import("./PDFDocument"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 p-8 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      Loading viewer…
    </div>
  ),
});

export default function PdfViewer(props: PdfDocumentProps) {
  return <PdfDocument {...props} />;
}
