import React, { useState } from 'react';
import { useApp, Box, Text } from 'ink';
import { useScreenSize } from 'fullscreen-ink';
import type { Chapter } from './parser.js';
import { useBookshelf } from './hooks/useBookshelf.js';
import { ReadingView } from './components/ReadingView.js';
import { TableOfContents } from './components/TableOfContents.js';
import { Bookshelf } from './components/Bookshelf.js';

type AppMode = 'reading' | 'toc' | 'bookshelf';

interface AppProps {
  readonly chapters?: readonly Chapter[];
  readonly filePath?: string;
  readonly startInBookshelf?: boolean;
}

export function App({ chapters: initialChapters, filePath: initialFilePath, startInBookshelf }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { width, height } = useScreenSize();

  const [mode, setMode] = useState<AppMode>(startInBookshelf ? 'bookshelf' : 'reading');
  const [tocFromBookshelf, setTocFromBookshelf] = useState(false);
  // Track the chapter selected from TOC to pass to ReadingView
  const [jumpToChapter, setJumpToChapter] = useState<number | undefined>(undefined);

  const bookshelf = useBookshelf(
    initialChapters ?? [],
    initialFilePath ?? '',
    setMode as (mode: string) => void,
  );

  const returnToBookshelf = () => {
    bookshelf.refreshBookshelf();
    setMode('bookshelf');
  };

  // Bookshelf mode
  if (mode === 'bookshelf') {
    return (
      <Box flexDirection="column" height={height} width={width}>
        <Bookshelf
          books={bookshelf.bookshelfData}
          height={height}
          width={width}
          onSelect={bookshelf.handleBookshelfSelect}
          onAdd={bookshelf.handleBookshelfAdd}
          onRemove={bookshelf.handleBookshelfRemove}
          onQuit={() => exit()}
        />
      </Box>
    );
  }

  // No chapters loaded
  if (bookshelf.chapters.length === 0) {
    return <Text color="red">No chapters found.</Text>;
  }

  // TOC mode
  if (mode === 'toc') {
    return (
      <Box flexDirection="column" height={height} width={width}>
        <TableOfContents
          chapters={bookshelf.chapters}
          currentChapter={jumpToChapter ?? 0}
          height={height}
          width={width}
          onSelect={(index) => {
            setJumpToChapter(index);
            setMode('reading');
          }}
          onClose={() => {
            if (tocFromBookshelf) {
              returnToBookshelf();
            } else {
              setMode('reading');
            }
          }}
        />
      </Box>
    );
  }

  // Reading mode
  return (
    <ReadingView
      key={`${bookshelf.filePath}-${jumpToChapter ?? 'auto'}`}
      chapters={bookshelf.chapters}
      filePath={bookshelf.filePath}
      screenWidth={width}
      screenHeight={height}
      startInBookshelf={startInBookshelf}
      initialChapter={jumpToChapter}
      onOpenToc={(currentChapter) => {
        setJumpToChapter(currentChapter);
        setTocFromBookshelf(false);
        setMode('toc');
      }}
      onReturnToBookshelf={returnToBookshelf}
    />
  );
}
