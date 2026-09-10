import {
  act,
  render,
  renderHook,
} from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createSurfaceModePolicy } from '../modePolicyService';
import { createPageFrameDefaultTypographyProfile } from '../pageFrameTypographyService';
import { estimateTextBlockHeight } from '../measurementService';
import { normalizeBlockLayoutForSave, resolveScreenRect, type CoordinateContract } from '../placementContractService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { DocumentTypographyProfile, PageFrameModel } from '../types';
import {
  useBlockPlacementInteractions,
  type UseBlockPlacementInteractionsOptions,
} from './useBlockPlacementInteractions';

interface PlacementTestBlock {
  id: string;
}

const PAGE_FRAME: PageFrameModel = {
  id: 'page-k5',
  role: 'primary_page_frame',
  exportable: true,
  x: 80,
  y: 0,
  width: 340,
  height: 340,
  contentInset: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
};

const BLOCK: PlacementTestBlock = { id: 'block-k5' };

function pointerStart(clientX: number, clientY: number, pointerId = 1) {
  return {
    clientX,
    clientY,
    pointerId,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as never;
}

function dispatchWindowPointer(type: 'pointermove' | 'pointerup' | 'pointercancel', clientX = 0, clientY = 0, pointerId = 1) {
  const event = new Event(type);
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
    pointerId: { value: pointerId },
  });
  window.dispatchEvent(event);
}

function renderPlacementSubject({
  initialLayout,
  snapEnabled,
  surfaceMode = 'canvas',
  displayScale = 1,
  coordinateContract,
  contentWidth = 500,
  pageFrames = [PAGE_FRAME],
  documentTypographyProfile,
  estimateBlockHeightForText = () => 64,
  additionalLayouts = {},
  trayDropTargetRef,
  onMoveBlockToTray,
}: {
  initialLayout: BlockBoxLayout;
  snapEnabled: boolean;
  surfaceMode?: 'page' | 'canvas';
  displayScale?: number;
  coordinateContract?: CoordinateContract;
  contentWidth?: number;
  pageFrames?: PageFrameModel[];
  documentTypographyProfile?: DocumentTypographyProfile;
  estimateBlockHeightForText?: UseBlockPlacementInteractionsOptions<PlacementTestBlock>['estimateBlockHeightForText'];
  additionalLayouts?: Record<string, BlockBoxLayout>;
  trayDropTargetRef?: UseBlockPlacementInteractionsOptions<PlacementTestBlock>['trayDropTargetRef'];
  onMoveBlockToTray?: UseBlockPlacementInteractionsOptions<PlacementTestBlock>['onMoveBlockToTray'];
}) {
  const persistChangedBlockLayouts = vi.fn();
  const pushLayoutHistory = vi.fn();
  const setInteractionState = vi.fn();
  const setSelectedBlockId = vi.fn();
  const setSnapGuide = vi.fn();
  const beginTemporaryLayoutMode = vi.fn();
  const clearTemporaryLayoutMode = vi.fn();
  const movingBlockIdRef = { current: null as string | null };
  const suppressMeasuredReflowUntilRef = { current: 0 };

  const subject = renderHook(({ noteId }) => {
    const [layouts, setLayouts] = useState<Record<string, BlockBoxLayout>>({
      [BLOCK.id]: initialLayout,
      ...additionalLayouts,
    });
    const options = {
      noteId,
      blockLayouts: layouts,
      coordinateContract,
      contentWidth,
      documentTypographyProfile,
      estimateBlockHeightForText,
      movingBlockIdRef,
      orderedBlocks: [BLOCK, ...Object.keys(additionalLayouts).map((id) => ({ id }))],
      pageFrames,
      pageOffsetX: 0,
      persistChangedBlockLayouts,
      pushLayoutHistory,
      beginTemporaryLayoutMode,
      clearTemporaryLayoutMode,
      setInteractionState,
      setLayoutDrafts: setLayouts,
      setSelectedBlockId,
      setSnapGuide,
      snapEnabled,
      suppressMeasuredReflowUntilRef,
      surfacePolicy: createSurfaceModePolicy(surfaceMode),
      trayDropTargetRef,
      onMoveBlockToTray,
      viewportTransform: {
        x: 0,
        y: 0,
        width: 1200,
        height: 900,
        zoom: displayScale,
      },
    } satisfies UseBlockPlacementInteractionsOptions<PlacementTestBlock>;
    const interactions = useBlockPlacementInteractions(options);
    return { layouts, setLayouts, ...interactions };
  }, { initialProps: { noteId: 'note-before' } });

  return {
    persistChangedBlockLayouts,
    pushLayoutHistory,
    beginTemporaryLayoutMode,
    clearTemporaryLayoutMode,
    setInteractionState,
    setSnapGuide,
    movingBlockIdRef,
    subject,
  };
}

function persistedLayout(persistChangedBlockLayouts: ReturnType<typeof vi.fn>): BlockBoxLayout {
  const layouts = persistChangedBlockLayouts.mock.calls[0]?.[0] as Record<string, BlockBoxLayout>;
  return layouts[BLOCK.id];
}

describe('useBlockPlacementInteractions staging gesture', () => {
  const initialLayout: BlockBoxLayout = { x: 100, y: 20, width: 180, height: 60, surface: 'formal_page' };
  const neighborLayout: BlockBoxLayout = { x: 100, y: 100, width: 180, height: 60, surface: 'formal_page' };

  function stagingSubject() {
    const tray = render(<aside />).container.firstElementChild as HTMLElement;
    tray.getBoundingClientRect = () => ({
      x: 800, y: 0, left: 800, top: 0, right: 1000, bottom: 600, width: 200, height: 600,
      toJSON: () => ({}),
    });
    const onMoveBlockToTray = vi.fn();
    const runtime = renderPlacementSubject({
      initialLayout, additionalLayouts: { neighbor: neighborLayout }, snapEnabled: true, surfaceMode: 'page',
      trayDropTargetRef: { current: tray }, onMoveBlockToTray,
    });
    return { ...runtime, onMoveBlockToTray };
  }

  it('restores a visibly displaced neighbor before handing the drop its explicit block and original layout', () => {
    const runtime = stagingSubject();
    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(100, 20), BLOCK, initialLayout));
    act(() => dispatchWindowPointer('pointermove', 100, 70));
    expect(runtime.subject.result.current.layouts.neighbor.y).toBeGreaterThan(neighborLayout.y);
    expect(runtime.subject.result.current.layouts[BLOCK.id]).not.toEqual(initialLayout);
    expect(runtime.movingBlockIdRef.current).toBe(BLOCK.id);
    expect(runtime.setSnapGuide.mock.calls.some(([guide]) => guide !== null)).toBe(true);

    act(() => dispatchWindowPointer('pointerup', 850, 120));

    expect(runtime.subject.result.current.layouts).toEqual({ [BLOCK.id]: initialLayout, neighbor: neighborLayout });
    expect(runtime.onMoveBlockToTray).toHaveBeenCalledExactlyOnceWith(BLOCK.id, initialLayout);
    expect(runtime.persistChangedBlockLayouts).not.toHaveBeenCalled();
    expect(runtime.pushLayoutHistory).not.toHaveBeenCalled();
    expect(runtime.movingBlockIdRef.current).toBeNull();
    expect(runtime.clearTemporaryLayoutMode).toHaveBeenCalledTimes(1);
    expect(runtime.setSnapGuide).toHaveBeenLastCalledWith(null);
    expect(runtime.setInteractionState).toHaveBeenLastCalledWith({ mode: 'selectedBlock', target: 'block', blockId: BLOCK.id });

    act(() => dispatchWindowPointer('pointermove', 100, 250));
    act(() => dispatchWindowPointer('pointerup', 850, 120));
    expect(runtime.onMoveBlockToTray).toHaveBeenCalledTimes(1);
    expect(runtime.subject.result.current.layouts).toEqual({ [BLOCK.id]: initialLayout, neighbor: neighborLayout });
    expect(runtime.persistChangedBlockLayouts).not.toHaveBeenCalled();
  });

  it('cancels the active pointer, restores all pushed layouts, and removes both move and end listeners', () => {
    const runtime = stagingSubject();
    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(100, 20), BLOCK, initialLayout));
    act(() => dispatchWindowPointer('pointermove', 100, 70));
    const pushedLayouts = runtime.subject.result.current.layouts;
    expect(pushedLayouts.neighbor.y).toBeGreaterThan(neighborLayout.y);

    act(() => dispatchWindowPointer('pointermove', 100, 300, 2));
    act(() => dispatchWindowPointer('pointerup', 850, 120, 2));
    act(() => dispatchWindowPointer('pointercancel', 850, 120, 2));
    expect(runtime.subject.result.current.layouts).toEqual(pushedLayouts);
    expect(runtime.movingBlockIdRef.current).toBe(BLOCK.id);
    act(() => dispatchWindowPointer('pointercancel', 850, 120));

    expect(runtime.subject.result.current.layouts).toEqual({ [BLOCK.id]: initialLayout, neighbor: neighborLayout });
    expect(runtime.movingBlockIdRef.current).toBeNull();
    expect(runtime.clearTemporaryLayoutMode).toHaveBeenCalledTimes(1);
    expect(runtime.setSnapGuide).toHaveBeenLastCalledWith(null);
    expect(runtime.setInteractionState).toHaveBeenLastCalledWith({ mode: 'selectedBlock', target: 'block', blockId: BLOCK.id });
    act(() => dispatchWindowPointer('pointermove', 100, 250));
    act(() => dispatchWindowPointer('pointerup', 850, 120));
    expect(runtime.subject.result.current.layouts).toEqual({ [BLOCK.id]: initialLayout, neighbor: neighborLayout });
    expect(runtime.clearTemporaryLayoutMode).toHaveBeenCalledTimes(1);
    expect(runtime.onMoveBlockToTray).not.toHaveBeenCalled();
    expect(runtime.persistChangedBlockLayouts).not.toHaveBeenCalled();
    expect(runtime.pushLayoutHistory).not.toHaveBeenCalled();
  });

  it('restores the drag snapshot when movement and cancellation are batched in one React update', () => {
    const runtime = stagingSubject();
    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(100, 20), BLOCK, initialLayout));
    act(() => {
      dispatchWindowPointer('pointermove', 100, 70);
      dispatchWindowPointer('pointercancel', 850, 120);
    });
    expect(runtime.subject.result.current.layouts).toEqual({ [BLOCK.id]: initialLayout, neighbor: neighborLayout });
    expect(runtime.movingBlockIdRef.current).toBeNull();
    expect(runtime.setSnapGuide).toHaveBeenLastCalledWith(null);
    expect(runtime.clearTemporaryLayoutMode).toHaveBeenCalledTimes(1);
    expect(runtime.onMoveBlockToTray).not.toHaveBeenCalled();
    expect(runtime.persistChangedBlockLayouts).not.toHaveBeenCalled();
    expect(runtime.pushLayoutHistory).not.toHaveBeenCalled();
  });

  it('keeps the ordinary geometry save when the release misses staging', () => {
    const runtime = stagingSubject();
    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(100, 20), BLOCK, initialLayout));
    act(() => dispatchWindowPointer('pointermove', 100, 70));
    act(() => dispatchWindowPointer('pointerup', 799, 120));
    expect(runtime.onMoveBlockToTray).not.toHaveBeenCalled();
    expect(runtime.persistChangedBlockLayouts).toHaveBeenCalledTimes(1);
    expect(runtime.pushLayoutHistory).toHaveBeenCalledTimes(1);
  });

  it('detaches an unfinished drag on unmount so later pointer events cannot write', () => {
    const runtime = stagingSubject();
    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(100, 20), BLOCK, initialLayout));
    act(() => dispatchWindowPointer('pointermove', 100, 70));
    const guideCalls = runtime.setSnapGuide.mock.calls.length;
    runtime.subject.unmount();
    act(() => dispatchWindowPointer('pointermove', 100, 250));
    act(() => dispatchWindowPointer('pointerup', 850, 120));
    act(() => dispatchWindowPointer('pointercancel', 850, 120));
    expect(runtime.setSnapGuide).toHaveBeenCalledTimes(guideCalls);
    expect(runtime.onMoveBlockToTray).not.toHaveBeenCalled();
    expect(runtime.persistChangedBlockLayouts).not.toHaveBeenCalled();
    expect(runtime.pushLayoutHistory).not.toHaveBeenCalled();
  });

  it('ends the old pointer session when noteId changes without unmounting the hook', () => {
    const runtime = stagingSubject();
    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(100, 20), BLOCK, initialLayout));
    act(() => dispatchWindowPointer('pointermove', 100, 70));
    runtime.subject.rerender({ noteId: 'note-after' });
    const guideCalls = runtime.setSnapGuide.mock.calls.length;
    const layoutsAfterNavigation = runtime.subject.result.current.layouts;
    expect(runtime.movingBlockIdRef.current).toBeNull();
    act(() => dispatchWindowPointer('pointermove', 100, 250));
    act(() => dispatchWindowPointer('pointerup', 850, 120));
    expect(runtime.subject.result.current.layouts).toEqual(layoutsAfterNavigation);
    expect(runtime.setSnapGuide).toHaveBeenCalledTimes(guideCalls);
    expect(runtime.onMoveBlockToTray).not.toHaveBeenCalled();
    expect(runtime.persistChangedBlockLayouts).not.toHaveBeenCalled();
    expect(runtime.pushLayoutHistory).not.toHaveBeenCalled();
  });
});

describe('useBlockPlacementInteractions K-5 release collection', () => {
  it.each([
    { frame_id: undefined, coordinate_space: 'page_frame_local' as const },
    { frame_id: 'retired-frame', coordinate_space: 'page_frame_local' as const },
    { frame_id: 'retired-frame', coordinate_space: 'canvas_world' as const },
  ])('passes an unresolved v2 organize drag ($frame_id, $coordinate_space) unchanged to save-time affiliation', ({ frame_id, coordinate_space }) => {
    const frame: PageFrameModel = {
      ...PAGE_FRAME, x: 0, y: 0, width: 904, height: 1279,
      contentInset: { left: 72, right: 72, top: 96, bottom: 96 },
    };
    const initialLayout: BlockBoxLayout = {
      x: 0, y: 0, width: 760, height: 44, coordinate_space, frame_id,
    };
    const runtime = renderPlacementSubject({
      initialLayout, snapEnabled: true, surfaceMode: 'page', coordinateContract: 'v2',
      displayScale: 0.987, contentWidth: 760, pageFrames: [frame],
    });

    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(0, 0), BLOCK, initialLayout));
    act(() => dispatchWindowPointer('pointermove', 0, 60));
    const preview = runtime.subject.result.current.layouts[BLOCK.id];
    expect(preview.x).toBe(0);
    expect(preview.y).toBeCloseTo(60 / 0.987, 10);
    expect(preview.y + preview.height / 2).toBeLessThan(frame.contentInset.top);
    expect(preview.frame_id).toBe(frame_id);

    act(() => dispatchWindowPointer('pointerup', 0, 60));
    expect(runtime.subject.result.current.layouts[BLOCK.id]).toEqual(preview);
    expect(runtime.persistChangedBlockLayouts).toHaveBeenCalledExactlyOnceWith({ [BLOCK.id]: preview });
    expect(runtime.pushLayoutHistory).toHaveBeenCalledWith({ [BLOCK.id]: initialLayout }, { [BLOCK.id]: preview });
    const saved = normalizeBlockLayoutForSave(persistedLayout(runtime.persistChangedBlockLayouts), {
      pageFrames: [frame], primaryFrameId: frame.id,
    }, 'v2');
    expect(saved).toMatchObject({ x: 0, frame_id: frame.id, surface: 'formal_page', boundary_role: 'inside' });
    expect(saved.y).toBe(preview.y - 96);
    expect(resolveScreenRect(saved, frame, 'v2')).toEqual(resolveScreenRect(preview, undefined, 'v2'));

    // Feed the persisted affiliation back into the same hook before dragging again.
    act(() => runtime.subject.result.current.setLayouts({ [BLOCK.id]: saved }));
    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(0, 0), BLOCK, saved));
    const contentBottom = frame.height - frame.contentInset.top - frame.contentInset.bottom;
    const secondClientY = (contentBottom - 10 - saved.y) * 0.987;
    act(() => dispatchWindowPointer('pointermove', 0, secondClientY));
    const secondPreview = runtime.subject.result.current.layouts[BLOCK.id];
    expect(secondPreview.frame_id).toBe(frame.id);
    expect(secondPreview.y).toBeLessThan(contentBottom);
    expect(secondPreview.y + secondPreview.height / 2).toBeGreaterThan(contentBottom);

    act(() => dispatchWindowPointer('pointerup', 0, secondClientY));
    const collected = { ...secondPreview, x: 0, y: contentBottom - secondPreview.height };
    expect(runtime.subject.result.current.layouts[BLOCK.id]).toEqual(collected);
    expect(runtime.persistChangedBlockLayouts).toHaveBeenNthCalledWith(2, { [BLOCK.id]: collected });
    expect(runtime.pushLayoutHistory).toHaveBeenLastCalledWith({ [BLOCK.id]: saved }, { [BLOCK.id]: collected });
    expect(normalizeBlockLayoutForSave(collected, { pageFrames: [frame], primaryFrameId: frame.id }, 'v2')).toEqual(collected);

    // Valid world IDs and geometric world affiliation retain the same collection rule.
    for (const worldFrameId of [frame.id, undefined]) {
      const worldLayout: BlockBoxLayout = {
        ...saved, x: 72, y: 96, width: 600, coordinate_space: 'canvas_world', frame_id: worldFrameId,
      };
      act(() => runtime.subject.result.current.setLayouts({ [BLOCK.id]: worldLayout }));
      act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(0, 0), BLOCK, worldLayout));
      const worldClientY = (contentBottom - 10) * 0.987;
      act(() => dispatchWindowPointer('pointermove', 0, worldClientY));
      const worldPreview = runtime.subject.result.current.layouts[BLOCK.id];
      expect(worldPreview.y).toBeLessThan(frame.height - frame.contentInset.bottom);
      expect(worldPreview.y + worldPreview.height / 2).toBeGreaterThan(frame.height - frame.contentInset.bottom);
      act(() => dispatchWindowPointer('pointerup', 0, worldClientY));
      expect(runtime.subject.result.current.layouts[BLOCK.id]).toEqual({
        ...worldPreview, y: frame.height - frame.contentInset.bottom - worldPreview.height,
      });
    }
  });

  it('clamps a crossing drag into its affiliated page content rect by minimum translation when organize mode is on', () => {
    const initialLayout = { x: 200, y: 60, width: 80, height: 60 };
    const runtime = renderPlacementSubject({ initialLayout, snapEnabled: true });

    act(() => runtime.subject.result.current.beginMoveBlock(
      pointerStart(200, 0),
      BLOCK,
      initialLayout,
    ));
    act(() => dispatchWindowPointer('pointermove', 40, 250));
    act(() => dispatchWindowPointer('pointerup'));

    expect(persistedLayout(runtime.persistChangedBlockLayouts)).toEqual({
      x: 100,
      y: 260,
      width: 80,
      height: 60,
    });
    expect(runtime.subject.result.current.layouts[BLOCK.id]).toEqual({
      x: 100,
      y: 260,
      width: 80,
      height: 60,
    });
    expect(runtime.pushLayoutHistory).toHaveBeenCalledWith(
      { [BLOCK.id]: initialLayout },
      { [BLOCK.id]: { x: 100, y: 260, width: 80, height: 60 } },
    );
  });

  it('keeps the same crossing drag rect value-for-value when organize mode is off', () => {
    const initialLayout = { x: 200, y: 60, width: 80, height: 60 };
    const runtime = renderPlacementSubject({ initialLayout, snapEnabled: false });

    act(() => runtime.subject.result.current.beginMoveBlock(
      pointerStart(200, 0),
      BLOCK,
      initialLayout,
    ));
    act(() => dispatchWindowPointer('pointermove', 40, 250));
    act(() => dispatchWindowPointer('pointerup'));

    const crossingCandidate = { x: 40, y: 310, width: 80, height: 60 };
    expect(persistedLayout(runtime.persistChangedBlockLayouts)).toEqual(crossingCandidate);
    expect(runtime.subject.result.current.layouts[BLOCK.id]).toEqual(crossingCandidate);
  });

  it('applies the same crossing collection policy to resize release', () => {
    const initialLayout = { x: 355, y: 90, width: 45, height: 52 };
    const runtime = renderPlacementSubject({ initialLayout, snapEnabled: true });

    act(() => runtime.subject.result.current.beginResizeBlock(
      pointerStart(0, 0),
      BLOCK,
      'resize me',
      initialLayout,
    ));
    act(() => dispatchWindowPointer('pointermove', 70, 0));
    act(() => dispatchWindowPointer('pointerup'));

    const collectedLayout = {
      x: 285,
      y: 90,
      width: 115,
      height: 64,
      width_mode: 'manual' as const,
    };
    expect(persistedLayout(runtime.persistChangedBlockLayouts)).toEqual(collectedLayout);
    expect(runtime.subject.result.current.layouts[BLOCK.id]).toEqual(collectedLayout);
    expect(runtime.pushLayoutHistory).toHaveBeenCalledWith(
      { [BLOCK.id]: initialLayout },
      { [BLOCK.id]: collectedLayout },
    );
  });

  it.each([
    ['inside', { x: 140, y: 80, width: 80, height: 60 }],
    ['inside with legal overflow', { x: 350, y: 80, width: 80, height: 60 }],
    ['workspace_only', { x: 430, y: 80, width: 60, height: 60 }],
  ] as const)('leaves an %s release value-for-value when organize mode is on', (_kind, initialLayout) => {
    const runtime = renderPlacementSubject({ initialLayout, snapEnabled: true });

    act(() => runtime.subject.result.current.beginMoveBlock(
      pointerStart(0, 0),
      BLOCK,
      initialLayout,
    ));
    act(() => dispatchWindowPointer('pointermove'));
    act(() => dispatchWindowPointer('pointerup'));

    expect(persistedLayout(runtime.persistChangedBlockLayouts)).toEqual(initialLayout);
  });
});

describe('useBlockPlacementInteractions reading-scale coordinate boundary', () => {
  it.each([
    { surfaceMode: 'page', displayScale: 0.5 },
    { surfaceMode: 'page', displayScale: 1.5 },
    { surfaceMode: 'canvas', displayScale: 0.5 },
    { surfaceMode: 'canvas', displayScale: 1.5 },
  ] as const)('converts $surfaceMode drag and resize screen deltas at scale $displayScale into layout units', ({ surfaceMode, displayScale }) => {
    const initialLayout: BlockBoxLayout = {
      x: 100,
      y: 80,
      width: 180,
      height: 60,
      coordinate_space: surfaceMode === 'page' ? 'page_frame_local' : 'canvas_world',
      frame_id: PAGE_FRAME.id,
    };
    const estimate = vi.fn(() => 64);
    const runtime = renderPlacementSubject({
      initialLayout,
      snapEnabled: false,
      surfaceMode,
      displayScale,
      estimateBlockHeightForText: estimate,
    });

    act(() => runtime.subject.result.current.beginMoveBlock(pointerStart(120, 200), BLOCK, initialLayout));
    act(() => dispatchWindowPointer('pointermove', 120 + 60 * displayScale, 200 + 30 * displayScale));
    act(() => dispatchWindowPointer('pointerup'));
    const movedLayout = { ...initialLayout, x: 160, y: 110 };
    expect(persistedLayout(runtime.persistChangedBlockLayouts)).toEqual(movedLayout);
    expect(runtime.subject.result.current.layouts[BLOCK.id]).toEqual(movedLayout);

    act(() => runtime.subject.result.current.beginResizeBlock(pointerStart(40, 200), BLOCK, 'resize text', movedLayout));
    act(() => dispatchWindowPointer('pointermove', 40 + 60 * displayScale, 200));
    act(() => dispatchWindowPointer('pointerup'));
    const resizedLayout = { ...movedLayout, width: 240, height: 64, width_mode: 'manual' };
    expect(runtime.persistChangedBlockLayouts).toHaveBeenLastCalledWith({ [BLOCK.id]: resizedLayout });
    expect(runtime.subject.result.current.layouts[BLOCK.id]).toEqual(resizedLayout);
    expect(estimate).toHaveBeenCalledWith(BLOCK, 'resize text', 240, undefined);
    expect(initialLayout).toEqual({
      x: 100, y: 80, width: 180, height: 60,
      coordinate_space: surfaceMode === 'page' ? 'page_frame_local' : 'canvas_world',
      frame_id: PAGE_FRAME.id,
    });
  });
});

describe('useBlockPlacementInteractions K-6 formal page regression', () => {
  it('uses the effective paper profile when a pointer resize estimates text height', () => {
    const profile = createPageFrameDefaultTypographyProfile({ templateId: 'letter_portrait', pageSize: 'Letter' });
    const text = 'physical typography resize '.repeat(12);
    const estimate = vi.fn((_block: PlacementTestBlock, value: string, width: number, typography?: DocumentTypographyProfile) => (
      estimateTextBlockHeight({ text: value, width, typography })
    ));
    const initialLayout = { x: 0, y: 0, width: 300, height: 60 };
    const runtime = renderPlacementSubject({
      initialLayout,
      snapEnabled: false,
      surfaceMode: 'page',
      documentTypographyProfile: profile,
      estimateBlockHeightForText: estimate,
    });

    act(() => runtime.subject.result.current.beginResizeBlock(pointerStart(0, 0), BLOCK, text, initialLayout));
    act(() => dispatchWindowPointer('pointermove', -100, 0));
    act(() => dispatchWindowPointer('pointerup'));

    const resized = persistedLayout(runtime.persistChangedBlockLayouts);
    expect(resized.width).toBe(200);
    expect(estimate).toHaveBeenCalledWith(BLOCK, text, resized.width, profile);
    expect(resized.height).toBe(estimateTextBlockHeight({ text, width: resized.width, typography: profile }));
    expect(resized.height).not.toBe(estimateTextBlockHeight({ text, width: resized.width }));
  });

  it('keeps a native formal_page inside-overflow release byte-for-byte unchanged', () => {
    const initialLayout = {
      x: 350,
      y: 80,
      width: 80,
      height: 60,
      rotation: 0,
      export_role: 'included',
      ai_visibility: 'visible',
      surface: 'formal_page',
      width_mode: 'manual',
      coordinate_space: 'page_frame_local',
      frame_id: PAGE_FRAME.id,
      boundary_role: 'inside',
      surface_authority: {
        coordinateSpace: 'page_frame_local',
      },
    } satisfies BlockBoxLayout;
    const initialBytes = JSON.stringify(initialLayout);
    const runtime = renderPlacementSubject({
      initialLayout,
      snapEnabled: true,
      surfaceMode: 'page',
    });

    act(() => runtime.subject.result.current.beginMoveBlock(
      pointerStart(0, 0),
      BLOCK,
      initialLayout,
    ));
    act(() => dispatchWindowPointer('pointerup'));

    const [historyBefore, historyAfter] = runtime.pushLayoutHistory.mock.calls[0] as [
      Record<string, BlockBoxLayout>,
      Record<string, BlockBoxLayout>,
    ];
    expect(JSON.stringify(persistedLayout(runtime.persistChangedBlockLayouts))).toBe(initialBytes);
    expect(JSON.stringify(runtime.subject.result.current.layouts[BLOCK.id])).toBe(initialBytes);
    expect(JSON.stringify(historyBefore[BLOCK.id])).toBe(initialBytes);
    expect(JSON.stringify(historyAfter[BLOCK.id])).toBe(initialBytes);
    expect(JSON.stringify(initialLayout)).toBe(initialBytes);
  });
});
