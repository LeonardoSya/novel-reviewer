import React from 'react';
import { Text, Box } from 'ink';
import type { WrappedLine } from '../utils/text.js';

interface ReaderProps {
  readonly wrappedLines: readonly WrappedLine[];
  readonly scrollLine: number;
  readonly visibleLines: number;
  readonly width: number;
  readonly gutterWidth: number;
}

export function Reader({
  wrappedLines,
  scrollLine,
  visibleLines,
  width,
  gutterWidth,
}: ReaderProps): React.ReactElement {
  const endLine = Math.min(scrollLine + visibleLines, wrappedLines.length);
  const visibleSlice = wrappedLines.slice(scrollLine, endLine);

  return (
    <Box flexDirection="column" width={width}>
      {visibleSlice.map((lineObj, i) => {
        const lineNum = scrollLine + i; // unique key

        // Only show original line number if it's the start of a paragraph
        const displayGutter = lineObj.isContinuation
          ? ''.padStart(gutterWidth, ' ')
          : String(lineObj.originalIndex + 1).padStart(gutterWidth, ' ');

        return (
          <Box key={`line-${lineNum}`}>
            <Text color="gray" dimColor>{displayGutter}</Text>
            <Text color="gray" dimColor> │ </Text>
            <Text wrap="truncate-end">{lineObj.content}</Text>
          </Box>
        );
      })}
      {/* Fill remaining space with empty lines */}
      {visibleSlice.length < visibleLines &&
        Array.from({ length: visibleLines - visibleSlice.length }, (_, i) => (
          <Box key={`empty-${i}`}>
            <Text color="gray" dimColor>{' '.padStart(gutterWidth, ' ')} │ </Text>
            <Text color="gray" dimColor>~</Text>
          </Box>
        ))}
    </Box>
  );
}
