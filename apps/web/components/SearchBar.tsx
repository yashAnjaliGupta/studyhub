"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, GraduationCap, BookOpen, FileText, Loader2 } from "lucide-react";

interface SearchResultItem {
  name: string;
  href: string;
  board?: string;
  className?: string;
  subjectName?: string;
  bookName?: string;
  chapterName?: string;
}

interface SearchResults {
  exams: SearchResultItem[];
  classes: SearchResultItem[];
  subjects: SearchResultItem[];
  books: SearchResultItem[];
  chapters: SearchResultItem[];
}

export const SearchBar = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [results, setResults] = useState<SearchResults>({
    exams: [],
    classes: [],
    subjects: [],
    books: [],
    chapters: [],
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search logic
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ exams: [], classes: [], subjects: [], books: [], chapters: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Failed to fetch search results:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global key listener for Ctrl+K and '/' to focus input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key.toLowerCase() === "k") ||
        (e.metaKey && e.key.toLowerCase() === "k") ||
        (e.key === "/" && document.activeElement !== inputRef.current)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Flatten results for keyboard navigation and assign index properties
  const { groupedResults, flatResults } = useMemo(() => {
    const flat: (SearchResultItem & { flatIndex: number; category: string; icon: React.ComponentType<{ className?: string }> })[] = [];
    
    const categories = [
      { name: "Exams", items: results.exams, icon: GraduationCap },
      { name: "Classes", items: results.classes, icon: BookOpen },
      { name: "Subjects", items: results.subjects, icon: BookOpen },
      { name: "Books", items: results.books, icon: BookOpen },
      { name: "Chapters", items: results.chapters, icon: FileText },
    ];

    const grouped = categories.map((cat) => {
      const itemsWithIndex = cat.items.map((item) => {
        const flatIndex = flat.length;
        const newItem = { ...item, flatIndex, category: cat.name, icon: cat.icon };
        flat.push(newItem);
        return newItem;
      });
      return { ...cat, items: itemsWithIndex };
    });

    return { groupedResults: grouped, flatResults: flat };
  }, [results]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (flatResults.length === 0 ? -1 : (prev + 1) % flatResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatResults.length === 0 ? -1 : (prev - 1 + flatResults.length) % flatResults.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatResults.length) {
        const selected = flatResults[activeIndex];
        if (selected) {
          setIsOpen(false);
          router.push(selected.href);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults({ exams: [], classes: [], subjects: [], books: [], chapters: [] });
    inputRef.current?.focus();
  };

  // Utility to highlight match text
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-100 font-semibold text-slate-900 rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const hasAnyResults = flatResults.length > 0;

  return (
    <div ref={searchRef} className="relative w-full max-w-xl">
      {/* Search Input Box */}
      <div className="relative flex items-center w-full bg-white border border-slate-200 rounded-full shadow-sm hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200">
        <Search className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent py-2.5 pl-11 pr-12 text-sm text-slate-900 placeholder:text-slate-400 outline-none rounded-full"
          placeholder="Search exams, classes, subjects, books..."
        />

        {/* Clear / Key hint icons */}
        <div className="absolute right-4 flex items-center gap-1.5">
          {query ? (
            <button
              onClick={clearSearch}
              className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center h-5 select-none pointer-events-none px-1.5 text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl scrollbar-hide z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Searching StudyHub...
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !hasAnyResults && (
            <div className="py-8 text-center text-slate-500 text-sm">
              No results found for &ldquo;<span className="font-medium text-slate-800">{query}</span>&rdquo;
            </div>
          )}

          {/* Grouped results list */}
          {!isLoading && hasAnyResults && (
            <div className="py-1">
              {groupedResults.map((category) => {
                if (category.items.length === 0) return null;
                const Icon = category.icon;

                return (
                  <div key={category.name}>
                    {/* Category Header */}
                    <div className="flex items-center px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100 first:border-t-0">
                      {category.name}
                    </div>

                    {/* Category Items */}
                    <div className="divide-y divide-slate-50">
                      {category.items.map((item) => {
                        const isActive = item.flatIndex === activeIndex;

                        return (
                          <Link
                            key={item.href + item.name}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-between px-4 py-3 text-sm transition-all duration-100 ${
                              isActive
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-slate-700 hover:bg-slate-50/80 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon
                                className={`h-4 w-4 flex-shrink-0 ${
                                  isActive ? "text-blue-600" : "text-slate-400"
                                }`}
                              />
                              <span className="truncate">
                                {highlightText(item.name, query)}
                              </span>
                            </div>

                            {/* Dynamic context label (breadcrumb style) on the right */}
                            <span className="text-[10px] text-slate-400 truncate max-w-[40%] pl-2 pointer-events-none">
                              {item.category === "Classes" && item.board}
                              {item.category === "Subjects" && `${item.board} › ${item.className}`}
                              {item.category === "Books" && `${item.className} › ${item.subjectName}`}
                              {item.category === "Chapters" && `${item.subjectName} › ${item.bookName}`}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
