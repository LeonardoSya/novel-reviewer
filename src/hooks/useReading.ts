import { useState, useRef } from 'react';
import type { Chapter } from '../parser.js';
import { wrapLines } from '../utils/text.js';
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
  readonly wrappedLines: ReturnType<typeof wrapLines>;
  readonly gutterWidth: number;
  readonly visibleLines: number;
  readonly totalLines: number;
  readonly maxScroll: number;
  readonly scrollDown: (delta: number) => void;
  readonly scrollUp: (delta: number) => void;
  readonly goToChapter: (index: number) => void;
  readonly getNextParagraphOffset: () => number;
  readonly getPrevParagraphOffset: () => number;
  readonly setScrollLine: React.Dispatch<React.SetStateAction<number>>;
}

export function useReading({
  chapters,
  filePath,
  screenWidth,
  screenHeight,
  initialChapter,
}: UseReadingOptions): UseReadingResult {
  const saved = filePath ? loadProgress(filePath) : null;

  // Skip trivial preamble (e.g. garbled book title) when no saved progress
  const defaultChapter = (() => {
    if (chapters.length > 1) {
      const first = chapters[0];
      if (first && first.title === '前言') {
        const nonEmpty = first.lines.filter((l) => l.trim().length > 0);
        if (nonEmpty.length <= 3) {
          return 1; // skip trivial preamble
        }
      }
    }
    return 0;
  })();

  const [chapterIndex, setChapterIndex] = useState(initialChapter ?? saved?.chapter ?? defaultChapter);
  const [scrollLine, setScrollLine] = useState(initialChapter !== undefined ? 0 : (saved?.scrollLine ?? 0));

  const chapter = chapters[chapterIndex];

  const visibleLines = Math.max(1, screenHeight - 4);
  const maxOriginalLineNum = chapter ? chapter.lines.length : 0;
  const gutterWidth = Math.max(3, String(maxOriginalLineNum).length);
  const contentWidth = Math.max(10, screenWidth - gutterWidth - 4);

  const wrappedLines = chapter ? wrapLines(chapter.lines, contentWidth) : [];
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

  const getNextParagraphOffset = () => {
    if (wrappedLines.length === 0) return 3;
    for (let i = scrollLine + 1; i < wrappedLines.length; i++) {
      if (!wrappedLines[i]?.isContinuation) {
        return i - scrollLine;
      }
    }
    return 3;
  };

  const getPrevParagraphOffset = () => {
    if (wrappedLines.length === 0) return 3;
    for (let i = Math.min(scrollLine - 1, wrappedLines.length - 1); i >= 0; i--) {
      if (!wrappedLines[i]?.isContinuation) {
        return scrollLine - i;
      }
    }
    return 3;
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
    goToChapter,
    getNextParagraphOffset,
    getPrevParagraphOffset,
    setScrollLine,
  };
}
