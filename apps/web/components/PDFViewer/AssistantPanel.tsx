"use client";

import { Bot, Send } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import type { ChatMessage } from "./reader";

interface AssistantPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function AssistantPanel({ messages, onSend }: AssistantPanelProps) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 bg-blue-50 p-3 dark:bg-blue-950/30">
      <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-blue-700 dark:text-blue-400">
        <Bot size={15} />
        AI assistant
      </h3>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-lg px-2.5 py-2 text-[13px] leading-snug ${
              m.from === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white py-1 pl-2.5 pr-1 dark:border-blue-800 dark:bg-slate-900">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question..."
          className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
        <button
          onClick={submit}
          aria-label="Send"
          className="flex shrink-0 items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
        >
          <Send size={13} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </div>
  );
}
