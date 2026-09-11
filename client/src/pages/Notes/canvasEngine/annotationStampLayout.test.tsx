// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { annotationStampTextRects, layoutAnnotationStamps } from './annotationStampLayout';
import { measureTextareaSelection } from './textareaNavigation';
import type { StampRect } from './annotationStampPlacement';

vi.mock('./textareaNavigation', () => ({ measureTextareaSelection: vi.fn() }));

let textGeometry: WeakMap<Node, DOMRect[]>;
let textareaGeometry: WeakMap<HTMLTextAreaElement, StampRect[]>;
const originalRangeRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');

function rect(left: number, top: number, width: number, height: number) {
  return new DOMRect(left, top, width, height);
}

function setBox(element: HTMLElement, measured: DOMRect, scale = 1) {
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => measured);
  Object.defineProperties(element, {
    offsetWidth: { configurable: true, value: measured.width / scale },
    offsetHeight: { configurable: true, value: measured.height / scale },
  });
}

function surface(measured = rect(0, 0, 300, 300)) {
  const scope = document.createElement('div');
  scope.dataset.annotationStampScope = 'test';
  setBox(scope, measured);
  document.body.append(scope);
  return scope;
}

function row(scope: HTMLElement, measured = rect(0, 0, 300, 300), scale = 1) {
  const element = document.createElement('div');
  element.dataset.textUnitRow = 'true';
  setBox(element, measured, scale);
  scope.append(element);
  return element;
}

function bodyText(parent: HTMLElement, fragments: DOMRect[], text = 'Body characters') {
  const span = document.createElement('span');
  const node = document.createTextNode(text);
  span.append(node);
  textGeometry.set(node, fragments);
  parent.append(span);
  return span;
}

function highlight(parent: HTMLElement, id: string, fragments: DOMRect[]) {
  const mark = document.createElement('mark');
  mark.dataset.annotationHighlightIds = JSON.stringify([id]);
  mark.append(document.createTextNode('Highlighted body characters'));
  textGeometry.set(mark.firstChild!, fragments);
  vi.spyOn(mark, 'getClientRects').mockImplementation(() => fragments as unknown as DOMRectList);
  parent.append(mark);
  return mark;
}

function stamp(parent: HTMLElement, id = 'annotation-1', scale = 1) {
  const button = document.createElement('button');
  button.dataset.annotationStamp = id;
  button.dataset.annotationStampKind = 'text';
  button.textContent = 'LABEL';
  Object.defineProperty(button, 'offsetParent', { configurable: true, value: parent });
  // jsdom does not perform CSS layout. Native measurement is the sole mock:
  // apply the production CSS position variables to the containing block rect.
  vi.spyOn(button, 'getBoundingClientRect').mockImplementation(() => {
    const parentRect = parent.getBoundingClientRect();
    const left = Number.parseFloat(button.style.getPropertyValue('--annotation-badge-left')) || 0;
    const top = Number.parseFloat(button.style.getPropertyValue('--annotation-badge-top')) || 0;
    return rect(parentRect.left + (left + parent.clientLeft - parent.scrollLeft) * scale,
      parentRect.top + (top + parent.clientTop - parent.scrollTop) * scale, 30 * scale, 10 * scale);
  });
  parent.append(button);
  return button;
}

function frame(scope: HTMLElement, measured: DOMRect, index = '0') {
  const element = document.createElement('div');
  element.dataset.pageFrameIndex = index;
  setBox(element, measured);
  scope.append(element);
  return element;
}

function expectPosition(button: HTMLElement, side: string, left: number, top: number, scale = 1) {
  expect(button.dataset.stampLayout).toBe('placed');
  expect(button.dataset.stampSide).toBe(side);
  const measured = button.getBoundingClientRect();
  expect({ left: measured.left, top: measured.top, width: measured.width, height: measured.height })
    .toEqual({ left, top, width: 30 * scale, height: 10 * scale });
}

function positiveIntersection(a: StampRect, b: StampRect) {
  return Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
}

beforeEach(() => {
  textGeometry = new WeakMap();
  textareaGeometry = new WeakMap();
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: function getClientRects(this: Range) {
      return textGeometry.get(this.startContainer) || [];
    },
  });
  vi.mocked(measureTextareaSelection).mockImplementation((textarea) => textareaGeometry.get(textarea) || []);
});

afterEach(() => {
  document.body.replaceChildren();
  if (originalRangeRects) Object.defineProperty(Range.prototype, 'getClientRects', originalRangeRects);
  else Reflect.deleteProperty(Range.prototype, 'getClientRects');
  vi.restoreAllMocks();
  vi.mocked(measureTextareaSelection).mockReset();
});

describe('annotation stamp DOM layout', () => {
  it('unions all wrapped and disjoint painted segments before choosing a direction', () => {
    const scope = surface();
    const unit = row(scope);
    highlight(unit, 'multi', [rect(80, 80, 40, 10), rect(60, 100, 50, 10)]);
    highlight(unit, 'multi', [rect(140, 120, 10, 10)]);
    bodyText(scope, [rect(0, 0, 300, 80)]);
    const button = stamp(unit, 'multi');

    layoutAnnotationStamps(scope);

    // Whole union is x=60..150, y=80..130, so bottom follows the final segment.
    expectPosition(button, 'bottom', 61, 133);
    expect(button.getBoundingClientRect().top).toBeGreaterThan(130);
  });

  it('positions the same annotation independently in different text units', () => {
    const scope = surface();
    const firstUnit = row(scope);
    const secondUnit = row(scope);
    highlight(firstUnit, 'shared', [rect(80, 80, 40, 20)]);
    highlight(secondUnit, 'shared', [rect(180, 160, 40, 20)]);
    const first = stamp(firstUnit, 'shared');
    const second = stamp(secondUnit, 'shared');

    layoutAnnotationStamps(scope);

    expectPosition(first, 'top', 81, 67);
    expectPosition(second, 'top', 181, 147);
  });

  it('coordinates adjacent blocks and proves zero text and peer DOM overlap', () => {
    const scope = surface();
    const firstUnit = row(scope);
    const secondUnit = row(scope);
    highlight(firstUnit, 'first', [rect(100, 100, 20, 20)]);
    highlight(secondUnit, 'second', [rect(122, 100, 20, 20)]);
    bodyText(scope, [rect(0, 130, 200, 15)], 'Unannotated body line');
    const first = stamp(firstUnit, 'first');
    const second = stamp(secondUnit, 'second');

    layoutAnnotationStamps(scope);

    expectPosition(first, 'top', 101, 87);
    expectPosition(second, 'top', 133, 87);
    const bodyRects = annotationStampTextRects(scope);
    const stampRects = [first.getBoundingClientRect(), second.getBoundingClientRect()];
    expect(bodyRects).toHaveLength(3);
    const textOverlaps = stampRects.flatMap((badge) => bodyRects.map((glyph) => positiveIntersection(badge, glyph)));
    expect(textOverlaps).toEqual([0, 0, 0, 0, 0, 0]);
    expect(positiveIntersection(stampRects[0], stampRects[1])).toBe(0);
    // Selected child outlines also remain disjoint and clear of body text.
    const outlines = stampRects.map((badge) => ({
      left: badge.left - 1, top: badge.top - 1, width: badge.width + 2, height: badge.height + 2,
    }));
    expect(positiveIntersection(outlines[0], outlines[1])).toBe(0);
    expect(outlines.flatMap((outline) => bodyRects.map((glyph) => positiveIntersection(outline, glyph))))
      .toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('protects an unannotated textarea line when placing a nearby stamp', () => {
    const scope = surface();
    const unit = row(scope);
    highlight(unit, 'near-input', [rect(80, 80, 40, 20)]);
    const textarea = document.createElement('textarea');
    textarea.value = 'An unannotated preceding line';
    setBox(textarea, rect(0, 60, 300, 20));
    textareaGeometry.set(textarea, [{ left: 0, top: 0, width: 300, height: 20 }]);
    scope.append(textarea);
    const button = stamp(unit, 'near-input');

    layoutAnnotationStamps(scope);

    expectPosition(button, 'bottom', 81, 103);
    expect(measureTextareaSelection).toHaveBeenCalledWith(textarea, 0, textarea.value.length);
    expect(annotationStampTextRects(scope).map((body) => positiveIntersection(button.getBoundingClientRect(), body)))
      .toEqual([0, 0]);
  });

  it('converts textarea local fragments into scaled view-space obstacles', () => {
    const scope = surface();
    const textarea = document.createElement('textarea');
    textarea.value = 'Scaled body';
    setBox(textarea, rect(40, 60, 200, 80), 2);
    textareaGeometry.set(textarea, [{ left: 3, top: 4, width: 50, height: 10 }]);
    scope.append(textarea);

    expect(annotationStampTextRects(scope)).toEqual([{ left: 46, top: 68, width: 100, height: 20 }]);
  });

  it('uses the containing physical page frame at the second page top', () => {
    const scope = surface(rect(0, 0, 200, 420));
    frame(scope, rect(0, 0, 200, 200));
    frame(scope, rect(0, 220, 200, 200), '1');
    const unit = row(scope);
    highlight(unit, 'page-two', [rect(80, 220, 40, 20)]);
    const button = stamp(unit, 'page-two');

    layoutAnnotationStamps(scope);

    expectPosition(button, 'bottom', 81, 243);
    expect(button.getBoundingClientRect().top).toBeGreaterThanOrEqual(220);
  });

  it('keeps the entire badge and outline inside the physical page edge', () => {
    const scope = surface();
    frame(scope, rect(0, 0, 200, 200));
    const unit = row(scope);
    highlight(unit, 'edge', [rect(185, 80, 15, 20)]);
    const button = stamp(unit, 'edge');

    layoutAnnotationStamps(scope);

    expectPosition(button, 'top', 169, 67);
    expect(button.getBoundingClientRect().right + 1).toBe(200);
  });

  it('converts placement back to a scaled and bordered containing block', () => {
    const scope = surface();
    const unit = row(scope, rect(40, 50, 200, 300), 2);
    Object.defineProperties(unit, {
      clientLeft: { configurable: true, value: 3 },
      clientTop: { configurable: true, value: 4 },
    });
    highlight(unit, 'scaled', [rect(100, 130, 60, 20)]);
    const button = stamp(unit, 'scaled', 2);

    layoutAnnotationStamps(scope);

    expectPosition(button, 'top', 102, 104, 2);
    expect(button.style.getPropertyValue('--annotation-badge-left')).toBe('28px');
    expect(button.style.getPropertyValue('--annotation-badge-top')).toBe('23px');
  });

  it('compensates both scroll axes of the scaled stamp containing block', () => {
    const scope = surface();
    const unit = row(scope, rect(40, 50, 200, 300), 2);
    Object.defineProperties(unit, {
      clientLeft: { configurable: true, value: 3 },
      clientTop: { configurable: true, value: 4 },
    });
    unit.scrollLeft = 7;
    unit.scrollTop = 11;
    highlight(unit, 'scrolled', [rect(100, 130, 60, 20)]);
    const button = stamp(unit, 'scrolled', 2);

    layoutAnnotationStamps(scope);

    expectPosition(button, 'top', 102, 104, 2);
    expect(button.style.getPropertyValue('--annotation-badge-left')).toBe('35px');
    expect(button.style.getPropertyValue('--annotation-badge-top')).toBe('34px');
  });

  it('matches the hidden selector after all adjacent whitespace becomes occupied', () => {
    const scope = surface();
    const unit = row(scope);
    highlight(unit, 'dense', [rect(80, 80, 40, 20)]);
    const button = stamp(unit, 'dense');
    layoutAnnotationStamps(scope);
    expectPosition(button, 'top', 81, 67);
    bodyText(scope, [rect(0, 0, 300, 300)]);

    layoutAnnotationStamps(scope);

    expect(button.dataset.stampLayout).toBe('no-space');
    expect(button.dataset.stampSide).toBeUndefined();
    expect(button.matches('[data-annotation-stamp]:not([data-stamp-side])')).toBe(true);
  });

  it('matches the hidden selector with no currently painted range instead of using stale offsets', () => {
    const scope = surface();
    const unit = row(scope);
    const button = stamp(unit, 'missing');

    layoutAnnotationStamps(scope);

    expect(button.dataset.stampLayout).toBe('unmeasured');
    expect(button.matches('[data-annotation-stamp]:not([data-stamp-side])')).toBe(true);
  });

  it('uses a block content box when the block has no body text fragments', () => {
    const scope = surface();
    const shell = row(scope);
    const content = document.createElement('div');
    content.dataset.annotationStampBlockContent = 'true';
    setBox(content, rect(80, 80, 100, 60));
    shell.append(content);
    const button = stamp(shell, 'block');
    button.dataset.annotationStampKind = 'block';

    layoutAnnotationStamps(scope);

    expectPosition(button, 'top', 81, 67);
  });

  it('uses the union of actual body lines for a text-bearing block stamp', () => {
    const scope = surface();
    const shell = row(scope);
    const content = document.createElement('div');
    content.dataset.annotationStampBlockContent = 'true';
    setBox(content, rect(80, 80, 100, 100));
    bodyText(content, [rect(95, 100, 40, 20), rect(85, 125, 70, 20)]);
    shell.append(content);
    const button = stamp(shell, 'block');
    button.dataset.annotationStampKind = 'block';

    layoutAnnotationStamps(scope);

    expectPosition(button, 'top', 86, 87);
  });
});
