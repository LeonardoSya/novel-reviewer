export interface Chapter {
  readonly title: string;
  readonly index: number;
  readonly lines: readonly string[];
}

// Common Chinese novel chapter patterns
const CHAPTER_PATTERN =
  /^[\s]*(第[零一二三四五六七八九十百千万〇０-９\d]+[章节回集卷部篇]|Chapter\s+\d+|引子|楔子|序[章言幕]?|尾声|番外|前言|后记|附录)/;

export function parseChapters(content: string, customPattern?: string): readonly Chapter[] {
  const pattern = customPattern ? new RegExp(customPattern, 'm') : CHAPTER_PATTERN;
  const allLines = content.split(/\r?\n/);

  // Find all chapter start positions
  const chapterStarts: Array<{ title: string; lineIndex: number }> = [];
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i]!.trim();
    if (line.length > 0 && pattern.test(line)) {
      chapterStarts.push({ title: line, lineIndex: i });
    }
  }

  // If no chapters found, treat entire file as one chapter
  if (chapterStarts.length === 0) {
    return [
      {
        title: '全文',
        index: 0,
        lines: allLines,
      },
    ];
  }

  // Split content into chapters
  const chapters: Chapter[] = [];
  for (let i = 0; i < chapterStarts.length; i++) {
    const start = chapterStarts[i]!;
    const endLine = i + 1 < chapterStarts.length ? chapterStarts[i + 1]!.lineIndex : allLines.length;

    // Get chapter lines, skip empty leading lines after title
    const chapterLines = allLines.slice(start.lineIndex, endLine);

    chapters.push({
      title: start.title,
      index: i,
      lines: chapterLines,
    });
  }

  // If there's content before the first chapter, include it as a "前言"
  const firstChapterLine = chapterStarts[0]!.lineIndex;
  if (firstChapterLine > 0) {
    const preambleLines = allLines.slice(0, firstChapterLine).filter((l) => l.trim().length > 0);
    if (preambleLines.length > 0) {
      chapters.unshift({
        title: '前言',
        index: -1, // will be re-indexed below
        lines: allLines.slice(0, firstChapterLine),
      });
    }
  }

  // Re-index
  return chapters.map((ch, i) => ({ ...ch, index: i }));
}
