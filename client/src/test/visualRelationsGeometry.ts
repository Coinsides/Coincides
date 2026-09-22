import type { CanvasRect } from '../pages/Notes/canvasEngine/types';

export interface RelationBox { id: string; rect: CanvasRect }
export interface GeometryRelationPage { id: string; content: CanvasRect; blocks: RelationBox[]; slots: RelationBox[] }
export interface GeometryRelationViolation {
  relation: 'intersection' | 'horizontal-overflow'; pageId: string; blockId: string;
  slotId?: string; overlapX?: number; overlapY?: number; leftOverflow?: number; rightOverflow?: number;
}

/** No kind switch: all collected page citizens are compared with every slot. */
export function scanGeometryRelations(pages: readonly GeometryRelationPage[], epsilon = 1e-6) {
  const violations: GeometryRelationViolation[] = [];
  const headerClearances: Array<{ pageId: string; firstBlockId: string; slotId: string; gap: number }> = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      const leftOverflow = page.content.x - block.rect.x;
      const rightOverflow = block.rect.x + block.rect.width - page.content.x - page.content.width;
      if (leftOverflow > epsilon || rightOverflow > epsilon) violations.push({ relation: 'horizontal-overflow',
        pageId: page.id, blockId: block.id, leftOverflow: Math.max(0, leftOverflow), rightOverflow: Math.max(0, rightOverflow) });
      for (const slot of page.slots) {
        const overlapX = Math.min(block.rect.x + block.rect.width, slot.rect.x + slot.rect.width) - Math.max(block.rect.x, slot.rect.x);
        const overlapY = Math.min(block.rect.y + block.rect.height, slot.rect.y + slot.rect.height) - Math.max(block.rect.y, slot.rect.y);
        if (overlapX > epsilon && overlapY > epsilon) violations.push({ relation: 'intersection',
          pageId: page.id, blockId: block.id, slotId: slot.id, overlapX, overlapY });
      }
    }
    const first = [...page.blocks].sort((a, b) => a.rect.y - b.rect.y)[0];
    if (first) for (const slot of page.slots.filter((entry) => entry.id.startsWith('header-'))) {
      headerClearances.push({ pageId: page.id, firstBlockId: first.id, slotId: slot.id,
        gap: first.rect.y - slot.rect.y - slot.rect.height });
    }
  }
  return { violations, headerClearances, pageCount: pages.length,
    blockCount: pages.reduce((sum, page) => sum + page.blocks.length, 0),
    slotCount: pages.reduce((sum, page) => sum + page.slots.length, 0) };
}

/** jsdom has no layout engine. Read the finite pixel boxes emitted by the real
 * renderer, never its zero getBoundingClientRect(), and apply its display scale.
 * This verifies projection geometry, not font rasterization or intrinsic overflow. */
export function readProjectedBox(element: HTMLElement, scale = 1): CanvasRect {
  const style = getComputedStyle(element);
  const values = ['left', 'top', 'width', 'height'].map((key) => {
    const value = style.getPropertyValue(key);
    if (!/^-?(?:\d*\.)?\d+px$/.test(value)) throw new Error(`Unmeasured ${key} on ${element.outerHTML.slice(0, 180)}: ${value}`);
    return Number.parseFloat(value) * scale;
  });
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

/** Selectors are renderer identity contracts, not a duplicated block-kind list. */
export function collectProjectedPage(root: HTMLElement, id: string, content: CanvasRect, scale = 1): GeometryRelationPage {
  return { id, content: { x: content.x * scale, y: content.y * scale, width: content.width * scale, height: content.height * scale },
    blocks: Array.from(root.querySelectorAll<HTMLElement>('[data-note-readonly-fragment]')).map((node) => {
      const rect = readProjectedBox(node, scale);
      const shell = node.querySelector<HTMLElement>('[data-note-block-shell]');
      if (!shell) throw new Error(`Missing block shell for ${node.dataset.blockId}`);
      // A manual projection can clip to the page before rendering. Preserve its
      // actual horizontal shell edges so clipping cannot conceal a wall violation.
      const shellStyle = getComputedStyle(shell);
      for (const key of ['left', 'width']) if (!/^-?(?:\d*\.)?\d+px$/.test(shellStyle.getPropertyValue(key))) {
        throw new Error(`Unmeasured block shell ${key}: ${node.dataset.blockId}`);
      }
      return { id: node.dataset.blockId!, rect: { ...rect,
        x: rect.x + Number.parseFloat(shellStyle.left) * scale,
        width: Number.parseFloat(shellStyle.width) * scale } };
    }),
    slots: Array.from(root.querySelectorAll<HTMLElement>('[data-page-frame-slot]')).map((node) => ({
      id: node.dataset.pageFrameSlotPosition || node.dataset.pageFrameSlot!, rect: readProjectedBox(node, scale) })) };
}
