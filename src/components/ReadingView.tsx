import React, { useState } from 'react';
import { useInput, useApp, Box, Text } from 'ink';
import type { Chapter } from '../parser.js';
import { useReading } from '../hooks/useReading.js';
import { Reader } from './Reader.js';
import { StatusBar } from './StatusBar.js';

type InputMode = 'reading' | 'command' | 'search';

interface ReadingViewProps {
  readonly chapters: readonly Chapter[];
  readonly filePath: string;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly startInBookshelf?: boolean;
  readonly initialChapter?: number;
  readonly onOpenToc: (currentChapter: number) => void;
  readonly onReturnToBookshelf: () => void;
}

export function ReadingView({
  chapters,
  filePath,
  screenWidth,
  screenHeight,
  startInBookshelf,
  initialChapter,
  onOpenToc,
  onReturnToBookshelf,
}: ReadingViewProps): React.ReactElement {
  const { exit } = useApp();
  const [inputMode, setInputMode] = useState<InputMode>('reading');
  const [commandBuffer, setCommandBuffer] = useState('');

  const reading = useReading({
    chapters,
    filePath,
    screenWidth,
    screenHeight,
    initialChapter,
  });

  const executeCommand = (cmd: string): boolean => {
    const trimmed = cmd.trim();
    if (trimmed === 'q' || trimmed === 'quit') {
      if (startInBookshelf) {
        onReturnToBookshelf();
      } else {
        exit();
      }
      return false;
    }
    if (trimmed === 'toc') {
      onOpenToc(reading.chapterIndex);
      setCommandBuffer('');
      return true;
    }
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= chapters.length) {
      reading.goToChapter(num - 1);
    }
    setCommandBuffer('');
    return false;
  };

  const executeSearch = (query: string): boolean => {
    if (!query) return false;
    const lowerQuery = query.toLowerCase();
    const found = chapters.findIndex((ch) =>
      ch.title.toLowerCase().includes(lowerQuery),
    );
    if (found >= 0) {
      reading.goToChapter(found);
    }
    setCommandBuffer('');
    return false;
  };

  useInput((input, key) => {
    if (inputMode === 'command') {
      if (key.return) {
        const handledMode = executeCommand(commandBuffer);
        if (!handledMode) {
          setInputMode('reading');
        }
      } else if (key.escape) {
        setInputMode('reading');
        setCommandBuffer('');
      } else if (key.backspace || key.delete) {
        if (commandBuffer.length === 0) {
          setInputMode('reading');
        } else {
          setCommandBuffer((prev) => prev.slice(0, -1));
        }
      } else if (input && !key.ctrl && !key.meta) {
        setCommandBuffer((prev) => prev + input);
      }
      return;
    }

    if (inputMode === 'search') {
      if (key.return) {
        const handledMode = executeSearch(commandBuffer);
        if (!handledMode) {
          setInputMode('reading');
        }
      } else if (key.escape) {
        setInputMode('reading');
        setCommandBuffer('');
      } else if (key.backspace || key.delete) {
        if (commandBuffer.length === 0) {
          setInputMode('reading');
        } else {
          setCommandBuffer((prev) => prev.slice(0, -1));
        }
      } else if (input && !key.ctrl && !key.meta) {
        setCommandBuffer((prev) => prev + input);
      }
      return;
    }

    // Reading mode keybindings
    if (input === 'q') {
      if (startInBookshelf) {
        onReturnToBookshelf();
      } else {
        exit();
      }
    } else if (input === 'j' || key.downArrow) {
      reading.scrollDown(reading.getNextParagraphOffset());
    } else if (input === 'k' || key.upArrow) {
      reading.scrollUp(reading.getPrevParagraphOffset());
    } else if (input === 'd') {
      reading.scrollDown(Math.floor(reading.visibleLines / 2));
    } else if (input === 'u') {
      reading.scrollUp(Math.floor(reading.visibleLines / 2));
    } else if (input === ' ' || key.pageDown) {
      reading.scrollDown(reading.visibleLines);
    } else if (key.pageUp) {
      reading.scrollUp(reading.visibleLines);
    } else if (input === 'g') {
      reading.setScrollLine(0);
    } else if (input === 'G') {
      reading.setScrollLine(reading.maxScroll);
    } else if (input === 'n') {
      reading.goToChapter(reading.chapterIndex + 1);
    } else if (input === 'N') {
      reading.goToChapter(reading.chapterIndex - 1);
    } else if (input === '/') {
      setInputMode('search');
      setCommandBuffer('');
    } else if (input === ':') {
      setInputMode('command');
      setCommandBuffer('');
    }
  });

  const separatorLine = '─'.repeat(Math.min(screenWidth, 120));

  return (
    <Box flexDirection="column" height={screenHeight} width={screenWidth}>
      <StatusBar
        chapterIndex={reading.chapterIndex}
        totalChapters={chapters.length}
        scrollLine={reading.scrollLine}
        totalLines={reading.totalLines}
        width={screenWidth}
      />
      <Text color="gray" dimColor>{separatorLine}</Text>
      <Reader
        wrappedLines={reading.wrappedLines}
        scrollLine={reading.scrollLine}
        visibleLines={reading.visibleLines}
        width={screenWidth}
        gutterWidth={reading.gutterWidth}
      />
      <Text color="gray" dimColor>{separatorLine}</Text>
      {inputMode === 'command' ? (
        <Text color="yellow">:{commandBuffer}█</Text>
      ) : inputMode === 'search' ? (
        <Text color="yellow">/{commandBuffer}█</Text>
      ) : (
        <Text color="gray">
          :q {startInBookshelf ? 'back' : 'quit'}  j/k scroll  d/u half-page  n/N next/prev  /search  :toc  :N jump
        </Text>
      )}
    </Box>
  );
}
