import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import api, { BOARD_PATH, detail, resetSample, seedLayer, seedMember, seedVisual, writes } from '../../../scripts/boardToolsSmoke/mockApi';
import type { BoardMember, BoardVisual } from './boardTypes';

// Real board, geometry writers and command history; only transport is in memory.
vi.mock('@/services/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/api')>(),
  default: (await import('../../../scripts/boardToolsSmoke/mockApi')).default,
}));
function openBoard() {
  return render(<MemoryRouter initialEntries={[BOARD_PATH]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/boards/:boardId" element={<BoardPage />} /></Routes>
  </MemoryRouter>);
}
const surface = () => screen.getByTestId('board-surface');
const saved = () => waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
const guides = () => screen.queryByTestId('board-alignment-guides');
const node = (object: BoardMember | BoardVisual) => screen.getByTestId(`board-${'member_kind' in object ? 'member' : 'visual'}-${object.id}`);
function pointer(target: Element, phase: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel', x: number, y: number, modifiers: PointerEventInit = {}) {
  fireEvent[phase](target, { pointerId: 1, button: 0, buttons: phase === 'pointerUp' ? 0 : 1, clientX: x, clientY: y, ...modifiers });
}
function start(object: BoardMember | BoardVisual) { pointer(node(object), 'pointerDown', 100, 100); }
function preview(dx: number, dy: number, modifiers: PointerEventInit = {}) { pointer(surface(), 'pointerMove', 100 + dx, 100 + dy, modifiers); }
function release(dx: number, dy: number, modifiers: PointerEventInit = {}) { pointer(surface(), 'pointerUp', 100 + dx, 100 + dy, modifiers); }
async function history(redo = false) {
  fireEvent.keyDown(surface(), { key: 'z', ctrlKey: true, shiftKey: redo });
  await act(async () => undefined);
  await saved();
}

beforeEach(() => {
  resetSample();
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId || 0; }
  });
  for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) {
    Object.defineProperties(prototype, {
      setPointerCapture: { configurable: true, value: () => {} },
      releasePointerCapture: { configurable: true, value: () => {} },
      hasPointerCapture: { configurable: true, value: () => false },
    });
  }
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('V13.5 C1 board drag alignment smoke', () => {
  it.each([0.5, 1, 2])('shows a screen-space guide at zoom %s, saves its exact position, undoes once and rereads geometry', async (zoom) => {
    detail.board.viewport = { x: 31, y: -27, zoom };
    const moving = seedMember('Moving', { x: 80, y: 80 });
    seedMember('Target', { x: 480, y: 500 });
    const view = openBoard(); await screen.findByTestId(`board-member-${moving.id}`);
    await act(async () => undefined);
    start(moving); preview(400 * zoom - 5, 150 * zoom);
    expect(node(moving).style.left).toBe('480px');
    expect(node(moving).style.top).toBe('230px');
    expect(guides()!.querySelector('line[data-axis="x"]')!.getAttribute('x1')).toBe(String(31 + 480 * zoom));
    expect(writes).toEqual([]);
    release(400 * zoom - 5, 150 * zoom);
    expect(guides()).toBeNull(); await saved();
    expect(moving).toMatchObject({ x: 480, y: 230 });
    expect(writes).toHaveLength(1);
    expect(writes[0].input).toEqual({ x: 480, y: 230 });
    await history(); expect(moving).toMatchObject({ x: 80, y: 80 });
    expect((screen.getByRole('button', { name: 'Undo board action' }) as HTMLButtonElement).disabled).toBe(true);
    await history(true); expect(moving).toMatchObject({ x: 480, y: 230 });
    view.unmount(); openBoard();
    expect((await screen.findByTestId(`board-member-${moving.id}`)).style.left).toBe('480px');
  });

  it('aligns both centers independently and includes the final pointerup coordinate', async () => {
    const moving = seedMember('Moving', { x: 80, y: 80 });
    seedMember('Wide target', { x: 480, y: 500, w: 240, h: 180 });
    openBoard(); await screen.findByTestId(`board-member-${moving.id}`);
    start(moving); preview(437, 458); // raw (517,538), centers approach (600,590)
    expect(node(moving).style.left).toBe('520px'); expect(node(moving).style.top).toBe('540px');
    expect(guides()!.querySelectorAll('line')).toHaveLength(2);
    release(441, 457); await saved();
    expect(moving).toMatchObject({ x: 520, y: 540 });
    await history(); expect(moving).toMatchObject({ x: 80, y: 80 });
  });

  it('uses Shift only during an established drag, updates without pointer motion, and keeps Ctrl/Alt/Shift selection gestures', async () => {
    const moving = seedMember('Moving', { x: 80, y: 80 });
    const target = seedMember('Target', { x: 480, y: 500 });
    openBoard(); await screen.findByTestId(`board-member-${moving.id}`);
    start(moving); preview(397, 150);
    expect(node(moving).style.left).toBe('480px');
    fireEvent.keyDown(surface(), { key: 'Shift', shiftKey: true });
    expect(guides()).toBeNull(); expect(node(moving).style.left).toBe('477px');
    fireEvent.keyUp(surface(), { key: 'Shift' });
    expect(guides()).toBeTruthy(); expect(node(moving).style.left).toBe('480px');
    release(397, 150, { shiftKey: true }); await saved();
    expect(moving).toMatchObject({ x: 477, y: 230 });
    await history();
    pointer(node(target), 'pointerDown', 490, 510, { ctrlKey: true });
    expect(screen.getByText('2 selected')).toBeTruthy();
    pointer(node(target), 'pointerDown', 490, 510, { altKey: true });
    expect(screen.getByText('1 selected')).toBeTruthy();
    pointer(node(target), 'pointerDown', 490, 510, { shiftKey: true });
    expect(screen.getByText('2 selected')).toBeTruthy();
    pointer(surface(), 'pointerDown', 450, 450, { altKey: true });
    pointer(surface(), 'pointerMove', 680, 630, { altKey: true });
    pointer(surface(), 'pointerUp', 680, 630, { altKey: true });
    expect(screen.getByText('1 selected')).toBeTruthy();
    expect(guides()).toBeNull(); expect(writes).toHaveLength(2);
  });

  it('snaps a group by the grabbed object rather than the first scene member and moves every object by the same delta', async () => {
    const first = seedMember('First in scene', { x: 80, y: 80 });
    const primary = seedVisual({ visual_kind: 'sticky', x: 283, y: 300, w: 160, h: 100, data: { text: 'Grab this chalk' } });
    const pinned = seedMember('Pinned target', { x: 680, y: 700, pinned: true });
    openBoard(); await screen.findByTestId(`board-member-${first.id}`);
    start(first); release(0, 0);
    pointer(node(primary), 'pointerDown', 100, 100, { ctrlKey: true });
    start(primary); preview(394, 130);
    expect(node(primary).style.left).toBe('680px');
    expect(node(first).style.left).toBe('477px');
    release(394, 130); await saved();
    expect(primary).toMatchObject({ x: 680, y: 430 });
    expect(first).toMatchObject({ x: 477, y: 210 });
    expect(pinned).toMatchObject({ x: 680, y: 700 });
    expect(writes).toHaveLength(2);
    await history();
    expect(first).toMatchObject({ x: 80, y: 80 }); expect(primary).toMatchObject({ x: 283, y: 300 });
    expect((screen.getByRole('button', { name: 'Undo board action' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('excludes the moving group, hidden layers and staged projections from alignment candidates', async () => {
    const moving = seedMember('Moving', { x: 80, y: 80 });
    const companion = seedMember('Companion', { x: 477, y: 500 });
    const hidden = seedLayer('Hidden', { visible: false });
    seedMember('Hidden target', { x: 480, y: 500, layer_id: hidden.id });
    seedVisual({ x: 480, y: 500, layer_id: hidden.id });
    seedMember('Staged target', { x: 480, y: 500, placed: false });
    openBoard(); await screen.findByTestId(`board-member-${moving.id}`);
    start(moving); release(0, 0);
    pointer(node(companion), 'pointerDown', 100, 100, { ctrlKey: true });
    start(moving); preview(397, 150);
    expect(guides()).toBeNull(); expect(node(moving).style.left).toBe('477px');
    release(397, 150); await saved(); expect(moving.x).toBe(477);
  });

  it.each(['sticky', 'shape'] as const)('aligns a scaled %s visual using its visible bounds and restores its geometry', async (visual_kind) => {
    const moving = seedVisual({ visual_kind, x: 80, y: 80, w: 100, h: 40, scale: 2,
      rotation: visual_kind === 'shape' ? 90 : 0, data: { text: 'Chalk', tray_source: { object: {}, extensions: {} } } });
    const rotated = visual_kind === 'shape';
    seedMember('Target', { x: 480, y: 700 });
    openBoard(); await screen.findByTestId(`board-visual-${moving.id}`);
    const hit = within(node(moving)).queryByRole('button', { name: 'Select moved shape' }) || node(moving);
    pointer(hit, 'pointerDown', 100, 100); preview(rotated ? 337 : 397, 150);
    expect(guides()!.querySelector('line[data-axis="x"]')!.getAttribute('x1')).toBe('480');
    release(rotated ? 337 : 397, 150); await saved();
    expect(moving.x).toBeCloseTo(rotated ? 420 : 480);
    expect(moving).toMatchObject({ y: 230, w: 100, h: 40, scale: 2, rotation: rotated ? 90 : 0 });
    await history(); expect(moving).toMatchObject({ x: 80, y: 80 });
  });

  it('does not snap a click and discards a cancelled snapped drag without writes or history', async () => {
    const moving = seedMember('Moving', { x: 477, y: 80 });
    seedMember('Target', { x: 480, y: 500 });
    openBoard(); await screen.findByTestId(`board-member-${moving.id}`);
    start(moving); release(0, 0); await saved();
    expect(writes).toEqual([]); expect(moving.x).toBe(477);
    start(moving); preview(0, 150); expect(guides()).toBeTruthy();
    pointer(surface(), 'pointerCancel', 100, 250);
    expect(guides()).toBeNull(); expect(node(moving).style.left).toBe('477px');
    expect(node(moving).style.top).toBe('80px'); expect(writes).toEqual([]);
    expect((screen.getByRole('button', { name: 'Undo board action' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not clear a new drag or its guides when the preceding save completes', async () => {
    const moving = seedMember('Moving', { x: 80, y: 80 });
    seedMember('Target', { x: 480, y: 500 });
    let complete!: () => void;
    const held = new Promise<void>((resolve) => { complete = resolve; });
    const patch = api.patch.bind(api);
    vi.spyOn(api, 'patch').mockImplementationOnce(async (...args) => { await held; return patch(...args); });
    openBoard(); await screen.findByTestId(`board-member-${moving.id}`);
    start(moving); preview(100, 150); release(100, 150);
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    start(moving); preview(297, 0);
    expect(guides()).toBeTruthy(); expect(node(moving).style.left).toBe('480px');
    await act(async () => { complete(); await held; });
    await waitFor(() => expect(moving.x).toBe(180));
    expect(guides()).toBeTruthy(); expect(node(moving).style.left).toBe('480px');
    release(297, 0); await saved(); expect(moving).toMatchObject({ x: 480, y: 230 });
    expect(guides()).toBeNull();
  });
});
