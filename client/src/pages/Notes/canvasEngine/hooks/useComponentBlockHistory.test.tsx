import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from '../runtimeDataTypes';
import type { ComponentBlockPayload } from '../componentBlockService';
import { usePlacementHistory } from './usePlacementHistory';
import { useComponentBlockHistory, type UseComponentBlockHistoryOptions } from './useComponentBlockHistory';

const timeline = (label = '北宋建立'): ComponentBlockPayload => ({ component_kind: 'timeline',
  params: { title: '宋初年表', entries: [{ year: '960', label, detail: '陈桥兵变' }] } });
const chart = (kind: 'chart_bar' | 'chart_line' = 'chart_bar'): ComponentBlockPayload => ({ component_kind: kind,
  params: { title: '岁入的换血', x_labels: ['宋初', '中期', '后期'],
    series: [{ name: '田赋', values: [60, 45, 30] }, { name: '商税', values: [20, 40, 65] }], y_label: '收入' } });
function component(payload = timeline()): NoteBlock {
  return { id: 'component-1', placement_id: 'placement-1', block_type: 'component', title: null,
    content_json: structuredClone(payload), plain_text: '', order_index: 0, metadata: {}, display_overrides_json: {}, source_references: [] };
}
interface FixtureOptions {
  noteId?: string; generation?: number; block?: NoteBlock; boundary?: () => boolean;
  persist?: UseComponentBlockHistoryOptions['saveComponentBlock'];
}
function useFixture({ noteId = 'note-a', generation = 1, block = component(), boundary = () => true,
  persist = async () => true }: FixtureOptions = {}) {
  const [blocks, setBlocks] = useState([block]);
  const history = usePlacementHistory({ noteId, generation, applyLayoutDrafts: () => {}, persistLayoutSnapshot: () => {}, target: null });
  const editor = useComponentBlockHistory({ noteId, generation, blocks, history, boundary,
    saveComponentBlock: async (liveBlock, payload) => {
      if (!await persist(liveBlock, payload)) return false;
      setBlocks((previous) => previous.map((entry) => entry.id === liveBlock.id ? { ...entry, content_json: { ...payload } } : entry));
      return true;
    },
  });
  return { ...editor, history, blocks };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('component block saves in the existing Note history', () => {
  it.each(['timeline', 'chart_bar', 'chart_line'] as const)('restores %s params using the actual undo and redo stack', async (kind) => {
    const original = kind === 'timeline' ? timeline() : chart(kind);
    const block = component(original);
    const after = structuredClone(original);
    after.params.title = '编辑后的标题';
    if (kind === 'timeline') after.params.entries = [{ year: '997', label: '真宗即位' }, { year: '960', label: '北宋建立' }];
    else { after.params.x_labels = ['晚期']; after.params.series = [{ name: '商税', values: [68] }]; }
    const expected = structuredClone(after);
    const boundary = vi.fn(() => true);
    const persist = vi.fn(async () => true);
    const { result } = renderHook(() => useFixture({ block, boundary, persist }));
    await act(async () => { expect(await result.current.save(block, after)).toBe(true); });
    after.params.title = 'external mutation';
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(original);
    await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(expected);
    expect(boundary).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(3);
  });

  it('records sequential edits in order', async () => {
    const block = component();
    const first = timeline('first'); const second = timeline('second');
    const { result } = renderHook(() => useFixture({ block }));
    await act(async () => { expect(await result.current.save(block, first)).toBe(true); });
    await act(async () => { expect(await result.current.save(result.current.blocks[0], second)).toBe(true); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(first);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(block.content_json);
  });

  it('respects pending boundaries and keeps failed saves outside history', async () => {
    const block = component();
    const persist = vi.fn(async () => false);
    const { result, rerender } = renderHook(({ allowed }) => useFixture({ block, persist, boundary: () => allowed }),
      { initialProps: { allowed: false } });
    await act(async () => { expect(await result.current.save(block, timeline('edited'))).toBe(false); });
    expect(persist).not.toHaveBeenCalled();
    rerender({ allowed: true });
    await act(async () => { expect(await result.current.save(block, timeline('edited'))).toBe(false); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(result.current.blocks[0].content_json).toEqual(block.content_json);
  });

  it('retains an undo entry after persistence failure for retry', async () => {
    const block = component();
    const persist = vi.fn(async () => true).mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('save interrupted'));
    const { result } = renderHook(() => useFixture({ block, persist }));
    await act(async () => { expect(await result.current.save(block, timeline('edited'))).toBe(true); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(block.content_json);
  });

  it('does not persist or record an unchanged payload', async () => {
    const block = component();
    const persist = vi.fn(async () => true);
    const { result } = renderHook(() => useFixture({ block, persist }));
    await act(async () => { expect(await result.current.save(block, timeline())).toBe(true); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(persist).not.toHaveBeenCalled();
  });

  it('abandons queued saves and old callbacks after a Note route generation changes', async () => {
    const block = component(); const pending = deferred<boolean>(); const persist = vi.fn(async () => true);
    const { result, rerender } = renderHook(({ noteId, generation }) => useFixture({ block, noteId, generation, persist }),
      { initialProps: { noteId: 'note-a', generation: 1 } });
    const oldSave = result.current.save;
    const hold = result.current.history.enqueueRuntimeHistoryOperation(() => pending.promise);
    const saving = oldSave(block, timeline('edited'));
    rerender({ noteId: 'note-b', generation: 2 });
    rerender({ noteId: 'note-a', generation: 3 });
    await act(async () => {
      pending.resolve(true);
      expect(await hold).toBe(false); expect(await saving).toBe(false);
      expect(await oldSave(block, timeline('edited'))).toBe(false);
      expect(await result.current.history.undoRuntimeHistory()).toBe(false);
    });
    expect(persist).not.toHaveBeenCalled();
  });

  it('does not publish an in-flight save into the next Note history', async () => {
    const block = component(); const pending = deferred<boolean>(); const persist = vi.fn(() => pending.promise);
    const { result, rerender } = renderHook(({ generation }) => useFixture({ block, generation, persist }),
      { initialProps: { generation: 1 } });
    const saving = result.current.save(block, timeline('edited'));
    await act(async () => { await Promise.resolve(); });
    expect(persist).toHaveBeenCalledTimes(1);
    rerender({ generation: 2 });
    await act(async () => {
      pending.resolve(true); expect(await saving).toBe(false);
      expect(await result.current.history.undoRuntimeHistory()).toBe(false);
    });
  });
});
