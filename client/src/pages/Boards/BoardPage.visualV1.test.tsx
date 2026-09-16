import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import { BOARD_PATH, detail, resetSample, seedEdge, seedMember, seedSticky, seedVisualEdge, writes } from '../../../scripts/boardToolsSmoke/mockApi';
import { boardEdgeGeometry } from './boardEdgeGeometry';
import { pointOnBoardArc } from '../../../../shared/boardVisualGeometry';
import type { BoardEdge, BoardMember, BoardSticky } from './boardTypes';

// Real page/repository/history; only the HTTP transport is synthetic and isolated.
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
function pointer(target: Element, phase: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number, altKey = false) {
  fireEvent[phase](target, { pointerId: 1, button: 0, buttons: phase === 'pointerUp' ? 0 : 1, clientX: x, clientY: y, altKey });
}
const cardNode = (card: BoardMember | BoardSticky) => screen.getByTestId(`board-${'member_kind' in card ? 'member' : 'sticky'}-${card.id}`);
function edgeHit(edge: BoardEdge) {
  const group = screen.getByTestId(`board-edge-${edge.id}`).parentElement!;
  return within(group).getByRole('button', { name: /^Connection / });
}
async function selectEdge(edge: BoardEdge) {
  fireEvent.keyDown(edgeHit(edge), { key: 'Enter' });
  await act(async () => undefined);
}
async function change(name: string, value: string) {
  fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });
  await saved();
}
async function dragAnchor(from: BoardMember | BoardSticky, anchor: 'n' | 'e' | 's' | 'w', to: { x: number; y: number }) {
  const x = from.x + (anchor === 'w' ? 0 : anchor === 'e' ? from.w : from.w / 2);
  const y = from.y + (anchor === 'n' ? 0 : anchor === 's' ? from.h : from.h / 2);
  pointer(within(cardNode(from)).getByRole('button', { name: `Connect from ${anchor} anchor` }), 'pointerDown', x, y);
  pointer(surface(), 'pointerMove', to.x, to.y);
  pointer(surface(), 'pointerUp', to.x, to.y);
  await saved();
}

beforeEach(() => {
  resetSample();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId || 0; }
  });
  for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) Object.defineProperties(prototype, {
    setPointerCapture: { configurable: true, value: () => undefined },
    releasePointerCapture: { configurable: true, value: () => undefined },
    hasPointerCapture: { configurable: true, value: () => false },
  });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } },
  });
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) for (const property of ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture']) Reflect.deleteProperty(prototype, property);
});

describe('board visual v1 complete UI workflows', () => {
  it('creates, edits, colors, resizes between the two widths and lightly deletes a board-owned sticky', async () => {
    openBoard();
    fireEvent.click(await screen.findByRole('button', { name: 'Add sticky' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Sticky text' }), { target: { value: 'A concept\nSecond line' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save sticky' })); await saved();
    const sticky = detail.stickies![0];
    expect(sticky).toMatchObject({ text: 'A concept\nSecond line', color_index: null, weight: 1, w: 240, scale: 1 });
    expect(detail.members).toHaveLength(0); expect(detail.visuals).toHaveLength(0);
    await change('Sticky width', '416');
    await change('Sticky weight', '3');
    await change('Sticky color', '1');
    expect(sticky).toMatchObject({ w: 416, h: 120, weight: 3, color_index: 1 });
    expect(cardNode(sticky).getAttribute('data-weight')).toBe('3');
    expect(cardNode(sticky).getAttribute('data-accent')).toBe('primary');
    await change('Sticky width', '240');
    expect(sticky.w).toBe(240);
    fireEvent.doubleClick(cardNode(sticky));
    fireEvent.change(screen.getByRole('textbox', { name: 'Sticky text' }), { target: { value: 'Revised concept' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save sticky' })); await saved();
    expect(sticky.text).toBe('Revised concept');
    expect(screen.queryByRole('button', { name: 'Cast to item' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete sticky' })); await saved();
    await waitFor(() => expect(detail.stickies).toHaveLength(0));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Undo board action' })); await saved();
    expect(detail.stickies![0].text).toBe('Revised concept');
    expect(writes.every(({ url }) => url.startsWith(BOARD_PATH))).toBe(true);
  });

  it('grows a long-text sticky vertically after narrowing and retains every character when widened again', async () => {
    const text = '长'.repeat(390);
    const sticky = seedSticky({ text, x: 80, y: 80, w: 416, h: 442 });
    openBoard(); await screen.findByTestId(`board-sticky-${sticky.id}`);
    pointer(cardNode(sticky), 'pointerDown', 90, 90);
    pointer(surface(), 'pointerUp', 90, 90);
    await change('Sticky width', '240');
    expect(sticky).toMatchObject({ text, w: 240, h: 826 });
    expect(cardNode(sticky).textContent).toContain(text);
    await change('Sticky width', '416');
    expect(sticky).toMatchObject({ text, w: 416, h: 442 });
    expect(writes.filter(({ method, url }) => method === 'PATCH' && url.endsWith(`/stickies/${sticky.id}`)).map(({ input }) => input))
      .toEqual([{ w: 240 }, { w: 416 }]);
  });

  it('draws an anchored member-to-sticky edge with preview, edits every style axis and inherits styles on the next line', async () => {
    const member = seedMember('Reference', { x: 80, y: 80 });
    const sticky = seedSticky({ x: 500, y: 80, text: 'Concept' });
    openBoard(); await screen.findByTestId(`board-sticky-${sticky.id}`);
    const handle = within(cardNode(member)).getByRole('button', { name: 'Connect from e anchor' });
    pointer(handle, 'pointerDown', 240, 130);
    pointer(surface(), 'pointerMove', 500, 140);
    expect(cardNode(sticky).getAttribute('data-binding-preview')).toBe('true');
    pointer(surface(), 'pointerUp', 500, 140); await saved();
    await waitFor(() => expect(detail.edges).toHaveLength(1));
    const edge = detail.edges[0];
    expect(edge).toMatchObject({ from: { kind: 'member', id: member.id, anchor: 'e' }, to: { kind: 'sticky', id: sticky.id, anchor: 'w' }, visual_version: 1 });
    expect(edge.bend).not.toBe(0);
    await selectEdge(edge);
    await change('Line weight', '3'); await change('Line dash', 'dashed');
    await change('Start cap', 'dot'); await change('End cap', 'arrow');
    expect(edge).toMatchObject({ weight: 3, dash: 'dashed', cap_start: 'dot', cap_end: 'arrow' });
    const painted = screen.getByTestId(`board-edge-${edge.id}`);
    expect(painted.getAttribute('style')).toContain('var(--board-line-3)');
    expect(painted.getAttribute('style')).toContain('7 5');
    await dragAnchor(sticky, 's', { x: member.x + member.w / 2, y: member.y + member.h });
    expect(detail.edges).toHaveLength(2);
    expect(detail.edges[1]).toMatchObject({ weight: 3, dash: 'dashed', cap_start: 'dot', cap_end: 'arrow',
      from: { kind: 'sticky', id: sticky.id, anchor: 's' }, to: { kind: 'member', id: member.id, anchor: 's' } });
  });

  it('edits bend and horizontal wrapping labels, leaves a true path gap and snaps the dragged label back to the midpoint', async () => {
    const member = seedMember('Reference', { x: 50, y: 80 });
    const sticky = seedSticky({ x: 650, y: 80, text: 'Concept' });
    const edge = seedVisualEdge({ from: { kind: 'member', id: member.id, anchor: 'e' }, to: { kind: 'sticky', id: sticky.id, anchor: 'w' }, bend: 18 });
    openBoard(); await screen.findByTestId(`board-edge-${edge.id}`);
    fireEvent.doubleClick(edgeHit(edge));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Connection label' }), { target: { value: 'A label long enough to wrap onto multiple lines' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save label' })); await saved();
    const label = screen.getByTestId(`board-edge-label-${edge.id}`);
    expect(label.querySelectorAll('tspan').length).toBeGreaterThan(1);
    expect(label.getAttribute('transform')).toBeNull();
    expect(screen.getByTestId(`board-edge-${edge.id}`).getAttribute('d')!.match(/M /g)?.length).toBe(2);
    await selectEdge(edge);
    let arc = boardEdgeGeometry(edge, detail)!.arc;
    const middle = pointOnBoardArc(arc, 0.5);
    pointer(screen.getByRole('button', { name: 'Drag connection bend' }), 'pointerDown', middle.x, middle.y);
    pointer(surface(), 'pointerMove', (arc.start.x + arc.end.x) / 2, (arc.start.y + arc.end.y) / 2 + 150);
    pointer(surface(), 'pointerUp', (arc.start.x + arc.end.x) / 2, (arc.start.y + arc.end.y) / 2 + 150); await saved();
    // The endpoints differ slightly in height; vertical pointer movement projects
    // onto the chord's normal, leaving a subpixel difference from 150.
    expect(edge.bend).toBeCloseTo(150, 1);
    arc = boardEdgeGeometry(edge, detail)!.arc;
    const shifted = pointOnBoardArc(arc, 0.8);
    pointer(screen.getByTestId(`board-edge-label-${edge.id}`), 'pointerDown', middle.x, middle.y);
    pointer(surface(), 'pointerMove', shifted.x, shifted.y); pointer(surface(), 'pointerUp', shifted.x, shifted.y); await saved();
    expect(edge.label_position).toBeCloseTo(0.8);
    const center = pointOnBoardArc(arc, 0.5);
    pointer(screen.getByTestId(`board-edge-label-${edge.id}`), 'pointerDown', shifted.x, shifted.y);
    pointer(surface(), 'pointerMove', center.x + 2, center.y); pointer(surface(), 'pointerUp', center.x + 2, center.y); await saved();
    expect(edge.label_position).toBe(0.5);
  });

  it('keeps a label position unchanged on an off-center click or sub-threshold move and still edits on double-click', async () => {
    const member = seedMember('Reference', { x: 50, y: 80 });
    const sticky = seedSticky({ x: 650, y: 80, text: 'Concept' });
    const edge = seedVisualEdge({ from: { kind: 'member', id: member.id, anchor: 'e' }, to: { kind: 'sticky', id: sticky.id, anchor: 'w' },
      bend: 18, label: 'Wide label text', label_position: 0.5 });
    openBoard(); await screen.findByTestId(`board-edge-label-${edge.id}`);
    const center = pointOnBoardArc(boardEdgeGeometry(edge, detail)!.arc, 0.5);
    const label = screen.getByTestId(`board-edge-label-${edge.id}`);
    pointer(label, 'pointerDown', center.x + 42, center.y);
    pointer(surface(), 'pointerUp', center.x + 42, center.y); await saved();
    expect(edge.label_position).toBe(0.5);
    pointer(label, 'pointerDown', center.x + 42, center.y);
    pointer(surface(), 'pointerMove', center.x + 44, center.y);
    pointer(surface(), 'pointerUp', center.x + 44, center.y); await saved();
    expect(edge.label_position).toBe(0.5);
    expect(writes.filter(({ method, url }) => method === 'PATCH' && url.endsWith(`/edges/${edge.id}`))).toHaveLength(0);
    fireEvent.doubleClick(label);
    expect((await screen.findByRole('textbox', { name: 'Connection label' }) as HTMLTextAreaElement).value).toBe('Wide label text');
    fireEvent.change(screen.getByRole('textbox', { name: 'Connection label' }), { target: { value: 'Edited by double-click' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save label' })); await saved();
    expect(edge).toMatchObject({ label: 'Edited by double-click', label_position: 0.5 });
  });

  it('drags a legacy label into the new geometry without losing its arrows and undo restores its original renderer', async () => {
    const from = seedMember('Old reference A', { x: 50, y: 80 });
    const to = seedMember('Old reference B', { x: 650, y: 80 });
    const edge = seedEdge(from, to, { label: 'Legacy label', style: { direction: 'both' }, visual_version: 0, bend: 0, label_position: 0.5 });
    openBoard(); await screen.findByTestId(`board-edge-${edge.id}`);
    const arc = boardEdgeGeometry(edge, detail)!.arc;
    const center = pointOnBoardArc(arc, 0.5);
    const shifted = pointOnBoardArc(arc, 0.8);
    pointer(screen.getByText('Legacy label'), 'pointerDown', center.x, center.y - 8);
    pointer(surface(), 'pointerMove', shifted.x, shifted.y);
    pointer(surface(), 'pointerUp', shifted.x, shifted.y); await saved();
    expect(edge).toMatchObject({ visual_version: 1, cap_start: 'arrow', cap_end: 'arrow' });
    expect(edge.label_position).toBeCloseTo(0.8);
    expect(screen.getByTestId(`board-edge-label-${edge.id}`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo board action' })); await saved();
    expect(edge).toMatchObject({ visual_version: 0, label_position: 0.5, style: { direction: 'both' } });
    expect(screen.getByTestId(`board-edge-${edge.id}`).getAttribute('marker-start')).toBe('url(#board-edge-arrow)');
    expect(screen.getByTestId(`board-edge-${edge.id}`).getAttribute('marker-end')).toBe('url(#board-edge-arrow)');
  });

  it('honors Alt no-snap, previews rebound anchors, explicitly unbinds and reroutes only when asked', async () => {
    const member = seedMember('Reference', { x: 80, y: 80 });
    const sticky = seedSticky({ x: 600, y: 80, text: 'Concept' });
    const edge = seedVisualEdge({ from: { kind: 'member', id: member.id, anchor: 'e' }, to: { kind: 'sticky', id: sticky.id, anchor: 'w' }, bend: 40 });
    openBoard(); await screen.findByTestId(`board-edge-${edge.id}`); await selectEdge(edge);
    pointer(screen.getByRole('button', { name: 'Drag connection to' }), 'pointerDown', 600, 140);
    pointer(surface(), 'pointerMove', 620, 100, true);
    expect(cardNode(sticky).getAttribute('data-binding-preview')).toBeNull();
    pointer(surface(), 'pointerUp', 620, 100, true); await saved();
    expect(edge.to).toEqual({ kind: 'point', x: 620, y: 100 });
    pointer(screen.getByRole('button', { name: 'Drag connection to' }), 'pointerDown', 620, 100);
    pointer(surface(), 'pointerMove', 720, 80);
    expect(cardNode(sticky).getAttribute('data-binding-preview')).toBe('true');
    pointer(surface(), 'pointerUp', 720, 80); await saved();
    expect(edge.to).toEqual({ kind: 'sticky', id: sticky.id, anchor: 'n' });
    fireEvent.click(screen.getByRole('button', { name: 'Unbind start' })); await saved();
    expect(edge.from?.kind).toBe('point'); expect(edge.from_member_id).toBeNull();
    expect(writes.some(({ url }) => url.endsWith('/reroute'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Reroute' })); await saved();
    expect(writes.filter(({ url }) => url.endsWith('/reroute'))).toHaveLength(1);
  });

  it('renders thirteen existing edges at zero bend without new styles and leaves their data unchanged across reload', async () => {
    const cards = Array.from({ length: 14 }, (_, index) => seedMember(`Card ${index + 1}`, { x: index * 210, y: index % 2 * 220 }));
    const edges = cards.slice(1).map((card, index) => seedEdge(cards[index], card, {
      label: `Existing ${index + 1}`, style: { direction: index % 2 ? 'both' : 'forward', legacy_key: index },
      visual_version: 0, bend: 0, dash: 'solid', weight: 1, cap_start: 'none', cap_end: 'none', color_index: null,
    }));
    const before = structuredClone(detail.edges);
    const view = openBoard(); await screen.findByTestId(`board-edge-${edges[0].id}`);
    for (const edge of edges) {
      const path = screen.getByTestId(`board-edge-${edge.id}`);
      expect(path.closest('[data-edge-version]')?.getAttribute('data-edge-version')).toBe('legacy');
      expect(path.getAttribute('d')).toBe(boardEdgeGeometry(edge, detail)!.arc.path);
      expect(path.getAttribute('d')).not.toContain(' A ');
      expect(path.getAttribute('style')).toBeNull();
      expect(path.getAttribute('marker-end')).toBe('url(#board-edge-arrow)');
    }
    expect(detail.edges).toEqual(before); expect(writes).toHaveLength(0);
    view.unmount(); openBoard(); await screen.findByTestId(`board-edge-${edges[12].id}`);
    expect(detail.edges).toEqual(before);
  });
});
