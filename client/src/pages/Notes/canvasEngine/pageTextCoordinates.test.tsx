import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextBlockProjection } from './blocks/TextBlockProjection';
import { getPageDisplayScale, getSlashMenuAnchor } from './overlayService';
import { SLASH_MENU_OFFSET } from './runtimeLayout';
import type { AnnotationRangeV1, TextBlockContentV1 } from './runtimeDataTypes';

afterEach(() => vi.restoreAllMocks());

const PHYSICAL_SCALE = (210 / 25.4 * 96) / 904;
const PAGE_SCALES = [0.5, 1.5, PHYSICAL_SCALE];

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return new DOMRect(left, top, width, height);
}

describe('page text input coordinate boundaries', () => {
  it.each(PAGE_SCALES)('projects a scrolled caret into the viewport at page scale %s', (scale) => {
    const { container } = render(<div data-page-display-scale={scale}><textarea defaultValue="abc/" /></div>);
    const textarea = container.querySelector('textarea')!;
    Object.defineProperties(textarea, {
      offsetWidth: { value: 200 },
      offsetHeight: { value: 100 },
    });
    textarea.scrollLeft = 6;
    textarea.scrollTop = 7;
    let mirrorWidth = '';
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this === textarea) return rect(100, 100, 200 * scale, 100 * scale);
      if (this.style.left === '-10000px') {
        mirrorWidth = this.style.width;
        return rect(-10000, 0, 200, 100);
      }
      if (this.tagName === 'SPAN' && this.parentElement?.style.left === '-10000px') {
        return rect(-9960, 30, 0, 20);
      }
      return rect(0, 0, 0, 0);
    });

    const anchor = getSlashMenuAnchor(textarea, container, 4);

    expect(anchor?.x).toBe(100 + 34 * scale);
    expect(anchor?.y).toBe(100 + 43 * scale + SLASH_MENU_OFFSET);
    expect(mirrorWidth).toBe('200px');
    expect(textarea.offsetWidth).toBe(200);
  });

  it('preserves the existing caret projection outside the page presentation scope', () => {
    const { container } = render(<div style={{ transform: 'scale(0.5)' }}><textarea defaultValue="abc/" /></div>);
    const textarea = container.querySelector('textarea')!;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this === textarea) return rect(100, 100, 100, 50);
      if (this.style.left === '-10000px') return rect(-10000, 0, 200, 100);
      if (this.tagName === 'SPAN' && this.parentElement?.style.left === '-10000px') {
        return rect(-9960, 30, 0, 20);
      }
      return rect(0, 0, 0, 0);
    });

    expect(getPageDisplayScale(textarea)).toBe(1);
    expect(getSlashMenuAnchor(textarea, container, 4)).toEqual({ x: 140, y: 150 + SLASH_MENU_OFFSET });
  });

  const textFlow: TextBlockContentV1 = {
    textflow_version: 'TextBlockContentV1',
    units: [{
      id: 'unit-page', text: 'abcdefghijkl', writing_role: 'paragraph', indent_level: 0,
      order_index: 0, metadata: {}, status: 'active',
    }],
    inline_structures: [],
    metadata: {},
  };
  const draftRanges: AnnotationRangeV1[] = [
    { id: 'first', target_kind: 'text_span', block_id: 'block-page', text_unit_id: 'unit-page', start_offset: 0, end_offset: 1 },
    { id: 'second', target_kind: 'text_span', block_id: 'block-page', text_unit_id: 'unit-page', start_offset: 6, end_offset: 7 },
  ];

  it.each([...PAGE_SCALES, undefined])('hits the same text range at page scale %s (undefined is the canvas baseline)', (scale) => {
    const onTextUnitContextMenu = vi.fn();
    const { container } = render(
      <div data-page-display-scale={scale}>
        <TextBlockProjection
          blockId="block-page"
          readOnly={false}
          text="abcdefghijkl"
          textFlow={textFlow}
          presentationKind="paragraph"
          annotations={[]}
          draftAnnotationRanges={draftRanges}
          selectedAnnotationIds={[]}
          showLabelOverlay={false}
          textareaRef={null}
          onFocused={vi.fn()}
          onAnnotationSelect={vi.fn()}
          onAnnotationContextMenu={vi.fn()}
          onTextUnitSelection={vi.fn()}
          onTextUnitContextMenu={onTextUnitContextMenu}
          onTextChange={vi.fn()}
          onTextFlowChange={vi.fn()}
          onSave={vi.fn()}
          onKeyDown={vi.fn()}
        />
      </div>,
    );
    const textarea = container.querySelector('textarea')!;
    const presentationScale = scale ?? 1;
    Object.defineProperty(textarea, 'clientWidth', { value: 200 });
    textarea.setSelectionRange(0, 0);
    textarea.scrollLeft = 6;
    textarea.scrollTop = 3;
    let mirrorWidth = '';
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this === textarea) return rect(100, 100, 200 * presentationScale, 100 * presentationScale);
      if (this.style.left === '-10000px') {
        mirrorWidth = this.style.width;
        return rect(-10000, 0, 200, 100);
      }
      if (this.dataset.offset !== undefined) return rect(-10000 + Number(this.dataset.offset) * 10, 0, 10, 20);
      return rect(0, 0, 0, 0);
    });
    const point = { x: 100 + (65 - 6) * presentationScale, y: 100 + (10 - 3) * presentationScale };

    fireEvent.contextMenu(textarea, { clientX: point.x, clientY: point.y });

    expect(onTextUnitContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ blockId: 'block-page', textUnitId: 'unit-page', startOffset: 6, endOffset: 7 }),
      expect.anything(),
      point,
    );
    expect(mirrorWidth).toBe('200px');
    expect(textarea.clientWidth).toBe(200);
  });
});
