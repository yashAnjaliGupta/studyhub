"use client";

import { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from "lucide-react";
import type { PdfDocumentProps } from "./reader";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfDocument({
  fileUrl,
  zoom,
  onLoadSuccess,
  scrollMode = "vertical",
  onPageChange,
  numPages,
  scrollTarget,
}: PdfDocumentProps) {
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track container size for responsive page sizing
  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [mounted]);

  // When scrollTarget is set (programmatic page navigation like next/prev buttons or chapter changes)
  useEffect(() => {
    if (!mounted || !containerRef.current || !scrollTarget) return;

    const pageElement = containerRef.current.querySelector(
      `[data-page-number="${scrollTarget.page}"]`
    );
    if (pageElement) {
      pageElement.scrollIntoView({
        behavior: "smooth",
        block: scrollMode === "vertical" ? "start" : "nearest",
        inline: scrollMode === "horizontal" ? "center" : "nearest",
      });
    }
  }, [scrollTarget, scrollMode, mounted]);

  // Set up intersection observer to track active page number on scroll
  useEffect(() => {
    if (!mounted || !containerRef.current || !onPageChange) return;

    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by highest visibility intersection ratio
          visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const topVisible = visibleEntries[0];
          if (topVisible) {
            const pageNum = parseInt(
              topVisible.target.getAttribute("data-page-number") || "1",
              10
            );
            onPageChange(pageNum);
          }
        }
      },
      {
        root: container,
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9],
      }
    );

    const pageElements = container.querySelectorAll("[data-page-number]");
    pageElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [numPages, scrollMode, mounted, onPageChange]);

  if (!mounted) return <ViewerFallback label="Preparing viewer…" />;

  const isMobileSize = containerWidth ? containerWidth < 768 : false;

  // Calculate the responsive width/height of each page
  let pageWidth: number | undefined = undefined;
  let pageHeight: number | undefined = undefined;

  if (containerWidth && containerHeight) {
    if (scrollMode === "vertical") {
      const paddingAmount = isMobileSize ? 0 : 48;
      pageWidth = Math.min(containerWidth - paddingAmount, 800) * zoom;
    } else {
      // Horizontal mode
      if (containerWidth < containerHeight) {
        // Portrait (e.g. mobile): fit to width so page does not overflow horizontally
        pageWidth = (containerWidth - 32) * zoom;
      } else {
        // Landscape (e.g. desktop): fit to available container height to avoid vertical scrolling
        pageHeight = (containerHeight - 64) * zoom; // Subtract 64px for bottom toolbar and padding
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex ${
        scrollMode === "vertical"
          ? "overflow-y-auto overflow-x-hidden flex-col items-center py-4 justify-start"
          : "overflow-x-auto overflow-y-hidden flex-row items-center snap-x snap-mandatory justify-start"
      }`}
    >
      <Document
        file={`/api/?url=${encodeURIComponent(fileUrl)}`}
        onLoadSuccess={onLoadSuccess}
        loading={<ViewerFallback label="Loading PDF…" />}
        error={<ViewerFallback label="Couldn't load the PDF." muted />}
        className={`flex ${
          scrollMode === "vertical"
            ? "flex-col gap-6 items-center w-full"
            : "flex-row items-center h-full w-full gap-0"
        }`}
      >
        {Array.from({ length: numPages || 1 }).map((_, index) => {
          const pNum = index + 1;
          return (
            <div
              key={pNum}
              data-page-number={pNum}
              className={`flex-shrink-0 transition-shadow duration-200 ${
                scrollMode === "vertical"
                  ? `w-full flex justify-center bg-white ${isMobileSize ? "" : "shadow-lg border"}`
                  : "w-full h-full flex justify-center overflow-y-auto no-scrollbar snap-center py-6 items-start"
              }`}
              style={{
                borderColor: scrollMode === "vertical" && !isMobileSize ? "var(--reader-border)" : "transparent",
              }}
            >
              {scrollMode === "horizontal" ? (
                <div
                  className="shadow-lg border bg-white flex-shrink-0"
                  style={{
                    borderColor: "var(--reader-border)",
                  }}
                >
                  <Page
                    pageNumber={pNum}
                    width={pageWidth}
                    height={pageHeight}
                    renderTextLayer
                    renderAnnotationLayer
                    loading={<ViewerFallback label={`Rendering page ${pNum}…`} />}
                  />
                </div>
              ) : (
                <Page
                  pageNumber={pNum}
                  width={pageWidth}
                  height={pageHeight}
                  renderTextLayer
                  renderAnnotationLayer
                  loading={<ViewerFallback label={`Rendering page ${pNum}…`} />}
                />
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
}

function ViewerFallback({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-8 text-sm text-slate-500 dark:text-slate-400">
      {!muted && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {label}
    </div>
  );
}
