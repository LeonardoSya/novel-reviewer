import { useState } from 'react';
import type { Chapter } from '../parser.js';
import { parseChapters } from '../parser.js';
import { readFileWithEncoding } from '../utils/encoding.js';
import {
  loadProgress,
  addBook,
  removeBook,
  getBookshelfWithProgress,
} from '../progress.js';

export interface UseBookshelfResult {
  readonly bookshelfData: ReturnType<typeof getBookshelfWithProgress>;
  readonly chapters: readonly Chapter[];
  readonly filePath: string;
  readonly refreshBookshelf: () => void;
  readonly openFile: (path: string, options?: { customName?: string }) => void;
  readonly handleBookshelfSelect: (selectedPath: string) => void;
  readonly handleBookshelfAdd: (inputPath: string, displayName?: string) => void;
  readonly handleBookshelfRemove: (removePath: string) => void;
}

export function useBookshelf(
  initialChapters: readonly Chapter[],
  initialFilePath: string,
  setMode: (mode: string) => void,
): UseBookshelfResult {
  const [chapters, setChapters] = useState<readonly Chapter[]>(initialChapters);
  const [filePath, setFilePath] = useState<string>(initialFilePath);
  const [bookshelfData, setBookshelfData] = useState(() => getBookshelfWithProgress());

  const refreshBookshelf = () => {
    setBookshelfData(getBookshelfWithProgress());
  };

  const openFile = (path: string, options?: { customName?: string }) => {
    try {
      const content = readFileWithEncoding(path);
      const parsed = parseChapters(content);
      if (parsed.length === 0) {
        return;
      }
      setChapters(parsed);
      setFilePath(path);

      const name = options?.customName ?? path.split('/').pop()?.replace(/\.txt$/i, '') ?? path;
      addBook(path, name, parsed.length);

      setMode('reading');
    } catch {
      // File not found or unreadable
    }
  };

  const handleBookshelfSelect = (selectedPath: string) => {
    openFile(selectedPath);
  };

  const handleBookshelfAdd = (inputPath: string, displayName?: string) => {
    const expanded = inputPath.startsWith('~')
      ? inputPath.replace('~', process.env['HOME'] ?? '')
      : inputPath;
    openFile(expanded, { customName: displayName });
    refreshBookshelf();
  };

  const handleBookshelfRemove = (removePath: string) => {
    removeBook(removePath);
    refreshBookshelf();
  };

  return {
    bookshelfData,
    chapters,
    filePath,
    refreshBookshelf,
    openFile,
    handleBookshelfSelect,
    handleBookshelfAdd,
    handleBookshelfRemove,
  };
}
