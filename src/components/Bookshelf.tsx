import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import type { BookEntry, ReadingProgress } from '../progress.js';

interface BookshelfProps {
  readonly books: ReadonlyArray<{
    readonly book: BookEntry;
    readonly progress: ReadingProgress | null;
  }>;
  readonly height: number;
  readonly width: number;
  readonly onSelect: (filePath: string) => void;
  readonly onAdd: (filePath: string, displayName?: string) => void;
  readonly onRemove: (filePath: string) => void;
  readonly onQuit: () => void;
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${diffWeek}w ago`;
}

// Convert book name to a disguised code-file path, e.g. "斗罗大陆" → "src/pages/douluodalu.ts"
function disguiseBookName(name: string): string {
  // Use the raw name but make it look like a code file path
  const dirs = ['src/pages', 'src/services', 'src/modules', 'lib/core', 'pkg/handlers'];
  const exts = ['.ts', '.go', '.rs', '.py'];
  // Stable hash from name for consistent disguise
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);
  const dir = dirs[absHash % dirs.length]!;
  const ext = exts[absHash % exts.length]!;
  return `${dir}/${name}${ext}`;
}

export function Bookshelf({
  books,
  height,
  width,
  onSelect,
  onAdd,
  onRemove,
  onQuit,
}: BookshelfProps): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const [inputMode, setInputMode] = useState<'normal' | 'command' | 'confirmDelete'>('normal');
  const [commandBuffer, setCommandBuffer] = useState('');

  // Reserve: title + separator + separator + footer = 4 lines, + command bar = 1
  const listHeight = Math.max(1, height - 5);

  // Visible window around cursor
  const startIdx = Math.max(0, Math.min(cursor - Math.floor(listHeight / 2), books.length - listHeight));
  const visibleBooks = books.slice(Math.max(0, startIdx), Math.max(0, startIdx) + listHeight);

  // Returns true if the command triggers a mode that should NOT reset to normal
  const executeCommand = (cmd: string): boolean => {
    const trimmed = cmd.trim();
    if (trimmed === 'q' || trimmed === 'quit') {
      onQuit();
      return false;
    }
    // :add <path> [displayName]  or  :a <path> [displayName]
    if (trimmed.startsWith('add ') || trimmed.startsWith('a ')) {
      const rest = trimmed.replace(/^(add|a)\s+/, '');
      // Split: first token is path, rest is display name
      const spaceIdx = rest.indexOf(' ');
      if (spaceIdx > 0) {
        const filePath = rest.slice(0, spaceIdx);
        const displayName = rest.slice(spaceIdx + 1).trim();
        onAdd(filePath, displayName || undefined);
      } else if (rest) {
        onAdd(rest);
      }
      return false;
    }
    if (trimmed === 'rm' || trimmed === 'remove' || trimmed === 'd') {
      if (books.length > 0) {
        setInputMode('confirmDelete');
        return true;
      }
      return false;
    }
    // :number → select that item
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= books.length) {
      setCursor(num - 1);
    }
    return false;
  };

  useInput((input, key) => {
    // Command input mode (vim-style : bar)
    if (inputMode === 'command') {
      if (key.return) {
        const stayInMode = executeCommand(commandBuffer);
        if (!stayInMode) {
          setInputMode('normal');
        }
        setCommandBuffer('');
      } else if (key.escape) {
        setInputMode('normal');
        setCommandBuffer('');
      } else if (key.backspace || key.delete) {
        if (commandBuffer.length === 0) {
          setInputMode('normal');
        } else {
          setCommandBuffer((prev) => prev.slice(0, -1));
        }
      } else if (input && !key.ctrl && !key.meta) {
        setCommandBuffer((prev) => prev + input);
      }
      return;
    }

    if (inputMode === 'confirmDelete') {
      if (input === 'y' || input === 'Y') {
        const book = books[cursor];
        if (book) {
          onRemove(book.book.filePath);
          setCursor((prev) => Math.max(0, Math.min(prev, books.length - 2)));
        }
      }
      setInputMode('normal');
      return;
    }

    // Normal mode
    if (input === 'q') {
      onQuit();
    } else if (input === ':') {
      setInputMode('command');
      setCommandBuffer('');
    } else if (input === 'j' || key.downArrow) {
      setCursor((prev) => Math.min(prev + 1, Math.max(0, books.length - 1)));
    } else if (input === 'k' || key.upArrow) {
      setCursor((prev) => Math.max(prev - 1, 0));
    } else if (key.return) {
      const book = books[cursor];
      if (book) {
        onSelect(book.book.filePath);
      }
    } else if (input === 'a') {
      setInputMode('command');
      setCommandBuffer('add ');
    } else if (input === 'd') {
      if (books.length > 0) {
        setInputMode('confirmDelete');
      }
    } else if (input === 'g') {
      setCursor(0);
    } else if (input === 'G') {
      setCursor(Math.max(0, books.length - 1));
    }
  });

  const separatorLine = '─'.repeat(Math.min(width, 60));

  // Bottom bar content based on mode
  const renderBottomBar = (): React.ReactElement => {
    if (inputMode === 'command') {
      return <Text color="yellow">:{commandBuffer}█</Text>;
    }
    if (inputMode === 'confirmDelete') {
      const book = books[cursor];
      const displayName = book ? disguiseBookName(book.book.name) : '';
      return <Text color="red">Remove &quot;{displayName}&quot;? (y/n)</Text>;
    }
    return <Text color="gray">  j/k select  Enter open  a add  d remove  :cmd  q quit</Text>;
  };

  // Empty bookshelf
  if (books.length === 0) {
    return (
      <Box flexDirection="column" width={width} height={height}>
        <Text bold color="cyan">{'  Code Review Dashboard'}</Text>
        <Text color="gray">{separatorLine}</Text>
        <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
          <Text color="gray">  No files in review queue.</Text>
          <Text color="gray">  :add {'<path>'} {'<name>'}  or  cr {'<file>'}</Text>
        </Box>
        <Box flexGrow={1} />
        <Text color="gray">{separatorLine}</Text>
        {renderBottomBar()}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Text bold color="cyan">{'  Code Review Dashboard'}</Text>
      <Text color="gray">{separatorLine}</Text>

      {visibleBooks.map((item, i) => {
        const realIndex = Math.max(0, startIdx) + i;
        const isSelected = realIndex === cursor;
        const prefix = isSelected ? '▸ ' : '  ';

        const displayName = disguiseBookName(item.book.name);
        const chapterProgress = item.progress
          ? `[${item.progress.chapter + 1}/${item.book.totalChapters}]`
          : '[new]';
        const lastTime = item.progress
          ? formatRelativeTime(item.progress.lastRead)
          : '';

        const numStr = String(realIndex + 1).padStart(2, ' ');
        const line = `${prefix}${numStr}. ${displayName}`;
        const rightInfo = lastTime ? `${chapterProgress}  ${lastTime}` : chapterProgress;
        const gap = Math.max(1, width - line.length - rightInfo.length - 2);

        return (
          <Box key={item.book.filePath}>
            <Text
              color={isSelected ? 'yellow' : undefined}
              bold={isSelected}
            >
              {line}
            </Text>
            <Text color="gray">{' '.repeat(gap)}</Text>
            <Text color={isSelected ? 'yellow' : 'gray'}>{rightInfo}</Text>
          </Box>
        );
      })}

      {/* Fill remaining space */}
      {visibleBooks.length < listHeight &&
        Array.from({ length: listHeight - visibleBooks.length }, (_, i) => (
          <Text key={`fill-${i}`}> </Text>
        ))}

      <Text color="gray">{separatorLine}</Text>
      {renderBottomBar()}
    </Box>
  );
}
