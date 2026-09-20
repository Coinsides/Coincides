import { describe, expect, it } from 'vitest';
import {
  estimateTypographyTextBlockHeight,
  measureTypographyTextLines,
  typographyTextCssProperties,
  typographyTextMetrics,
  TYPOGRAPHY_TEXT_BLOCK_HORIZONTAL_CHROME,
  type TypographyLineMeasurementInput,
} from './typographyMeasurementService';
import {
  compareTypographyMeasurements,
  createTypographyDomLineMeasurer,
  measureTypographyTextLinesInDom,
} from './typographyDomMeasurementService';
import { createDefaultDocumentTypographyProfile } from './typographyProfileService';

const typography = createDefaultDocumentTypographyProfile();
const input = (text: string, overrides: Partial<TypographyLineMeasurementInput> = {}): TypographyLineMeasurementInput => ({
  text, width: 180, typography, ...overrides,
});

function expectLossless(result: ReturnType<typeof measureTypographyTextLines>, text: string, from = 0) {
  expect(result.lines.map((line) => text.slice(line.startOffset, line.endOffset)).join('')).toBe(text.slice(from));
  result.lines.slice(1).forEach((line, index) => expect(line.startOffset).toBe(result.lines[index].endOffset));
}

describe('A1 load-bearing typography lines', () => {
  it('preserves logical UTF-16 offsets, hard breaks and complete grapheme clusters', () => {
    const text = '宋史👨‍👩‍👧‍👦手册e\u0301研究🇨🇳'.repeat(6) + '\n\n尾章\n';
    const result = measureTypographyTextLines(input(text));
    expectLossless(result, text);
    const boundaries = new Set([text.length, ...Array.from(new Intl.Segmenter(undefined,
      { granularity: 'grapheme' }).segment(text), ({ index }) => index)]);
    for (const line of result.lines) {
      expect(boundaries.has(line.startOffset)).toBe(true);
      expect(boundaries.has(line.endOffset)).toBe(true);
    }
    expect(result.lines[result.lines.length - 1]?.startOffset).toBe(text.length);
  });

  it('deducts actual box chrome, indentation and role marker before wrapping', () => {
    const text = '天地玄黄宇宙洪荒'.repeat(16);
    const plain = measureTypographyTextLines(input(text, { width: 300 }));
    const indented = measureTypographyTextLines(input(text, { width: 300, indentLevel: 3 }));
    const list = measureTypographyTextLines(input(text, { width: 300, indentLevel: 3, writingRole: 'bullet_item' }));
    expect(plain.textWidth).toBe(300 - TYPOGRAPHY_TEXT_BLOCK_HORIZONTAL_CHROME);
    expect(indented.textWidth).toBe(plain.textWidth - 72);
    expect(list.textWidth).toBe(indented.textWidth - 29);
    expect(indented.lines.length).toBeGreaterThan(plain.lines.length);
    expect(list.lines.length).toBeGreaterThanOrEqual(indented.lines.length);
  });

  it('reflows a continuation at target-page width without changing its logical range', () => {
    const text = '史家记录地方行政与兵权制度。'.repeat(24);
    const wide = measureTypographyTextLines(input(text, { width: 400 }));
    const from = wide.lines[3].startOffset;
    const continuation = measureTypographyTextLines(input(text, { width: 180, startOffset: from }));
    expectLossless(continuation, text, from);
    expect(continuation.lines[0].endOffset).toBeLessThan(wide.lines[3].endOffset);
  });

  it('honors individual unit indentation and spacing while retaining joining newline offsets', () => {
    const text = '正文'.repeat(25) + '\n' + '缩进'.repeat(25);
    const split = text.indexOf('\n') + 1;
    const result = measureTypographyTextLines(input(text, {
      width: 300,
      typography: createDefaultDocumentTypographyProfile({ paragraphSpacingPx: 9 }),
      units: [{ startOffset: 0, endOffset: split, indentLevel: 0 },
        { startOffset: split, endOffset: text.length, indentLevel: 4 }],
    }));
    expectLossless(result, text);
    expect(result.lines.filter((line) => line.indentLevel === 4).length)
      .toBeGreaterThan(result.lines.filter((line) => line.indentLevel === 0).length);
    expect(result.heightPx).toBe(result.lines.length * typography.lineHeightPx + 18);
  });

  it('uses the four typography parameters and the same role style as the renderer', () => {
    const a = input('统一字型度量'.repeat(30), { width: 400 });
    const b = { ...a, typography: createDefaultDocumentTypographyProfile({
      fontFamily: 'Georgia, serif', fontSizePx: 24, lineHeightPx: 36, paragraphSpacingPx: 8,
    }) };
    expect(measureTypographyTextLines(b).heightPx).toBeGreaterThan(measureTypographyTextLines(a).heightPx);
    expect(typographyTextCssProperties(typographyTextMetrics(b))).toMatchObject({
      fontFamily: 'Georgia, serif', fontSize: '24px', lineHeight: '36px',
    });
    expect(typographyTextMetrics({ ...a, writingRole: 'heading' })).toMatchObject({
      fontSizePx: 21, fontWeight: 780, lineHeightPx: 28.35, rowMarginPx: 5,
    });
    expect(typographyTextMetrics({ ...a, writingRole: 'code_line' }).lineHeightPx).toBe(21.7);
    expect(typographyTextMetrics({ ...a, writingRole: 'quote' }).textWidth).toBe(a.width - 34);
  });

  it('allows injected font advances and breaks long words at complete glyphs', () => {
    const text = 'small widewordlonger tail';
    const result = measureTypographyTextLines(input(text, {
      width: 100, measureText: (value) => value.length * 10,
    }));
    expectLossless(result, text);
    expect(result.lines[0].endOffset).toBe(6);
    expect(result.lines.every((line) => line.widthPx <= 80)).toBe(true);
  });

  it.each(['heading', 'code_line'] as const)('%s responds independently to document font size, line height and paragraph spacing', (writingRole) => {
    const value = input('角色样式同源', { writingRole });
    const baseline = typographyTextMetrics(value);
    const bigger = typographyTextMetrics({ ...value, typography: createDefaultDocumentTypographyProfile({ fontSizePx: 18, lineHeightPx: 22 }) });
    const tallerInput = { ...value, typography: createDefaultDocumentTypographyProfile({ lineHeightPx: 34, paragraphSpacingPx: 7, fontFamily: 'Georgia, serif' }) };
    const taller = typographyTextMetrics(tallerInput);
    expect(bigger.fontSizePx).toBeCloseTo(baseline.fontSizePx * 18 / 15);
    expect(bigger.lineHeightPx).toBe(baseline.lineHeightPx);
    expect(taller.fontSizePx).toBe(baseline.fontSizePx);
    expect(taller.lineHeightPx).toBeCloseTo(baseline.lineHeightPx * 34 / 22);
    expect(taller.paragraphSpacingPx).toBe(7);
    expect(taller.fontFamily).toBe(writingRole === 'heading' ? 'Georgia, serif' : baseline.fontFamily);
    expect(measureTypographyTextLines(tallerInput).heightPx).toBeGreaterThan(measureTypographyTextLines(value).heightPx);
    expect(typographyTextCssProperties(taller).lineHeight).toBe(`${taller.lineHeightPx}px`);
  });

  it('has deterministic output and does not mutate typography or unit truth', () => {
    const value = input('甲乙丙丁'.repeat(35), { units: [{ startOffset: 0, endOffset: 140, indentLevel: 2 }] });
    const before = JSON.stringify(value);
    expect(measureTypographyTextLines(value)).toEqual(measureTypographyTextLines(value));
    expect(JSON.stringify(value)).toBe(before);
  });

  it('keeps canonical offsets around collapsed units without measuring their hidden content', () => {
    const value = input('首段\n隐藏\n尾段', { units: [
      { startOffset: 0, endOffset: 3 },
      { startOffset: 3, endOffset: 6, hidden: true },
      { startOffset: 6, endOffset: 8 },
    ] });
    const result = measureTypographyTextLines(value);
    expect(result.lines.map(({ startOffset, endOffset }) => [startOffset, endOffset])).toEqual([[0, 3], [6, 8]]);
    expect(value.text).toBe('首段\n隐藏\n尾段');
  });

  it('keeps a trailing Shift+Enter row inside a unit distinct from its joining separator', () => {
    const value = input('甲\n', { units: [{ startOffset: 0, endOffset: 2 }] });
    const result = measureTypographyTextLines(value);
    expect(result.lines.map(({ startOffset, endOffset }) => [startOffset, endOffset])).toEqual([[0, 2], [2, 2]]);
    expect(measureTypographyTextLines({ ...value, startOffset: 2 }).lines).toHaveLength(1);
    const joined = measureTypographyTextLines(input('甲\n乙', { units: [
      { startOffset: 0, endOffset: 2 }, { startOffset: 2, endOffset: 3 },
    ] }));
    expect(joined.lines).toHaveLength(2);
    expectLossless(joined, '甲\n乙');
  });

  it('includes paragraph minimum, chrome and declared title/preview/source extras', () => {
    const base = estimateTypographyTextBlockHeight(input('甲'));
    const decorated = estimateTypographyTextBlockHeight({ ...input('甲'), title: '章', showPreview: true, sourceReferenceCount: 1 });
    expect(base.heightPx).toBe(44);
    expect(decorated.heightPx - base.heightPx).toBe(22 + 72 + 34);
  });
});

describe('A1 DOM correction policy', () => {
  it('declares the 0.5px threshold and detects line changes even at identical total heights', () => {
    const estimated = measureTypographyTextLines(input('甲乙丙丁'.repeat(20)));
    const measured = { ...estimated, source: 'dom' as const, heightPx: estimated.heightPx + 0.5 };
    expect(compareTypographyMeasurements(estimated, measured).corrected).toBe(false);
    expect(compareTypographyMeasurements(estimated, { ...measured, heightPx: estimated.heightPx + 0.51 }).corrected).toBe(true);
    expect(compareTypographyMeasurements(estimated, { ...estimated, lines: estimated.lines.map((line, i) => (
      i === 0 ? { ...line, endOffset: line.endOffset - 1 } : line
    )) }).corrected).toBe(true);
  });

  it('does not report jsdom zero-layout data as a measured correction', () => {
    const value = input('真实浏览器才可实测。');
    expect(measureTypographyTextLinesInDom(value, document).source).toBe('estimate');
    const measurer = createTypographyDomLineMeasurer(document);
    expect(measurer(value)).toEqual(measureTypographyTextLines(value));
    expect(measurer.evidence()).toEqual([]);
    measurer.invalidate();
    measurer.dispose();
    expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});

