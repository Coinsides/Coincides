import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MediaImageEditV1 } from '@shared/types';
import type { NoteBlock } from '../runtimeDataTypes';
import { readMediaBlockMetadata } from '../mediaBlockService';
import { usePlacementHistory } from './usePlacementHistory';
import { useMediaImageHistory, type UseMediaImageHistoryOptions } from './useMediaImageHistory';

const edited: MediaImageEditV1 = { crop: { x: 20, y: 10, w: 50, h: 50 }, zoom: 2, rotation: 90 };
function mediaBlock(edit?: MediaImageEditV1 | null): NoteBlock {
  return { id: 'media-one', placement_id: 'place-one', block_type: 'media', title: null,
    content_json: {}, plain_text: '', order_index: 0, source_references: [], display_overrides_json: {},
    metadata: { keep: 'birth receipt', media: { asset_id: 'image-one', naturalWidth: 800, naturalHeight: 400,
      alt: 'Sample', ...(edit === undefined ? {} : { edit_v1: structuredClone(edit) }) } } };
}
function useFixture({ block = mediaBlock(), generation = 1, allowed = true,
  persist = async () => true }: { block?: NoteBlock; generation?: number; allowed?: boolean;
    persist?: UseMediaImageHistoryOptions['saveMediaImageEdit'] } = {}) {
  const [blocks, setBlocks] = useState([block]);
  const history = usePlacementHistory({ noteId: 'note-one', generation, applyLayoutDrafts: () => {},
    persistLayoutSnapshot: () => {}, target: null });
  const editor = useMediaImageHistory({ noteId: 'note-one', generation, blocks, history, boundary: () => allowed,
    saveMediaImageEdit: async (live, edit) => {
      if (!await persist(live, edit)) return false;
      const media = { ...(live.metadata.media as Record<string, unknown>) };
      if (edit === undefined) delete media.edit_v1; else media.edit_v1 = edit;
      setBlocks((all) => all.map((entry) => entry.id === live.id ? { ...entry, metadata: { ...entry.metadata, media } } : entry));
      return true;
    } });
  return { ...editor, history, blocks };
}

describe('B5 media metadata uses the actual Note undo stack', () => {
  it.each([undefined, null, { crop: null, zoom: null, rotation: 270 } as MediaImageEditV1])(
    'undo and redo preserve the original edit state %j and asset identity', async (initial) => {
      const block = mediaBlock(initial);
      const { result } = renderHook(() => useFixture({ block }));
      const next = structuredClone(edited);
      await act(async () => { expect(await result.current.save(block, next)).toBe(true); });
      next.rotation = 180;
      await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
      expect(result.current.blocks[0].metadata).toEqual(block.metadata);
      await act(async () => { expect(await result.current.history.redoRuntimeHistory()).toBe(true); });
      expect(readMediaBlockMetadata(result.current.blocks[0])).toEqual({
        ...readMediaBlockMetadata(block), edit_v1: edited,
      });
      expect(result.current.blocks[0].metadata.keep).toBe('birth receipt');
    });

  it('reset is one reversible save and an unchanged legacy open/save writes nothing', async () => {
    const persist = vi.fn(async () => true);
    const { result } = renderHook(() => useFixture({ persist }));
    await act(async () => { expect(await result.current.save(result.current.blocks[0], null)).toBe(true); });
    expect(persist).not.toHaveBeenCalled();
    await act(async () => { await result.current.save(result.current.blocks[0], edited); });
    await act(async () => { await result.current.save(result.current.blocks[0], null); });
    expect(readMediaBlockMetadata(result.current.blocks[0])?.edit_v1).toBeNull();
    await act(async () => { await result.current.history.undoRuntimeHistory(); });
    expect(readMediaBlockMetadata(result.current.blocks[0])?.edit_v1).toEqual(edited);
  });

  it('keeps failed saves outside history and failed undo available to retry', async () => {
    const persist = vi.fn(async () => true).mockResolvedValueOnce(false);
    const { result } = renderHook(() => useFixture({ persist }));
    await act(async () => { expect(await result.current.save(result.current.blocks[0], edited)).toBe(false); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await result.current.save(result.current.blocks[0], edited)).toBe(true); });
    persist.mockRejectedValueOnce(new Error('Connection interrupted'));
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(false); });
    await act(async () => { expect(await result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(readMediaBlockMetadata(result.current.blocks[0])?.edit_v1).toBeUndefined();
  });

  it('does not save during a pending document boundary or through an old route callback', async () => {
    const persist = vi.fn(async () => true);
    const { result, rerender } = renderHook(({ generation, allowed }) => useFixture({ generation, allowed, persist }),
      { initialProps: { generation: 1, allowed: false } });
    const oldSave = result.current.save;
    await act(async () => { expect(await oldSave(result.current.blocks[0], edited)).toBe(false); });
    rerender({ generation: 2, allowed: true });
    await act(async () => { expect(await oldSave(result.current.blocks[0], edited)).toBe(false); });
    expect(persist).not.toHaveBeenCalled();
  });
});
