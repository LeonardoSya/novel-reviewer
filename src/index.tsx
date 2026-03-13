#!/usr/bin/env bun
import React from 'react';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import meow from 'meow';
import { withFullScreen } from 'fullscreen-ink';
import { readFileWithEncoding } from './utils/encoding.js';
import { parseChapters } from './parser.js';
import { addBook, listBooks } from './progress.js';
import { App } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cli = meow(
  `
  Usage
    $ cr [novel.txt]

  Options
    --pattern, -p  Custom chapter regex pattern

  Examples
    $ cr                              Open bookshelf
    $ cr 斗罗大陆.txt                  Read directly
    $ cr novel.txt --pattern "^第\\\\d+章"
`,
  {
    importMeta: import.meta,
    flags: {
      pattern: {
        type: 'string',
        shortFlag: 'p',
      },
    },
  },
);

// Seed demo book into bookshelf on first launch
const books = listBooks();
if (books.length === 0) {
  const demoPath = path.resolve(__dirname, '..', 'demo', '斗罗大陆II绝世唐门.txt');
  try {
    const demoContent = readFileWithEncoding(demoPath);
    const demoChapters = parseChapters(demoContent);
    if (demoChapters.length > 0) {
      addBook(demoPath, '斗罗大陆II绝世唐门', demoChapters.length);
    }
  } catch {
    // Demo file not found — skip silently
  }
}

const filePath = cli.input[0];

if (filePath) {
  // Direct reading mode — read file, parse, auto-add to bookshelf
  const content = readFileWithEncoding(filePath);
  const chapters = parseChapters(content, cli.flags.pattern);

  if (chapters.length === 0) {
    console.error('Error: No chapters found in the file.');
    process.exit(1);
  }

  // Auto-add to bookshelf
  const name = filePath.split('/').pop()?.replace(/\.txt$/i, '') ?? filePath;
  addBook(filePath, name, chapters.length);

  const { start, waitUntilExit } = withFullScreen(
    React.createElement(App, { chapters, filePath }),
  );
  await start();
  await waitUntilExit();
} else {
  // Bookshelf mode — no file argument
  const { start, waitUntilExit } = withFullScreen(
    React.createElement(App, { startInBookshelf: true }),
  );
  await start();
  await waitUntilExit();
}
