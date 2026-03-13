import React from 'react';
import { Text, Box } from 'ink';
import { generateFakeFilePath, generateFakeTimestamp } from '../utils/disguise.js';

interface StatusBarProps {
  readonly chapterIndex: number;
  readonly totalChapters: number;
  readonly scrollLine: number;
  readonly totalLines: number;
  readonly width: number;
}

export function StatusBar({
  chapterIndex,
  totalChapters,
  scrollLine,
  totalLines,
  width,
}: StatusBarProps): React.ReactElement {
  const fakePath = generateFakeFilePath(chapterIndex);
  const progress = `(${chapterIndex + 1}/${totalChapters})`;
  const lineInfo = `L${scrollLine + 1}/${totalLines}`;
  const time = generateFakeTimestamp();

  const left = `reviewing: ${fakePath}  ${progress}`;
  const right = `${lineInfo}  ${time}`;
  const gap = Math.max(1, width - left.length - right.length);

  return (
    <Box width={width}>
      <Text color="green" bold>{left}</Text>
      <Text>{' '.repeat(gap)}</Text>
      <Text color="gray">{right}</Text>
    </Box>
  );
}
