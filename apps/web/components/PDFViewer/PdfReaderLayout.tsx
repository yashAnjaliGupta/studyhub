"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Bot,
  Highlighter,
  ZoomOut,
  ZoomIn,
  Search,
  Sun,
  Moon,
  Bookmark,
  Send,
  User,
  ReceiptText,
  BookOpenText,
  Maximize2,
  Minimize2,
} from "lucide-react";
import PdfViewer from "./PdfViewer";
import { getReadingProgress, saveReadingProgress } from "../../lib/readingProgress";
import FloatingChatbot from "../FloatingChatbot";

export interface BookItem {
  id?: number;
  chapterId?: number;
  fileId?: number;
  chapterName: string;
  pdfUrl: string;
  status?: string;
}

export default function PdfReaderLayout({ Book, isLoggedIn }: { Book: BookItem[]; isLoggedIn?: boolean }) {
  const documentKey = Book[0]?.pdfUrl || Book[0]?.chapterName || "book_reader";

  const [activeChapter, setActiveChapter] = useState(() => {
    const saved = typeof window !== "undefined" ? getReadingProgress(documentKey) : null;
    if (saved?.chapterName && Book.some((ch) => ch.chapterName === saved.chapterName)) {
      return saved.chapterName;
    }
    return Book[0]?.chapterName;
  });

  const [pageNumber, setPageNumber] = useState(() => {
    const saved = typeof window !== "undefined" ? getReadingProgress(documentKey) : null;
    return saved?.pageNumber && saved.pageNumber > 0 ? saved.pageNumber : 1;
  });

  const [numPages, setNumPages] = useState(18);
  const [zoom, setZoom] = useState(1);
  const [dark, setDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrollMode, setScrollMode] = useState<"vertical" | "horizontal">("vertical");
  const [scrollTarget, setScrollTarget] = useState<{ page: number; timestamp: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const element = layoutRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const progress = numPages ? Math.round((pageNumber / numPages) * 100) : 0;

  const currentChapterObj = Book.find((ch) => ch.chapterName === activeChapter) || Book[0];
  const channel = currentChapterObj?.pdfUrl ?? Book[0]?.pdfUrl ?? null;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Save progress automatically whenever page or chapter changes
  useEffect(() => {
    if (pageNumber > 0 && activeChapter) {
      saveReadingProgress(documentKey, {
        chapterName: activeChapter,
        pageNumber,
      });
    }
  }, [documentKey, activeChapter, pageNumber]);

  const onDocLoad = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    const saved = getReadingProgress(documentKey);
    if (saved && saved.chapterName === activeChapter && saved.pageNumber > 1 && saved.pageNumber <= n) {
      setPageNumber(saved.pageNumber);
      setScrollTarget({ page: saved.pageNumber, timestamp: Date.now() });
    } else {
      setScrollTarget({ page: pageNumber, timestamp: Date.now() });
    }
  }, [documentKey, activeChapter, pageNumber]);

  const goToPage = (delta: number) => {
    const newPage = Math.min(Math.max(1, pageNumber + delta), numPages || 18);
    setPageNumber(newPage);
    setScrollTarget({ page: newPage, timestamp: Date.now() });
  };

  // const sendMessage = () => {
  //   const text = draft.trim();
  //   if (!text) return;
  //   setMessages((m) => [
  //     ...m,
  //     { from: "user", text },
  //     { from: "ai", text: "Good question — let's break that down using what's on this page." },
  //   ]);
  //   setDraft("");
  // };

  const themeVars = dark
    ? {
      "--reader-bg": "#15181c",
      "--reader-surface": "#1d2126",
      "--reader-border": "rgba(255,255,255,0.08)",
      "--reader-text": "#e7e9ea",
      "--reader-muted": "#9aa1a8",
    }
    : {
      "--reader-bg": "#f3f4f6",
      "--reader-surface": "#ffffff",
      "--reader-border": "#e5e7eb",
      "--reader-text": "#111827",
      "--reader-muted": "#6b7280",
    };
  // console.log(channel)
  return (
    <div
      ref={layoutRef}
      className="flex flex-col h-screen overflow-hidden"
      style={{
        ...themeVars,
        backgroundColor: "var(--reader-bg)",
        color: "var(--reader-text)",
      }}
    >
      {/* Top breadcrumb bar */}


      {/* Body: 3 columns */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left — chapters */}
        {!isMobile && (
          <aside className="w-48 flex-shrink-0 overflow-y-auto p-3" style={{ backgroundColor: "var(--reader-surface)", borderRight: "0.5px solid var(--reader-border)" }}>
            <h2 className="text-sm font-medium text-blue-700 flex items-center gap-1.5 mb-2.5" style={{ color: "#1d4ed8" }}>
              <BookOpen size={15} />
              Chapters
            </h2>
            <div className="flex flex-col gap-1">
              {Book.map((ch) => {
                const active = ch.chapterName === activeChapter;
                return (
                  <button
                    key={ch.chapterName}
                    onClick={() => {
                      setActiveChapter(ch.chapterName);
                      setPageNumber(1);
                      setScrollTarget({ page: 1, timestamp: Date.now() });
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-0 text-sm text-left transition-colors ${active
                      ? "bg-blue-600 text-white font-medium"
                      : "bg-transparent text-current font-normal hover:bg-opacity-50"
                      }`}
                    style={active ? { backgroundColor: "#2563eb" } : {}}
                  >
                    <span
                      className={` h-5.5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${active ? "bg-white bg-opacity-20" : ""
                        }`}
                      style={{
                        backgroundColor: active ? "rgba(255,255,255,0.18)" : "var(--reader-bg)",
                      }}
                    >
                      {ch.chapterName}
                    </span>
                    <BookOpen size={14} className={`flex-shrink-0 ${active ? "opacity-100" : "opacity-60"}`} />
                    {/* <span className="overflow-hidden text-ellipsis">
                    Ch {ch.chapterName}: {ch.chapterName}
                  </span> */}
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center — viewer */}
        <main className="flex-1 relative flex overflow-hidden" style={{ backgroundColor: "var(--reader-bg)" }}>
          <button
            onClick={() => goToPage(-1)}
            aria-label="Previous page"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-0 flex items-center justify-center cursor-pointer z-20 shadow-sm"
            style={{
              backgroundColor: "var(--reader-surface)",
              color: "#1d4ed8",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => goToPage(1)}
            aria-label="Next page"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-0 flex items-center justify-center cursor-pointer z-20 shadow-sm"
            style={{
              backgroundColor: "var(--reader-surface)",
              color: "#1d4ed8",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
          >
            <ChevronRight size={18} />
          </button>

          <div
            className={`flex-1 overflow-hidden flex justify-stretch items-stretch ${isMobile ? "px-0 py-0" : "px-16 py-8"
              }`}
          >

            <PdfViewer
              fileUrl={channel || ""}
              pageNumber={pageNumber}
              zoom={zoom}
              onLoadSuccess={onDocLoad}
              scrollMode={scrollMode}
              onPageChange={setPageNumber}
              numPages={numPages}
              scrollTarget={scrollTarget}
            />

          </div>

          <FloatingChatbot
            chapterId={currentChapterObj?.chapterId}
            fileId={currentChapterObj?.fileId}
            documentTitle={currentChapterObj?.chapterName || "Document"}
            currentPage={pageNumber}
            status={currentChapterObj?.status || "COMPLETED"}
            isLoggedIn={isLoggedIn}
            onJumpToPage={(targetPage) => {
              setPageNumber(targetPage);
              setScrollTarget({ page: targetPage, timestamp: Date.now() });
            }}
          />
        </main>
      </div>

      {/* Bottom toolbar */}
      <div className="bg-blue-900 text-white flex items-center gap-3 px-4 h-13 flex-shrink-0">
        <ToolbarButton onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} label={null} aria-label="Zoom out">
          <ZoomOut size={16} />
        </ToolbarButton>
        <span className="text-sm font-medium w-9 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarButton onClick={() => setZoom((z) => Math.min(2, z + 0.1))} label={null} aria-label="Zoom in">
          <ZoomIn size={16} />
        </ToolbarButton>

        <Divider />

        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => goToPage(-1)} aria-label="Previous page" className={toolbarBtnClasses}>
            <ChevronLeft size={15} />
          </button>
          <span>
            Page {pageNumber} / {numPages}
          </span>
          <button onClick={() => goToPage(1)} aria-label="Next page" className={toolbarBtnClasses}>
            <ChevronRight size={15} />
          </button>
        </div>

        <Divider />

        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => {
              setScrollMode("vertical");
              setScrollTarget({ page: pageNumber, timestamp: Date.now() });
            }}
            label={null}
            aria-label="Vertical Scroll"
            title="Vertical continuous scroll"
            iconColor={scrollMode === "vertical" ? "#60a5fa" : undefined}
          >
            <ReceiptText size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              setScrollMode("horizontal");
              setScrollTarget({ page: pageNumber, timestamp: Date.now() });
            }}
            label={null}
            aria-label="Horizontal Scroll"
            title="Horizontal continuous scroll"
            iconColor={scrollMode === "horizontal" ? "#60a5fa" : undefined}
          >
            <BookOpenText size={15} />
          </ToolbarButton>
        </div>

        <Divider />

        <ToolbarButton label={null} title="Press Ctrl+F or Cmd+F to search">
          <Search size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Theme" onClick={() => setDark((d) => !d)}>
          {dark ? <Moon size={15} /> : <Sun size={15} />}
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Bookmark" iconColor="#93c5fd">
          <Bookmark size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          // label="Fullscreen"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </ToolbarButton>

        <Divider />

        <div className="flex items-center gap-2.5 ml-auto">
          <div className="w-24 h-1.5 rounded-full bg-white bg-opacity-15 overflow-hidden">
            <div className="h-full bg-blue-400" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">{progress}% complete</span>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  onClick,
  iconColor,
  title,
}: {
  children?: any;
  label?: string | null;
  onClick?: () => void;
  iconColor?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={toolbarBtnClasses}
      aria-label={label || undefined}
      title={title}
    >
      <span style={{ color: iconColor }}>{children}</span>
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}

const toolbarBtnClasses = "flex items-center gap-1.5 bg-white bg-opacity-10 border-0 rounded-lg text-black px-3 py-2 text-sm cursor-pointer hover:bg-opacity-20 transition-colors";

function Divider() {
  return <div className="w-0.5 h-6 bg-white bg-opacity-20 flex-shrink-0" />;
}
