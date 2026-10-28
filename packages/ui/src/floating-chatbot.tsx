'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Minimize2,
  Trash2,
  FileText,
  Loader2,
  Lock,
  Maximize2,
} from 'lucide-react';
import { MathText } from './math-text';

export interface FloatingChatbotProps {
  // Document Context (StudyHub book/chapter/file)
  chapterId?: number;
  fileId?: number;
  documentTitle?: string;
  currentPage?: number;
  status?: string;
  onJumpToPage?: (pageNumber: number) => void;

  // Custom Context (TestHub topic-wise questions, exam detailed analysis, etc.)
  contextType?: 'document' | 'topic' | 'analysis' | 'general';
  contextData?: Record<string, unknown>;

  // Custom Endpoints & Prompts
  apiEndpoint?: string;
  title?: string;
  subtitle?: string;
  welcomeMessage?: string;
  suggestedPrompts?: string[];
  placeholder?: string;

  // Authentication & Layout
  isLoggedIn?: boolean;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  pageCitations?: number[];
  timestamp: string;
  isError?: boolean;
}

export function FloatingChatbot({
  chapterId,
  fileId,
  documentTitle = 'Document',
  currentPage = 1,
  status: initialStatus = 'COMPLETED',
  onJumpToPage,
  contextType = 'document',
  contextData,
  apiEndpoint = '/api/chat',
  title = 'AI Assistant',
  subtitle,
  welcomeMessage,
  suggestedPrompts: customPrompts,
  placeholder,
  isLoggedIn = true,
  position = 'bottom-right',
  className = '',
}: FloatingChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string>(initialStatus);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync initial status and poll if PROCESSING for document mode
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (contextType !== 'document') {
      setStatus('COMPLETED');
      return;
    }

    const isReady = status === 'COMPLETED' || status === 'PROCESSED';
    const validChapterId = typeof chapterId === 'number' && !isNaN(chapterId) ? chapterId : null;
    const validFileId = typeof fileId === 'number' && !isNaN(fileId) ? fileId : null;

    if (isReady || (!validChapterId && !validFileId)) return;

    // Poll status every 3 seconds if PENDING or PROCESSING in document mode
    const interval = setInterval(async () => {
      try {
        const queryParam = validChapterId ? `chapterId=${validChapterId}` : `fileId=${validFileId}`;
        const res = await fetch(`/api/document-status?${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            setStatus(data.status);
            if (data.status === 'COMPLETED' || data.status === 'PROCESSED') {
              clearInterval(interval);
            }
          }
        } else {
          setStatus('COMPLETED');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('[FloatingChatbot] Status check failed:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, chapterId, fileId, contextType]);

  // Initial welcome message
  useEffect(() => {
    const defaultWelcome =
      contextType === 'topic'
        ? `Hello! I'm your AI Topic Tutor for **${documentTitle}**. Ask me any doubt, concept explanation, or step-by-step problem hints!`
        : contextType === 'analysis'
        ? `Hello! I'm your AI Performance Tutor. Ask me anything about your exam results, topic weaknesses, or preparation strategy!`
        : `Hello! I'm your AI Study Assistant. I've analyzed **${documentTitle}**. Ask me any question!`;

    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: welcomeMessage || defaultWelcome,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [documentTitle, welcomeMessage, contextType]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const isProcessed = status === 'COMPLETED' || status === 'PROCESSED';

  const defaultPrompts =
    contextType === 'topic'
      ? [
          'Summarize key formulas',
          'Common mistakes in this topic',
          'How to approach difficult questions?',
          'Give me a conceptual hint',
        ]
      : contextType === 'analysis'
      ? [
          'Where did I lose the most marks?',
          'How to improve my weak topics?',
          'Analyze my time pacing',
          'Generate a revision strategy',
        ]
      : [
          'Summarize whole chapter',
          'What are the main concepts?',
          `Explain page ${currentPage}`,
          'Generate 5 practice questions',
        ];

  const activePrompts = customPrompts || defaultPrompts;

  const handleSendMessage = async (textToSend?: string) => {
    if (!isLoggedIn) return;
    const queryText = (textToSend || input).trim();
    if (!queryText || isLoading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsgId = `ai_${Date.now()}`;
    const aiMsgPlaceholder: Message = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      pageCitations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, aiMsgPlaceholder]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          messages: nextMessages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
          chapterId,
          fileId,
          currentPage,
          examContext: contextData,
          contextData,
          contextType,
        }),
      });

      const contentType = res.headers.get('content-type') || '';

      // JSON Response Handling (e.g. analysis-chat or standard JSON APIs)
      if (!res.ok || contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to fetch response');
        }
        const answerText = data.reply || data.answer || data.text || '';
        const citations = data.pageCitations || [];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, text: answerText, pageCitations: citations } : msg
          )
        );
        return;
      }

      // Stream Response Handling
      if (!res.body) {
        throw new Error('No stream body available');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // Extract [Page X] citations dynamically
        const matchedCitations = Array.from(
          new Set(
            Array.from(accumulatedText.matchAll(/\[Page (\d+)\]/g)).map((m) =>
              parseInt(m[1] || '1', 10)
            )
          )
        );

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  text: accumulatedText,
                  pageCitations: matchedCitations,
                }
              : msg
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                text: 'Sorry, I encountered an issue analyzing this request. Please try again.',
                isError: true,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        sender: 'ai',
        text: `Chat cleared. Ask me any question about **${documentTitle}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const positionClasses =
    position === 'bottom-left'
      ? 'left-6 items-start'
      : 'right-6 items-end';

  return (
    <div className={`fixed bottom-6 ${positionClasses} z-[999] flex flex-col ${className}`}>
      {/* Chat Window */}
      {isOpen && isProcessed && (
        <div
          className={`mb-3 w-[370px] sm:w-[420px] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in zoom-in-95 ${
            isMinimized ? 'h-[64px]' : 'h-[530px]'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-purple-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-full bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                <Bot className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium px-2 py-0.2 rounded-full flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AI Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  {subtitle || (contextType === 'document' ? `Page ${currentPage} • ${documentTitle}` : documentTitle)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition"
                title="Clear chat"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                            : msg.isError
                            ? 'bg-red-950/60 border border-red-800 text-red-200 rounded-bl-none'
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <div>
                          <MathText
                            text={msg.text}
                            onJumpToPage={onJumpToPage}
                            className={isUser ? 'text-white' : 'text-slate-200'}
                          />
                        </div>

                        {/* Page Citations Pills */}
                        {msg.pageCitations && msg.pageCitations.length > 0 && !isUser && (
                          <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-medium">Referred:</span>
                            {msg.pageCitations.map((pg) => (
                              <button
                                key={pg}
                                type="button"
                                onClick={() => onJumpToPage?.(pg)}
                                className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30 transition flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="size-2.5" />
                                Page {pg}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                    <Loader2 className="size-4 animate-spin text-blue-400" />
                    <span>Analyzing with AI Tutor...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggested Prompts Pills */}
              <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <Sparkles className="size-3.5 text-blue-400 shrink-0" />
                {activePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="whitespace-nowrap text-[11px] bg-slate-800/80 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/60 rounded-full px-2.5 py-1 transition disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Bar or Auth Notice */}
              {!isLoggedIn ? (
                <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Lock className="size-4 text-amber-400 shrink-0" />
                    <span>Sign in to ask questions to AI</span>
                  </div>
                  <a
                    href="/signin"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shrink-0"
                  >
                    Sign In
                  </a>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder || (contextType === 'topic' ? `Ask doubt about this topic...` : `Ask about ${documentTitle}...`)}
                    disabled={isLoading}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      {isProcessed ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          className="relative group bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center border border-white/20 cursor-pointer transition transform hover:scale-105 active:scale-95"
          title="Open AI Study Assistant"
        >
          <Sparkles className="size-5 text-yellow-300 animate-pulse" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 text-xs font-semibold">
            Ask AI
          </span>
          {!isOpen && (
            <span className="absolute -top-1 -right-1 size-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          )}
        </button>
      ) : (
        /* Status Indicator during background document embedding */
        <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs px-3.5 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
          <Loader2 className="size-3.5 animate-spin text-amber-400" />
          <span>Processing AI Embeddings...</span>
        </div>
      )}
    </div>
  );
}
export default FloatingChatbot;
