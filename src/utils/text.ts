export function getCharWidth(char: string): number {
  const code = char.charCodeAt(0);
  // Basic CJK Unified Ideographs, full width punctuation, etc.
  if (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xff01 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0x3000 && code <= 0x303f) || // CJK Symbols and Punctuation
    code === 0x2014 || // em dash —
    code === 0x2018 || // left single quotation mark ‘
    code === 0x2019 || // right single quotation mark ’
    code === 0x201c || // left double quotation mark “
    code === 0x201d || // right double quotation mark ”
    code === 0x2026    // horizontal ellipsis …
  ) {
    return 2;
  }
  return 1;
}

export interface WrappedLine {
  readonly originalIndex: number;
  readonly content: string;
  readonly isContinuation: boolean;
}

export function wrapLines(lines: readonly string[], maxWidth: number): WrappedLine[] {
  const result: WrappedLine[] = [];
  const safeMaxWidth = Math.max(10, maxWidth);
  
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i]!;
    if (originalLine.length === 0) {
      result.push({ originalIndex: i, content: '', isContinuation: false });
      continue;
    }

    let currentLine = '';
    let currentWidth = 0;
    let isContinuation = false;

    for (let charIndex = 0; charIndex < originalLine.length; charIndex++) {
      const char = originalLine[charIndex]!;
      const charWidth = getCharWidth(char);

      if (currentWidth + charWidth > safeMaxWidth && currentWidth > 0) {
        result.push({ originalIndex: i, content: currentLine, isContinuation });
        currentLine = char;
        currentWidth = charWidth;
        isContinuation = true;
      } else {
        currentLine += char;
        currentWidth += charWidth;
      }
    }

    if (currentLine.length > 0) {
      result.push({ originalIndex: i, content: currentLine, isContinuation });
    }
  }

  return result;
}
