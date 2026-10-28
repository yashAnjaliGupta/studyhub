"use client";

import dynamic from "next/dynamic";
import { StudyHubLoader } from "../StudyHubLoader";
import type { PdfDocumentProps } from "./reader";

// next/dynamic with ssr:false is what actually excludes pdf.js (and its
// DOMMatrix/canvas/Promise.withResolvers usage) from the server bundle.
// Marking PdfDocument.tsx "use client" alone is not enough — Next would
// still try to render it during the SSR pass unless it's loaded this way.
const PdfDocument = dynamic<PdfDocumentProps>(() => import("./PDFDocument"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <StudyHubLoader size={60} text="Loading document reader…" />
    </div>
  ),
});

export default function PdfViewer(props: PdfDocumentProps) {
  return <PdfDocument {...props} />;
}
