import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import { BOARD_PATH, detail, resetSample, seedEdge, seedLayer, seedMember, seedVisual, writes } from '../../../scripts/boardToolsSmoke/mockApi';
import type { BoardMember, BoardVisual } from './boardTypes';

// Real BoardPage/useBoard/history, with the shared synthetic in-memory transport.
vi.mock('@/services/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/api')>(),
  default: (await import('../../../scripts/boardToolsSmoke/mockApi')).default,
}));
const noop = () => undefined;
type Modifiers = Pick<PointerEventInit, 'ctrlKey' | 'shiftKey' | 'altKey'>;
function openBoard() {
  return render(<MemoryRouter initialEntries={[BOARD_PATH]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/boards/:boardId" element={<BoardPage />} /></Routes>
  </MemoryRouter>);
}
const surface = () => screen.getByTestId('board-surface');
const saved = () => waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
function pointer(target: Element, phase: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number, modifiers: Modifiers = {}) {
  fireEvent[phase](target, { pointerId: 1, button: 0, buttons: phase === 'pointerUp' ? 0 : 1, clientX: x, clientY: y, ...modifiers });
}
function marquee(x: number, y: number, right: number, bottom: number, modifiers: Modifiers = {}) {
  pointer(surface(), 'pointerDown', x, y, modifiers);
  pointer(surface(), 'pointerMove', right, bottom, modifiers);
  pointer(surface(), 'pointerUp', right, bottom, modifiers);
}
function boardObject(object: BoardMember | BoardVisual) {
  return screen.getByTestId(`board-${'member_kind' in object ? 'member' : 'visual'}-${object.id}`);
}
async function select(object: BoardMember | BoardVisual, modifiers: Modifiers = {}) {
  const node = boardObject(object);
  const hit = 'visual_kind' in object && object.visual_kind === 'freehand' ? within(node).getByRole('button') : node;
  pointer(hit, 'pointerDown', object.x + 5, object.y + 1, modifiers);
  pointer(surface(), 'pointerUp', object.x + 5, object.y + 1, modifiers);
  await act(async () => undefined);
}
function selected(count: number) {
  if (!count) expect(screen.queryByRole('toolbar', { name: 'Selected projection controls' })).toBeNull();
  else expect(within(screen.getByRole('toolbar', { name: 'Selected projection controls' })).getByText(`${count} selected`)).toBeTruthy();
}
async function selectionList() {
  if (!screen.queryByRole('complementary', { name: 'Selection list' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Selection list' }));
  }
  return screen.findByRole('complementary', { name: 'Selection list' });
}
function row(panel: HTMLElement, key: string) {
  const result = panel.querySelector<HTMLElement>(`[data-selection-key="${key}"]`);
  expect(result).toBeTruthy();
  return result!;
}
function selectionKeys(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll('[data-selection-key]'), (entry) => entry.getAttribute('data-selection-key')).sort();
}
function hasSelectedStyle(object: BoardMember | BoardVisual) {
  const node = boardObject(object);
  const painted = 'visual_kind' in object && object.visual_kind === 'freehand' ? node.querySelector('path')! : node;
  return /selected/.test(painted.getAttribute('class') || '');
}
async function history(redo = false) {
  fireEvent.keyDown(surface(), { key: 'z', ctrlKey: true, shiftKey: redo });
  await act(async () => undefined);
  await saved();
}
function twoAreas() {
  return [
    seedMember('Upper card', { x: 80, y: 80 }),
    seedVisual({ visual_kind: 'sticky', x: 90, y: 240, data: { text: 'Upper chalk' } }),
    seedMember('Lower card', { x: 650, y: 470 }),
    seedVisual({ x: 660, y: 630 }),
  ];
}

beforeEach(() => {
  resetSample();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId || 0; }
  });
  for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) {
    Object.defineProperties(prototype, {
      setPointerCapture: { configurable: true, value: noop },
      releasePointerCapture: { configurable: true, value: noop },
      hasPointerCapture: { configurable: true, value: () => false },
    });
  }
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } },
  });
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) {
    for (const property of ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture']) Reflect.deleteProperty(prototype, property);
  }
});

describe('V13.4 walk-through fix 4 selection workflows', () => {
  it('① accumulates two Ctrl marquees, drags all four objects in one history step and moves the same selection to a layer', async () => {
    const objects = twoAreas();
    const outside = seedMember('Between the two areas', { x: 380, y: 330 });
    const destination = seedLayer('Collected');
    const original = objects.map(({ x, y }) => ({ x, y }));
    openBoard(); await screen.findByTestId(`board-member-${objects[0].id}`);
    marquee(40, 40, 280, 290, { ctrlKey: true }); selected(2);
    pointer(surface(), 'pointerDown', 600, 440, { ctrlKey: true }); selected(2);
    pointer(surface(), 'pointerMove', 850, 690, { ctrlKey: true });
    pointer(surface(), 'pointerUp', 850, 690, { ctrlKey: true }); selected(4);
    pointer(boardObject(objects[0]), 'pointerDown', 85, 85);
    pointer(surface(), 'pointerMove', 145, 125); pointer(surface(), 'pointerUp', 145, 125);
    await saved();
    objects.forEach((object, index) => expect(object).toMatchObject({ x: original[index].x + 60, y: original[index].y + 40 }));
    expect(outside).toMatchObject({ x: 380, y: 330 });
    await history(); objects.forEach((object, index) => expect(object).toMatchObject(original[index]));
    await history(true);
    objects.forEach((object, index) => expect(object).toMatchObject({ x: original[index].x + 60, y: original[index].y + 40 }));
    selected(4);
    fireEvent.change(screen.getByRole('combobox', { name: 'Move to layer' }), { target: { value: destination.id } });
    await saved();
    objects.forEach((object) => expect(object.layer_id).toBe(destination.id));
    expect(outside.layer_id).toBeUndefined();
    await history(); objects.forEach((object) => expect(object.layer_id ?? null).toBeNull());
    await history(true); objects.forEach((object) => expect(object.layer_id).toBe(destination.id));
  });

  it('② subtracts an Alt marquee from its starting set, restores hits as it shrinks, and preserves additive and replacement semantics', async () => {
    const objects = twoAreas();
    openBoard(); await screen.findByTestId(`board-member-${objects[0].id}`);
    marquee(40, 40, 850, 690); selected(4);
    pointer(surface(), 'pointerDown', 40, 40, { altKey: true }); selected(4);
    pointer(surface(), 'pointerMove', 280, 290, { altKey: true }); selected(2);
    pointer(surface(), 'pointerMove', 50, 50, { altKey: true }); selected(4);
    pointer(surface(), 'pointerMove', 280, 290, { altKey: true });
    pointer(surface(), 'pointerUp', 280, 290, { altKey: true }); selected(2);
    expect(hasSelectedStyle(objects[0])).toBe(false); expect(hasSelectedStyle(objects[2])).toBe(true);
    pointer(surface(), 'pointerDown', 40, 40, { ctrlKey: true });
    pointer(surface(), 'pointerMove', 280, 290, { ctrlKey: true }); selected(4);
    pointer(surface(), 'pointerMove', 50, 50, { ctrlKey: true }); selected(2);
    pointer(surface(), 'pointerUp', 50, 50, { ctrlKey: true });
    marquee(40, 40, 280, 290); selected(2);
    expect(hasSelectedStyle(objects[0])).toBe(true); expect(hasSelectedStyle(objects[2])).toBe(false);
    expect(writes).toEqual([]);
  });

  it('③ groups all card kinds, chalk, mount-ordered strokes and labeled connections, following Ctrl/Shift toggles immediately', async () => {
    const note = seedMember('Reading note', { x: 80, y: 80, member_kind: 'note',
      reference: { kind: 'note', id: 'source-note', title: 'Reading note', note_id: null, state: 'available', reason: null } });
    const group = seedMember('Related passages', { x: 300, y: 80, member_kind: 'content_group',
      reference: { kind: 'content_group', id: 'source-group', title: 'Related passages', note_id: null, state: 'available', reason: null } });
    const item = seedMember('An extracted idea', { x: 550, y: 80 });
    const range = seedMember('Source title', { x: 790, y: 80, member_kind: 'text_range',
      reference: { kind: 'text_range', id: 'source-range', title: 'Source title', summary: 'The chosen excerpt.', plain_text: 'The chosen excerpt.',
        note_id: null, state: 'available', reason: null } });
    const chalk = seedVisual({ visual_kind: 'sticky', x: 80, y: 300, data: { text: 'A chalk reminder' } });
    const first = seedVisual({ x: 380, y: 320, z_index: 20, created_at: '2026-09-09T10:00:00.000Z' });
    const second = seedVisual({ x: 620, y: 320, z_index: 1, created_at: '2026-09-09T11:00:00.000Z' });
    // Scene/z order differs from mounting order; names must retain that history.
    detail.visuals = [chalk, second, first];
    seedEdge(note, group, { label: 'Passage supports note' });
    openBoard(); await screen.findByTestId(`board-member-${note.id}`);
    marquee(40, 40, 1030, 700); selected(8);
    const panel = await selectionList();
    for (const [name, count] of [['Cards', 4], ['Chalk', 1], ['Strokes', 2], ['Connections', 1]] as const) {
      const section = within(panel).getByRole('region', { name });
      expect(within(section).getAllByRole('listitem')).toHaveLength(count);
      expect(within(section).getByRole('heading').textContent).toBe(`${name} (${count})`);
    }
    for (const title of ['Reading note', 'Related passages', 'An extracted idea', 'The chosen excerpt.', 'A chalk reminder', 'Stroke 1', 'Stroke 2', 'Passage supports note']) {
      expect(within(panel).getByRole('button', { name: title })).toBeTruthy();
    }
    expect(within(row(panel, `visual:${first.id}`)).getByRole('button', { name: 'Stroke 1' })).toBeTruthy();
    expect(within(row(panel, `visual:${second.id}`)).getByRole('button', { name: 'Stroke 2' })).toBeTruthy();
    expect(panel.querySelectorAll('img, canvas, svg path[d^="M 0 0 L 100 20"]')).toHaveLength(0);
    await select(first, { ctrlKey: true }); selected(7);
    expect(panel.querySelector(`[data-selection-key="visual:${first.id}"]`)).toBeNull();
    expect(within(panel).getByRole('button', { name: 'Stroke 2' })).toBeTruthy();
    await select(first, { shiftKey: true }); selected(8);
    await select(item, { shiftKey: true }); selected(7);
    await select(item, { ctrlKey: true }); selected(8);
    expect(selectionKeys(panel)).toContain(`member:${range.id}`);
    expect(selectionKeys(panel)).toContain(`visual:${chalk.id}`);
    expect(selectionKeys(panel)).toContain(`visual:${second.id}`);
    expect(writes).toEqual([]);
  });

  it('④ emphasizes only the hovered stroke in either direction, scrolls its row into view and locates without changing selection', async () => {
    const first = seedVisual({ x: 80, y: 80 });
    const second = seedVisual({ x: 300, y: 280 });
    openBoard(); await screen.findByTestId(`board-visual-${first.id}`);
    marquee(40, 40, 500, 400); selected(2);
    const panel = await selectionList();
    const firstRow = row(panel, `visual:${first.id}`);
    const secondRow = row(panel, `visual:${second.id}`);
    fireEvent.pointerEnter(firstRow);
    expect(boardObject(first).getAttribute('data-selection-highlighted')).toBe('true');
    expect(boardObject(second).getAttribute('data-selection-highlighted')).not.toBe('true');
    fireEvent.pointerLeave(firstRow);
    expect(boardObject(first).getAttribute('data-selection-highlighted')).not.toBe('true');
    // A focused list row remains focused when the pointer moves onto the board.
    // Pointer hover still emphasizes a single object, with board hover taking precedence.
    act(() => within(firstRow).getByRole('button', { name: 'Stroke 1' }).focus());
    expect(boardObject(first).getAttribute('data-selection-highlighted')).toBe('true');
    const scroller = secondRow.closest('section')!.parentElement!;
    vi.spyOn(scroller, 'clientHeight', 'get').mockReturnValue(200);
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 200 } as DOMRect);
    vi.spyOn(secondRow, 'getBoundingClientRect').mockReturnValue({ top: 300, bottom: 360 } as DOMRect);
    fireEvent.pointerMove(within(boardObject(second)).getByRole('button'), { pointerId: 1, buttons: 0, clientX: 305, clientY: 281 });
    expect(secondRow.getAttribute('data-selection-highlighted')).toBe('true');
    expect(firstRow.getAttribute('data-selection-highlighted')).not.toBe('true');
    expect(boardObject(second).getAttribute('data-selection-highlighted')).toBe('true');
    expect(boardObject(first).getAttribute('data-selection-highlighted')).not.toBe('true');
    expect(scroller.scrollTop).toBe(160);
    expect(surface().scrollTop).toBe(0);
    const before = selectionKeys(panel);
    const world = screen.getByTestId('board-world'); const oldTransform = world.style.transform;
    fireEvent.click(within(firstRow).getByRole('button', { name: 'Stroke 1' }));
    expect(boardObject(first).getAttribute('data-selection-flashing')).toBe('true');
    expect(boardObject(second).getAttribute('data-selection-flashing')).not.toBe('true');
    expect(world.style.transform).not.toBe(oldTransform);
    selected(2); expect(selectionKeys(panel)).toEqual(before);
    expect(detail.visuals.map(({ id }) => id)).toEqual([first.id, second.id]);
    await saved();
    expect(writes.every(({ url }) => url === BOARD_PATH)).toBe(true);
  });

  it('⑤ removes one row or a complete group from the live selection and clears the corresponding board styles', async () => {
    const card = seedMember('Keep the card', { x: 80, y: 80 });
    const chalk = seedVisual({ visual_kind: 'sticky', x: 80, y: 300, data: { text: 'Remove this chalk' } });
    const first = seedVisual({ x: 350, y: 300 }); const second = seedVisual({ x: 550, y: 300 });
    openBoard(); await screen.findByTestId(`board-member-${card.id}`);
    marquee(40, 40, 750, 600); selected(4);
    const panel = await selectionList();
    fireEvent.click(within(panel).getByRole('button', { name: 'Remove Remove this chalk from selection' }));
    selected(3); expect(hasSelectedStyle(chalk)).toBe(false);
    expect(panel.querySelector(`[data-selection-key="visual:${chalk.id}"]`)).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: 'Remove all Strokes from selection' }));
    selected(1); expect(hasSelectedStyle(first)).toBe(false); expect(hasSelectedStyle(second)).toBe(false);
    expect(hasSelectedStyle(card)).toBe(true);
    expect(selectionKeys(panel)).toEqual([`member:${card.id}`]);
    expect(detail.members).toHaveLength(1); expect(detail.visuals).toHaveLength(3);
    expect(writes).toEqual([]);
  });

  it('⑥ clears selection with Escape from a sidebar button and cancels an active marquee without restoring it on pointerup', async () => {
    const objects = twoAreas();
    openBoard(); await screen.findByTestId(`board-member-${objects[0].id}`);
    marquee(40, 40, 850, 690); selected(4);
    const panel = await selectionList();
    const button = within(panel).getByRole('button', { name: 'Upper card' });
    act(() => button.focus());
    fireEvent.keyDown(button, { key: 'Escape' }); selected(0);
    expect(selectionKeys(panel)).toEqual([]);
    objects.forEach((object) => expect(hasSelectedStyle(object)).toBe(false));
    marquee(40, 40, 280, 290); selected(2);
    pointer(surface(), 'pointerDown', 600, 440, { ctrlKey: true });
    pointer(surface(), 'pointerMove', 850, 690, { ctrlKey: true }); selected(4);
    expect(screen.getByTestId('board-marquee')).toBeTruthy();
    fireEvent.keyDown(surface(), { key: 'Escape' }); selected(0);
    expect(screen.queryByTestId('board-marquee')).toBeNull();
    pointer(surface(), 'pointerMove', 850, 700, { ctrlKey: true });
    pointer(surface(), 'pointerUp', 850, 700, { ctrlKey: true }); selected(0);
    expect(writes).toEqual([]);
  });

  it('keeps accumulated selection in the existing mixed-delete confirmation and reversible drawing history', async () => {
    const objects = twoAreas();
    const survivor = seedMember('Untouched', { x: 380, y: 330 });
    openBoard(); await screen.findByTestId(`board-member-${objects[0].id}`);
    marquee(40, 40, 280, 290, { ctrlKey: true });
    marquee(600, 440, 850, 690, { ctrlKey: true }); selected(4);
    fireEvent.keyDown(surface(), { key: 'Delete' });
    const dialog = await screen.findByRole('dialog', { name: 'Remove selected objects?' });
    expect(dialog.textContent).toMatch(/2 cards/i);
    expect(dialog.textContent).toMatch(/2.*drawing/i);
    fireEvent.click(within(dialog).getByRole('button', { name: /Remove|Delete/ })); await saved();
    expect(detail.members.map(({ id }) => id)).toEqual([survivor.id]); expect(detail.visuals).toEqual([]);
    await history();
    expect(detail.visuals).toHaveLength(2); expect(detail.members.map(({ id }) => id)).toEqual([survivor.id]);
    await history(true); expect(detail.visuals).toEqual([]);
  });
});
