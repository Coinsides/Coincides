import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Note, NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import { insertPageFrameAfter, normalizePageFrameCollection } from '../pageFrameCollectionService';
import { buildPageFrameWallEdit, movePageFrameWall } from '../pageFrameWallService';
import { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';
import { usePlacementHistory } from './usePlacementHistory';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn(), addToast: vi.fn() }));
vi.mock('@/services/api', () => ({
  getToken: () => null, setToken: vi.fn(), default: mocks }));
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (select: (state: { addToast: typeof mocks.addToast }) => unknown) => select({ addToast: mocks.addToast }),
}));

const onNoteLoaded = vi.fn();
const clearLayoutDraftForBlock = vi.fn();
const setLayoutDraftForBlock = vi.fn();
const applyLayoutDrafts = vi.fn();
const persistLayoutSnapshot = vi.fn();

function fixture(noteId: string) {
  const note: Note = { id: noteId, course_id: '', title: noteId, description: null, status: 'active', metadata: {} };
  const frameId = `${noteId}-frame`;
  const collection = normalizePageFrameCollection({
    pageFrames: [0, 1].map((index) => ({
      id: index ? `${frameId}-2` : frameId,
      role: index ? 'secondary_page_frame' as const : 'primary_page_frame' as const,
      exportable: true, pageSize: 'A4' as const, x: 0, y: index * 1400, width: 904, height: 1320,
      contentInset: { top: 0, right: 72, bottom: 96, left: 72 },
    })),
    primaryFrameId: frameId, selectedFrameId: frameId,
  });
  const block = (kind: 'auto' | 'manual'): NoteBlock => ({
    id: `${noteId}-${kind}`, placement_id: `${noteId}-${kind}-placement`,
    display_overrides_json: {}, block_type: 'text', title: null,
    content_json: { body: kind }, plain_text: kind, metadata: {}, order_index: kind === 'auto' ? 0 : 1,
    source_references: [], canvas_layout: null,
  });
  const blocks = [block('auto'), block('manual')];
  const layout: BlockBoxLayout = {
    x: 260, y: 40, width: 500, height: 100, frame_id: frameId,
    surface: 'formal_page', boundary_role: 'inside', width_mode: 'manual', coordinate_space: 'page_frame_local',
  };
  const persistence = {
    pageFrameCollection: collection,
    blockLayouts: blocks.map((item, index) => ({
      block_id: item.id, placement_id: item.placement_id,
      layout: index ? layout : { ...layout, x: 0, width: 760, width_mode: 'auto' },
    })),
    canvasObjects: [{ objectId: `${noteId}-image`, canvasId: noteId, kind: 'image', backing: 'asset', objectClass: 'media', status: 'active' }],
    canvasPlacements: [{
      placementId: `${noteId}-image-placement`, objectId: `${noteId}-image`, canvasId: noteId,
      x: 200, y: 60, width: 560, height: 300, rotation: 0, frameId,
      surface: 'formal_page', boundaryRole: 'inside', coordinate_space: 'page_frame_local',
    }],
  };
  return { note, blocks, collection, persistence };
}

type Adapter = ReturnType<typeof useNoteCanvasDataAdapter>;
function wallEdit(adapter: Adapter, side: 'left' | 'right' = 'right', delta = 168) {
  const before = adapter.pageFrameCollection!;
  return buildPageFrameWallEdit({
    before, after: movePageFrameWall(before, before.primaryFrameId!, side, delta),
    blocks: adapter.blocks, objects: adapter.persistedCanvasObjects, placements: adapter.persistedCanvasPlacements,
    coordinateContract: adapter.coordinateContract,
  });
}

function visibleState(adapter: Adapter) {
  return structuredClone({ collection: adapter.pageFrameCollection, blocks: adapter.blocks, placements: adapter.persistedCanvasPlacements });
}

function wrapper({ children }: { children: ReactNode }) {
  return <StrictMode><MemoryRouter>{children}</MemoryRouter></StrictMode>;
}

function renderAdapter() {
  return renderHook(({ noteId }) => {
    const adapter = useNoteCanvasDataAdapter({ noteId, onNoteLoaded, clearLayoutDraftForBlock, setLayoutDraftForBlock });
    const history = usePlacementHistory({
      noteId, generation: adapter.textHistoryGeneration, applyLayoutDrafts, persistLayoutSnapshot, target: null,
    });
    return { adapter, history };
  }, { initialProps: { noteId: 'note-1' }, wrapper });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

describe('page wall adapter persistence through the real collection repository', () => {
  let fixtures: Record<string, ReturnType<typeof fixture>>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    fixtures = { 'note-1': fixture('note-1'), 'note-2': fixture('note-2') };
    mocks.get.mockImplementation(async (url: string) => {
      if (url === '/palette-colors') return { data: [] };
      if (url === '/canvas-objects/coordinate-contract') return { data: { coordinate_contract: 'v2' } };
      if (url.startsWith('/boards/text-ranges/by-note/')) return { data: { text_ranges: [] } };
      for (const [id, data] of Object.entries(fixtures)) {
        if (url === `/notes/${id}`) return { data: structuredClone(data.note) };
        if (url === `/notes/${id}/blocks`) return { data: structuredClone(data.blocks) };
        if (url === `/canvas-objects/by-note/${id}`) return { data: structuredClone(data.persistence) };
        if (url === `/annotation-truths/by-note/${id}`) return { data: [] };
      }
      if (['/content-groups', '/group-folders', '/purposes', '/templates'].includes(url)) return { data: [] };
      throw new Error(`Unexpected fixture GET ${url}`);
    });
    mocks.put.mockImplementation(async (_url: string, payload: { collection: unknown }) => ({ data: structuredClone(payload.collection) }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('sends one PUT containing all insets plus both clamp batches and keeps auto storage unchanged', async () => {
    const { result } = renderAdapter();
    await waitFor(() => expect(result.current.adapter.blocks).toHaveLength(2));
    const autoBefore = structuredClone(result.current.adapter.blocks[0]);
    const edit = wallEdit(result.current.adapter);
    await act(async () => expect(await result.current.adapter.savePageFrameWalls(edit.after)).toBe(true));
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put.mock.calls[0][0]).toBe('/canvas-objects/by-note/note-1/page-frame-collection');
    const payload = mocks.put.mock.calls[0][1];
    expect(payload.collection.pageFrames.map((frame: any) => frame.contentInset.right)).toEqual([240, 240]);
    expect(payload.layout_updates).toHaveLength(1);
    expect(payload.layout_updates[0]).toMatchObject({
      block_id: 'note-1-manual', placement_id: 'note-1-manual-placement',
      layout: { x: 92, width: 500, width_mode: 'manual', coordinate_space: 'page_frame_local' },
    });
    expect(payload.object_layout_updates).toHaveLength(1);
    expect(payload.object_layout_updates[0]).toMatchObject({
      object_id: 'note-1-image', placement_id: 'note-1-image-placement',
      layout: { x: 32, width: 560, coordinate_space: 'page_frame_local' },
    });
    expect(result.current.adapter.blocks[0]).toEqual(autoBefore);
    expect(result.current.adapter.blocks[1].canvas_layout).toMatchObject({ x: 92, width: 500 });
    expect(result.current.adapter.persistedCanvasPlacements[0]).toMatchObject({ x: 104, width: 560 });
    expect(clearLayoutDraftForBlock).toHaveBeenCalledExactlyOnceWith('note-1-manual');
  });

  it('reprojects generic local boxes once on left-wall expansion under StrictMode without sending coordinates', async () => {
    const { result } = renderAdapter();
    await waitFor(() => expect(result.current.adapter.blocks).toHaveLength(2));
    expect(result.current.adapter.persistedCanvasPlacements[0].x).toBe(272);
    const beforeBlocks = structuredClone(result.current.adapter.blocks);
    const rawBefore = JSON.stringify(fixtures['note-1'].persistence.canvasPlacements);
    const edit = wallEdit(result.current.adapter, 'left', -48);
    expect(edit.after.layoutUpdates).toEqual([]);
    expect(edit.after.objectLayoutUpdates).toEqual([]);
    await act(async () => expect(await result.current.adapter.savePageFrameWalls(edit.after)).toBe(true));
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put.mock.calls[0][1]).not.toHaveProperty('layout_updates');
    expect(mocks.put.mock.calls[0][1]).not.toHaveProperty('object_layout_updates');
    expect(result.current.adapter.persistedCanvasPlacements[0].x).toBe(224);
    expect(result.current.adapter.blocks).toEqual(beforeBlocks);
    expect(JSON.stringify(fixtures['note-1'].persistence.canvasPlacements)).toBe(rawBefore);
  });

  it('undo and redo share usePlacementHistory and each send one symmetric batch with local state restored', async () => {
    const { result } = renderAdapter();
    await waitFor(() => expect(result.current.adapter.blocks).toHaveLength(2));
    const initial = visibleState(result.current.adapter);
    const edit = wallEdit(result.current.adapter);
    await act(async () => {
      expect(await result.current.adapter.savePageFrameWalls(edit.after)).toBe(true);
      expect(result.current.history.pushHistoryEntry({
        type: 'reversibleEdit',
        undo: () => result.current.adapter.savePageFrameWalls(edit.before),
        redo: () => result.current.adapter.savePageFrameWalls(edit.after),
      })).toBe(true);
    });
    const after = visibleState(result.current.adapter);
    await act(async () => expect(await result.current.history.undoRuntimeHistory()).toBe(true));
    expect(visibleState(result.current.adapter)).toEqual(initial);
    await act(async () => expect(await result.current.history.redoRuntimeHistory()).toBe(true));
    expect(visibleState(result.current.adapter)).toEqual(after);
    expect(mocks.put).toHaveBeenCalledTimes(3);
    expect(mocks.put.mock.calls.map(([, payload]) => payload.layout_updates[0].layout.x)).toEqual([92, 260, 92]);
    expect(mocks.put.mock.calls.map(([, payload]) => payload.object_layout_updates[0].layout.x)).toEqual([32, 200, 32]);
  });

  it('returns false on failed save and preserves collection, blocks and generic positions', async () => {
    const { result } = renderAdapter();
    await waitFor(() => expect(result.current.adapter.blocks).toHaveLength(2));
    const before = visibleState(result.current.adapter);
    const edit = wallEdit(result.current.adapter);
    mocks.put.mockRejectedValueOnce(new Error('Synthetic write failure'));
    await act(async () => expect(await result.current.adapter.savePageFrameWalls(edit.after)).toBe(false));
    expect(visibleState(result.current.adapter)).toEqual(before);
    expect(clearLayoutDraftForBlock).not.toHaveBeenCalled();
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.addToast).toHaveBeenCalledWith('error', expect.stringMatching(/margins/));
  });

  it('undo preserves a subsequently inserted page and unrelated frame properties while restoring note insets', async () => {
    const { result } = renderAdapter();
    await waitFor(() => expect(result.current.adapter.blocks).toHaveLength(2));
    const edit = wallEdit(result.current.adapter);
    await act(async () => {
      expect(await result.current.adapter.savePageFrameWalls(edit.after)).toBe(true);
      result.current.history.pushHistoryEntry({
        type: 'reversibleEdit',
        undo: () => result.current.adapter.savePageFrameWalls(edit.before),
        redo: () => result.current.adapter.savePageFrameWalls(edit.after),
      });
    });
    const inserted = insertPageFrameAfter(result.current.adapter.pageFrameCollection!, 'note-1-frame', { id: 'new-page' });
    const updated = {
      ...inserted,
      pageFrames: inserted.pageFrames.map((frame) => frame.id === 'new-page' ? {
        ...frame, exportable: false, contentInset: { ...frame.contentInset, top: 20, bottom: 110 },
      } : frame),
    };
    await act(async () => { await result.current.adapter.savePageFrameCollection(updated); });
    const topology = result.current.adapter.pageFrameCollection!.pageFrames.map(({ id, x, y }) => ({ id, x, y }));
    const beforeUndoRequests = mocks.put.mock.calls.length;
    await act(async () => expect(await result.current.history.undoRuntimeHistory()).toBe(true));
    expect(mocks.put).toHaveBeenCalledTimes(beforeUndoRequests + 1);
    const undone = result.current.adapter.pageFrameCollection!;
    expect(undone.pageFrames.map(({ id, x, y }) => ({ id, x, y }))).toEqual(topology);
    expect(undone.pageFrames.map((frame) => [frame.contentInset.left, frame.contentInset.right])).toEqual([[72, 72], [72, 72], [72, 72]]);
    expect(undone.pageFrames.find((frame) => frame.id === 'new-page')).toMatchObject({
      exportable: false, contentInset: { top: 20, bottom: 110 },
    });
    await act(async () => expect(await result.current.history.redoRuntimeHistory()).toBe(true));
    expect(result.current.adapter.pageFrameCollection!.pageFrames.map(({ id, x, y }) => ({ id, x, y }))).toEqual(topology);
    expect(result.current.adapter.pageFrameCollection!.pageFrames.map((frame) => frame.contentInset.right)).toEqual([240, 240, 240]);
  });

  it('ignores a held note-1 response after note-2 has loaded', async () => {
    const { result, rerender } = renderAdapter();
    await waitFor(() => expect(result.current.adapter.blocks).toHaveLength(2));
    const edit = wallEdit(result.current.adapter);
    const held = deferred<{ data: unknown }>();
    mocks.put.mockReturnValueOnce(held.promise);
    let saved!: Promise<boolean>;
    act(() => { saved = result.current.adapter.savePageFrameWalls(edit.after); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    rerender({ noteId: 'note-2' });
    await waitFor(() => expect(result.current.adapter.note?.id).toBe('note-2'));
    const secondNote = visibleState(result.current.adapter);
    await act(async () => {
      held.resolve({ data: edit.after.collection });
      expect(await saved).toBe(false);
    });
    expect(visibleState(result.current.adapter)).toEqual(secondNote);
    expect(clearLayoutDraftForBlock).not.toHaveBeenCalled();
  });

  it('ignores an old response during note-2 loading before hydrated note identity catches up', async () => {
    const { result, rerender } = renderAdapter();
    await waitFor(() => expect(result.current.adapter.blocks).toHaveLength(2));
    const edit = wallEdit(result.current.adapter);
    const held = deferred<{ data: unknown }>();
    const secondNoteLoad = deferred<{ data: Note }>();
    const normalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((url: string) => url === '/notes/note-2' ? secondNoteLoad.promise : normalGet(url));
    mocks.put.mockReturnValueOnce(held.promise);
    let saved!: Promise<boolean>;
    act(() => { saved = result.current.adapter.savePageFrameWalls(edit.after); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    rerender({ noteId: 'note-2' });
    await waitFor(() => expect(result.current.adapter.loading).toBe(true));
    const loadingState = visibleState(result.current.adapter);
    await act(async () => {
      held.resolve({ data: edit.after.collection });
      expect(await saved).toBe(false);
    });
    expect(visibleState(result.current.adapter)).toEqual(loadingState);
    await act(async () => { secondNoteLoad.resolve({ data: fixtures['note-2'].note }); });
    await waitFor(() => expect(result.current.adapter.note?.id).toBe('note-2'));
    expect(result.current.adapter.pageFrameCollection?.primaryFrameId).toBe('note-2-frame');
  });

  it('ignores a response from an earlier visit after navigating away and back to the same note', async () => {
    const { result, rerender } = renderAdapter();
    await waitFor(() => expect(result.current.adapter.blocks).toHaveLength(2));
    const edit = wallEdit(result.current.adapter);
    const held = deferred<{ data: unknown }>();
    mocks.put.mockReturnValueOnce(held.promise);
    let saved!: Promise<boolean>;
    act(() => { saved = result.current.adapter.savePageFrameWalls(edit.after); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    rerender({ noteId: 'note-2' });
    await waitFor(() => expect(result.current.adapter.note?.id).toBe('note-2'));
    rerender({ noteId: 'note-1' });
    await waitFor(() => expect(result.current.adapter.note?.id).toBe('note-1'));
    const revisited = visibleState(result.current.adapter);
    await act(async () => {
      held.resolve({ data: edit.after.collection });
      expect(await saved).toBe(false);
    });
    expect(visibleState(result.current.adapter)).toEqual(revisited);
  });
});
