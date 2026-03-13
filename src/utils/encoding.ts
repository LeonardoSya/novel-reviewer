import * as fs from 'node:fs';

const ENCODING_SIGNATURES: Array<{ encoding: string; pattern: Buffer }> = [
  { encoding: 'utf-8', pattern: Buffer.from([0xef, 0xbb, 0xbf]) },
  { encoding: 'utf-16le', pattern: Buffer.from([0xff, 0xfe]) },
  { encoding: 'utf-16be', pattern: Buffer.from([0xfe, 0xff]) },
];

function detectEncoding(buffer: Buffer): string {
  for (const { encoding, pattern } of ENCODING_SIGNATURES) {
    if (buffer.subarray(0, pattern.length).equals(pattern)) {
      return encoding;
    }
  }

  // Heuristic: try UTF-8 first — if it decodes cleanly, it's likely UTF-8
  const utf8Text = buffer.toString('utf-8');
  const replacementCount = (utf8Text.match(/\uFFFD/g) ?? []).length;
  if (replacementCount === 0) {
    return 'utf-8';
  }

  // Fall back to GBK (covers GB2312 and GB18030 common chars)
  return 'gbk';
}

function decodeWithIconv(buffer: Buffer, encoding: string): string {
  try {
    // Lazy-load iconv-lite only when needed for non-UTF-8 files
    const { createRequire } = require('node:module');
    const req = createRequire(import.meta.url);
    const iconv = req('iconv-lite') as typeof import('iconv-lite');
    return iconv.decode(buffer, encoding);
  } catch {
    // If iconv-lite is not available, fall back to UTF-8
    return buffer.toString('utf-8');
  }
}

export function readFileWithEncoding(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const encoding = detectEncoding(buffer);

  if (encoding === 'utf-8') {
    // Strip BOM if present
    const text = buffer.toString('utf-8');
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }

  return decodeWithIconv(buffer, encoding);
}
