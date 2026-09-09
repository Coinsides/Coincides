import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import api, { BOARD_PATH, detail, events, resetSample, seedEdge, seedMember, seedVisual, writes } from '../../../scripts/boardToolsSmoke/mockApi';
import type { BoardVisual } from './boardTypes';

vi.mock('@/services/api', async () => ({ default: (await import('../../../scripts/boardToolsSmoke/mockApi')).default }));
const noop = () => undefined;
function openBoard() {
  return render(<MemoryRouter initialEntries={[BOARD_PATH]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/boards/:boardId" element={<BoardPage />} /></Routes>
  </MemoryRouter>);
}
function pointer(target: Element, phase: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number, shiftKey = false) {
  fireEvent[phase](target, { pointerId: 1, button: 0, buttons: phase === 'pointerUp' ? 0 : 1, clientX: x, clientY: y, shiftKey });
}
const surface = () => screen.getByTestId('board-surface');
const saved = () => waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
async function key(key: string, shiftKey = false) {
  fireEvent.keyDown(surface(), { key, ctrlKey: true, shiftKey });
  await act(async () => undefined);
  await saved();
}
async function selectMember(id: string, shift = false) {
  pointer(screen.getByTestId(`board-member-${id}`), 'pointerDown', 85, 85, shift);
  pointer(surface(), 'pointerUp', 85, 85, shift);
  await act(async () => undefined);
}
async function selectVisual(visual: BoardVisual, shift = false) {
  const target = screen.getByTestId(`board-visual-${visual.id}`);
  const hit = visual.visual_kind === 'freehand' ? within(target).getByRole('button') : target;
  pointer(hit, 'pointerDown', visual.x + 5, visual.y + 1, shift);
  pointer(surface(), 'pointerUp', visual.x + 5, visual.y + 1, shift);
  await act(async () => undefined);
}
function draw(y: number) {
  pointer(surface(), 'pointerDown', 80, y);
  pointer(surface(), 'pointerMove', 160, y + 20);
  pointer(surface(), 'pointerUp', 180, y + 20);
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
  // jsdom has no SVG geometry primitives. Supply the platform's segment hit
  // operation from rendered d/transform attributes; browser smoke uses Chrome's
  // native getScreenCTM/isPointInStroke on these same production hit paths.
  vi.stubGlobal('DOMPoint', class {
    constructor(readonly x: number, readonly y: number) {}
    matrixTransform(matrix: { x: number; y: number }) { return { x: this.x - matrix.x, y: this.y - matrix.y }; }
  });
  Object.defineProperties(SVGElement.prototype, {
    getScreenCTM: { configurable: true, value: function (this: SVGElement) {
      const transform = this.parentElement?.getAttribute('transform') || '';
      const [, x = '0', y = '0'] = /translate\(([-\d.]+)[ ,]+([-\d.]+)/.exec(transform) || [];
      return { inverse: () => ({ x: Number(x), y: Number(y) }) };
    } },
    isPointInStroke: { configurable: true, value: function (this: SVGElement, point: { x: number; y: number }) {
      const values = (this.getAttribute('d')?.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      for (let i = 2; i < values.length; i += 2) {
        const [x, y, endX, endY] = values.slice(i - 2, i + 2);
        const dx = endX - x; const dy = endY - y;
        const t = Math.max(0, Math.min(1, ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy || 1)));
        if (Math.hypot(point.x - x - t * dx, point.y - y - t * dy) <= 8) return true;
      }
      return false;
    } },
  });
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
  Reflect.deleteProperty(SVGElement.prototype, 'getScreenCTM');
  Reflect.deleteProperty(SVGElement.prototype, 'isPointInStroke');
});

describe('V13.4 S4 six board tool workflows', () => {
  it('① draws three strokes, erases two in one gesture, undoes both and redoes the erasure', async () => {
    openBoard(); await screen.findByTestId('board-surface');
    fireEvent.click(screen.getByRole('button', { name: /^Pen$/ }));
    for (const y of [80, 180, 320]) { draw(y); await saved(); }
    expect(detail.visuals).toHaveLength(3);
    const survivor = detail.visuals[2].id;
    fireEvent.click(screen.getByRole('button', { name: /Eraser/ }));
    // Pointer-captured sweeps use the production hit scan between these positions.
    pointer(surface(), 'pointerDown', 110, 87.5);
    pointer(surface(), 'pointerMove', 110, 187.5);
    pointer(surface(), 'pointerUp', 110, 187.5);
    await saved();
    expect(detail.visuals.map(({ id }) => id)).toEqual([survivor]);
    await key('z');
    expect(detail.visuals).toHaveLength(3);
    expect(detail.visuals.some(({ id }) => id === survivor)).toBe(true);
    await key('y');
    expect(detail.visuals.map(({ id }) => id)).toEqual([survivor]);
  });

  it('② drags a card, undoes/redoes its position and preserves the saved terminal state on reopening', async () => {
    const member = seedMember('A', { x: 80, y: 80 });
    const view = openBoard(); await screen.findByTestId(`board-member-${member.id}`);
    pointer(screen.getByTestId(`board-member-${member.id}`), 'pointerDown', 85, 85);
    pointer(surface(), 'pointerMove', 185, 145);
    pointer(surface(), 'pointerUp', 185, 145);
    await saved(); expect(member).toMatchObject({ x: 180, y: 140 });
    await key('z'); expect(member).toMatchObject({ x: 80, y: 80 });
    await key('z', true); expect(member).toMatchObject({ x: 180, y: 140 });
    view.unmount(); openBoard();
    const card = await screen.findByTestId(`board-member-${member.id}`);
    expect(card.style.left).toBe('180px'); expect(card.style.top).toBe('140px');
    const count = writes.length;
    await key('z'); expect(writes).toHaveLength(count);
  });

  it('③ deletes an independent labeled directed edge, restores its label/direction with a new ID, and redoes', async () => {
    const a = seedMember('A', { x: 80, y: 80 });
    const b = seedMember('B', { x: 480, y: 80 });
    const edge = seedEdge(a, b, { label: 'Supports the claim', style: { direction: 'both' } });
    openBoard(); await screen.findByTestId(`board-edge-${edge.id}`);
    pointer(screen.getByRole('button', { name: 'Connection A to B' }), 'pointerDown', 300, 130);
    fireEvent.keyDown(surface(), { key: 'Delete' }); await saved();
    expect(detail.edges).toEqual([]);
    await key('z');
    expect(detail.edges).toHaveLength(1);
    expect(detail.edges[0]).toMatchObject({ label: edge.label, style: edge.style, from_member_id: a.id, to_member_id: b.id });
    expect(detail.edges[0].id).not.toBe(edge.id);
    expect(screen.getByTestId(`board-edge-${detail.edges[0].id}`).getAttribute('marker-start')).toBe('url(#board-edge-arrow)');
    await key('y'); expect(detail.edges).toEqual([]);
  });

  it('④ follows live visual IDs across delete/undo/redo/undo and a subsequent move and history replay', async () => {
    const old = seedVisual({ visual_kind: 'sticky', x: 80, y: 80, data: { text: 'A movable thought.' } });
    openBoard(); await screen.findByTestId(`board-visual-${old.id}`);
    await selectVisual(old); fireEvent.keyDown(surface(), { key: 'Delete' }); await saved();
    await key('z'); const first = detail.visuals[0].id; expect(first).not.toBe(old.id);
    await key('y'); expect(detail.visuals).toHaveLength(0);
    await key('z'); const current = detail.visuals[0]; expect(current.id).not.toBe(first);
    pointer(screen.getByTestId(`board-visual-${current.id}`), 'pointerDown', 85, 85);
    pointer(surface(), 'pointerMove', 145, 115); pointer(surface(), 'pointerUp', 145, 115);
    await saved(); expect(current).toMatchObject({ x: 140, y: 110 });
    expect(writes[writes.length - 1]?.url).toBe(`${BOARD_PATH}/visuals/${current.id}`);
    await key('z'); expect(current).toMatchObject({ x: 80, y: 80 });
    await key('y'); expect(current).toMatchObject({ x: 140, y: 110 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('⑤ marquee-selects three objects, skips pinned movement with a hint, undoes the whole drag, and Shift-toggles', async () => {
    resetSample('group');
    const [a, pinned] = detail.members; const chalk = detail.visuals[0];
    openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    pointer(surface(), 'pointerDown', 40, 40); pointer(surface(), 'pointerMove', 480, 380); pointer(surface(), 'pointerUp', 480, 380);
    expect(screen.getByText(/3 selected/i)).toBeTruthy();
    pointer(screen.getByTestId(`board-member-${a.id}`), 'pointerDown', 85, 85);
    pointer(surface(), 'pointerMove', 145, 125); pointer(surface(), 'pointerUp', 145, 125);
    await saved();
    expect(a).toMatchObject({ x: 140, y: 120 }); expect(chalk).toMatchObject({ x: 150, y: 290 });
    expect(pinned).toMatchObject({ x: 310, y: 80 });
    expect(screen.getByText(/1 pinned.*skip|skip.*1 pinned/i)).toBeTruthy();
    await key('z'); expect(a).toMatchObject({ x: 80, y: 80 }); expect(chalk).toMatchObject({ x: 90, y: 250 });
    await selectMember(pinned.id, true); expect(screen.getByText(/2 selected/i)).toBeTruthy();
    await selectMember(pinned.id, true); expect(screen.getByText(/3 selected/i)).toBeTruthy();
  });

  it('⑥ shows actual N/K/M including an unselected cascade; undo restores only the drawing and leaves A/E unmounted', async () => {
    resetSample('mixed');
    const [a] = detail.members; const [selectedEdge] = detail.edges; const visual = detail.visuals[0];
    openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    await selectMember(a.id);
    pointer(screen.getByRole('button', { name: 'Connection A to B' }), 'pointerDown', 300, 130, true);
    await selectVisual(visual, true);
    fireEvent.keyDown(surface(), { key: 'Delete' });
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toMatch(/1 card/i);
    expect(dialog.textContent).toMatch(/2.*connect/i);
    expect(dialog.textContent).toMatch(/1.*drawing/i);
    expect(dialog.textContent).toMatch(/cannot be undone/i);
    expect(dialog.textContent).toMatch(/can be undone/i);
    const writesBefore = writes.length;
    fireEvent.keyDown(dialog, { key: 'z', ctrlKey: true });
    await act(async () => undefined); expect(writes).toHaveLength(writesBefore);
    fireEvent.click(within(dialog).getByRole('button', { name: /Remove|Delete/ }));
    await saved();
    expect(detail.members.map(({ id }) => id)).not.toContain(a.id);
    expect(detail.edges).toHaveLength(0); expect(detail.visuals).toHaveLength(0);
    await key('z'); expect(detail.visuals).toHaveLength(1);
    expect(detail.visuals[0].data).toEqual(visual.data);
    expect(detail.members.map(({ id }) => id)).not.toContain(a.id);
    expect(detail.edges.map(({ id }) => id)).not.toContain(selectedEdge.id);
    expect((await api.get(`${BOARD_PATH}/events`)).data).toEqual({ events: [{ event_type: 'unmounted', member_id: a.id }] });
    expect(events).toHaveLength(1);
    expect(writes.filter(({ method, url }) => method === 'POST' && url.endsWith('/members'))).toEqual([]);
  });
});
