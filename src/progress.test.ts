import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadProgress,
  saveProgress,
  listBooks,
  addBook,
  removeBook,
  getBookshelfWithProgress,
} from './progress.js';

const PROGRESS_DIR = path.join(os.homedir(), '.novel-reviewer');
const PROGRESS_FILE = path.join(PROGRESS_DIR, 'progress.json');

// Unique fake paths to avoid collisions
const FAKE_NOVEL_PATH = `/tmp/test-novel-${process.pid}-${Date.now()}.txt`;

// Backup and restore progress.json around bookshelf tests
let originalContent: string | null = null;

function backupProgressFile(): void {
  if (fs.existsSync(PROGRESS_FILE)) {
    originalContent = fs.readFileSync(PROGRESS_FILE, 'utf-8');
  } else {
    originalContent = null;
  }
}

function restoreProgressFile(): void {
  if (originalContent !== null) {
    fs.writeFileSync(PROGRESS_FILE, originalContent, 'utf-8');
  } else if (fs.existsSync(PROGRESS_FILE)) {
    // File didn't exist before, remove what we created
    // (leave it — safer not to delete)
  }
}

describe('progress', () => {
  describe('loadProgress', () => {
    it('returns null for a file with no saved progress', () => {
      const result = loadProgress(`/tmp/nonexistent-novel-${Date.now()}.txt`);
      expect(result).toBeNull();
    });
  });

  describe('saveProgress + loadProgress roundtrip', () => {
    it('saves and loads progress correctly', () => {
      const progress = {
        chapter: 42,
        scrollLine: 15,
        lastRead: '2026-03-13T12:00:00.000Z',
      };

      saveProgress(FAKE_NOVEL_PATH, progress);
      const loaded = loadProgress(FAKE_NOVEL_PATH);

      expect(loaded).toEqual(progress);
    });

    it('overwrites previous progress for the same file', () => {
      const progress1 = { chapter: 1, scrollLine: 0, lastRead: '2026-01-01T00:00:00Z' };
      const progress2 = { chapter: 50, scrollLine: 100, lastRead: '2026-03-13T00:00:00Z' };

      saveProgress(FAKE_NOVEL_PATH, progress1);
      saveProgress(FAKE_NOVEL_PATH, progress2);

      const loaded = loadProgress(FAKE_NOVEL_PATH);
      expect(loaded).toEqual(progress2);
    });

    it('resolves relative paths to absolute', () => {
      const relPath = './test-relative-novel.txt';
      const absPath = path.resolve(relPath);
      const progress = { chapter: 3, scrollLine: 0, lastRead: '2026-01-01T00:00:00Z' };

      saveProgress(relPath, progress);
      const loaded = loadProgress(absPath);
      expect(loaded).toEqual(progress);
    });

    it('keeps progress for different files separate', () => {
      const path1 = `/tmp/novel-a-${process.pid}.txt`;
      const path2 = `/tmp/novel-b-${process.pid}.txt`;
      const prog1 = { chapter: 1, scrollLine: 0, lastRead: '2026-01-01T00:00:00Z' };
      const prog2 = { chapter: 99, scrollLine: 50, lastRead: '2026-02-01T00:00:00Z' };

      saveProgress(path1, prog1);
      saveProgress(path2, prog2);

      expect(loadProgress(path1)).toEqual(prog1);
      expect(loadProgress(path2)).toEqual(prog2);
    });
  });
});

describe('bookshelf', () => {
  beforeEach(() => {
    backupProgressFile();
  });

  afterEach(() => {
    restoreProgressFile();
  });

  describe('addBook', () => {
    it('adds a new book to the bookshelf', () => {
      const testPath = `/tmp/bookshelf-test-${Date.now()}.txt`;
      const entry = addBook(testPath, 'Test Novel', 100);

      expect(entry.filePath).toBe(path.resolve(testPath));
      expect(entry.name).toBe('Test Novel');
      expect(entry.totalChapters).toBe(100);
      expect(entry.addedAt).toBeTruthy();
    });

    it('does not add duplicate books', () => {
      const testPath = `/tmp/bookshelf-dedup-${Date.now()}.txt`;
      addBook(testPath, 'Novel A', 50);
      addBook(testPath, 'Novel A', 50);

      const books = listBooks();
      const matching = books.filter((b) => b.filePath === path.resolve(testPath));
      expect(matching.length).toBe(1);
    });

    it('updates totalChapters if changed', () => {
      const testPath = `/tmp/bookshelf-update-${Date.now()}.txt`;
      addBook(testPath, 'Novel', 50);
      const updated = addBook(testPath, 'Novel', 75);

      expect(updated.totalChapters).toBe(75);
    });
  });

  describe('removeBook', () => {
    it('removes an existing book', () => {
      const testPath = `/tmp/bookshelf-remove-${Date.now()}.txt`;
      addBook(testPath, 'To Remove', 10);

      const removed = removeBook(testPath);
      expect(removed).toBe(true);

      const books = listBooks();
      const matching = books.filter((b) => b.filePath === path.resolve(testPath));
      expect(matching.length).toBe(0);
    });

    it('returns false for non-existent book', () => {
      const removed = removeBook(`/tmp/nonexistent-${Date.now()}.txt`);
      expect(removed).toBe(false);
    });
  });

  describe('listBooks', () => {
    it('returns empty array when no books', () => {
      // Write a clean bookshelf
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ bookshelf: [], progress: {} }), 'utf-8');
      const books = listBooks();
      expect(books).toEqual([]);
    });

    it('returns added books', () => {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ bookshelf: [], progress: {} }), 'utf-8');
      addBook('/tmp/list-test-1.txt', 'Book 1', 10);
      addBook('/tmp/list-test-2.txt', 'Book 2', 20);

      const books = listBooks();
      expect(books.length).toBe(2);
    });
  });

  describe('getBookshelfWithProgress', () => {
    it('returns books with their reading progress', () => {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ bookshelf: [], progress: {} }), 'utf-8');
      const testPath = `/tmp/progress-test-${Date.now()}.txt`;
      addBook(testPath, 'Progress Test', 100);
      saveProgress(testPath, { chapter: 10, scrollLine: 5, lastRead: '2026-03-13T00:00:00Z' });

      const data = getBookshelfWithProgress();
      const match = data.find((d) => d.book.filePath === path.resolve(testPath));
      expect(match).toBeTruthy();
      expect(match!.progress).toEqual({ chapter: 10, scrollLine: 5, lastRead: '2026-03-13T00:00:00Z' });
    });

    it('returns null progress for books not yet read', () => {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ bookshelf: [], progress: {} }), 'utf-8');
      const testPath = `/tmp/no-progress-${Date.now()}.txt`;
      addBook(testPath, 'Unread', 50);

      const data = getBookshelfWithProgress();
      const match = data.find((d) => d.book.filePath === path.resolve(testPath));
      expect(match).toBeTruthy();
      expect(match!.progress).toBeNull();
    });
  });

  describe('legacy format migration', () => {
    it('migrates flat format to nested format', () => {
      // Write old flat format
      const legacyData = {
        '/tmp/legacy-novel.txt': {
          chapter: 5,
          scrollLine: 10,
          lastRead: '2026-01-01T00:00:00Z',
        },
      };
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(legacyData), 'utf-8');

      // loadProgress should still work
      const progress = loadProgress('/tmp/legacy-novel.txt');
      expect(progress).toEqual(legacyData['/tmp/legacy-novel.txt']);

      // Verify the file was migrated to new format
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      expect(raw).toHaveProperty('bookshelf');
      expect(raw).toHaveProperty('progress');
      expect(Array.isArray(raw.bookshelf)).toBe(true);
    });

    it('preserves progress data during migration', () => {
      const legacyData = {
        '/tmp/migrate-a.txt': { chapter: 1, scrollLine: 0, lastRead: '2026-01-01T00:00:00Z' },
        '/tmp/migrate-b.txt': { chapter: 42, scrollLine: 15, lastRead: '2026-02-01T00:00:00Z' },
      };
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(legacyData), 'utf-8');

      expect(loadProgress('/tmp/migrate-a.txt')).toEqual(legacyData['/tmp/migrate-a.txt']);
      expect(loadProgress('/tmp/migrate-b.txt')).toEqual(legacyData['/tmp/migrate-b.txt']);
    });
  });
});
