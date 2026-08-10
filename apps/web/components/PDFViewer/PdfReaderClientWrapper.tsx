"use client";

import dynamic from "next/dynamic";
import type { BookItem } from "./PdfReaderLayout";

const PdfReaderLayout = dynamic(() => import("./PdfReaderLayout"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[80dvh] items-center justify-center bg-slate-950 text-white">
      <span className="text-slate-400">Loading PDF Reader…</span>
    </div>
  ),
});

export default function PdfReaderClientWrapper({
  Book,
  isLoggedIn,
}: {
  Book: BookItem[];
  isLoggedIn?: boolean;
}) {
  return <PdfReaderLayout Book={Book} isLoggedIn={isLoggedIn} />;
}
