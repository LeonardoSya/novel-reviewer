import { describe, it, expect } from 'bun:test';
import { parseChapters } from './parser.js';

describe('parseChapters', () => {
  describe('standard Chinese chapter patterns', () => {
    it('parses 第N章 format', () => {
      const content = [
        '第一章 开端',
        '这是第一章的内容。',
        '第二章 发展',
        '这是第二章的内容。',
      ].join('\n');

      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(2);
      expect(chapters[0]!.title).toBe('第一章 开端');
      expect(chapters[0]!.index).toBe(0);
      expect(chapters[1]!.title).toBe('第二章 发展');
      expect(chapters[1]!.index).toBe(1);
    });

    it('parses 第N回 format (classical novel style)', () => {
      const content = '第一回 大闹天宫\n内容\n第二回 三打白骨精\n内容';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(2);
      expect(chapters[0]!.title).toBe('第一回 大闹天宫');
    });

    it('parses numeric digit chapters (第1章)', () => {
      const content = '第1章 起始\n段落\n第2章 继续\n段落';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(2);
      expect(chapters[0]!.title).toBe('第1章 起始');
    });

    it('parses 第N卷/集/节/部/篇 formats', () => {
      const formats = ['卷', '集', '节', '部', '篇'];
      for (const fmt of formats) {
        const content = `第一${fmt} 标题\n内容\n第二${fmt} 标题2\n内容`;
        const chapters = parseChapters(content);
        expect(chapters.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('parses 引子/楔子/序/尾声/番外', () => {
      const content = '引子\n前情\n第一章 正文\n内容\n尾声\n结尾';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(3);
      expect(chapters[0]!.title).toBe('引子');
      expect(chapters[2]!.title).toBe('尾声');
    });

    it('parses English "Chapter N" format', () => {
      const content = 'Chapter 1\nContent\nChapter 2\nMore content';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(2);
      expect(chapters[0]!.title).toBe('Chapter 1');
    });
  });

  describe('preamble handling', () => {
    it('includes preamble as 前言 when content exists before first chapter', () => {
      const content = '作者：某某\n简介\n\n第一章 开始\n正文内容';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(2);
      expect(chapters[0]!.title).toBe('前言');
      expect(chapters[0]!.index).toBe(0);
      expect(chapters[1]!.title).toBe('第一章 开始');
      expect(chapters[1]!.index).toBe(1);
    });

    it('skips preamble when only empty lines before first chapter', () => {
      const content = '\n\n\n第一章 开始\n正文';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(1);
      expect(chapters[0]!.title).toBe('第一章 开始');
    });
  });

  describe('fallback behavior', () => {
    it('returns entire file as single chapter when no chapter markers found', () => {
      const content = '这是一段没有章节标记的文本。\n第二行。\n第三行。';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(1);
      expect(chapters[0]!.title).toBe('全文');
      expect(chapters[0]!.lines).toHaveLength(3);
    });
  });

  describe('chapter content', () => {
    it('splits lines correctly between chapters', () => {
      const content = '第一章 A\nline1\nline2\n第二章 B\nline3';
      const chapters = parseChapters(content);
      expect(chapters[0]!.lines).toEqual(['第一章 A', 'line1', 'line2']);
      expect(chapters[1]!.lines).toEqual(['第二章 B', 'line3']);
    });

    it('last chapter includes all remaining lines', () => {
      const content = '第一章 X\na\n第二章 Y\nb\nc\nd';
      const chapters = parseChapters(content);
      expect(chapters[1]!.lines).toEqual(['第二章 Y', 'b', 'c', 'd']);
    });

    it('indexes are sequential starting from 0', () => {
      const content = '前言内容\n第一章 A\nx\n第二章 B\ny\n第三章 C\nz';
      const chapters = parseChapters(content);
      chapters.forEach((ch, i) => {
        expect(ch.index).toBe(i);
      });
    });
  });

  describe('custom pattern', () => {
    it('accepts a custom regex pattern', () => {
      const content = '== Part 1 ==\ncontent1\n== Part 2 ==\ncontent2';
      const chapters = parseChapters(content, '^== Part \\d+ ==$');
      expect(chapters).toHaveLength(2);
      expect(chapters[0]!.title).toBe('== Part 1 ==');
    });
  });

  describe('edge cases', () => {
    it('handles empty content', () => {
      const chapters = parseChapters('');
      expect(chapters).toHaveLength(1);
      expect(chapters[0]!.title).toBe('全文');
    });

    it('handles content with Windows line endings (\\r\\n)', () => {
      const content = '第一章 A\r\nline1\r\n第二章 B\r\nline2';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(2);
    });

    it('handles chapter title with leading whitespace', () => {
      const content = '  第一章 缩进标题\n内容';
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(1);
      expect(chapters[0]!.title).toBe('第一章 缩进标题');
    });

    it('handles large number of chapters', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `第${i + 1}章 标题${i + 1}\n内容${i + 1}`);
      const content = lines.join('\n');
      const chapters = parseChapters(content);
      expect(chapters).toHaveLength(100);
    });
  });
});
