import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { readFileWithEncoding } from './encoding.js';

const TMP_DIR = path.join(os.tmpdir(), `novel-reader-enc-test-${process.pid}`);

beforeAll(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

function writeTmpFile(name: string, content: Buffer | string): string {
  const filePath = path.join(TMP_DIR, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('readFileWithEncoding', () => {
  it('reads plain UTF-8 file correctly', () => {
    const filePath = writeTmpFile('utf8.txt', '你好世界\nHello World');
    const result = readFileWithEncoding(filePath);
    expect(result).toBe('你好世界\nHello World');
  });

  it('strips UTF-8 BOM', () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const text = Buffer.from('带BOM的文件', 'utf-8');
    const filePath = writeTmpFile('utf8-bom.txt', Buffer.concat([bom, text]));
    const result = readFileWithEncoding(filePath);
    expect(result).toBe('带BOM的文件');
  });

  it('reads ASCII-only file as UTF-8', () => {
    const filePath = writeTmpFile('ascii.txt', 'Hello World\nLine 2');
    const result = readFileWithEncoding(filePath);
    expect(result).toBe('Hello World\nLine 2');
  });

  it('reads GBK-encoded file and decodes to UTF-8', () => {
    // "你好" in GBK: 0xC4E3 0xBAC3
    const gbkBuffer = Buffer.from([0xc4, 0xe3, 0xba, 0xc3]);
    const filePath = writeTmpFile('gbk.txt', gbkBuffer);
    const result = readFileWithEncoding(filePath);
    expect(result).toBe('你好');
  });

  it('handles empty file', () => {
    const filePath = writeTmpFile('empty.txt', '');
    const result = readFileWithEncoding(filePath);
    expect(result).toBe('');
  });

  it('handles file with only newlines', () => {
    const filePath = writeTmpFile('newlines.txt', '\n\n\n');
    const result = readFileWithEncoding(filePath);
    expect(result).toBe('\n\n\n');
  });

  it('throws for nonexistent file', () => {
    expect(() => readFileWithEncoding('/tmp/does-not-exist-xyz.txt')).toThrow();
  });
});
