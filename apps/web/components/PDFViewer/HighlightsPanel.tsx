import { Highlighter } from "lucide-react";
import type { Highlight } from "./reader";

interface HighlightsPanelProps {
  highlights: Highlight[];
}

export default function HighlightsPanel({ highlights }: HighlightsPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-white p-3 dark:bg-slate-900">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-medium text-blue-700 dark:text-blue-400">
        <Highlighter size={15} className="text-yellow-500" />
        Highlights
      </h3>
      <div className="flex flex-col gap-2">
        {highlights.map((h, i) => (
          <div
            key={i}
            className="flex justify-between gap-2 rounded-md bg-yellow-100 px-2.5 py-2 text-[12.5px] text-slate-700 dark:bg-yellow-900/30 dark:text-slate-200"
          >
            <span>{h.text} —</span>
            <span className="shrink-0 text-slate-500 dark:text-slate-400">p.{h.page}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
