'use client';

import type { ProcessedPaper, PaperMetadata } from './paper-service';

// In-memory cache across Next.js client-side route navigations
const memoryPaperCache = new Map<string, ProcessedPaper>();
const memoryMetadataCache = new Map<string, PaperMetadata>();
const pendingFetches = new Map<string, Promise<{ status: string; paper?: ProcessedPaper; message?: string }>>();

const STORAGE_PREFIX = 'testhub:paper:';
const META_PREFIX = 'testhub:meta:';

/**
 * Get full paper from in-memory cache or sessionStorage
 */
export function getCachedPaper(id: string): ProcessedPaper | null {
  if (!id) return null;
  const decoded = decodeURIComponent(id).trim();

  // 1. In-memory cache
  if (memoryPaperCache.has(decoded)) {
    return memoryPaperCache.get(decoded)!;
  }

  // 2. sessionStorage fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${decoded}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          // Check for stale/corrupted cache (e.g. legacy bug where identical image was attached to all questions)
          const imgUrls = parsed.questions.map((q: any) => q.imageUrl).filter(Boolean);
          if (imgUrls.length > 4 && new Set(imgUrls).size === 1) {
            console.warn('[PaperCache] Evicting stale paper cache with duplicated diagrams:', decoded);
            sessionStorage.removeItem(`${STORAGE_PREFIX}${decoded}`);
            memoryPaperCache.delete(decoded);
            return null;
          }
          memoryPaperCache.set(decoded, parsed);
          return parsed;
        }
      }
    } catch {
      // Ignore sessionStorage parsing or quota errors
    }
  }

  return null;
}

/**
 * Invalidate full paper cache in memory and sessionStorage
 */
export function clearCachedPaper(id: string): void {
  if (!id) return;
  const decoded = decodeURIComponent(id).trim();
  memoryPaperCache.delete(decoded);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${decoded}`);
    } catch {}
  }
}

/**
 * Store full paper in memory and sessionStorage
 */
export function setCachedPaper(id: string, paper: ProcessedPaper): void {
  if (!id || !paper) return;
  const decoded = decodeURIComponent(id).trim();
  memoryPaperCache.set(decoded, paper);

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX}${decoded}`, JSON.stringify(paper));
    } catch {
      // Storage might exceed quota if paper is huge; memory cache will still serve it
    }
  }
}

/**
 * Get lightweight paper metadata from cache
 */
export function getCachedMetadata(id: string): PaperMetadata | null {
  if (!id) return null;
  const decoded = decodeURIComponent(id).trim();

  if (memoryMetadataCache.has(decoded)) {
    return memoryMetadataCache.get(decoded)!;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`${META_PREFIX}${decoded}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.questionCount > 0) {
          memoryMetadataCache.set(decoded, parsed);
          return parsed;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Store lightweight paper metadata
 */
export function setCachedMetadata(id: string, meta: PaperMetadata): void {
  if (!id || !meta) return;
  const decoded = decodeURIComponent(id).trim();
  memoryMetadataCache.set(decoded, meta);

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`${META_PREFIX}${decoded}`, JSON.stringify(meta));
    } catch {}
  }
}

/**
 * Fast first check: queries only lightweight metadata (~10-20ms) instead of full paper JSON
 */
export async function checkPaperMetadata(id: string, examName?: string): Promise<{
  status: 'READY' | 'NOT_FOUND' | 'ERROR';
  metadata?: PaperMetadata;
  message?: string;
}> {
  const cached = getCachedMetadata(id);
  if (cached) {
    return { status: 'READY', metadata: cached };
  }

  try {
    const examQuery = examName ? `&exam=${encodeURIComponent(examName)}` : '';
    const res = await fetch(`/api/exam/paper/${encodeURIComponent(id)}?metadataOnly=true${examQuery}`);
    if (!res.ok && res.status !== 404) {
      return {
        status: 'ERROR',
        message: `Paper service responded with error (status: ${res.status})`,
      };
    }
    const data = await res.json().catch(() => ({}));

    if (data.status === 'READY' && data.metadata) {
      setCachedMetadata(id, data.metadata);
      return { status: 'READY', metadata: data.metadata };
    }

    return {
      status: data.status === 'NOT_FOUND' ? 'NOT_FOUND' : 'ERROR',
      message: data.message || 'Paper not yet ready in database',
    };
  } catch (err: any) {
    return {
      status: 'ERROR',
      message: err?.message || 'Network error checking paper',
    };
  }
}

/**
 * Fetch full paper with questions, options, and diagrams.
 * Deduplicates in-flight requests and automatically stores into cache.
 */
export async function fetchFullPaper(
  id: string,
  examNameOrForce?: string | boolean,
  force = false
): Promise<{
  status: 'READY' | 'NOT_FOUND' | 'ERROR';
  paper?: ProcessedPaper;
  message?: string;
}> {
  const examName = typeof examNameOrForce === 'string' ? examNameOrForce : undefined;
  const isForce = typeof examNameOrForce === 'boolean' ? examNameOrForce : force;

  if (!isForce) {
    const cached = getCachedPaper(id);
    if (cached) {
      return { status: 'READY', paper: cached };
    }
  }

  const decoded = decodeURIComponent(id).trim();
  if (pendingFetches.has(decoded)) {
    return pendingFetches.get(decoded)! as any;
  }

  const fetchPromise = (async () => {
    try {
      const params = new URLSearchParams();
      if (isForce) params.set('force', 'true');
      if (examName) params.set('exam', examName);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const url = `/api/exam/paper/${encodeURIComponent(id)}${queryStr}`;
      const res = await fetch(url);
      if (!res.ok && res.status !== 404) {
        return {
          status: 'ERROR',
          message: `Paper extraction service responded with status ${res.status}`,
        };
      }
      const data = await res.json().catch(() => ({}));

      if (data.status === 'READY' && data.paper && data.paper.questions?.length > 0) {
        setCachedPaper(id, data.paper);
        return { status: 'READY', paper: data.paper };
      }

      return {
        status: data.status === 'NOT_FOUND' ? 'NOT_FOUND' : 'ERROR',
        message: data.message || 'Paper questions not yet extracted',
      };
    } catch (err: any) {
      return {
        status: 'ERROR',
        message: err?.message || 'Network error fetching paper',
      };
    } finally {
      pendingFetches.delete(decoded);
    }
  })();

  pendingFetches.set(decoded, fetchPromise);
  return fetchPromise as any;
}

/**
 * Non-blocking background preload of the full paper while user reads instructions or configures test
 */
export function preloadPaper(id: string): void {
  if (!id) return;
  if (getCachedPaper(id)) return;
  fetchFullPaper(id).catch(() => {});
}
