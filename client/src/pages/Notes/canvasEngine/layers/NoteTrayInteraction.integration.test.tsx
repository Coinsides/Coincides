import { useRef, useState } from 'react';
import { act, cleanup, createEvent, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { useBlockPlacementInteractions } from '../hooks/useBlockPlacementInteractions';
import { useTrayController } from '../hooks/useTrayController';
import { createSurfaceModePolicy } from '../modePolicyService';
import type { RuntimeHistoryEntry } from '../historyService';
import type { RuntimeInteractionState } from '../interactionController';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout, SnapGuide } from '../runtimeLayout';
import type { CanvasObject, CanvasPlacement, ContentMount } from '../types';
import { TRAY_DRAG_TYPE } from '../trayService';
import { NoteTraySidebar } from './NoteTraySidebar';

// Only HTTP is replaced. The gesture/controller/sidebar, collision calculation,
// placement repository and history callbacks below are production code.
const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

const noteId = 'synthetic-tray-note';
const original: BlockBoxLayout = { x: 100, y: 20, width: 180, height: 60, surface: 'formal_page',
  export_role: 'included', ai_visibility: 'visible' };
const neighbor: BlockBoxLayout = { x: 100, y: 100, width: 180, height: 60, surface: 'formal_page' };
const stored: BlockBoxLayout = { x: 0, y: 0, width: 0, height: 0, surface: 'tray', order_index: 0 };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function block(id: string, layout: BlockBoxLayout): NoteBlock {
  return { id, placement_id: `placement-${id}`, display_overrides_json: {}, canvas_layout: { ...layout },
    block_type: 'paragraph', title: null, content_json: { body: `Saved ${id}` }, plain_text: `Saved ${id}`,
    metadata: {}, order_index: 0, source_references: [] };
}

function placement(id: string, layout: BlockBoxLayout): CanvasPlacement {
  return { placementId: `placement-${id}`, objectId: `object-${id}`, canvasId: noteId,
    x: layout.x, y: layout.y, width: layout.width, height: layout.height, rotation: 0,
    surface: layout.surface ?? 'formal_page', boundaryRole: 'inside', zIndex: 0, orderIndex: layout.order_index };
}

function initialStore() {
  const blocks = [block('moving', original), block('neighbor', neighbor), block('staged', stored)];
  const objects: CanvasObject[] = blocks.map((item) => ({ objectId: `object-${item.id}`, canvasId: noteId,
    kind: 'paragraph_block_projection', backing: 'note_block', objectClass: 'block_backed', status: 'active' }));
  objects.push({ objectId: 'object-drawing', canvasId: noteId, kind: 'shape', backing: 'none', objectClass: 'pure', status: 'active' },
    { objectId: 'object-mount', canvasId: noteId, kind: 'content_group_projection', backing: 'content_group', objectClass: 'projection_backed', status: 'active' });
  const mounts: ContentMount[] = blocks.map((item) => ({ mountId: `mount-${item.id}`, objectId: `object-${item.id}`,
    targetKind: 'note_block', targetId: item.id, projectionMode: 'owned', syncPolicy: 'manual' }));
  mounts.push({ mountId: 'mount-group', objectId: 'object-mount', targetKind: 'content_group', targetId: 'synthetic-group',
    projectionMode: 'reference', syncPolicy: 'read_through' });
  return { blocks, objects, mounts, placements: [placement('moving', original), placement('neighbor', neighbor),
    placement('staged', stored), placement('drawing', { ...stored, order_index: 1 }), placement('mount', { ...stored, order_index: 2 })] };
}

let store: ReturnType<typeof initialStore>;
let writes: string[];
let failOrder: boolean;

beforeEach(() => {
  store = initialStore(); writes = []; failOrder = false;
  http.get.mockReset().mockImplementation(async (url: string) => {
    if (url === '/boards') return { data: { boards: [] } };
    throw new Error(`Unexpected synthetic GET ${url}`);
  });
  http.post.mockReset().mockRejectedValue(new Error('Unexpected synthetic POST'));
  http.put.mockReset().mockImplementation(async (url: string, input: Record<string, unknown>) => {
    if (url === '/note-blocks/moving') {
      writes.push('content');
      store.blocks = store.blocks.map((item) => item.id === 'moving'
        ? { ...item, plain_text: input.plain_text as string, content_json: { body: input.plain_text } } : item);
      return { data: copy(store.blocks.find((item) => item.id === 'moving')) };
    }
    if (url === `/canvas-objects/by-note/${noteId}/block-placements/placement-moving`) {
      writes.push('placement');
      const layout = copy(input.layout as BlockBoxLayout);
      store.blocks = store.blocks.map((item) => item.id === 'moving' ? { ...item, canvas_layout: { ...layout } } : item);
      store.placements = store.placements.map((item) => item.placementId === 'placement-moving' ? placement('moving', layout) : item);
      return { data: { block_id: 'moving', placement_id: 'placement-moving', layout } };
    }
    if (url === `/notes/${noteId}/tray/order`) {
      writes.push('order');
      if (failOrder) throw new Error('Synthetic order write rejected');
      const ids = input.placementIds as string[];
      store.placements = store.placements.map((item) => item.surface === 'tray' ? { ...item, orderIndex: ids.indexOf(item.placementId) } : item);
      return { data: {} };
    }
    throw new Error(`Unexpected synthetic PUT ${url}`);
  });
});
afterEach(cleanup);

const ordinarySave = vi.fn();
const ordinaryHistory = vi.fn();

function Fixture({ flushGate = Promise.resolve(true) }: { flushGate?: Promise<boolean> }) {
  const [snapshot, setSnapshot] = useState(() => copy(store));
  const [drafts, setDrafts] = useState<Record<string, BlockBoxLayout>>({});
  const [draftText, setDraftText] = useState('Saved moving');
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<RuntimeHistoryEntry[]>([]);
  const [temporary, setTemporary] = useState(false);
  const [guide, setGuide] = useState<SnapGuide | null>(null);
  const [interaction, setInteraction] = useState<RuntimeInteractionState>({ mode: 'idle', target: 'surface' });
  const dropTargetRef = useRef<HTMLElement>(null);
  const movingBlockIdRef = useRef<string | null>(null);
  const suppressMeasuredReflowUntilRef = useRef(0);
  const paperBlocks = snapshot.blocks.filter((item) => item.canvas_layout?.surface !== 'tray');
  const layouts = Object.fromEntries(paperBlocks.map((item) => [item.id, drafts[item.id] ?? item.canvas_layout as unknown as BlockBoxLayout]));
  const tray = useTrayController({
    noteId, enabled: true, dropTargetRef, blocks: snapshot.blocks, objects: snapshot.objects,
    placements: snapshot.placements, mounts: snapshot.mounts, selectedBlockId: selected, blockLayouts: layouts,
    collection: null, pageOffsetX: 0, clearSelection: () => setSelected(null),
    resolvePlacementWriteContext: async () => ({ coordinateContract: 'v1', pageFrameCollection: null }),
    pushHistory: (entry) => setHistory((items) => [...items, entry]),
    refresh: async (changedIds = []) => {
      setSnapshot(copy(store));
      setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !changedIds.includes(id))));
    },
    flushBlock: async (item) => {
      if (!await flushGate) return false;
      await api.put(`/note-blocks/${item.id}`, { plain_text: draftText });
      return true;
    },
  });
  const interactions = useBlockPlacementInteractions({
    blockLayouts: layouts, contentWidth: 500, orderedBlocks: paperBlocks, pageFrames: [], pageOffsetX: 0,
    estimateBlockHeightForText: () => 60, movingBlockIdRef, suppressMeasuredReflowUntilRef,
    persistChangedBlockLayouts: ordinarySave, pushLayoutHistory: ordinaryHistory,
    beginTemporaryLayoutMode: () => setTemporary(true), clearTemporaryLayoutMode: () => setTemporary(false),
    setInteractionState: setInteraction, setLayoutDrafts: setDrafts, setSelectedBlockId: setSelected,
    setSnapGuide: setGuide, snapEnabled: true, surfacePolicy: createSurfaceModePolicy('page'),
    viewportTransform: { x: 0, y: 0, width: 1200, height: 900, zoom: 1 }, trayDropTargetRef: dropTargetRef,
    onMoveBlockToTray: (id, before) => { void tray.moveBlockToTray(id, before); },
  });
  return <>
    <button type="button" onClick={() => tray.setOpen(!tray.open)}>Toggle staging</button>
    <button type="button" disabled={!history.length || tray.busy} onClick={() => {
      const command = history[history.length - 1];
      if (command?.type === 'reversibleEdit') void command.undo();
    }}>Undo staging move</button>
    <div data-testid="paper" data-temporary={temporary} data-snapped={Boolean(guide)} data-mode={interaction.mode}>
      {paperBlocks.map((item) => <article key={item.id} data-paper-block={item.id}
        style={{ left: layouts[item.id].x, top: layouts[item.id].y }}>
        <button type="button" onPointerDown={(event) => interactions.beginMoveBlock(event, item, layouts[item.id])}>Move {item.id}</button>
        {item.id === 'moving' && <textarea aria-label="Block draft" value={draftText} onChange={(event) => setDraftText(event.target.value)} />}
      </article>)}
    </div>
    {tray.open && <NoteTraySidebar tray={tray} />}
  </>;
}

async function openFixture(flushGate?: Promise<boolean>) {
  ordinarySave.mockClear(); ordinaryHistory.mockClear();
  const view = render(<MemoryRouter><Fixture flushGate={flushGate} /></MemoryRouter>);
  await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Toggle staging' })); });
  const aside = view.getByRole('complementary', { name: 'Note staging' });
  vi.spyOn(aside, 'getBoundingClientRect').mockReturnValue({ left: 800, top: 0, right: 1000, bottom: 600, width: 200, height: 600 } as DOMRect);
  return { ...view, aside };
}

function pointer(target: HTMLElement | Window, type: string, clientX: number, clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, { pointerId: { value: 5 }, clientX: { value: clientX }, clientY: { value: clientY } });
  fireEvent(target, event);
}

function ids(aside: HTMLElement) {
  return Array.from(aside.querySelectorAll<HTMLElement>('[data-tray-placement-id]')).map((row) => row.dataset.trayPlacementId);
}

describe('Staging gesture and sidebar integration with isolated HTTP memory', () => {
  it('restores drag collisions, flushes the draft before the placement, renders the moved row, and undoes to the pre-drag position', async () => {
    let finishFlush!: (ready: boolean) => void;
    const flushGate = new Promise<boolean>((resolve) => { finishFlush = resolve; });
    const view = await openFixture(flushGate);
    fireEvent.change(view.getByRole('textbox', { name: 'Block draft' }), { target: { value: 'Fresh unsaved synthetic draft' } });
    pointer(view.getByRole('button', { name: 'Move moving' }), 'pointerdown', 100, 20);
    pointer(window, 'pointermove', 100, 70);
    const paper = view.getByTestId('paper');
    expect(Number.parseFloat(view.container.querySelector<HTMLElement>('[data-paper-block="neighbor"]')!.style.top)).toBeGreaterThan(neighbor.y);
    expect(paper.dataset.temporary).toBe('true');
    expect(paper.dataset.snapped).toBe('true');
    pointer(window, 'pointerup', 850, 120);
    expect(view.container.querySelector<HTMLElement>('[data-paper-block="neighbor"]')!.style.top).toBe('100px');
    expect(view.container.querySelector<HTMLElement>('[data-paper-block="moving"]')!.style.top).toBe('20px');
    expect(paper.dataset.temporary).toBe('false');
    expect(paper.dataset.snapped).toBe('false');
    expect(writes).toEqual([]);
    expect(ids(view.aside)).not.toContain('placement-moving');
    await act(async () => { finishFlush(true); await flushGate; });
    await waitFor(() => expect(ids(view.aside)).toContain('placement-moving'));
    expect(writes).toEqual(['content', 'placement']);
    expect(view.aside.textContent).toContain('Fresh unsaved synthetic draft');
    expect(view.container.querySelector('[data-paper-block="moving"]')).toBeNull();
    expect(store.placements.find((item) => item.placementId === 'placement-moving')).toMatchObject({ surface: 'tray', x: 0, y: 0, width: 0, height: 0, orderIndex: 3 });
    expect(store.blocks.find((item) => item.id === 'neighbor')!.canvas_layout).toEqual(neighbor);
    expect(ordinarySave).not.toHaveBeenCalled();
    expect(ordinaryHistory).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Undo staging move' })); });
    await waitFor(() => expect(view.container.querySelector('[data-paper-block="moving"]')).not.toBeNull());
    expect(ids(view.aside)).not.toContain('placement-moving');
    expect(view.container.querySelector<HTMLElement>('[data-paper-block="moving"]')!.style.top).toBe('20px');
    expect(view.container.querySelector<HTMLElement>('[data-paper-block="moving"]')!.style.left).toBe('100px');
    expect(view.container.querySelector<HTMLElement>('[data-paper-block="neighbor"]')!.style.top).toBe('100px');
    expect(store.blocks.find((item) => item.id === 'moving')!.canvas_layout).toMatchObject(original);
    expect(writes).toEqual(['content', 'placement', 'placement']);
  });

  it('retains the mixed sidebar order and persisted rows when the real controller receives a rejected reorder request', async () => {
    const view = await openFixture();
    failOrder = true;
    const before = copy(store.placements);
    const beforeIds = ids(view.aside);
    const rows = view.aside.querySelectorAll<HTMLElement>('[data-tray-placement-id]');
    const data = new Map<string, string>();
    const dataTransfer = { get types() { return [...data.keys()]; }, effectAllowed: 'move', dropEffect: 'move',
      setData: (type: string, value: string) => data.set(type, value), getData: (type: string) => data.get(type) ?? '' };
    fireEvent.dragStart(rows[2], { dataTransfer });
    expect(dataTransfer.getData(TRAY_DRAG_TYPE)).toBe('placement-mount');
    vi.spyOn(rows[0], 'getBoundingClientRect').mockReturnValue({ top: 100, height: 40 } as DOMRect);
    const drop = createEvent.drop(rows[0], { dataTransfer });
    Object.defineProperty(drop, 'clientY', { value: 105 });
    await act(async () => { fireEvent(rows[0], drop); });
    expect(http.put).toHaveBeenCalledExactlyOnceWith(`/notes/${noteId}/tray/order`, {
      placementIds: ['placement-mount', 'placement-staged', 'placement-drawing'],
    });
    expect(ids(view.aside)).toEqual(beforeIds);
    expect(store.placements).toEqual(before);
    expect(view.getByRole('alert').textContent).toContain('previous order has been kept');
  });
});
