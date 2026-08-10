export interface ReadingProgress {
  chapterName?: string;
  pageNumber: number;
  updatedAt: number;
}

/**
 * Save user reading progress for a specific file or book key in localStorage.
 */
export function saveReadingProgress(
  fileKey: string,
  progress: { chapterName?: string; pageNumber: number }
): void {
  if (typeof window === "undefined" || !fileKey) return;
  try {
    const key = `studyhub_progress_${encodeURIComponent(fileKey)}`;
    const data: ReadingProgress = {
      ...progress,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save reading progress:", err);
  }
}

/**
 * Retrieve user reading progress for a specific file or book key from localStorage.
 */
export function getReadingProgress(fileKey: string): ReadingProgress | null {
  if (typeof window === "undefined" || !fileKey) return null;
  try {
    const key = `studyhub_progress_${encodeURIComponent(fileKey)}`;
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as ReadingProgress;
  } catch (err) {
    console.error("Failed to get reading progress:", err);
    return null;
  }
}

/**
 * Clear user reading progress for a specific file or book key.
 */
export function clearReadingProgress(fileKey: string): void {
  if (typeof window === "undefined" || !fileKey) return;
  try {
    const key = `studyhub_progress_${encodeURIComponent(fileKey)}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.error("Failed to clear reading progress:", err);
  }
}
