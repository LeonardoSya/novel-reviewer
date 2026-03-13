import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const PROGRESS_DIR = path.join(os.homedir(), '.novel-reviewer');
const PROGRESS_FILE = path.join(PROGRESS_DIR, 'progress.json');

export interface ReadingProgress {
  readonly chapter: number;
  readonly scrollLine: number;
  readonly lastRead: string; // ISO timestamp
}

export interface BookEntry {
  readonly filePath: string;
  readonly name: string;
  readonly addedAt: string; // ISO timestamp
  readonly totalChapters: number;
}

export interface BookshelfData {
  readonly bookshelf: readonly BookEntry[];
  readonly progress: Record<string, ReadingProgress>;
}

type LegacyProgressMap = Record<string, ReadingProgress>;

function ensureDir(): void {
  if (!fs.existsSync(PROGRESS_DIR)) {
    fs.mkdirSync(PROGRESS_DIR, { recursive: true });
  }
}

function isLegacyFormat(data: unknown): data is LegacyProgressMap {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  // New format has 'bookshelf' and 'progress' keys
  if ('bookshelf' in data && 'progress' in data) {
    return false;
  }
  // Legacy format: keys are file paths mapped to ReadingProgress objects
  return true;
}

function migrateFromLegacy(legacy: LegacyProgressMap): BookshelfData {
  return {
    bookshelf: [],
    progress: { ...legacy },
  };
}

function loadAll(): BookshelfData {
  ensureDir();
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { bookshelf: [], progress: {} };
  }
  const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8');
  const data: unknown = JSON.parse(raw);

  if (isLegacyFormat(data)) {
    const migrated = migrateFromLegacy(data);
    // Persist the migrated format
    saveAll(migrated);
    return migrated;
  }

  return data as BookshelfData;
}

function saveAll(data: BookshelfData): void {
  ensureDir();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function loadProgress(filePath: string): ReadingProgress | null {
  const all = loadAll();
  const key = path.resolve(filePath);
  return all.progress[key] ?? null;
}

export function saveProgress(filePath: string, progress: ReadingProgress): void {
  const all = loadAll();
  const key = path.resolve(filePath);
  saveAll({
    ...all,
    progress: { ...all.progress, [key]: progress },
  });
}

export function listBooks(): readonly BookEntry[] {
  const all = loadAll();
  return all.bookshelf;
}

export function addBook(filePath: string, name: string, totalChapters: number): BookEntry {
  const all = loadAll();
  const absPath = path.resolve(filePath);

  // Don't add duplicates
  const existing = all.bookshelf.find((b) => b.filePath === absPath);
  if (existing) {
    // Update totalChapters if changed
    if (existing.totalChapters !== totalChapters) {
      const updated: BookEntry = { ...existing, totalChapters };
      saveAll({
        ...all,
        bookshelf: all.bookshelf.map((b) => (b.filePath === absPath ? updated : b)),
      });
      return updated;
    }
    return existing;
  }

  const entry: BookEntry = {
    filePath: absPath,
    name,
    addedAt: new Date().toISOString(),
    totalChapters,
  };

  saveAll({
    ...all,
    bookshelf: [...all.bookshelf, entry],
  });

  return entry;
}

export function removeBook(filePath: string): boolean {
  const all = loadAll();
  const absPath = path.resolve(filePath);
  const filtered = all.bookshelf.filter((b) => b.filePath !== absPath);

  if (filtered.length === all.bookshelf.length) {
    return false; // not found
  }

  saveAll({
    ...all,
    bookshelf: filtered,
  });

  return true;
}

export function getBookshelfWithProgress(): ReadonlyArray<{
  readonly book: BookEntry;
  readonly progress: ReadingProgress | null;
}> {
  const all = loadAll();
  return all.bookshelf.map((book) => ({
    book,
    progress: all.progress[book.filePath] ?? null,
  }));
}
