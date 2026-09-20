import { snapGraphemeOffset } from '../../../../../shared/graphemes';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, normalizeDocumentTypographyProfile } from './typographyProfileService';
import type { TextUnitWritingRole } from './runtimeDataTypes';
import type { DocumentTypographyProfile } from './types';

// Shared with .blockBox (7px 9px padding, 1px border) and .textUnitRow.
export const TYPOGRAPHY_TEXT_BLOCK_MIN_HEIGHT = 42;
export const TYPOGRAPHY_TEXT_BLOCK_HORIZONTAL_CHROME = 20;
export const TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME = 16;
export const TYPOGRAPHY_UNIT_INDENT_PX = 24;
export const TYPOGRAPHY_UNIT_MIN_HEIGHT = 28;
export const TYPOGRAPHY_MEASUREMENT_TOLERANCE_PX = 0.5;

export interface TypographyMeasurementUnit {
  hidden?: boolean;
  startOffset: number;
  endOffset: number;
  indentLevel?: number;
  writingRole?: TextUnitWritingRole;
}
export interface TypographyTextMetrics {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  lineHeightPx: number;
  paragraphSpacingPx: number;
  textWidth: number;
  indentLevel: number;
  writingRole: TextUnitWritingRole;
  rowMarginPx: number;
}
export interface TypographyLineMeasurementInput {
  text: string;
  width: number;
  typography: DocumentTypographyProfile;
  startOffset?: number;
  indentLevel?: number;
  writingRole?: TextUnitWritingRole;
  /** Ranges in the canonical block string; never persisted fragment state. */
  units?: TypographyMeasurementUnit[];
  measureText?: (text: string, metrics: TypographyTextMetrics) => number;
}
export interface TypographyMeasuredLine {
  startOffset: number;
  endOffset: number;
  heightPx: number;
  lineHeightPx: number;
  widthPx: number;
  indentLevel: number;
  writingRole: TextUnitWritingRole;
}
export interface TypographyLineMeasurement {
  lines: TypographyMeasuredLine[];
  heightPx: number;
  textWidth: number;
  lineHeightPx: number;
  verticalChromePx: number;
  source: 'estimate' | 'dom';
}
export type TypographyLineMeasurer = (input: TypographyLineMeasurementInput) => TypographyLineMeasurement;
export interface TypographyMeasurementInput extends TypographyLineMeasurementInput {
  title?: string | null;
  showPreview?: boolean;
  sourceReferenceCount?: number;
}
export interface TypographyTextBlockMeasurement {
  text: string;
  width: number;
  textWidth: number;
  charsPerLine: number;
  lineCount: number;
  heightPx: number;
  averageCharWidthPx: number;
  lineHeightPx: number;
  paragraphSpacingPx: number;
}

export function typographyTextMetrics(input: TypographyLineMeasurementInput, unit: TypographyMeasurementUnit = {
  startOffset: 0, endOffset: input.text.length, indentLevel: input.indentLevel, writingRole: input.writingRole,
}): TypographyTextMetrics {
  const profile = normalizeDocumentTypographyProfile(input.typography);
  const role = unit.writingRole ?? 'paragraph';
  const indentLevel = Math.max(0, Math.min(6, Math.trunc(unit.indentLevel ?? 0)));
  const markerWidth = ['bullet_item', 'numbered_item', 'todo_item', 'toggle_item'].includes(role) ? 29 : 0;
  // Keep the existing default role hierarchy while all roles follow the same
  // document font-size and line-height controls used by the renderer.
  const fontScale = profile.fontSizePx / DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontSizePx;
  const lineScale = profile.lineHeightPx / DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.lineHeightPx;
  return {
    fontFamily: role === 'code_line'
      ? 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace' : profile.fontFamily,
    fontSizePx: role === 'heading' ? 21 * fontScale : role === 'code_line' ? 14 * fontScale : profile.fontSizePx,
    fontWeight: role === 'heading' ? 780 : 400,
    lineHeightPx: role === 'heading' ? 28.35 * lineScale : role === 'code_line' ? 21.7 * lineScale : profile.lineHeightPx,
    paragraphSpacingPx: profile.paragraphSpacingPx,
    textWidth: Math.max(1, input.width - TYPOGRAPHY_TEXT_BLOCK_HORIZONTAL_CHROME
      - indentLevel * TYPOGRAPHY_UNIT_INDENT_PX - markerWidth - (role === 'quote' ? 14 : 0)),
    indentLevel,
    writingRole: role,
    rowMarginPx: role === 'heading' ? 5 : 0,
  };
}

/** These exact properties also drive the DOM mirror and may be applied to renderers. */
export function typographyTextCssProperties(metrics: TypographyTextMetrics): Record<string, string> {
  return {
    fontFamily: metrics.fontFamily,
    fontSize: `${metrics.fontSizePx}px`,
    fontWeight: String(metrics.fontWeight),
    lineHeight: `${metrics.lineHeightPx}px`,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    wordBreak: 'normal',
    tabSize: '8',
    letterSpacing: 'normal',
  };
}

export function typographyMeasurementUnits(input: TypographyLineMeasurementInput): Array<TypographyMeasurementUnit & { hasTrailingSeparator: boolean }> {
  const from = snapGraphemeOffset(input.text, input.startOffset ?? 0, 'forward');
  let cursor = 0;
  const units: TypographyMeasurementUnit[] = input.units?.length ? input.units : input.text.split('\n').map((text, index, paragraphs) => {
    const startOffset = cursor;
    cursor += text.length + (index < paragraphs.length - 1 ? 1 : 0);
    return { startOffset, endOffset: cursor, indentLevel: input.indentLevel, writingRole: input.writingRole };
  });
  return units.map((unit, index) => ({ ...unit, hasTrailingSeparator: index < units.length - 1 }))
    .filter((unit) => !unit.hidden && (unit.endOffset > from || (unit.startOffset === from && unit.endOffset === from)
      || (!unit.hasTrailingSeparator && unit.endOffset === from && input.text.slice(unit.startOffset, unit.endOffset).endsWith('\n'))))
    .map((unit) => ({ ...unit, startOffset: Math.max(from, unit.startOffset) }));
}

export function finishTypographyUnitLines(lines: TypographyMeasuredLine[], metrics: TypographyTextMetrics): TypographyMeasuredLine[] {
  if (!lines.length) return lines;
  const base = lines.reduce((sum, line) => sum + line.heightPx, 0);
  const extra = Math.max(0, TYPOGRAPHY_UNIT_MIN_HEIGHT - base - metrics.paragraphSpacingPx)
    + metrics.paragraphSpacingPx + metrics.rowMarginPx;
  return lines.map((line, index) => index === lines.length - 1 ? { ...line, heightPx: line.heightPx + extra } : line);
}

function estimateGlyphWidth(text: string, metrics: TypographyTextMetrics, average: number): number {
  let width = 0;
  for (const glyph of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
    width += glyph.segment === '\t' ? average * 8
      : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Extended_Pictographic}\u3000-\u303f\uff00-\uffef]/u.test(glyph.segment)
        ? metrics.fontSizePx : average;
  }
  return width;
}

/** Pure fallback. Production injects the DOM measurer into the same flow plan. */
export function measureTypographyTextLines(input: TypographyLineMeasurementInput): TypographyLineMeasurement {
  const profile = normalizeDocumentTypographyProfile(input.typography);
  const lines: TypographyMeasuredLine[] = [];
  const units = typographyMeasurementUnits(input);
  for (const unit of units) {
    const metrics = typographyTextMetrics(input, unit);
    const widthOf = (text: string) => input.measureText?.(text, metrics)
      ?? estimateGlyphWidth(text, metrics, profile.averageCharWidthPx * metrics.fontSizePx / profile.fontSizePx);
    const unitLines: TypographyMeasuredLine[] = [];
    let lineStart = unit.startOffset;
    let cursor = lineStart;
    let lastBreak = lineStart;
    const append = (end: number) => {
      unitLines.push({ startOffset: lineStart, endOffset: end,
        heightPx: metrics.lineHeightPx, lineHeightPx: metrics.lineHeightPx,
        widthPx: widthOf(input.text.slice(lineStart, end).replace(/\n$/, '')),
        indentLevel: metrics.indentLevel, writingRole: metrics.writingRole });
      lineStart = end;
      lastBreak = end;
    };
    const contentEnd = unit.endOffset - (unit.hasTrailingSeparator ? 1 : 0);
    const body = input.text.slice(unit.startOffset, contentEnd);
    const graphemes = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(body));
    for (const grapheme of graphemes) {
      cursor = unit.startOffset + grapheme.index;
      if (grapheme.segment === '\n' || grapheme.segment === '\r\n') {
        append(cursor + grapheme.segment.length);
        continue;
      }
      if (cursor > lineStart && widthOf(input.text.slice(lineStart, cursor + grapheme.segment.length)) > metrics.textWidth) {
        const end = lastBreak > lineStart ? lastBreak : cursor;
        append(end);
        // A word can itself exceed the width after a whitespace break.
        if (cursor > lineStart && widthOf(input.text.slice(lineStart, cursor + grapheme.segment.length)) > metrics.textWidth) append(cursor);
      }
      if (/\s|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(grapheme.segment)) {
        lastBreak = cursor + grapheme.segment.length;
      }
    }
    if (lineStart < contentEnd || !unitLines.length || body.endsWith('\n')) append(contentEnd);
    // The joining separator belongs to this range without adding a visual row.
    unitLines[unitLines.length - 1].endOffset = unit.endOffset;
    lines.push(...finishTypographyUnitLines(unitLines, metrics));
  }
  const metrics = typographyTextMetrics(input);
  return { lines, heightPx: lines.reduce((sum, line) => sum + line.heightPx, 0),
    textWidth: metrics.textWidth, lineHeightPx: metrics.lineHeightPx,
    verticalChromePx: TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME, source: 'estimate' };
}

export function estimateAverageCharWidth(profile: DocumentTypographyProfile): number {
  return normalizeDocumentTypographyProfile(profile).averageCharWidthPx;
}

export function estimateTypographyTextBlockHeight(input: TypographyMeasurementInput): TypographyTextBlockMeasurement {
  const normalized = normalizeDocumentTypographyProfile(input.typography);
  const measurement = measureTypographyTextLines(input);
  return {
    text: input.text, width: input.width, textWidth: measurement.textWidth,
    charsPerLine: Math.max(1, Math.floor(measurement.textWidth / normalized.averageCharWidthPx)),
    lineCount: measurement.lines.length + (input.title ? 1 : 0),
    heightPx: Math.max(TYPOGRAPHY_TEXT_BLOCK_MIN_HEIGHT,
      TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME + measurement.heightPx
      + (input.title ? normalized.lineHeightPx : 0) + (input.showPreview ? 72 : 0)
      + ((input.sourceReferenceCount ?? 0) > 0 ? 34 : 0)),
    averageCharWidthPx: normalized.averageCharWidthPx,
    lineHeightPx: normalized.lineHeightPx, paragraphSpacingPx: normalized.paragraphSpacingPx,
  };
}

export function estimatePageFrameLineCapacity({ contentHeight, typography }: {
  contentHeight: number; typography: DocumentTypographyProfile;
}): number {
  return Math.max(1, Math.floor(contentHeight / normalizeDocumentTypographyProfile(typography).lineHeightPx));
}
