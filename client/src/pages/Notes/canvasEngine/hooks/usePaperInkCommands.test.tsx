import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePageFrameCollection } from '../pageFrameCollectionService';
import { paperFreehandSavePayload } from '../freehandService';
import type { CanvasObject, CanvasPlacement } from '../types';
import { useNoteCanvasDataAdapter, type PersistCanvasObjectInput } from './useNoteCanvasDataAdapter';
import { usePaperInkCommands } from './usePaperInkCommands';
import { usePlacementHistory } from './usePlacementHistory';

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn(), addToast: vi.fn() }));
vi.mock('@/services/api', () => ({
  getToken: () => null, setToken: vi.fn(), default: api }));
vi.mock('@/stores/uiStore', () => ({ useUIStore: (selector: (state: { addToast: typeof api.addToast }) => unknown) => selector(api) }));

const note = { id: 'ink-note', title: 'Synthetic paper ink', course_id: '', description: null, status: 'active', metadata: {} };
const collection = normalizePageFrameCollection({
  pageFrames: [{ id: 'ink-page', role: 'primary_page_frame', exportable: true,
    x: 84, y: 80, width: 794, height: 1320, pageSize: 'A4',
    contentInset: { left: 72, top: 96, right: 72, bottom: 96 } }],
  primaryFrameId: 'ink-page', selectedFrameId: 'ink-page',
});
const frame = collection.pageFrames[0];
const data = { points: [{ x: 2, y: 2 }, { x: 36, y: 18 }, { x: 74, y: 36 }],
  path: 'M 2 2 L 36 18 L 74 36', style: { color_token: 'ink', width: 2.5 } };
const object: CanvasObject = { objectId: 'ink-stroke', canvasId: 'primary-note-canvas', kind: 'freehand',
  backing: 'none', objectClass: 'pure', status: 'active', metadata: { freehand: data } };
const placement: CanvasPlacement = { placementId: 'ink-placement', objectId: object.objectId, canvasId: object.canvasId,
  frameId: frame.id, surface: 'formal_page', boundaryRole: 'inside', x: frame.x + frame.contentInset.left + 20,
  y: frame.y + frame.contentInset.top + 30, width: 80, height: 42, rotation: 0, zIndex: 1 };
const input = (): PersistCanvasObjectInput => structuredClone({ canvasObject: object, placement, contentMounts: [],
  payload: paperFreehandSavePayload(object, placement) });
const adapterOptions = { noteId: note.id, onNoteLoaded: vi.fn(), clearLayoutDraftForBlock: vi.fn(), setLayoutDraftForBlock: vi.fn() };
const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
let durable: Record<string, unknown> | null;
let boundaryAllowed: boolean;
let layoutX: number;

function subject() {
  return renderHook(() => {
    const adapter = useNoteCanvasDataAdapter(adapterOptions);
    const history = usePlacementHistory({ noteId: note.id, generation: adapter.textHistoryGeneration,
      beforeHistoryBoundary: () => boundaryAllowed,
      applyLayoutDrafts: (layouts) => { layoutX = layouts.existing.x; }, persistLayoutSnapshot: () => true, target: window });
    const commands = usePaperInkCommands({ noteId: note.id, generation: adapter.textHistoryGeneration,
      objects: adapter.persistedCanvasObjects, placements: adapter.persistedCanvasPlacements,
      persistCanvasObject: adapter.persistCanvasObject, deleteCanvasObject: adapter.deleteCanvasObject,
      boundary: () => boundaryAllowed, pushHistoryEntry: history.pushHistoryEntry,
      enqueueRuntimeHistoryOperation: history.enqueueRuntimeHistoryOperation });
    return { adapter, history, commands };
  }, { wrapper });
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  durable = null;
  boundaryAllowed = true;
  layoutX = 0;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  api.get.mockImplementation(async (url: string) => {
    if (url === '/palette-colors') return { data: [] };
    if (url === '/canvas-objects/coordinate-contract') return { data: { coordinate_contract: 'v2' } };
    if (url === `/notes/${note.id}`) return { data: note };
    if (url === `/canvas-objects/by-note/${note.id}`) return { data: { coordinateContract: 'v2', pageFrameCollection: collection,
      canvasObjects: durable ? [durable.canvasObject] : [], canvasPlacements: durable ? [durable.placement] : [] } };
    if (url.startsWith('/boards/text-ranges/by-note/')) return { data: { text_ranges: [] } };
    if ([`/notes/${note.id}/blocks`, `/annotation-truths/by-note/${note.id}`, '/content-groups', '/group-folders', '/purposes', '/templates'].includes(url)) return { data: [] };
    throw new Error(`Unexpected synthetic GET ${url}`);
  });
  api.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
    if (url !== `/canvas-objects/by-note/${note.id}/objects/${object.objectId}`) throw new Error(`Unexpected synthetic PUT ${url}`);
    const stored = payload.placement as Record<string, unknown>;
    durable = structuredClone({ canvasObject: { ...object, metadata: { freehand: payload.data } },
      placement: { ...stored, id: stored.placement_id || `${object.objectId}:placement`, object_id: object.objectId,
        metadata: { layout_policy: { coordinate_space: 'page_frame_local' } } }, contentMounts: [] });
    return { data: durable };
  });
  api.delete.mockImplementation(async (url: string) => {
    if (url !== `/canvas-objects/by-note/${note.id}/objects/${object.objectId}`) throw new Error(`Unexpected synthetic DELETE ${url}`);
    durable = null;
    return { data: { deleted: true } };
  });
});
afterEach(() => vi.restoreAllMocks());

describe('C4 paper ink through the existing canvas command stack and persistence adapter', () => {
  it('moves and deletes a reloaded stroke with symmetric placement undo/redo on the paper stack', async () => {
    const first = subject();
    await waitFor(() => expect(first.result.current.adapter.loading).toBe(false));
    await act(async () => { await first.result.current.commands.persistCanvasObject(input()); });
    const original = structuredClone(durable);
    first.unmount();
    const { result } = subject();
    await waitFor(() => expect(result.current.adapter.persistedCanvasObjects).toHaveLength(1));
    const moved = input();
    moved.placement = { ...moved.placement, x: placement.x + 80, y: placement.y + 35 };
    moved.payload = paperFreehandSavePayload(moved.canvasObject, moved.placement);
    await act(async () => { expect(await result.current.commands.persistCanvasObject(moved)).toBe(true); });
    const afterMove = structuredClone(durable);
    expect(afterMove).toMatchObject({ placement: { x: 100, y: 65, frame_id: frame.id } });
    expect(result.current.adapter.persistedCanvasPlacements[0]).toMatchObject(moved.placement);
    await act(async () => { expect(await result.current.commands.deleteCanvasObject(object.objectId)).toBe(true); });
    expect(durable).toBeNull();
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durable).toEqual(afterMove);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durable).toEqual(original);
    await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(durable).toEqual(afterMove);
    await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(durable).toBeNull();
  });

  it('serializes immediate moves and deletion before React publishes them, recovering each exact position', async () => {
    const { result } = subject();
    await waitFor(() => expect(result.current.adapter.loading).toBe(false));
    await act(async () => {
      await result.current.commands.persistCanvasObject(input());
      for (const dx of [10, 20]) {
        const moved = input();
        moved.placement.x += dx;
        moved.payload = paperFreehandSavePayload(moved.canvasObject, moved.placement);
        expect(await result.current.commands.persistCanvasObject(moved)).toBe(true);
      }
      expect(await result.current.commands.deleteCanvasObject(object.objectId)).toBe(true);
      for (const x of [40, 30, 20]) {
        expect(await result.current.history.undoRuntimeHistory()).toBe(true);
        expect(durable).toMatchObject({ placement: { x } });
      }
      expect(await result.current.history.undoRuntimeHistory()).toBe(true);
      expect(durable).toBeNull();
    });
  });

  it('does not record a failed move and keeps a failed move undo available for retry', async () => {
    const { result } = subject();
    await waitFor(() => expect(result.current.adapter.loading).toBe(false));
    await act(async () => { await result.current.commands.persistCanvasObject(input()); });
    const original = structuredClone(durable);
    const moved = input();
    moved.placement.x += 70;
    moved.payload = paperFreehandSavePayload(moved.canvasObject, moved.placement);
    api.put.mockRejectedValueOnce(new Error('synthetic move failure'));
    await act(async () => { expect(await result.current.commands.persistCanvasObject(moved)).toBe(false); });
    expect(durable).toEqual(original);
    await act(async () => { expect(await result.current.commands.persistCanvasObject(moved)).toBe(true); });
    api.put.mockRejectedValueOnce(new Error('synthetic move undo failure'));
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(durable).toMatchObject({ placement: { x: 90 } });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durable).toEqual(original);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durable).toBeNull();
  });

  it('draws one page-owned stroke, survives reload and erases the complete persisted object', async () => {
    const first = subject();
    await waitFor(() => expect(first.result.current.adapter.loading).toBe(false));
    await act(async () => { expect(await first.result.current.commands.persistCanvasObject(input())).toBe(true); });
    expect(api.put).toHaveBeenCalledWith(`/canvas-objects/by-note/${note.id}/objects/${object.objectId}`, expect.objectContaining({
      kind: 'freehand', data, placement: expect.objectContaining({ frame_id: frame.id, surface: 'formal_page',
        boundary_role: 'inside', coordinate_space: 'page_frame_local', x: 20, y: 30 }),
    }));
    first.unmount();
    const reloaded = subject();
    await waitFor(() => expect(reloaded.result.current.adapter.persistedCanvasObjects).toHaveLength(1));
    expect(reloaded.result.current.adapter.persistedCanvasObjects[0]).toMatchObject({ objectId: object.objectId, kind: 'freehand', metadata: { freehand: data } });
    expect(reloaded.result.current.adapter.persistedCanvasPlacements[0]).toMatchObject(placement);
    await act(async () => { expect(await reloaded.result.current.commands.deleteCanvasObject(object.objectId)).toBe(true); });
    expect(durable).toBeNull();
    expect(reloaded.result.current.adapter.persistedCanvasObjects).toEqual([]);
    reloaded.unmount();
    const erasedReload = subject();
    await waitFor(() => expect(erasedReload.result.current.adapter.loading).toBe(false));
    expect(erasedReload.result.current.adapter.persistedCanvasObjects).toEqual([]);
  });

  it('replays create, existing layout and whole-stroke erase in one Ctrl+Z/Y order using the same identities', async () => {
    const { result } = subject();
    await waitFor(() => expect(result.current.adapter.loading).toBe(false));
    await act(async () => { expect(await result.current.commands.persistCanvasObject(input())).toBe(true); });
    const originalDurable = structuredClone(durable);
    act(() => {
      layoutX = 50;
      result.current.history.pushLayoutHistory({ existing: { x: 0, y: 0, width: 100, height: 40 } },
        { existing: { x: 50, y: 0, width: 100, height: 40 } });
    });
    await act(async () => { expect(await result.current.commands.deleteCanvasObject(object.objectId)).toBe(true); });
    const key = async (key: 'z' | 'y') => {
      await act(async () => {
        const event = new KeyboardEvent('keydown', { key, ctrlKey: true, cancelable: true });
        window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        await result.current.history.whenHistoryIdle();
      });
    };
    await key('z');
    expect(durable).toEqual(originalDurable);
    expect(layoutX).toBe(50);
    await key('z');
    expect(layoutX).toBe(0);
    expect(durable).toEqual(originalDurable);
    await key('z');
    expect(durable).toBeNull();
    await key('y');
    expect(durable).toEqual(originalDurable);
    await key('y');
    expect(layoutX).toBe(50);
    await key('y');
    expect(durable).toBeNull();
    expect(api.put.mock.calls.every(([url]) => url.endsWith(`/objects/${object.objectId}`))).toBe(true);
  });

  it('keeps failed replay available for retry and does not record unsuccessful draw or erase', async () => {
    const { result } = subject();
    await waitFor(() => expect(result.current.adapter.loading).toBe(false));
    api.put.mockRejectedValueOnce(new Error('synthetic draw failure'));
    await act(async () => {
      expect(await result.current.commands.persistCanvasObject(input())).toBe(false);
      expect(await result.current.history.undoRuntimeHistory()).toBe(false);
    });
    await act(async () => { expect(await result.current.commands.persistCanvasObject(input())).toBe(true); });
    api.delete.mockRejectedValueOnce(new Error('synthetic erase failure'));
    await act(async () => { expect(await result.current.commands.deleteCanvasObject(object.objectId)).toBe(false); });
    expect(durable).not.toBeNull();
    api.delete.mockRejectedValueOnce(new Error('synthetic undo failure'));
    await act(async () => {
      expect(await result.current.history.undoRuntimeHistory()).toBe(false);
      expect(await result.current.history.undoRuntimeHistory()).toBe(true);
    });
    expect(durable).toBeNull();
    api.put.mockRejectedValueOnce(new Error('synthetic redo failure'));
    await act(async () => {
      expect(await result.current.history.redoRuntimeHistory()).toBe(false);
      expect(await result.current.history.redoRuntimeHistory()).toBe(true);
    });
    expect(durable).not.toBeNull();
  });

  it('seals the shared boundary and serializes repeated erase samples after an immediate draw', async () => {
    const { result } = subject();
    await waitFor(() => expect(result.current.adapter.loading).toBe(false));
    boundaryAllowed = false;
    await act(async () => { expect(await result.current.commands.persistCanvasObject(input())).toBe(false); });
    expect(api.put).not.toHaveBeenCalled();
    boundaryAllowed = true;
    await act(async () => {
      expect(await result.current.commands.persistCanvasObject(input())).toBe(true);
      const first = result.current.commands.deleteCanvasObject(object.objectId);
      const repeated = result.current.commands.deleteCanvasObject(object.objectId);
      expect(await first).toBe(true);
      expect(await repeated).toBe(false);
    });
    expect(api.delete).toHaveBeenCalledTimes(1);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durable).not.toBeNull();
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durable).toBeNull();
  });
});
