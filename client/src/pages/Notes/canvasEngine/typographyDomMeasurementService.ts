import {
  finishTypographyUnitLines,
  measureTypographyTextLines,
  typographyMeasurementUnits,
  typographyTextCssProperties,
  typographyTextMetrics,
  TYPOGRAPHY_MEASUREMENT_TOLERANCE_PX,
  TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME,
  type TypographyLineMeasurement,
  type TypographyLineMeasurementInput,
  type TypographyLineMeasurer,
  type TypographyMeasuredLine,
} from './typographyMeasurementService';

export interface TypographyMeasurementEvidence {
  estimatedHeightPx: number;
  measuredHeightPx: number;
  absoluteErrorPx: number;
  relativeError: number;
  estimatedLineCount: number;
  measuredLineCount: number;
  lineBoundariesDiffer: boolean;
  corrected: boolean;
  tolerancePx: number;
}

export function compareTypographyMeasurements(
  estimate: TypographyLineMeasurement,
  measured: TypographyLineMeasurement,
): TypographyMeasurementEvidence {
  const absoluteErrorPx = Math.abs(estimate.heightPx - measured.heightPx);
  const lineBoundariesDiffer = estimate.lines.length !== measured.lines.length
    || estimate.lines.some((line, index) => line.startOffset !== measured.lines[index]?.startOffset
      || line.endOffset !== measured.lines[index]?.endOffset);
  return {
    estimatedHeightPx: estimate.heightPx,
    measuredHeightPx: measured.heightPx,
    absoluteErrorPx,
    relativeError: measured.heightPx > 0 ? absoluteErrorPx / measured.heightPx : 0,
    estimatedLineCount: estimate.lines.length,
    measuredLineCount: measured.lines.length,
    lineBoundariesDiffer,
    corrected: absoluteErrorPx > TYPOGRAPHY_MEASUREMENT_TOLERANCE_PX || lineBoundariesDiffer,
    tolerancePx: TYPOGRAPHY_MEASUREMENT_TOLERANCE_PX,
  };
}

/** Layout adapter only. No DOM/global state is read by the pure pagination planner. */
export function measureTypographyTextLinesInDom(
  input: TypographyLineMeasurementInput,
  ownerDocument: Document,
): TypographyLineMeasurement {
  const fallback = measureTypographyTextLines(input);
  if (!ownerDocument.body || typeof ownerDocument.createRange !== 'function') return fallback;
  const range = ownerDocument.createRange();
  if (typeof range.getClientRects !== 'function') return fallback;
  const host = ownerDocument.createElement('div');
  Object.assign(host.style, {
    position: 'fixed', left: '-100000px', top: '0', visibility: 'hidden', pointerEvents: 'none',
    padding: '0', border: '0', margin: '0', contain: 'layout style',
  });
  host.setAttribute('aria-hidden', 'true');
  ownerDocument.body.appendChild(host);
  const lines: TypographyMeasuredLine[] = [];
  try {
    for (const unit of typographyMeasurementUnits(input)) {
      const metrics = typographyTextMetrics(input, unit);
      const unitLines: TypographyMeasuredLine[] = [];
      const text = input.text.slice(unit.startOffset, unit.endOffset);
      // A unit range owns its joining newline, but that separator is not another
      // empty row in the unit. A separate empty unit still produces its own row.
      const body = unit.hasTrailingSeparator ? text.slice(0, -1) : text;
      const paragraphs = body.split('\n');
      let offset = unit.startOffset;
      for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
        const paragraph = paragraphs[paragraphIndex];
        const mirror = ownerDocument.createElement('div');
        Object.assign(mirror.style, typographyTextCssProperties(metrics), {
          boxSizing: 'content-box', width: `${metrics.textWidth}px`, minWidth: '0', minHeight: '0',
          padding: '0', margin: '0', border: '0', textAlign: 'start', textIndent: '0',
        });
        const node = ownerDocument.createTextNode(paragraph || '\u200b');
        mirror.appendChild(node);
        host.appendChild(mirror);
        const mirrorBox = mirror.getBoundingClientRect();
        if (mirrorBox.height === 0) return fallback;
        const paragraphLineStart = unitLines.length;
        let current: TypographyMeasuredLine | undefined;
        let currentLineIndex = -1;
        for (const segment of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(paragraph)) {
          range.setStart(node, segment.index);
          range.setEnd(node, segment.index + segment.segment.length);
          const rects = Array.from(range.getClientRects());
          const rect = rects.find((candidate) => candidate.height > 0) ?? rects[0];
          if (!rect) return fallback;
          // Fallback fonts (notably emoji) can have different glyph-box tops on
          // the same baseline. Group by the containing CSS line box instead.
          const lineIndex = Math.max(0, Math.floor(((rect.top + rect.bottom) / 2 - mirrorBox.top)
            / metrics.lineHeightPx));
          if (!current || lineIndex !== currentLineIndex) {
            current = {
              startOffset: offset + segment.index,
              endOffset: offset + segment.index + segment.segment.length,
              heightPx: metrics.lineHeightPx, lineHeightPx: metrics.lineHeightPx,
              widthPx: rect.width, indentLevel: metrics.indentLevel, writingRole: metrics.writingRole,
            };
            unitLines.push(current);
            currentLineIndex = lineIndex;
          } else {
            current.endOffset = offset + segment.index + segment.segment.length;
            current.widthPx = Math.max(current.widthPx, rect.right - mirrorBox.left);
          }
        }
        if (!current) {
          current = { startOffset: offset, endOffset: offset,
            heightPx: metrics.lineHeightPx, lineHeightPx: metrics.lineHeightPx, widthPx: 0,
            indentLevel: metrics.indentLevel, writingRole: metrics.writingRole };
          unitLines.push(current);
        }
        const measuredLineHeight = mirrorBox.height / (unitLines.length - paragraphLineStart);
        for (let index = paragraphLineStart; index < unitLines.length; index += 1) {
          unitLines[index].heightPx = measuredLineHeight;
          unitLines[index].lineHeightPx = measuredLineHeight;
        }
        offset += paragraph.length;
        if (paragraphIndex < paragraphs.length - 1 || unit.hasTrailingSeparator) {
          current.endOffset = ++offset;
        }
        host.removeChild(mirror);
      }
      lines.push(...finishTypographyUnitLines(unitLines, metrics));
    }
    return { ...fallback, lines, heightPx: lines.reduce((sum, line) => sum + line.heightPx, 0),
      verticalChromePx: TYPOGRAPHY_TEXT_BLOCK_VERTICAL_CHROME, source: 'dom' };
  } finally {
    host.remove();
  }
}

export interface TypographyDomLineMeasurer extends TypographyLineMeasurer {
  /** Bounded, derived-only cache. Font reload or renderer size changes invalidate it. */
  invalidate: () => void;
  dispose: () => void;
  evidence: () => readonly TypographyMeasurementEvidence[];
}

/**
 * One shared adapter supplies editor, Overview and print's common flow plan.
 * DOM results immediately replace the estimate; >0.5px or any changed line
 * boundary is recorded as a correction. No measured fragments are persisted.
 */
export function createTypographyDomLineMeasurer(
  ownerDocument: Document,
  onInvalidate?: () => void,
): TypographyDomLineMeasurer {
  const cache = new Map<string, TypographyLineMeasurement>();
  const evidence: TypographyMeasurementEvidence[] = [];
  const measure = ((input: TypographyLineMeasurementInput) => {
    const key = JSON.stringify({ text: input.text, width: input.width, typography: input.typography,
      startOffset: input.startOffset, indentLevel: input.indentLevel, writingRole: input.writingRole,
      units: input.units });
    const cached = cache.get(key);
    if (cached) return cached;
    const estimate = measureTypographyTextLines(input);
    const measured = measureTypographyTextLinesInDom(input, ownerDocument);
    if (measured.source === 'dom') {
      evidence.push(compareTypographyMeasurements(estimate, measured));
      if (evidence.length > 256) evidence.shift();
      cache.set(key, measured);
      if (cache.size > 256) cache.delete(cache.keys().next().value!);
    }
    return measured;
  }) as TypographyDomLineMeasurer;
  measure.invalidate = () => { cache.clear(); onInvalidate?.(); };
  measure.evidence = () => evidence;
  const fonts = ownerDocument.fonts;
  fonts?.addEventListener?.('loadingdone', measure.invalidate);
  measure.dispose = () => {
    fonts?.removeEventListener?.('loadingdone', measure.invalidate);
    cache.clear();
  };
  return measure;
}

