import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NoteBlock } from '../runtimeDataTypes';
import type { TableBlockPayload } from '../tableBlockService';
import { usePlacementHistory } from './usePlacementHistory';
import { useTableBlockHistory, type UseTableBlockHistoryOptions } from './useTableBlockHistory';

function table(payload: TableBlockPayload = { headers: ['法令', '内容'], rows: [['青苗法', '春贷秋还']] }): NoteBlock {
  return { id: 'table-1', placement_id: 'placement-1', block_type: 'table', title: null,
    content_json: { ...payload }, plain_text: '', order_index: 0, metadata: {}, display_overrides_json: {}, source_references: [] };
}

interface FixtureOptions {
  noteId?: string;
  generation?: number;
  block?: NoteBlock;
  boundary?: () => boolean;
  persist?: UseTableBlockHistoryOptions['saveTableBlock'];
}

function useFixture({ noteId = 'note-a', generation = 1, block = table(), boundary = () => true,
  persist = async () => true }: FixtureOptions = {}) {
  const [blocks, setBlocks] = useState([block]);
  const history = usePlacementHistory({ noteId, generation, applyLayoutDrafts: () => {}, persistLayoutSnapshot: () => {}, target: null });
  const editor = useTableBlockHistory({ noteId, generation, blocks, history, boundary,
    saveTableBlock: async (liveBlock, payload) => {
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

describe('table block saves in the Note history', () => {
  it('restores cell, row, column and header edits through the existing undo and redo stack', async () => {
    const block = table();
    const original = structuredClone(block.content_json);
    const after: TableBlockPayload = { caption: '熙宁新法', headers: [], rows: [['青苗法', '春贷秋还', '农事'], ['免役法', '纳钱代役', '役制']] };
    const boundary = vi.fn(() => true);
    const persist = vi.fn(async () => true);
    const { result } = renderHook(() => useFixture({ block, boundary, persist }));
    await act(async () => { expect(await result.current.save(block, after)).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(after);
    after.rows[0][0] = 'changed outside the editor';
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(original);
    await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual({ caption: '熙宁新法', headers: [],
      rows: [['青苗法', '春贷秋还', '农事'], ['免役法', '纳钱代役', '役制']] });
    expect(boundary).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(3);
  });

  it('records separate saves and preserves their actual order', async () => {
    const block = table();
    const first = { headers: ['法令'], rows: [['青苗法']] };
    const second = { headers: ['法令'], rows: [['青苗法'], ['免役法']] };
    const { result } = renderHook(() => useFixture({ block }));
    await act(async () => { expect(await result.current.save(block, first)).toBe(true); });
    await act(async () => { expect(await result.current.save(result.current.blocks[0], second)).toBe(true); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(first);
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(block.content_json);
  });

  it('does not persist across a rejected boundary or add an entry for a failed save', async () => {
    const block = table();
    const after = { headers: ['法令'], rows: [['青苗法']] };
    const persist = vi.fn(async () => false);
    const { result, rerender } = renderHook(({ allowed }) => useFixture({ block, persist, boundary: () => allowed }),
      { initialProps: { allowed: false } });
    await act(async () => { expect(await result.current.save(block, after)).toBe(false); });
    expect(persist).not.toHaveBeenCalled();
    rerender({ allowed: true });
    await act(async () => { expect(await result.current.save(block, after)).toBe(false); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(result.current.blocks[0].content_json).toEqual(block.content_json);
  });

  it('retains an undo entry after a persistence failure and allows retry', async () => {
    const block = table();
    const persist = vi.fn(async () => true).mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('synthetic save failure'));
    const { result } = renderHook(() => useFixture({ block, persist }));
    await act(async () => { expect(await result.current.save(block, { headers: ['法令'], rows: [['青苗法']] })).toBe(true); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(result.current.blocks[0].content_json).toEqual(block.content_json);
  });

  it('does not add unchanged payloads to the history', async () => {
    const payload = { headers: ['法令'], rows: [['青苗法']] };
    const block = table(payload);
    const persist = vi.fn(async () => true);
    const { result } = renderHook(() => useFixture({ block, persist }));
    await act(async () => { expect(await result.current.save(block, payload)).toBe(true); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(persist).not.toHaveBeenCalled();
  });

  it('abandons queued saves and old callbacks after a Note route generation changes', async () => {
    const block = table();
    const pending = deferred<boolean>();
    const persist = vi.fn(async () => true);
    const { result, rerender } = renderHook(({ noteId, generation }) => useFixture({ block, noteId, generation, persist }),
      { initialProps: { noteId: 'note-a', generation: 1 } });
    const oldSave = result.current.save;
    const hold = result.current.history.enqueueRuntimeHistoryOperation(() => pending.promise);
    const saving = oldSave(block, { headers: ['法令'], rows: [['青苗法']] });
    rerender({ noteId: 'note-b', generation: 2 });
    rerender({ noteId: 'note-a', generation: 3 });
    await act(async () => {
      pending.resolve(true);
      expect(await hold).toBe(false);
      expect(await saving).toBe(false);
      expect(await oldSave(block, { headers: ['法令'], rows: [['青苗法']] })).toBe(false);
      expect(await result.current.history.undoRuntimeHistory()).toBe(false);
    });
    expect(persist).not.toHaveBeenCalled();
  });

  it('does not publish an in-flight save into a new Note history', async () => {
    const block = table();
    const pending = deferred<boolean>();
    const persist = vi.fn(() => pending.promise);
    const { result, rerender } = renderHook(({ generation }) => useFixture({ block, generation, persist }),
      { initialProps: { generation: 1 } });
    const saving = result.current.save(block, { headers: ['法令'], rows: [['青苗法']] });
    await act(async () => { await Promise.resolve(); });
    expect(persist).toHaveBeenCalledTimes(1);
    rerender({ generation: 2 });
    await act(async () => {
      pending.resolve(true);
      expect(await saving).toBe(false);
      expect(await result.current.history.undoRuntimeHistory()).toBe(false);
    });
  });
});
