'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MathText } from '@repo/ui/math-text';

export interface ExamChatContext {
  paperTitle: string;
  subject: string;
  totalMarks: number;
  scoreAwarded: number;
  percentage: number;
  weakTopics: Array<{ name: string; accuracy: number }>;
  strongTopics: Array<{ name: string; accuracy: number }>;
  timeSpentMinutes: number;
  avgTimePerQuestionSeconds: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const STARTER_PROMPTS = [
  '🎯 Where did I lose the most marks in this paper?',
  '💡 How can I improve my accuracy on my weakest topics?',
  '⏱️ Analyze my pacing and time management',
  '📋 Generate a 3-day recovery revision plan for this exam',
];

export function AnalysisChatbot({ context }: { context: ExamChatContext }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your TestHub AI Performance Tutor. You scored **${context.scoreAwarded} / ${context.totalMarks} marks** (${context.percentage}%) on **${context.paperTitle}**.\n\nAsk me anything about your mistakes, topic concepts, or study strategies to boost your score!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isMinimized]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/exam/analysis-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          examContext: context,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || data.error || 'I could not generate a response. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: replyText,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: 'Sorry, I encountered a temporary network issue. Please check your connection and ask again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-[#dce4ef] bg-white shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#edf2f7] bg-gradient-to-r from-[#0875f9] to-[#0256be] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/20 shadow-xs backdrop-blur-xs">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold tracking-tight sm:text-base">
                AI Exam Performance & Doubts Tutor
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live AI
              </span>
            </div>
            <p className="text-xs text-blue-100">
              Personalized guidance on {context.paperTitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMinimized((prev) => !prev)}
          className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20 transition"
        >
          {isMinimized ? 'Expand Chat ▲' : 'Minimize ▼'}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Container */}
          <div className="max-h-[460px] min-h-[300px] overflow-y-auto p-5 sm:p-6 space-y-4 bg-[#f8fafc]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#0875f9] text-xs font-bold text-white shadow-xs">
                    T
                  </span>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0875f9] text-white shadow-xs rounded-tr-xs'
                      : 'border border-[#dce4ef] bg-white text-[#1c2d45] shadow-xs rounded-tl-xs'
                  }`}
                >
                  <MathText text={msg.content} />
                </div>

                {msg.role === 'user' && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#102a56] text-xs font-bold text-white shadow-xs">
                    You
                  </span>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#0875f9] text-xs font-bold text-white shadow-xs">
                  T
                </span>
                <div className="rounded-2xl rounded-tl-xs border border-[#dce4ef] bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#0875f9] animate-bounce" />
                    <span className="size-2 rounded-full bg-[#0875f9] animate-bounce [animation-delay:0.2s]" />
                    <span className="size-2 rounded-full bg-[#0875f9] animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-2 text-xs font-semibold text-[#68778b]">
                      AI Tutor analyzing your exam metrics...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestion Chips */}
          <div className="border-t border-[#edf2f7] bg-white p-3 sm:px-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#68778b]">
              Suggested Questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-[#20324d] transition hover:border-[#0875f9] hover:bg-blue-50 hover:text-[#0875f9] disabled:opacity-50 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="border-t border-[#edf2f7] bg-white p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your tutor anything about this paper, concepts, or formulas..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-slate-300 bg-[#f8fafc] px-4 py-2.5 text-xs sm:text-sm text-[#1c2d45] placeholder-slate-400 focus:border-[#0875f9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="flex items-center gap-1.5 rounded-xl bg-[#0875f9] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <span>Send</span>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
