// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { expandGraphemeRange, nextGraphemeOffset, previousGraphemeOffset,
  sliceGraphemes, snapGraphemeOffset } from '../../../../../shared/graphemes';

describe('B9 grapheme boundaries in UTF-16 coordinates', () => {
  it.each(['\u{1f600}', '\u{1f469}\u200d\u{1f4bb}', 'e\u0301', '\u{1f1e8}\u{1f1e6}', '\u{1f44d}\u{1f3fd}'])
  ('expands every partial excerpt of %s, including either internal endpoint', (cluster) => {
    const text = `A${cluster}B`;
    for (let start = 1; start < 1 + cluster.length; start++) {
      for (let end = start + 1; end <= 1 + cluster.length; end++) {
        expect(sliceGraphemes(text, start, end)).toBe(cluster);
        expect(expandGraphemeRange(text, start, end)).toEqual({ start: 1, end: 1 + cluster.length });
      }
      expect(nextGraphemeOffset(text, start)).toBe(1 + cluster.length);
      expect(previousGraphemeOffset(text, start + 1)).toBe(1);
      expect(sliceGraphemes(text, start, start)).toBe('');
    }
    expect(nextGraphemeOffset(text, text.length)).toBe(text.length);
    expect(previousGraphemeOffset(text, 0)).toBe(0);
  });

  it('snaps by affinity, keeps empty ranges empty and clamps numeric edges', () => {
    expect(snapGraphemeOffset('A\u{1f600}B', 2, 'backward')).toBe(1);
    expect(snapGraphemeOffset('A\u{1f600}B', 2, 'forward')).toBe(3);
    expect(snapGraphemeOffset('A\u{1f600}B', 2)).toBe(3);
    expect(expandGraphemeRange('A\u{1f600}B', 2, 2)).toEqual({ start: 3, end: 3 });
    expect(sliceGraphemes('A\u{1f600}B', 3, 1)).toBe('');
    expect(snapGraphemeOffset('', Infinity)).toBe(0);
    expect(snapGraphemeOffset('abc', NaN)).toBe(0);
    expect(snapGraphemeOffset('abc', -Infinity)).toBe(0);
    expect(snapGraphemeOffset('abc', Infinity)).toBe(3);
  });

  it.each(['ASCII text\nnext line', '中文漢字', 'ASCII混合中文123'])
  ('keeps every ordinary ASCII/CJK slice byte-for-byte: %s', (text) => {
    for (let start = -text.length - 2; start <= text.length + 2; start++) {
      for (let end = -text.length - 2; end <= text.length + 2; end++) {
        expect(sliceGraphemes(text, start, end)).toBe(text.slice(start, end));
      }
    }
    for (let point = 0; point <= text.length; point++) {
      expect(snapGraphemeOffset(text, point)).toBe(point);
      expect(previousGraphemeOffset(text, point)).toBe(Math.max(0, point - 1));
      expect(nextGraphemeOffset(text, point)).toBe(Math.min(text.length, point + 1));
    }
  });
});
