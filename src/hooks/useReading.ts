import { useState, useRef, useMemo } from 'react';
import type { Chapter } from '../parser.js';
import { wrapLines, type WrappedLine } from '../utils/text.js';
import {
  loadProgress,
  saveProgress,
  type ReadingProgress,
} from '../progress.js';

export interface UseReadingOptions {
  readonly chapters: readonly Chapter[];
  readonly filePath: string;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly initialChapter?: number;
}

export interface UseReadingResult {
  readonly chapterIndex: number;
  readonly scrollLine: number;
  readonly wrappedLines: readonly WrappedLine[];
  readonly gutterWidth: number;
  readonly visibleLines: number;
  readonly totalLines: number;
  readonly maxScroll: number;
  readonly scrollDown: (delta: number) => void;
  readonly scrollUp: (delta: number) => void;
  readonly scrollDownParagraph: () => void;
  readonly scrollUpParagraph: () => void;
  readonly goToChapter: (index: number) => void;
  readonly setScrollLine: React.Dispatch<React.SetStateAction<number>>;
}

// Find the next original-line boundary from a given position
function findNextParagraphOffset(lines: readonly WrappedLine[], from: number): number {
  for (let i = from + 1; i < lines.length; i++) {
    if (!lines[i]?.isContinuation) {
      return i - from;
    }
  }
  // Already near the end — scroll remaining lines
  const remaining = lines.length - from;
  return remaining > 0 ? remaining : 1;
}

// Find the previous original-line boundary from a given position
function findPrevParagraphOffset(lines: readonly WrappedLine[], from: number): number {
  // First, skip to the start of the current original line
  let i = from;
  while (i > 0 && lines[i]?.isContinuation) {
    i--;
  }
  // If we moved, that's the start of the current paragraph
  if (i < from) {
    return from - i;
  }
  // Already at a paragraph start — find the previous one
  i = from - 1;
  while (i > 0 && lines[i]?.isContinuation) {
    i--;
  }
  return from - Math.max(0, i);
}

export function useReading({
  chapters,
  filePath,
  screenWidth,
  screenHeight,
  initialChapter,
}: UseReadingOptions): UseReadingResult {
  const saved = filePath ? loadProgress(filePath) : null;

  const [chapterIndex, setChapterIndex] = useState(initialChapter ?? saved?.chapter ?? 0);
  const [scrollLine, setScrollLine] = useState(initialChapter !== undefined ? 0 : (saved?.scrollLine ?? 0));

  const chapter = chapters[chapterIndex];

  const visibleLines = Math.max(1, screenHeight - 4);
  const maxOriginalLineNum = chapter ? chapter.lines.length : 0;
  const gutterWidth = Math.max(3, String(maxOriginalLineNum).length);
  const contentWidth = Math.max(10, screenWidth - gutterWidth - 4);

  // Memoize wrapping to ensure stable identity across renders
  const wrappedLines = useMemo(
    () => (chapter ? wrapLines(chapter.lines, contentWidth) : []),
    [chapter, contentWidth],
  );

  const totalLines = wrappedLines.length;
  const maxScroll = Math.max(0, totalLines - visibleLines);

  const clampScroll = (line: number) => Math.max(0, Math.min(line, maxScroll));

  // Track consecutive boundary hits for auto-advance
  const boundaryHits = useRef(0);
  const lastBoundary = useRef<'top' | 'bottom' | null>(null);

  const persistProgress = (chap: number, scroll: number, path: string) => {
    if (!path) return;
    const progress: ReadingProgress = {
      chapter: chap,
      scrollLine: scroll,
      lastRead: new Date().toISOString(),
    };
    saveProgress(path, progress);
  };

  const goToChapter = (index: number) => {
    const clamped = Math.max(0, Math.min(index, chapters.length - 1));
    setChapterIndex(clamped);
    setScrollLine(0);
    persistProgress(clamped, 0, filePath);
  };

  const scrollDown = (delta: number) => {
    setScrollLine((prev) => {
      const next = clampScroll(prev + delta);
      if (prev >= maxScroll && next >= maxScroll && maxScroll > 0) {
        if (lastBoundary.current === 'bottom') {
          boundaryHits.current += 1;
        } else {
          lastBoundary.current = 'bottom';
          boundaryHits.current = 1;
        }
        if (boundaryHits.current >= 2 && chapterIndex < chapters.length - 1) {
          boundaryHits.current = 0;
          lastBoundary.current = null;
          goToChapter(chapterIndex + 1);
          return 0;
        }
      } else {
        boundaryHits.current = 0;
        lastBoundary.current = null;
      }
      persistProgress(chapterIndex, next, filePath);
      return next;
    });
  };

  const scrollUp = (delta: number) => {
    setScrollLine((prev) => {
      const next = clampScroll(prev - delta);
      if (prev <= 0 && next <= 0) {
        if (lastBoundary.current === 'top') {
          boundaryHits.current += 1;
        } else {
          lastBoundary.current = 'top';
          boundaryHits.current = 1;
        }
        if (boundaryHits.current >= 2 && chapterIndex > 0) {
          boundaryHits.current = 0;
          lastBoundary.current = null;
          goToChapter(chapterIndex - 1);
          return 0;
        }
      } else {
        boundaryHits.current = 0;
        lastBoundary.current = null;
      }
      persistProgress(chapterIndex, next, filePath);
      return next;
    });
  };

  // Paragraph-aware scroll: compute offset inside the callback using `prev`
  const scrollDownParagraph = () => {
    setScrollLine((prev) => {
      const delta = findNextParagraphOffset(wrappedLines, prev);
      const next = clampScroll(prev + delta);
      if (prev >= maxScroll && next >= maxScroll && maxScroll > 0) {
        if (lastBoundary.current === 'bottom') {
          boundaryHits.current += 1;
        } else {
          lastBoundary.current = 'bottom';
          boundaryHits.current = 1;
        }
        if (boundaryHits.current >= 2 && chapterIndex < chapters.length - 1) {
          boundaryHits.current = 0;
          lastBoundary.current = null;
          goToChapter(chapterIndex + 1);
          return 0;
        }
      } else {
        boundaryHits.current = 0;
        lastBoundary.current = null;
      }
      persistProgress(chapterIndex, next, filePath);
      return next;
    });
  };

  const scrollUpParagraph = () => {
    setScrollLine((prev) => {
      const delta = findPrevParagraphOffset(wrappedLines, prev);
      const next = clampScroll(prev - delta);
      if (prev <= 0 && next <= 0) {
        if (lastBoundary.current === 'top') {
          boundaryHits.current += 1;
        } else {
          lastBoundary.current = 'top';
          boundaryHits.current = 1;
        }
        if (boundaryHits.current >= 2 && chapterIndex > 0) {
          boundaryHits.current = 0;
          lastBoundary.current = null;
          goToChapter(chapterIndex - 1);
          return 0;
        }
      } else {
        boundaryHits.current = 0;
        lastBoundary.current = null;
      }
      persistProgress(chapterIndex, next, filePath);
      return next;
    });
  };

  return {
    chapterIndex,
    scrollLine,
    wrappedLines,
    gutterWidth,
    visibleLines,
    totalLines,
    maxScroll,
    scrollDown,
    scrollUp,
    scrollDownParagraph,
    scrollUpParagraph,
    goToChapter,
    setScrollLine,
  };
}
