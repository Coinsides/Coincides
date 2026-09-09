import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrayController } from './useTrayController';
import type { RuntimeHistoryEntry } from '../historyService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { CanvasObject, CanvasPlacement, ContentMount } from '../types';
import { createInFlightWriteRegistry } from '../inFlightWriteRegistry';

const mocks = vi.hoisted(() => ({ save: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../canvasObjectRepository', () => ({ saveBlockCanvasPlacementForNote: mocks.save }));
vi.mock('@/services/api', () => ({ default: { post: mocks.post, put: mocks.put } }));
const block: NoteBlock = { id:'block', placement_id:'placement', display_overrides_json:{},
  block_type:'paragraph', title:null, content_json:{body:'Draft'}, plain_text:'Draft',
  metadata:{}, order_index:0, source_references:[] };

function input() {
  return {noteId:'note',enabled:true,blocks:[block],objects:[],placements:[],mounts:[],
    selectedBlockId:'block',blockLayouts:{block:{x:0,y:100,width:760,height:72,surface:'formal_page' as const}},
    collection:null,pageOffsetX:0,refresh:vi.fn().mockResolvedValue(undefined),clearSelection:vi.fn(),
    pushHistory:vi.fn<(entry: RuntimeHistoryEntry) => void>(),flushBlock:vi.fn().mockResolvedValue(true)};
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function mixedInput() {
  const objects: CanvasObject[] = [
    { objectId: 'paragraph', canvasId: 'note', kind: 'paragraph_block_projection', backing: 'note_block', objectClass: 'block_backed', status: 'active', source: 'runtime_seed' },
    { objectId: 'shape', canvasId: 'note', kind: 'shape', backing: 'none', objectClass: 'pure', status: 'active', source: 'runtime_seed' },
    { objectId: 'mounted', canvasId: 'note', kind: 'content_group_projection', backing: 'content_group', objectClass: 'projection_backed', status: 'active', source: 'runtime_seed' },
  ];
  const placements: CanvasPlacement[] = objects.map((object, index) => ({
    placementId: index ? `p-${index}` : 'placement', objectId: object.objectId, canvasId: 'note',
    surface: 'tray', boundaryRole: 'outside', x: 0, y: 0, width: 0, height: 0, rotation: 0, zIndex: 10 - index, orderIndex: index,
  }));
  const mounts: ContentMount[] = [
    { mountId: 'm1', objectId: 'paragraph', targetKind: 'note_block', targetId: 'block', projectionMode: 'owned', syncPolicy: 'manual' },
    { mountId: 'm2', objectId: 'mounted', targetKind: 'content_group', targetId: 'group', projectionMode: 'reference', syncPolicy: 'manual' },
  ];
  return { ...input(), objects, placements, mounts };
}

describe('ordinary reversible tray edits', () => {
  beforeEach(() => {mocks.save.mockReset().mockResolvedValue({});mocks.post.mockReset();mocks.put.mockReset();});
  it('flushes the explicitly dragged block before moving it and uses its pre-drag layout for undo', async () => {
    const options = input();
    const draggedBlock = { ...block, id: 'dragged', placement_id: 'dragged-placement' };
    const before: BlockBoxLayout = { x: 80, y: 200, width: 320, height: 90, surface: 'formal_page', export_role: 'included', ai_visibility: 'hidden' };
    const pendingFlush = deferred<boolean>();
    options.flushBlock.mockReturnValueOnce(pendingFlush.promise);
    const { result } = renderHook(() => useTrayController({
      ...options, blocks: [block, draggedBlock],
      // The selected block and in-flight geometry both differ from the gesture's captured identity/layout.
      blockLayouts: { ...options.blockLayouts, dragged: { ...before, x: 400, y: 450 } },
    }));
    let pending!: Promise<void>;
    act(() => { pending = result.current.moveBlockToTray('dragged', before); });
    expect(options.flushBlock).toHaveBeenCalledExactlyOnceWith(draggedBlock);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(options.pushHistory).not.toHaveBeenCalled();
    await act(async () => { pendingFlush.resolve(true); await pending; });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0]).toMatchObject({
      block: draggedBlock, layout: { surface: 'tray', x: 0, y: 0, width: 0, height: 0, export_role: 'included', ai_visibility: 'hidden' },
    });
    expect(options.refresh).toHaveBeenCalledWith(['dragged']);
    const edit = options.pushHistory.mock.calls[0][0];
    if (edit.type !== 'reversibleEdit') throw new Error('Expected ordinary history edit');
    await act(async () => { expect(await edit.undo()).toBe(true); });
    expect(mocks.save.mock.calls[1][0]).toMatchObject({ block: draggedBlock, layout: before });
    expect(mocks.save.mock.calls[1][0].layout).toEqual(before);
    await act(async () => { expect(await edit.redo()).toBe(true); });
    expect(mocks.save.mock.calls[2][0].layout).toEqual(mocks.save.mock.calls[0][0].layout);
  });
  it.each(['pending', 'rejected'] as const)('preserves the paper block when its drag flush is %s', async (failure) => {
    const options = input();
    if (failure === 'pending') options.flushBlock.mockResolvedValue(false);
    else options.flushBlock.mockRejectedValue(new Error('Synthetic content save rejection'));
    const { result } = renderHook(() => useTrayController(options));
    await act(async () => { await result.current.moveBlockToTray(block.id, options.blockLayouts.block); });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(options.refresh).not.toHaveBeenCalled();
    expect(options.clearSelection).not.toHaveBeenCalled();
    expect(options.pushHistory).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
    expect(result.current.busy).toBe(false);
  });
  it('saves one mixed placement order through the note endpoint and reads that same order after reload', async () => {
    const options = mixedInput();
    const pendingWrite = deferred<void>();
    mocks.put.mockReturnValueOnce(pendingWrite.promise);
    const { result, rerender, unmount } = renderHook((props) => useTrayController(props), { initialProps: options });
    const order = ['p-2', 'placement', 'p-1'];
    expect(result.current.entries.map((entry) => entry.category)).toEqual(['block', 'object', 'mount']);
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.reorder(order); });
    expect(mocks.put).toHaveBeenCalledExactlyOnceWith('/notes/note/tray/order', { placementIds: order });
    expect(result.current.entries.map((entry) => entry.placement.placementId)).toEqual(['placement', 'p-1', 'p-2']);
    expect(options.refresh).not.toHaveBeenCalled();
    await act(async () => { pendingWrite.resolve(); expect(await pending).toBe(true); });
    expect(options.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
    const refreshed = { ...options, placements: options.placements.map((placement) => ({ ...placement, orderIndex: order.indexOf(placement.placementId) })) };
    rerender(refreshed);
    expect(result.current.entries.map((entry) => entry.placement.placementId)).toEqual(order);
    unmount();
    const reloaded = renderHook(() => useTrayController(refreshed));
    expect(reloaded.result.current.entries.map((entry) => entry.placement.placementId)).toEqual(order);
    expect(reloaded.result.current.entries.map((entry) => entry.category)).toEqual(['mount', 'block', 'object']);
  });
  it('leaves the complete original order and shows an error when the order request fails', async () => {
    const options = mixedInput();
    const originalPlacements = structuredClone(options.placements);
    mocks.put.mockRejectedValueOnce(new Error('Synthetic order rejection'));
    const { result } = renderHook(() => useTrayController(options));
    await act(async () => { expect(await result.current.reorder(['p-2', 'placement', 'p-1'])).toBe(false); });
    expect(result.current.entries.map((entry) => entry.placement.placementId)).toEqual(['placement', 'p-1', 'p-2']);
    expect(options.placements).toEqual(originalPlacements);
    expect(result.current.error).toBeTruthy();
    expect(result.current.busy).toBe(false);
    expect(options.refresh).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(options.pushHistory).not.toHaveBeenCalled();
  });
  it('still drops a staged block back onto paper and restores its staging placement on undo', async () => {
    const before: BlockBoxLayout = { x: 0, y: 0, width: 0, height: 0, surface: 'tray', order_index: 0 };
    const options = { ...mixedInput(), blocks: [{ ...block, canvas_layout: { ...before } }] };
    const paperLayout: BlockBoxLayout = { x: 20, y: 100, width: 320, height: 72, surface: 'formal_page' };
    const { result } = renderHook(() => useTrayController(options));
    await act(async () => { await result.current.dropOnPaper('placement', paperLayout); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0].layout).toMatchObject({ ...paperLayout, coordinate_space: 'page_frame_local' });
    expect(options.refresh).toHaveBeenCalledWith(['block']);
    const edit = options.pushHistory.mock.calls[0][0];
    if (edit.type !== 'reversibleEdit') throw new Error('Expected ordinary history edit');
    await act(async () => { expect(await edit.undo()).toBe(true); });
    expect(mocks.save.mock.calls[1][0].layout).toEqual(before);
    await act(async () => { expect(await edit.redo()).toBe(true); });
    expect(mocks.save.mock.calls[2][0].layout).toEqual(mocks.save.mock.calls[0][0].layout);
  });
  it('waits for the editor save and retains undo/redo even when refreshing the saved edit fails', async () => {
    const options=input();
    let finish!: (saved: boolean) => void;
    options.flushBlock.mockReturnValue(new Promise<boolean>((resolve) => {finish=resolve;}));
    options.refresh.mockRejectedValue(new Error('Synthetic refresh failure'));
    const {result}=renderHook(()=>useTrayController(options));
    let pending!: Promise<void>;
    act(()=>{pending=result.current.moveSelectedToTray();});
    expect(mocks.save).not.toHaveBeenCalled();
    await act(async()=>{finish(true);await pending;});
    expect(mocks.save.mock.calls[0][0].layout).toMatchObject({surface:'tray',order_index:0,x:0,y:0,width:0,height:0});
    expect(result.current.error).toContain('edit was saved');
    const edit=options.pushHistory.mock.calls[0][0];
    if(edit.type!=='reversibleEdit')throw new Error('Expected ordinary history edit');
    await act(async()=>{expect(await edit.undo()).toBe(true);});
    expect(mocks.save.mock.calls[1][0].layout).toEqual(options.blockLayouts.block);
    await act(async()=>{expect(await edit.redo()).toBe(true);});
    expect(mocks.save.mock.calls[2][0].layout.surface).toBe('tray');
  });
  it('does not remove a block with a pending content save', async () => {
    const options=input();options.flushBlock.mockResolvedValue(false);
    const {result}=renderHook(()=>useTrayController(options));
    await act(async()=>{await result.current.moveSelectedToTray();});
    expect(mocks.save).not.toHaveBeenCalled();expect(options.pushHistory).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
  it('uses the split receipt for undo/redo and refuses history writes after changing notes', async () => {
    const options=input();mocks.post.mockResolvedValue({data:{note_id:'new-note',batch_id:'batch'}});
    const {result,rerender}=renderHook((props)=>useTrayController(props),{initialProps:options});
    await act(async()=>{await result.current.split(['placement'],'New note');});
    expect(result.current.createdNoteId).toBe('new-note');
    const edit=options.pushHistory.mock.calls[0][0];
    if(edit.type!=='reversibleEdit')throw new Error('Expected ordinary history edit');
    await act(async()=>{expect(await edit.undo()).toBe(true);});
    expect(mocks.post).toHaveBeenLastCalledWith('/notes/note/tray/split/batch',{applied:false});
    await act(async()=>{expect(await edit.redo()).toBe(true);});
    expect(mocks.post).toHaveBeenLastCalledWith('/notes/note/tray/split/batch',{applied:true});
    rerender({...options,noteId:'other-note'});
    expect(await edit.undo()).toBe(false);expect(mocks.post).toHaveBeenCalledTimes(3);
  });
  it('keeps modal close waiting across editor flush, placement persistence and refresh, including history writes', async () => {
    const registry = createInFlightWriteRegistry();
    const options = { ...input(), hostMode: 'modal' as const, trackPendingWrite: registry.track };
    const flush = deferred<boolean>(); const save = deferred<void>(); const refresh = deferred<void>();
    options.flushBlock.mockReturnValueOnce(flush.promise);
    mocks.save.mockReturnValueOnce(save.promise);
    options.refresh.mockReturnValueOnce(refresh.promise);
    const { result } = renderHook(() => useTrayController(options));
    let pending!: Promise<void>;
    act(() => { pending = result.current.moveSelectedToTray(); });
    const idle = vi.fn(); const closing = registry.whenIdle().then(idle);
    await act(async () => { flush.resolve(true); await flush.promise; });
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(idle).not.toHaveBeenCalled();
    await act(async () => { save.resolve(); await save.promise; });
    expect(options.refresh).toHaveBeenCalledWith(['block']); expect(idle).not.toHaveBeenCalled();
    await act(async () => { refresh.resolve(); await pending; await closing; });
    expect(idle).toHaveBeenCalledTimes(1);
    const edit = options.pushHistory.mock.calls[0][0];
    if (edit.type !== 'reversibleEdit') throw new Error('Expected ordinary history edit');
    for (const action of [edit.undo, edit.redo]) {
      const historyWrite = deferred<void>(); mocks.save.mockReturnValueOnce(historyWrite.promise);
      let writing!: Promise<boolean>;
      act(() => { writing = action(); });
      const historyIdle = vi.fn(); const historyClose = registry.whenIdle().then(historyIdle);
      await act(async () => { await Promise.resolve(); });
      expect(historyIdle).not.toHaveBeenCalled();
      await act(async () => { historyWrite.resolve(); expect(await writing).toBe(true); await historyClose; });
      expect(historyIdle).toHaveBeenCalledTimes(1);
    }
  });
  it('retains the original swallowed modal failure until the same placement succeeds', async () => {
    const registry = createInFlightWriteRegistry();
    const options = { ...input(), hostMode: 'modal' as const, trackPendingWrite: registry.track };
    const failure = new Error('Synthetic placement rejection');
    mocks.save.mockRejectedValueOnce(failure);
    mocks.post.mockResolvedValue({ data: { note_id: 'new-note', batch_id: 'batch' } });
    const { result } = renderHook(() => useTrayController(options));
    await act(async () => { await result.current.moveSelectedToTray(); });
    expect(result.current.error).toContain('could not be saved');
    await expect(registry.whenIdle()).rejects.toBe(failure);
    await act(async () => { await result.current.split(['placement'], 'Another operation'); });
    await expect(registry.whenIdle()).rejects.toBe(failure);
    await act(async () => { await result.current.moveSelectedToTray(); });
    await expect(registry.whenIdle()).resolves.toBeUndefined();
  });
  it('tracks modal split and its undo/redo through their refresh continuation', async () => {
    const registry = createInFlightWriteRegistry();
    const options = { ...input(), hostMode: 'modal' as const, trackPendingWrite: registry.track };
    const split = deferred<{ data: { note_id: string; batch_id: string } }>();
    mocks.post.mockReturnValueOnce(split.promise);
    const refresh = deferred<void>(); options.refresh.mockReturnValueOnce(refresh.promise);
    const { result } = renderHook(() => useTrayController(options));
    let pending!: Promise<void>;
    act(() => { pending = result.current.split(['placement'], 'New note'); });
    const idle = vi.fn(); const closing = registry.whenIdle().then(idle);
    await act(async () => { split.resolve({ data: { note_id: 'new-note', batch_id: 'batch' } }); await split.promise; });
    expect(idle).not.toHaveBeenCalled();
    await act(async () => { refresh.resolve(); await pending; await closing; });
    expect(result.current.createdNoteId).toBe('new-note');
    const edit = options.pushHistory.mock.calls[0][0];
    if (edit.type !== 'reversibleEdit') throw new Error('Expected ordinary history edit');
    for (const action of [edit.undo, edit.redo]) {
      const historyWrite = deferred<void>(); mocks.post.mockReturnValueOnce(historyWrite.promise);
      let writing!: Promise<boolean>;
      act(() => { writing = action(); });
      const historyIdle = vi.fn(); const historyClose = registry.whenIdle().then(historyIdle);
      await act(async () => { await Promise.resolve(); });
      expect(historyIdle).not.toHaveBeenCalled();
      await act(async () => { historyWrite.resolve(); expect(await writing).toBe(true); await historyClose; });
      expect(historyIdle).toHaveBeenCalledTimes(1);
    }
  });
  it('keeps page writes on the existing path even if a host tracker is provided', async () => {
    const trackPendingWrite = vi.fn();
    const { result } = renderHook(() => useTrayController({ ...input(), hostMode: 'page', trackPendingWrite }));
    await act(async () => { await result.current.moveSelectedToTray(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(trackPendingWrite).not.toHaveBeenCalled();
    expect(result.current.navigationDisabled).toBe(false);
  });
});
