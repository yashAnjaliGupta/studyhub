"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot,
    X,
    Send,
    Sparkles,
    RefreshCw,
    MessageSquare,
    BookOpen,
    ChevronDown,
    Minimize2,
    Trash2,
    FileText,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Lock,
} from "lucide-react";

export interface FloatingChatbotProps {
    chapterId?: number;
    fileId?: number;
    documentTitle?: string;
    currentPage: number;
    status?: string;
    isLoggedIn?: boolean;
    onJumpToPage?: (pageNumber: number) => void;
}

interface Message {
    id: string;
    sender: "user" | "ai";
    text: string;
    pageCitations?: number[];
    timestamp: string;
    isError?: boolean;
}

export default function FloatingChatbot({
    chapterId,
    fileId,
    documentTitle = "Document",
    currentPage,
    status: initialStatus = "COMPLETED",
    isLoggedIn = true,
    onJumpToPage,
}: FloatingChatbotProps) {
    console.log(chapterId)
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<string>(initialStatus);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sync initial status and poll if PROCESSING
    useEffect(() => {
        setStatus(initialStatus);
    }, [initialStatus]);

    useEffect(() => {
        const isReady = status === "COMPLETED" || status === "PROCESSED";
        const validChapterId = typeof chapterId === "number" && !isNaN(chapterId) ? chapterId : null;
        const validFileId = typeof fileId === "number" && !isNaN(fileId) ? fileId : null;

        if (isReady || (!validChapterId && !validFileId)) return;

        // Poll status every 3 seconds if PENDING or PROCESSING
        const interval = setInterval(async () => {
            try {
                const queryParam = validChapterId ? `chapterId=${validChapterId}` : `fileId=${validFileId}`;
                const res = await fetch(`/api/document-status?${queryParam}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status) {
                        setStatus(data.status);
                        if (data.status === "COMPLETED" || data.status === "PROCESSED") {
                            clearInterval(interval);
                        }
                    }
                } else {
                    // If response is not ok, fallback to COMPLETED to unlock UI
                    setStatus("COMPLETED");
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("[FloatingChatbot] Status check failed:", err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [status, chapterId, fileId]);

    // Initial welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: "welcome",
                    sender: "ai",
                    text: `Hello! I'm your AI Study Assistant. I've analyzed **${documentTitle}**. Ask me any question`,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
            ]);
        }
    }, [documentTitle]);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);
    console.log(status);
    const isProcessed = status === "COMPLETED" || status === "PROCESSED";

    const handleSendMessage = async (textToSend?: string) => {
        if (!isLoggedIn) return;
        const queryText = (textToSend || input).trim();
        if (!queryText || isLoading) return;

        const userMsg: Message = {
            id: `user_${Date.now()}`,
            sender: "user",
            text: queryText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const aiMsgId = `ai_${Date.now()}`;
        const aiMsgPlaceholder: Message = {
            id: aiMsgId,
            sender: "ai",
            text: "",
            pageCitations: [],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, userMsg, aiMsgPlaceholder]);
        if (!textToSend) setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: queryText,
                    chapterId,
                    fileId,
                    currentPage,
                }),
            });

            // If response is JSON error
            const contentType = res.headers.get("content-type") || "";
            if (!res.ok || contentType.includes("application/json")) {
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.error) {
                    throw new Error(data.error || "Failed to fetch response");
                }
                if (data.answer) {
                    const citations = data.pageCitations || [];
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === aiMsgId
                                ? { ...msg, text: data.answer, pageCitations: citations }
                                : msg
                        )
                    );
                    return;
                }
            }

            if (!res.body) {
                throw new Error("No stream body available");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;

                // Extract [Page X] citations dynamically
                const matchedCitations = Array.from(
                    new Set(
                        Array.from(accumulatedText.matchAll(/\[Page (\d+)\]/g)).map((m) =>
                            parseInt(m[1] || "1", 10)
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
        } catch (err: any) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === aiMsgId
                        ? {
                            ...msg,
                            text: "Sorry, I encountered an error analyzing this document. Please try again.",
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
                id: "welcome_reset",
                sender: "ai",
                text: `Chat cleared. Ask me any question about **${documentTitle}**.`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
        ]);
    };

    const suggestedPrompts = [
        "Summarize whole chapter",
        "What are the main concepts?",
        "Explain page " + currentPage,
        "Generate 5 quiz questions",
    ];

    // Helper to parse page citations in text like [Page 3]
    const renderTextWithCitations = (text: string, citations?: number[]) => {
        const parts = text.split(/(\[Page \d+\])/g);
        return parts.map((part, index) => {
            const match = part.match(/\[Page (\d+)\]/);
            if (match && match[1]) {
                const pageNum = parseInt(match[1], 10);
                return (
                    <button
                        key={index}
                        onClick={() => onJumpToPage?.(pageNum)}
                        className="inline-flex items-center gap-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold px-2 py-0.5 rounded text-xs transition cursor-pointer mx-0.5"
                        title={`Jump to Page ${pageNum}`}
                    >
                        <BookOpen className="w-3 h-3" />
                        Page {pageNum}
                    </button>
                );
            }
            return part;
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {/* Chat Window */}
                {isOpen && isProcessed && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className={`mb-4 w-[380px] sm:w-[420px] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all ${isMinimized ? "h-[64px]" : "h-[540px]"
                            }`}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white truncate">AI Assistant</h3>
                                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            AI Ready
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">Page {currentPage} • {documentTitle}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 text-slate-400">
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-1 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
                                    title={isMinimized ? "Expand" : "Minimize"}
                                >
                                    <Minimize2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleClearChat}
                                    className="p-1 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition"
                                    title="Clear chat"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Body */}
                        {!isMinimized && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
                                    {messages.map((msg) => {
                                        const isUser = msg.sender === "user";
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                                            >
                                                <div
                                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${isUser
                                                        ? "bg-blue-600 text-white rounded-br-none shadow-md"
                                                        : msg.isError
                                                            ? "bg-red-950/60 border border-red-800 text-red-200 rounded-bl-none"
                                                            : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-sm"
                                                        }`}
                                                >
                                                    <div className="whitespace-pre-wrap">
                                                        {renderTextWithCitations(msg.text, msg.pageCitations)}
                                                    </div>

                                                    {/* Page Citations Pills */}
                                                    {msg.pageCitations && msg.pageCitations.length > 0 && !isUser && (
                                                        <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[10px] text-slate-400 font-medium">Referred Pages:</span>
                                                            {msg.pageCitations.map((pg) => (
                                                                <button
                                                                    key={pg}
                                                                    onClick={() => onJumpToPage?.(pg)}
                                                                    className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30 transition flex items-center gap-1"
                                                                >
                                                                    <FileText className="w-2.5 h-2.5" />
                                                                    Page {pg}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                                            </motion.div>
                                        );
                                    })}

                                    {isLoading && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-slate-400 text-xs p-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                            <span>Analyzing document vector embeddings...</span>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Quick Suggested Pills */}
                                <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                    {suggestedPrompts.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSendMessage(prompt)}
                                            disabled={isLoading}
                                            className="whitespace-nowrap text-[11px] bg-slate-800/80 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/60 rounded-full px-2.5 py-1 transition disabled:opacity-50"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>

                                {/* Input Bar or Auth Banner */}
                                {!isLoggedIn ? (
                                    <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs text-slate-300">
                                            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                            <span>Sign in to ask questions to AI</span>
                                        </div>
                                        <a
                                            href="/signin"
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex-shrink-0"
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
                                            placeholder={`Ask about ${documentTitle}...`}
                                            disabled={isLoading}
                                            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim() || isLoading}
                                            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Action Button (FAB) / Status Indicator */}
            {isProcessed ? (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setIsOpen(!isOpen);
                        setIsMinimized(false);
                    }}
                    className="relative group bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white p-3.5 rounded-full shadow-xl flex items-center justify-center border border-white/20 z-50 cursor-pointer"
                    title="Open AI Study Assistant"
                >
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                    <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 text-xs font-semibold">
                        Ask AI
                    </span>
                    {!isOpen && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                    )}
                </motion.button>
            ) : (
                /* Status Indicator during processing */
                <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs px-3.5 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Processing AI Embeddings...</span>
                </div>
            )}
        </div>
    );
}
