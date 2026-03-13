import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import type { Chapter } from '../parser.js';

interface TableOfContentsProps {
  readonly chapters: readonly Chapter[];
  readonly currentChapter: number;
  readonly height: number;
  readonly width: number;
  readonly onSelect: (index: number) => void;
  readonly onClose: () => void;
}

export function TableOfContents({
  chapters,
  currentChapter,
  height,
  width,
  onSelect,
  onClose,
}: TableOfContentsProps): React.ReactElement {
  const [cursor, setCursor] = useState(currentChapter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const filtered = searchQuery
    ? chapters.filter((ch) => ch.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [...chapters];

  // Visible window around cursor
  const listHeight = height - 4; // header + footer + search
  const halfWindow = Math.floor(listHeight / 2);

  // Find cursor position in filtered list
  const cursorInFiltered = filtered.findIndex((ch) => ch.index === cursor);
  const effectiveCursor = cursorInFiltered >= 0 ? cursorInFiltered : 0;

  const startIdx = Math.max(0, Math.min(effectiveCursor - halfWindow, filtered.length - listHeight));
  const visibleChapters = filtered.slice(Math.max(0, startIdx), Math.max(0, startIdx) + listHeight);

  useInput((input, key) => {
    if (isSearching) {
      if (key.return) {
        setIsSearching(false);
        // Move cursor to first match
        if (filtered.length > 0) {
          setCursor(filtered[0]!.index);
        }
      } else if (key.escape) {
        setIsSearching(false);
        setSearchQuery('');
      } else if (key.backspace || key.delete) {
        setSearchQuery((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setSearchQuery((prev) => prev + input);
      }
      return;
    }

    if (input === 'q' || key.escape) {
      onClose();
    } else if (input === 'j' || key.downArrow) {
      const nextIdx = Math.min(effectiveCursor + 1, filtered.length - 1);
      if (filtered[nextIdx]) {
        setCursor(filtered[nextIdx]!.index);
      }
    } else if (input === 'k' || key.upArrow) {
      const prevIdx = Math.max(effectiveCursor - 1, 0);
      if (filtered[prevIdx]) {
        setCursor(filtered[prevIdx]!.index);
      }
    } else if (key.return) {
      const selected = filtered[effectiveCursor];
      if (selected) {
        onSelect(selected.index);
      }
    } else if (input === '/') {
      setIsSearching(true);
      setSearchQuery('');
    } else if (input === 'g') {
      if (filtered.length > 0) {
        setCursor(filtered[0]!.index);
      }
    } else if (input === 'G') {
      if (filtered.length > 0) {
        setCursor(filtered[filtered.length - 1]!.index);
      }
    }
  });

  return (
    <Box flexDirection="column" width={width}>
      <Box>
        <Text bold color="cyan">{'  Table of Contents'}</Text>
        <Text color="gray">{`  (${filtered.length} chapters)`}</Text>
      </Box>
      <Text color="gray">{'─'.repeat(Math.min(width, 60))}</Text>

      {visibleChapters.map((ch) => {
        const isCurrent = ch.index === currentChapter;
        const isSelected = ch.index === cursor;
        const prefix = isSelected ? '▸ ' : '  ';
        const marker = isCurrent ? ' ◀' : '';
        const numStr = String(ch.index + 1).padStart(4, ' ');

        return (
          <Box key={ch.index}>
            <Text
              color={isSelected ? 'yellow' : isCurrent ? 'green' : undefined}
              bold={isSelected}
              inverse={isSelected}
            >
              {prefix}{numStr}. {ch.title}{marker}
            </Text>
          </Box>
        );
      })}

      {/* Fill remaining lines */}
      {visibleChapters.length < listHeight &&
        Array.from({ length: listHeight - visibleChapters.length }, (_, i) => (
          <Text key={`fill-${i}`}> </Text>
        ))}

      <Text color="gray">{'─'.repeat(Math.min(width, 60))}</Text>
      {isSearching ? (
        <Text color="yellow">/{searchQuery}█</Text>
      ) : (
        <Text color="gray">j/k navigate  Enter select  /search  q close</Text>
      )}
    </Box>
  );
}
