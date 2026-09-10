/// <reference lib="es2022.intl" />
import { getPageDisplayScale } from './overlayService';
import { expandGraphemeRange, previousGraphemeOffset, snapGraphemeOffset } from '../../../../../shared/graphemes';

interface CaretPoint { x: number; y: number; height: number }
export interface TextareaSelectionRect { left: number; top: number; width: number; height: number }
interface TextareaLayout {
  selectionRects: (start: number, end: number) => TextareaSelectionRect[];
  localPoint: (point: CaretPoint) => TextareaSelectionRect;
  pointerY: (clientY: number) => number;
  clip: (rect: TextareaSelectionRect) => TextareaSelectionRect | null;
  breakWidth: number;
}
interface BoundaryCaret {
  offset: number;
  y: number;
  nativeLineEndFrom?: number;
  nativeColumnSeed?: { offset: number; steps: number; direction: 'forward' | 'backward' };
}

// Keep the complete text in one node: splitting it into spans changes wrapping,
// ligatures and kerning. The browser lays out this inert mirror, not a character
// count approximation. Offsets remain textarea UTF-16 offsets.
function withTextareaLayout<T>(
  textarea: HTMLTextAreaElement,
  read: (point: (offset: number, upstream?: boolean) => CaretPoint | null, layout: TextareaLayout) => T | null,
): T | null {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  for (const property of [
    'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
    'font-stretch', 'font-kerning', 'font-feature-settings', 'font-variation-settings',
    'letter-spacing', 'word-spacing', 'line-height', 'text-transform', 'text-indent',
    'text-align', 'direction', 'tab-size', 'padding', 'word-break',
  ]) mirror.style.setProperty(property, computed.getPropertyValue(property));
  Object.assign(mirror.style, {
    position: 'fixed', visibility: 'hidden', pointerEvents: 'none',
    left: '0', top: '0', margin: '0', border: '0',
    boxSizing: 'border-box', width: `${textarea.clientWidth}px`,
    whiteSpace: textarea.wrap === 'off' ? 'pre' : 'pre-wrap', overflowWrap: 'break-word',
  });
  mirror.setAttribute('aria-hidden', 'true');
  const text = document.createTextNode(textarea.value);
  mirror.append(text, document.createTextNode('\u200b'));
  document.body.appendChild(mirror);
  const range = document.createRange();
  try {
    if (typeof range.getClientRects !== 'function') return null;
    const mirrorRect = mirror.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    const scale = getPageDisplayScale(textarea);
    const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
    const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
    const point = (offset: number, upstream = false): CaretPoint | null => {
      offset = snapGraphemeOffset(textarea.value, offset);
      const previousCharacter = upstream && offset > 0 && textarea.value[offset - 1] !== '\n';
      if (previousCharacter) {
        range.setStart(text, previousGraphemeOffset(textarea.value, offset));
        range.setEnd(text, offset);
      } else if (offset === textarea.value.length) {
        range.setStart(mirror.lastChild!, 0);
        range.collapse(true);
      } else {
        range.setStart(text, offset);
        range.collapse(true);
      }
      const rects = range.getClientRects();
      const rect = rects[rects.length - 1];
      if (!rect || rect.height === 0) return null;
      return {
        x: textareaRect.left + (borderLeft + (previousCharacter ? rect.right : rect.left) - mirrorRect.left - textarea.scrollLeft) * scale,
        y: rect.top - mirrorRect.top,
        height: rect.height,
      };
    };
    return read(point, {
      selectionRects: (start, end) => {
        range.setStart(text, start);
        range.setEnd(text, end);
        return [...range.getClientRects()].map((rect) => ({
          left: borderLeft + rect.left - mirrorRect.left - textarea.scrollLeft,
          top: borderTop + rect.top - mirrorRect.top - textarea.scrollTop,
          width: rect.width,
          height: rect.height,
        }));
      },
      localPoint: (caret) => ({
        left: (caret.x - textareaRect.left) / scale,
        top: borderTop + caret.y - textarea.scrollTop,
        width: 0,
        height: caret.height,
      }),
      pointerY: (clientY) => (clientY - textareaRect.top) / scale + textarea.scrollTop - borderTop,
      clip: (rect) => {
        const left = Math.max(borderLeft, rect.left);
        const top = Math.max(borderTop, rect.top);
        const right = Math.min(borderLeft + textarea.clientWidth, rect.left + rect.width);
        const bottom = Math.min(borderTop + textarea.clientHeight, rect.top + rect.height);
        return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
      },
      breakWidth: Math.max(3, (Number.parseFloat(computed.fontSize) || 16) * 0.4),
    });
  } finally {
    mirror.remove();
  }
}

/** Unscaled CSS rectangles relative to the textarea border box, clipped to its viewport. */
export function measureTextareaSelection(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number,
  includeBreak = false,
): TextareaSelectionRect[] {
  const { start: low, end: high } = expandGraphemeRange(textarea.value, Math.min(start, end), Math.max(start, end));
  if (low === high && !includeBreak) return [];
  return withTextareaLayout(textarea, (point, layout) => {
    const rectangles = low < high ? layout.selectionRects(low, high).filter((rect) => rect.width > 0) : [];
    const addBreak = (offset: number) => {
      const caret = point(offset);
      if (caret) rectangles.push({ ...layout.localPoint(caret), width: layout.breakWidth });
    };
    // Range rectangles have zero width for explicit line breaks. Keep these and
    // the selected inter-unit separator visible, including an empty TextUnit.
    for (let index = low; index < high; index += 1) {
      if (textarea.value[index] === '\n') addBreak(index);
    }
    if (includeBreak) addBreak(textarea.value.length);
    return rectangles.map(layout.clip).filter((rect): rect is TextareaSelectionRect => rect !== null);
  }) || [];
}

function graphemeCarets(
  value: string,
  point: (offset: number, upstream?: boolean) => CaretPoint | null,
): (CaretPoint & { offset: number })[] {
  const offsets = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)]
    .map((segment) => segment.index);
  offsets.push(value.length);
  return offsets.flatMap((offset) => {
    const caret = point(offset);
    if (!caret) return [];
    const upstream = point(offset, true);
    return upstream && Math.abs(upstream.y - caret.y) >= 1
      ? [{ ...caret, offset }, { ...upstream, offset }]
      : [{ ...caret, offset }];
  });
}

/** The click is in viewport coordinates; the result uses the B5 caret affinity. */
export function textareaCaretAtPoint(textarea: HTMLTextAreaElement, clientX: number, clientY: number): BoundaryCaret | null {
  return withTextareaLayout(textarea, (point, layout) => {
    const candidates = graphemeCarets(textarea.value, point);
    const targetY = layout.pointerY(clientY);
    let closest: (CaretPoint & { offset: number }) | null = null;
    for (const candidate of candidates) {
      const rowDistance = Math.abs(candidate.y + candidate.height / 2 - targetY);
      const bestRowDistance = closest ? Math.abs(closest.y + closest.height / 2 - targetY) : Infinity;
      if (rowDistance < bestRowDistance - 0.1
        || (Math.abs(rowDistance - bestRowDistance) < 0.1 && closest
          && Math.abs(candidate.x - clientX) < Math.abs(closest.x - clientX))) closest = candidate;
    }
    return closest ? { offset: closest.offset, y: closest.y } : null;
  });
}

/** Used only while a flow selection owns the caret; ordinary B5 arrows stay native. */
export function textareaLineCaret(
  textarea: HTMLTextAreaElement,
  offset: number,
  direction: 'up' | 'down',
  targetX: number,
  preferredY?: number,
): BoundaryCaret | null {
  return withTextareaLayout(textarea, (point) => {
    let current = point(offset);
    const upstream = point(offset, true);
    if (current && upstream && preferredY !== undefined
      && Math.abs(upstream.y - preferredY) < Math.abs(current.y - preferredY)) current = upstream;
    if (!current) return null;
    const sign = direction === 'down' ? 1 : -1;
    const candidates = graphemeCarets(textarea.value, point)
      .filter((candidate) => (candidate.y - current.y) * sign >= 1);
    const nearestRow = candidates.reduce((distance, candidate) => Math.min(distance, Math.abs(candidate.y - current.y)), Infinity);
    let closest: (CaretPoint & { offset: number }) | null = null;
    for (const candidate of candidates) {
      if (Math.abs(Math.abs(candidate.y - current.y) - nearestRow) >= 1) continue;
      if (!closest || Math.abs(candidate.x - targetX) < Math.abs(closest.x - targetX)) closest = candidate;
    }
    return closest ? { offset: closest.offset, y: closest.y } : null;
  });
}

export function measureTextareaNavigation(textarea: HTMLTextAreaElement, offset: number, preferredY?: number) {
  return withTextareaLayout(textarea, (point) => {
    let caret = point(offset);
    const upstream = point(offset, true);
    // A soft wrap has two visual carets at one UTF-16 offset. Native End and
    // vertical motion supply the line affinity; never mistake End for next Home.
    if (caret && upstream && preferredY !== undefined
      && Math.abs(upstream.y - preferredY) < Math.abs(caret.y - preferredY)) caret = upstream;
    const first = point(0);
    const last = point(textarea.value.length);
    if (!caret || !first || !last) return null;
    return {
      x: caret.x,
      y: caret.y,
      lineHeight: Number.parseFloat(window.getComputedStyle(textarea).lineHeight)
        || Number.parseFloat(window.getComputedStyle(textarea).fontSize) * 1.2,
      atFirstLine: Math.abs(caret.y - first.y) < 1,
      atLastLine: Math.abs(caret.y - last.y) < 1,
    };
  });
}

export function textareaBoundaryCaret(
  textarea: HTMLTextAreaElement,
  edge: 'first' | 'last',
  targetX: number,
): BoundaryCaret | null {
  return withTextareaLayout(textarea, (point) => {
    const boundary = point(edge === 'first' ? 0 : textarea.value.length);
    if (!boundary) return null;
    const offsets = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(textarea.value)]
      .map((segment) => segment.index);
    offsets.push(textarea.value.length);
    if (edge === 'last') offsets.reverse();
    let closest: BoundaryCaret = { offset: offsets[0], y: boundary.y };
    let distance = Infinity;
    for (const [index, offset] of offsets.entries()) {
      let caret = point(offset);
      if (!caret) return null;
      let nativeLineEndFrom: number | undefined;
      if (Math.abs(caret.y - boundary.y) >= 1) {
        const upstream = edge === 'first' ? point(offset, true) : null;
        if (!upstream || Math.abs(upstream.y - boundary.y) >= 1) break;
        caret = upstream;
        nativeLineEndFrom = offsets[index - 1];
      }
      const nextDistance = Math.abs(caret.x - targetX);
      if (nextDistance < distance) {
        closest = { offset, y: boundary.y, nativeLineEndFrom };
        distance = nextDistance;
      }
      if (nativeLineEndFrom !== undefined) break;
    }
    // A short boundary line must not reset the browser's own vertical column.
    // Seed that column on a wider line, then move natively to the boundary as
    // part of this one cross-unit step. Subsequent in-unit arrows stay native.
    if (distance < 0.1) return closest;
    let seed: { offset: number; y: number } | null = null;
    const rows = new Set<number>();
    for (const offset of offsets) {
      const caret = point(offset);
      if (!caret) return null;
      rows.add(caret.y);
      const nextDistance = Math.abs(caret.x - targetX);
      if (nextDistance + 0.1 < distance) {
        seed = { offset, y: caret.y };
        distance = nextDistance;
      }
    }
    if (seed && Math.abs(seed.y - boundary.y) >= 1) {
      const orderedRows = [...rows].sort((a, b) => a - b);
      closest.nativeColumnSeed = {
        offset: seed.offset,
        steps: Math.abs(orderedRows.indexOf(seed.y) - orderedRows.indexOf(boundary.y)),
        direction: edge === 'first' ? 'backward' : 'forward',
      };
    }
    return closest;
  });
}
