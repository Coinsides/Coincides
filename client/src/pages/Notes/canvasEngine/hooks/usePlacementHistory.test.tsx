import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RuntimeHistoryEntry } from '../historyService';
import { usePlacementHistory, type UsePlacementHistoryOptions } from './usePlacementHistory';

function options(overrides: Partial<UsePlacementHistoryOptions> = {}): UsePlacementHistoryOptions {
  return {
    noteId: 'note-a',
    generation: 1,
    applyLayoutDrafts: vi.fn(),
    persistLayoutSnapshot: vi.fn(),
    target: null,
    ...overrides,
  };
}

function reversible(undo = vi.fn(async () => true), redo = vi.fn(async () => true)): RuntimeHistoryEntry {
  return { type: 'reversibleEdit', undo, redo };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('usePlacementHistory shared Note session history', () => {
  it('keeps a failed or thrown entry available and moves it only after a successful retry', async () => {
    const undo = vi.fn(async () => true)
      .mockRejectedValueOnce(new Error('synthetic save failure'))
      .mockResolvedValueOnce(false);
    const redo = vi.fn(async () => true).mockRejectedValueOnce(new Error('synthetic stale save'));
    const { result } = renderHook(() => usePlacementHistory(options()));
    act(() => result.current.pushHistoryEntry(reversible(undo, redo)));

    await act(async () => {
      expect(await result.current.undoRuntimeHistory()).toBe(false);
      expect(await result.current.redoRuntimeHistory()).toBe(false);
      expect(await result.current.undoRuntimeHistory()).toBe(false);
      expect(await result.current.undoRuntimeHistory()).toBe(true);
      expect(await result.current.undoRuntimeHistory()).toBe(false);
      expect(await result.current.redoRuntimeHistory()).toBe(false);
      expect(await result.current.redoRuntimeHistory()).toBe(true);
      expect(await result.current.redoRuntimeHistory()).toBe(false);
    });
    expect(undo).toHaveBeenCalledTimes(3);
    expect(redo).toHaveBeenCalledTimes(2);
  });

  it('seals typing before a layout entry and replays text/layout/text in actual order', async () => {
    let text = 'first';
    let x = 20;
    let pending: RuntimeHistoryEntry | null = null;
    const { result } = renderHook(() => usePlacementHistory(options({
      beforeHistoryBoundary: () => {
        if (!pending) return;
        const entry = pending;
        pending = null;
        result.current.pushHistoryEntry(entry, { skipBoundary: true });
      },
      applyLayoutDrafts: (layouts) => { x = layouts.block.x; },
    })));
    const textEdit = (before: string, after: string) => reversible(
      vi.fn(async () => { text = before; return true; }),
      vi.fn(async () => { text = after; return true; }),
    );
    pending = textEdit('', 'first');
    act(() => result.current.pushLayoutHistory(
      { block: { x: 0, y: 0, width: 100, height: 50 } },
      { block: { x: 20, y: 0, width: 100, height: 50 } },
    ));
    text = 'second';
    pending = textEdit('first', 'second');

    await act(async () => {
      expect(await result.current.undoRuntimeHistory()).toBe(true);
      expect([text, x]).toEqual(['first', 20]);
      expect(await result.current.undoRuntimeHistory()).toBe(true);
      expect([text, x]).toEqual(['first', 0]);
      expect(await result.current.undoRuntimeHistory()).toBe(true);
      expect([text, x]).toEqual(['', 0]);
      expect(await result.current.redoRuntimeHistory()).toBe(true);
      expect(await result.current.redoRuntimeHistory()).toBe(true);
      expect(await result.current.redoRuntimeHistory()).toBe(true);
      expect([text, x]).toEqual(['second', 20]);
    });
  });

  it('queues save finalization and history replay through the same operation lane', async () => {
    const save = deferred<boolean>();
    const calls: string[] = [];
    const { result } = renderHook(() => usePlacementHistory(options()));
    act(() => result.current.pushHistoryEntry(reversible(vi.fn(async () => {
      calls.push('undo');
      return true;
    }))));
    const saved = result.current.enqueueRuntimeHistoryOperation(async () => {
      calls.push('save:start');
      const succeeded = await save.promise;
      calls.push('save:end');
      return succeeded;
    });
    const undone = result.current.undoRuntimeHistory();
    await act(async () => { await Promise.resolve(); });
    expect(calls).toEqual(['save:start']);
    await act(async () => {
      save.resolve(true);
      expect(await saved).toBe(true);
      expect(await undone).toBe(true);
    });
    expect(calls).toEqual(['save:start', 'save:end', 'undo']);
  });

  it('retains a layout entry when persistence reports failure', async () => {
    const persist = vi.fn(async () => true).mockResolvedValueOnce(false);
    const { result } = renderHook(() => usePlacementHistory(options({ persistLayoutSnapshot: persist })));
    act(() => result.current.pushLayoutHistory(
      { block: { x: 0, y: 0, width: 100, height: 50 } },
      { block: { x: 20, y: 0, width: 100, height: 50 } },
    ));
    await act(async () => {
      expect(await result.current.undoRuntimeHistory()).toBe(false);
      expect(await result.current.redoRuntimeHistory()).toBe(false);
      expect(await result.current.undoRuntimeHistory()).toBe(true);
      expect(await result.current.redoRuntimeHistory()).toBe(true);
    });
  });

  it('retains the existing 80-entry bound and clears redo on a new edit', async () => {
    const { result } = renderHook(() => usePlacementHistory(options()));
    const undo = vi.fn(async () => true);
    act(() => {
      for (let index = 0; index < 81; index += 1) result.current.pushHistoryEntry(reversible(undo));
    });
    await act(async () => {
      for (let index = 0; index < 80; index += 1) expect(await result.current.undoRuntimeHistory()).toBe(true);
      expect(await result.current.undoRuntimeHistory()).toBe(false);
      result.current.pushHistoryEntry(reversible(undo));
      expect(await result.current.redoRuntimeHistory()).toBe(false);
    });
    expect(undo).toHaveBeenCalledTimes(80);
  });

  it('isolates old callbacks and pending results across Note and generation changes', async () => {
    const pendingUndo = deferred<boolean>();
    const { result, rerender } = renderHook(
      ({ noteId, generation }) => usePlacementHistory(options({ noteId, generation })),
      { initialProps: { noteId: 'note-a', generation: 1 } },
    );
    act(() => result.current.pushHistoryEntry(reversible(vi.fn(() => pendingUndo.promise))));
    const oldPush = result.current.pushHistoryEntry;
    const oldEnqueue = result.current.enqueueRuntimeHistoryOperation;
    const oldUndo = result.current.undoRuntimeHistory();
    const staleQueuedOperation = vi.fn(async () => true);
    const staleQueuedResult = result.current.enqueueRuntimeHistoryOperation(staleQueuedOperation);
    await act(async () => { await Promise.resolve(); });
    rerender({ noteId: 'note-b', generation: 1 });
    const newUndo = vi.fn(async () => true);
    act(() => {
      oldPush(reversible());
      result.current.pushHistoryEntry(reversible(newUndo));
    });
    await act(async () => {
      expect(await result.current.undoRuntimeHistory()).toBe(true);
      expect(await result.current.undoRuntimeHistory()).toBe(false);
      pendingUndo.resolve(true);
      expect(await oldUndo).toBe(false);
      expect(await staleQueuedResult).toBe(false);
      expect(await oldEnqueue(async () => true)).toBe(false);
      expect(await result.current.redoRuntimeHistory()).toBe(true);
      expect(await result.current.redoRuntimeHistory()).toBe(false);
    });
    expect(newUndo).toHaveBeenCalledTimes(1);
    expect(staleQueuedOperation).not.toHaveBeenCalled();
    rerender({ noteId: 'note-b', generation: 2 });
    await act(async () => {
      expect(await result.current.undoRuntimeHistory()).toBe(false);
      expect(await result.current.redoRuntimeHistory()).toBe(false);
    });
  });

  it('refuses to seal or push a separate action while composition owns the editing boundary', async () => {
    let composing = true;
    const undo = vi.fn(async () => true);
    const { result } = renderHook(() => usePlacementHistory(options({
      beforeHistoryBoundary: () => !composing,
    })));
    act(() => {
      expect(result.current.pushHistoryEntry(reversible())).toBe(false);
      result.current.pushHistoryEntry(reversible(undo), { skipBoundary: true });
    });
    await act(async () => {
      expect(await result.current.undoRuntimeHistory()).toBe(false);
      composing = false;
      expect(await result.current.undoRuntimeHistory()).toBe(true);
      expect(await result.current.undoRuntimeHistory()).toBe(false);
    });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('routes managed TextFlow shortcuts once, while ordinary forms and composing input remain native', async () => {
    let pending = true;
    const undo = vi.fn(async () => true);
    const redo = vi.fn(async () => true);
    const { result, unmount } = renderHook(() => usePlacementHistory(options({
      target: window,
      beforeHistoryBoundary: () => {
        if (!pending) return;
        pending = false;
        result.current.pushHistoryEntry(reversible(undo, redo), { skipBoundary: true });
      },
    })));
    const managed = document.createElement('textarea');
    managed.dataset.runtimeTextflowEditor = 'true';
    const ordinary = document.createElement('input');
    document.body.append(managed, ordinary);
    const key = (target: HTMLElement, extras: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true, ...extras });
      target.dispatchEvent(event);
      return event;
    };
    await act(async () => {
      expect(key(ordinary).defaultPrevented).toBe(false);
      expect(key(managed, { isComposing: true }).defaultPrevented).toBe(false);
      managed.dataset.runtimeTextflowComposing = 'true';
      expect(key(managed).defaultPrevented).toBe(false);
      managed.dataset.runtimeTextflowComposing = 'false';
      expect(key(managed).defaultPrevented).toBe(true);
    });
    expect(undo).toHaveBeenCalledTimes(1);
    await act(async () => {
      expect(key(managed, { key: 'y' }).defaultPrevented).toBe(true);
    });
    expect(redo).toHaveBeenCalledTimes(1);
    await act(async () => { expect(key(managed).defaultPrevented).toBe(true); });
    await act(async () => { expect(key(managed).defaultPrevented).toBe(true); });
    expect(undo).toHaveBeenCalledTimes(2);
    unmount();
    managed.remove();
    ordinary.remove();
  });
});
