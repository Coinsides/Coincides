import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { measurePastedImage, mediaLayoutAfterBlock, pasteMediaBlock } from './mediaBlockPasteService';
import { uploadCanvasImageAsset } from './canvasAssetRepository';
import type { PageFrameModel } from './types';

vi.mock('./canvasAssetRepository', () => ({ uploadCanvasImageAsset: vi.fn() }));
const frame: PageFrameModel = { id: 'frame', role: 'primary_page_frame', exportable: true,
  x: 0, y: 0, width: 904, height: 1280, contentInset: { left: 72, right: 72, top: 72, bottom: 72 } };
const anchor = { x: 80, y: 25, width: 680, height: 42 };
let pending: { naturalWidth: number; naturalHeight: number; onload: null | (() => void); onerror: null | (() => void) };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('Image', class {
    naturalWidth = 1000; naturalHeight = 50; onload = null; onerror = null;
    constructor() { pending = this; }
  });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:measure'), revokeObjectURL: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('media image paste creation', () => {
  it('uses the page content width and exact short-image ratio in manual frame-local space', () => {
    expect(mediaLayoutAfterBlock(anchor, frame, { naturalWidth: 1000, naturalHeight: 50 })).toEqual({
      x: 0, y: 67, width: 760, height: 38, width_mode: 'manual', coordinate_space: 'page_frame_local',
      frame_id: 'frame', surface: 'formal_page', boundary_role: 'inside', export_role: 'included',
    });
    expect(mediaLayoutAfterBlock(anchor, { ...frame, width: 600 }, { naturalWidth: 1000, naturalHeight: 50 }).width).toBe(456);
    expect(mediaLayoutAfterBlock(anchor, frame, { naturalWidth: 20, naturalHeight: 10 }).width).toBe(20);
  });
  it('measures before upload, uploads before create, and records the anchor and media metadata', async () => {
    const file = new File(['synthetic'], 'Screenshot.png', { type: 'image/png' });
    const createBlock = vi.fn().mockResolvedValue({ id: 'media' });
    vi.mocked(uploadCanvasImageAsset).mockResolvedValue({ assetId: 'asset' } as never);
    const result = pasteMediaBlock({ noteId: 'note', blockId: 'text', file, anchor, frame, isCurrent: () => true, createBlock });
    expect(uploadCanvasImageAsset).not.toHaveBeenCalled(); expect(createBlock).not.toHaveBeenCalled();
    pending.onload!();
    expect(await result).toEqual({ id: 'media' });
    expect(uploadCanvasImageAsset).toHaveBeenCalledWith({ noteId: 'note', file, width: 1000, height: 50 });
    expect(createBlock).toHaveBeenCalledWith(expect.objectContaining({ legacy_block_type: 'media' }), '', expect.objectContaining({
      afterBlockId: 'text', contentJson: {}, metadataPatch: { media: { asset_id: 'asset', naturalWidth: 1000, naturalHeight: 50, alt: 'Screenshot.png' } },
      layout: expect.objectContaining({ height: 38, width_mode: 'manual' }),
    }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:measure');
  });
  it('lands in the nearest clear space below the anchor without covering later text', () => {
    const nextText = { x: 0, y: 80, width: 760, height: 50, frame_id: frame.id, surface: 'formal_page' as const };
    const layout = mediaLayoutAfterBlock(anchor, frame, { naturalWidth: 1000, naturalHeight: 100 }, [nextText]);
    expect(layout.y).toBe(130);
    expect(nextText.y).toBe(80);
  });
  it('never creates a half block when upload fails', async () => {
    vi.mocked(uploadCanvasImageAsset).mockRejectedValue(new Error('Upload unavailable'));
    const createBlock = vi.fn();
    const result = pasteMediaBlock({ noteId: 'note', blockId: 'text', file: new File(['x'], 'x.png'), anchor, frame, isCurrent: () => true, createBlock });
    pending.onload!();
    await expect(result).rejects.toThrow('Upload unavailable'); expect(createBlock).not.toHaveBeenCalled();
  });
  it('releases the measurement URL on a readable image-load failure', async () => {
    const result = measurePastedImage(new File(['x'], 'x.png'));
    pending.onerror!();
    await expect(result).rejects.toThrow('This image could not be read');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:measure');
  });
  it('does not upload after the note session has closed', async () => {
    const createBlock = vi.fn();
    const result = pasteMediaBlock({ noteId: 'note', blockId: 'text', file: new File(['x'], 'x.png'), anchor, frame, isCurrent: () => false, createBlock });
    pending.onload!(); expect(await result).toBeNull();
    expect(uploadCanvasImageAsset).not.toHaveBeenCalled(); expect(createBlock).not.toHaveBeenCalled();
  });
});
