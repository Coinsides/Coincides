import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import { BOARD_PATH, detail, resetSample, seedEdge, seedLayer, seedMember, seedVisual, writes } from '../../../scripts/boardToolsSmoke/mockApi';
import type { BoardMember, BoardVisual } from './boardTypes';

// Production page, repository and history; transport state is synthetic memory only.
vi.mock('@/services/api', async () => ({ default: (await import('../../../scripts/boardToolsSmoke/mockApi')).default }));
const noop = () => undefined;
function openBoard() {
  return render(<MemoryRouter initialEntries={[BOARD_PATH]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/boards/:boardId" element={<BoardPage />} /></Routes>
  </MemoryRouter>);
}
const surface = () => screen.getByTestId('board-surface');
const saved = () => waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
function pointer(target: Element, phase: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number, shiftKey = false) {
  fireEvent[phase](target, { pointerId: 1, button: 0, buttons: phase === 'pointerUp' ? 0 : 1, clientX: x, clientY: y, shiftKey });
}
async function select(object: BoardMember | BoardVisual, shift = false) {
  const kind = 'member_kind' in object ? 'member' : 'visual';
  const target = screen.getByTestId(`board-${kind}-${object.id}`);
  pointer(target, 'pointerDown', object.x + 5, object.y + 5, shift);
  pointer(surface(), 'pointerUp', object.x + 5, object.y + 5, shift);
  await act(async () => undefined);
}
async function layersPanel() {
  if (!screen.queryByRole('complementary', { name: 'Layers' })) {
    fireEvent.click(await screen.findByRole('button', { name: 'Layers' }));
  }
  return screen.findByRole('complementary', { name: 'Layers' });
}
async function undo(redo = false) {
  fireEvent.keyDown(surface(), { key: 'z', ctrlKey: true, shiftKey: redo });
  await act(async () => undefined);
  await saved();
}
async function moveTo(layerId: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Move to layer' }), { target: { value: layerId } });
  await saved();
}
function container(object: BoardMember | BoardVisual) {
  const kind = 'member_kind' in object ? 'member' : 'visual';
  const node = screen.getByTestId(`board-${kind}-${object.id}`).closest<HTMLElement>('[data-board-layer]');
  expect(node).toBeTruthy();
  return node!;
}
function geometry(object: BoardMember | BoardVisual) {
  const { id, x, y, w, h, scale, z_index, pinned } = object;
  return { id, x, y, w, h, scale, z_index, pinned };
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

describe('V13.4 S8 six board layer workflows', () => {
  it('① adds two layers, moves overlapping cards, drags layer order and rereads the saved order', async () => {
    const a = seedMember('A', { x: 80, y: 80, z_index: 99 });
    const b = seedMember('B', { x: 100, y: 100, z_index: -4 });
    const view = openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    const panel = await layersPanel();
    fireEvent.click(within(panel).getByRole('button', { name: 'Add layer' })); await saved();
    fireEvent.click(within(panel).getByRole('button', { name: 'Add layer' })); await saved();
    expect(detail.layers).toHaveLength(2);
    const [low, high] = detail.layers!;
    fireEvent.doubleClick(within(panel).getByRole('button', { name: low.name }));
    const name = within(panel).getByRole('textbox', { name: 'Layer name' });
    fireEvent.change(name, { target: { value: 'Ideas' } }); fireEvent.keyDown(name, { key: 'Enter' }); await saved();
    expect(low.name).toBe('Ideas');
    await select(a); await moveTo(low.id);
    await select(b); await moveTo(high.id);
    expect(container(a).dataset.boardLayer).toBe(low.id);
    expect(container(b).dataset.boardLayer).toBe(high.id);
    expect(container(a).compareDocumentPosition(container(b)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const data = new Map<string, string>();
    const transfer = { setData: (type: string, value: string) => data.set(type, value), getData: (type: string) => data.get(type) || '', effectAllowed: 'move', dropEffect: 'move' };
    const source = within(panel).getByRole('button', { name: `Move ${high.name}` }).closest('[draggable]')!;
    const target = within(panel).getByRole('button', { name: `Move ${low.name}` }).closest('[draggable]')!;
    expect(source).toBeTruthy(); expect(target).toBeTruthy();
    fireEvent.dragStart(source, { dataTransfer: transfer });
    fireEvent.dragOver(target, { dataTransfer: transfer });
    fireEvent.drop(target, { dataTransfer: transfer });
    fireEvent.dragEnd(source, { dataTransfer: transfer }); await saved();
    expect(detail.layers!.map(({ id }) => id)).toEqual([high.id, low.id]);
    expect(container(b).compareDocumentPosition(container(a)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(a.z_index).toBe(99); expect(b.z_index).toBe(-4);
    view.unmount(); openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    expect(container(b).compareDocumentPosition(container(a)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container(a).dataset.boardLayer).toBe(low.id);
  });

  it('② hides objects and cross-layer edges from rendering and selection, preserves staging, then restores them', async () => {
    const low = seedLayer('Ideas'); const high = seedLayer('Evidence');
    const a = seedMember('A', { x: 80, y: 80, layer_id: low.id });
    const b = seedMember('B', { x: 600, y: 80, layer_id: high.id });
    const stroke = seedVisual({ x: 90, y: 260, layer_id: low.id });
    const staged = seedMember('Waiting', { placed: false, layer_id: low.id });
    const edge = seedEdge(a, b);
    openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    expect(screen.getByTestId(`board-edge-${edge.id}`).closest<HTMLElement>('[data-board-layer]')?.dataset.boardLayer).toBe(high.id);
    await select(a);
    const panel = await layersPanel();
    fireEvent.click(within(panel).getByRole('button', { name: 'Hide Ideas' })); await saved();
    expect(screen.queryByTestId(`board-member-${a.id}`)).toBeNull();
    expect(screen.queryByTestId(`board-visual-${stroke.id}`)).toBeNull();
    expect(screen.queryByTestId(`board-edge-${edge.id}`)).toBeNull();
    expect(screen.queryByRole('toolbar', { name: 'Selected projection controls' })).toBeNull();
    pointer(surface(), 'pointerDown', 40, 40); pointer(surface(), 'pointerMove', 420, 400); pointer(surface(), 'pointerUp', 420, 400);
    expect(screen.queryByRole('toolbar', { name: 'Selected projection controls' })).toBeNull();
    fireEvent.keyDown(surface(), { key: 'Delete' }); await act(async () => undefined);
    expect(detail.members).toHaveLength(3); expect(detail.visuals).toHaveLength(1);
    await select(b);
    fireEvent.keyDown(surface(), { key: 'Delete' });
    const removal = await screen.findByRole('dialog', { name: 'Remove selected objects?' });
    expect(removal.textContent).toContain('1 card and 1 connected edge');
    fireEvent.click(within(removal).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Staging (1)' }));
    expect(await screen.findByTestId(`staging-member-${staged.id}`)).toBeTruthy();
    fireEvent.click(within(panel).getByRole('button', { name: 'Show Ideas' })); await saved();
    expect(screen.getByTestId(`board-member-${a.id}`)).toBeTruthy();
    expect(screen.getByTestId(`board-visual-${stroke.id}`)).toBeTruthy();
    expect(screen.getByTestId(`board-edge-${edge.id}`)).toBeTruthy();
  });

  it('③ confirms the object count, deletes a layer and moves all objects to Base without changing geometry', async () => {
    const layer = seedLayer('Ideas');
    const a = seedMember('A', { x: 82, y: 123, scale: 1.25, layer_id: layer.id });
    const chalk = seedVisual({ visual_kind: 'sticky', x: 290, y: 250, layer_id: layer.id, data: { text: 'Retain this thought.' } });
    const staged = seedMember('Waiting', { placed: false, layer_id: layer.id });
    const before = [a, chalk, staged].map(geometry);
    openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    const panel = await layersPanel();
    expect(within(panel).queryByRole('button', { name: 'Delete Base' })).toBeNull();
    expect(within(panel).queryByRole('button', { name: 'Move Base' })).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: 'Delete Ideas' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete layer Ideas' });
    expect(dialog.textContent).toMatch(/3 objects will move to Base/);
    expect(dialog.textContent).toMatch(/positions will stay the same/);
    expect(detail.layers).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete layer' })); await saved();
    expect(detail.layers).toEqual([]);
    expect([a, chalk, staged].map(({ layer_id }) => layer_id)).toEqual([null, null, null]);
    expect([a, chalk, staged].map(geometry)).toEqual(before);
    expect(detail.members).toHaveLength(2); expect(detail.visuals).toHaveLength(1);
    expect(staged.placed).toBe(false);
    expect(container(a).dataset.boardLayer).toBe('base'); expect(container(chalk).dataset.boardLayer).toBe('base');
    expect(writes.filter(({ method }) => method === 'DELETE').map(({ url }) => url)).toEqual([`${BOARD_PATH}/layers/${layer.id}`]);
  });

  it('④ assigns new pen, chalk and staging placement to the active custom layer and replays created visual layers', async () => {
    const layer = seedLayer('Ideas');
    const staged = seedMember('Waiting', { placed: false, layer_id: null });
    openBoard(); await screen.findByTestId('board-surface');
    const panel = await layersPanel();
    fireEvent.click(within(panel).getByRole('button', { name: 'Ideas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pen' }));
    pointer(surface(), 'pointerDown', 100, 100); pointer(surface(), 'pointerMove', 170, 130); pointer(surface(), 'pointerUp', 180, 140); await saved();
    expect(detail.visuals).toHaveLength(1);
    expect(detail.visuals[0]).toMatchObject({ visual_kind: 'freehand', layer_id: layer.id });
    await undo(); expect(detail.visuals).toHaveLength(0);
    await undo(true); expect(detail.visuals[0].layer_id).toBe(layer.id);
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.doubleClick(surface(), { clientX: 420, clientY: 300 });
    const editor = await screen.findByRole('textbox', { name: 'Chalk text' });
    fireEvent.change(editor, { target: { value: 'A layered thought.' } }); fireEvent.keyDown(editor, { key: 'Enter' }); await saved();
    expect(detail.visuals.find(({ visual_kind }) => visual_kind === 'sticky')?.layer_id).toBe(layer.id);
    fireEvent.click(screen.getByRole('button', { name: 'Staging (1)' }));
    const row = await screen.findByTestId(`staging-member-${staged.id}`);
    fireEvent.click(within(row).getByRole('button', { name: 'Place on board' })); await saved();
    expect(staged).toMatchObject({ placed: true, layer_id: layer.id });
  });

  it('⑤ moves three selected objects in one command and Ctrl+Z restores their distinct original layers', async () => {
    const ideas = seedLayer('Ideas'); const evidence = seedLayer('Evidence');
    const a = seedMember('A', { x: 80, y: 80, layer_id: null });
    const b = seedMember('Pinned B', { x: 310, y: 80, layer_id: ideas.id, pinned: true });
    const chalk = seedVisual({ visual_kind: 'sticky', x: 90, y: 250, layer_id: evidence.id, data: { text: 'Move all three.' } });
    const objects = [a, b, chalk]; const before = objects.map(geometry);
    openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    pointer(surface(), 'pointerDown', 40, 40); pointer(surface(), 'pointerMove', 490, 400); pointer(surface(), 'pointerUp', 490, 400);
    expect(screen.getByText('3 selected')).toBeTruthy();
    await moveTo(evidence.id);
    expect(objects.map(({ layer_id }) => layer_id)).toEqual([evidence.id, evidence.id, evidence.id]);
    expect(objects.map(geometry)).toEqual(before);
    await undo(); expect(objects.map(({ layer_id }) => layer_id)).toEqual([null, ideas.id, evidence.id]);
    await undo(true); expect(objects.map(({ layer_id }) => layer_id)).toEqual([evidence.id, evidence.id, evidence.id]);
  });

  it('⑥ keeps legacy all-NULL geometry, class order and edge-before-ink rendering in Base', async () => {
    const a = seedMember('A', { x: 80, y: 80, layer_id: null, z_index: -4 });
    const b = seedMember('B', { x: 400, y: 80, layer_id: null, z_index: 8 });
    const edge = seedEdge(a, b, { style: { direction: 'both' } });
    const stroke = seedVisual({ x: 90, y: 280, layer_id: null, z_index: 200 });
    const chalk = seedVisual({ visual_kind: 'sticky', x: 330, y: 260, layer_id: null, z_index: 3, data: { text: 'Legacy chalk.' } });
    const view = openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    const base = container(a);
    for (const object of [a, b, stroke, chalk]) expect(container(object)).toBe(base);
    expect(base.dataset.boardLayer).toBe('base');
    expect(screen.getByTestId(`board-member-${a.id}`).style.zIndex).toBe('-4');
    expect(screen.getByTestId(`board-member-${b.id}`).style.zIndex).toBe('8');
    expect(screen.getByTestId(`board-visual-${chalk.id}`).style.zIndex).toBe('3');
    const edgeNode = screen.getByTestId(`board-edge-${edge.id}`) as unknown as SVGElement;
    const strokeNode = screen.getByTestId(`board-visual-${stroke.id}`) as unknown as SVGElement;
    expect(edgeNode.ownerSVGElement).toBe(strokeNode.ownerSVGElement);
    expect(edgeNode.compareDocumentPosition(strokeNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(edgeNode.getAttribute('marker-start')).toBe('url(#board-edge-arrow)');
    const panel = await layersPanel();
    fireEvent.click(within(panel).getByRole('button', { name: 'Hide Base' })); await saved();
    expect(surface().querySelector('[data-testid^="board-member-"]')).toBeNull();
    expect(surface().querySelector('[data-testid^="board-visual-"]')).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: 'Show Base' })); await saved();
    view.unmount(); openBoard(); await screen.findByTestId(`board-member-${a.id}`);
    expect(container(a).dataset.boardLayer).toBe('base');
    expect(screen.getByTestId(`board-visual-${chalk.id}`).textContent).toContain('Legacy chalk.');
    expect(writes.filter(({ url }) => /\/(members|visuals|edges)\//.test(url))).toEqual([]);
  });
});
