import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createNotePagePresetSeed } from '../notePagePresetService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import { createViewport } from '../engineModel';
import { useNoteCanvasFrameModel, type UseNoteCanvasFrameModelOptions } from './useNoteCanvasLayoutModel';
import type { BlockBoxLayout } from '../runtimeLayout';

function input(preset: 'a4_portrait' | 'letter_portrait' | 'screen_note'): UseNoteCanvasFrameModelOptions {
  const collection = createNotePagePresetSeed(preset);
  return {
    notePagePreset: preset, coordinateContract: 'v2', pageFrameCollection: collection,
    blockLayouts: {}, defaultDraftLayout: { x: 0, y: 0, width: 992, height: 100, surface: 'formal_page',
      coordinate_space: 'page_frame_local', frame_id: collection.primaryFrameId! },
    documentTypographyProfile: createDefaultDocumentTypographyProfile(), draftActive: false, draftLayout: null,
    persistedCanvasObjects: [], persistedCanvasPlacements: [], persistedContentMounts: [], persistedVisualConnectors: [],
    persistedImageObjects: [], persistedStructuredObjects: [], pageOffsetX: 84, surfaceMode: 'page',
    viewportTransform: createViewport(), visibleBlocks: [],
  };
}

describe('new note page presets in the mounted frame model', () => {
  it.each([
    ['a4_portrait', 904, 1278, { top: 0, right: 72, bottom: 96, left: 72 }],
    ['letter_portrait', 904, 1170, { top: 0, right: 72, bottom: 96, left: 72 }],
    ['screen_note', 1120, 720, { top: 48, right: 64, bottom: 64, left: 64 }],
  ] as const)('keeps %s geometry after mounting and remounting', (preset, width, height, contentInset) => {
    const options = input(preset);
    const before = structuredClone(options.pageFrameCollection);
    const { result, unmount } = renderHook(() => useNoteCanvasFrameModel(options));
    expect(result.current.primaryPageFrame).toMatchObject({ templateId: preset, width, height, contentInset });
    expect(result.current.pageContentHeight + contentInset.top).toBe(height);
    expect(result.current.noteCanvasRuntime.pageFrames).toHaveLength(1);
    unmount();
    const reloaded = renderHook(() => useNoteCanvasFrameModel({ ...options, pageFrameCollection: before }));
    expect(reloaded.result.current.primaryPageFrame).toMatchObject({ templateId: preset, width, height, contentInset });
    expect(options.pageFrameCollection).toEqual(before);
  });

  it('grows one fixed-width Web frame from live and reloaded content, including the bottom wall', () => {
    const options = input('screen_note');
    const frame = options.pageFrameCollection!.pageFrames[0];
    const before = structuredClone(options.pageFrameCollection);
    const body: BlockBoxLayout = { ...options.defaultDraftLayout, y: 0, height: 6000 };
    const { result, rerender, unmount } = renderHook((props) => useNoteCanvasFrameModel(props), { initialProps: options });
    rerender({ ...options, blockLayouts: { body } });
    expect(result.current.primaryPageFrame).toMatchObject({ id: frame.id, width: 1120, height: 6112 });
    expect(result.current.noteCanvasRuntime.pageFrames).toHaveLength(1);
    rerender({ ...options, blockLayouts: { body }, draftActive: true,
      draftLayout: { ...body, y: 6100, height: 1000 } });
    expect(result.current.primaryPageFrame?.height).toBe(7212);
    expect(options.pageFrameCollection).toEqual(before);
    unmount();
    const reloaded = renderHook(() => useNoteCanvasFrameModel({ ...options, blockLayouts: { body } }));
    expect(reloaded.result.current.primaryPageFrame?.height).toBe(6112);
    const adjusted = structuredClone(before!);
    adjusted.pageFrames[0].contentInset.bottom = 120;
    const walls = renderHook(() => useNoteCanvasFrameModel({ ...options, pageFrameCollection: adjusted, blockLayouts: { body } }));
    expect(walls.result.current.primaryPageFrame).toMatchObject({ width: 1120, height: 6168, contentInset: { bottom: 120 } });
  });

  it('leaves historical collections and the legacy primary fallback path unchanged', () => {
    const options = input('screen_note');
    options.notePagePreset = 'flow';
    // Historical non-default frame identity has always stayed as stored.
    const frame = options.pageFrameCollection!.pageFrames[0];
    frame.id = 'historical-web';
    options.pageFrameCollection!.primaryFrameId = frame.id;
    const before = structuredClone(options.pageFrameCollection);
    const { result } = renderHook(() => useNoteCanvasFrameModel({ ...options,
      blockLayouts: { body: { ...options.defaultDraftLayout, frame_id: frame.id, height: 6000 } } }));
    expect(result.current.primaryPageFrame).toMatchObject({ id: frame.id, height: 720, width: 1120 });
    expect(options.pageFrameCollection).toEqual(before);
  });

  it('includes frame-owned visual content when growing the Web page', () => {
    const options = input('screen_note');
    const frame = options.pageFrameCollection!.pageFrames[0];
    const { result } = renderHook(() => useNoteCanvasFrameModel({ ...options,
      persistedCanvasPlacements: [{ placementId: 'visual-placement', objectId: 'visual', canvasId: 'canvas',
        frameId: frame.id, surface: 'formal_page', boundaryRole: 'inside', x: 100, y: 9000,
        width: 300, height: 400, zIndex: 1, rotation: 0 }],
    }));
    expect(result.current.primaryPageFrame).toMatchObject({ width: 1120, height: 9464 });
    expect(result.current.noteCanvasRuntime.pageFrames).toHaveLength(1);
  });
});
