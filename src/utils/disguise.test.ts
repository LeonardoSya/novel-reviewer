import { describe, it, expect } from 'bun:test';
import { generateFakeFilePath, generateFakeTimestamp } from './disguise.js';

describe('generateFakeFilePath', () => {
  it('returns a path with directory, filename, and extension', () => {
    const result = generateFakeFilePath(0);
    expect(result).toMatch(/^[a-z]+\/[a-z]+\/[a-z-]+\.\w+$/);
  });

  it('produces different paths for different chapter indices', () => {
    const paths = new Set(
      Array.from({ length: 20 }, (_, i) => generateFakeFilePath(i)),
    );
    // Should have variety — at least 10 unique paths for 20 indices
    expect(paths.size).toBeGreaterThanOrEqual(10);
  });

  it('is deterministic for the same index', () => {
    expect(generateFakeFilePath(5)).toBe(generateFakeFilePath(5));
    expect(generateFakeFilePath(42)).toBe(generateFakeFilePath(42));
  });

  it('cycles through extensions for high indices', () => {
    // With 15 fake files and 5 extensions, index 0 and 15 should differ in extension
    const path0 = generateFakeFilePath(0);
    const path15 = generateFakeFilePath(15);
    const ext0 = path0.split('.').pop();
    const ext15 = path15.split('.').pop();
    expect(ext0).not.toBe(ext15);
  });

  it('handles large chapter indices without error', () => {
    expect(() => generateFakeFilePath(9999)).not.toThrow();
    const result = generateFakeFilePath(9999);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('generateFakeTimestamp', () => {
  it('returns a HH:MM formatted string', () => {
    const result = generateFakeTimestamp();
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('has valid hour and minute values', () => {
    const result = generateFakeTimestamp();
    const [hours, minutes] = result.split(':').map(Number);
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThanOrEqual(23);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThanOrEqual(59);
  });
});
