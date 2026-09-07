import {
  act,
  renderHook,
} from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createSurfaceModePolicy } from '../modePolicyService';
import { createPageFrameDefaultTypographyProfile } from '../pageFrameTypographyService';
import { estimateTextBlockHeight } from '../measurementService';
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

function pointerStart(clientX: number, clientY: number) {
  return {
    clientX,
    clientY,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as never;
}

function dispatchWindowPointer(type: 'pointermove' | 'pointerup', clientX = 0, clientY = 0) {
  const event = new Event(type);
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  window.dispatchEvent(event);
}

function renderPlacementSubject({
  initialLayout,
  snapEnabled,
  surfaceMode = 'canvas',
  displayScale = 1,
  documentTypographyProfile,
  estimateBlockHeightForText = () => 64,
}: {
  initialLayout: BlockBoxLayout;
  snapEnabled: boolean;
  surfaceMode?: 'page' | 'canvas';
  displayScale?: number;
  documentTypographyProfile?: DocumentTypographyProfile;
  estimateBlockHeightForText?: UseBlockPlacementInteractionsOptions<PlacementTestBlock>['estimateBlockHeightForText'];
}) {
  const persistChangedBlockLayouts = vi.fn();
  const pushLayoutHistory = vi.fn();
  const setInteractionState = vi.fn();
  const setSelectedBlockId = vi.fn();
  const setSnapGuide = vi.fn();
  const movingBlockIdRef = { current: null as string | null };
  const suppressMeasuredReflowUntilRef = { current: 0 };

  const subject = renderHook(() => {
    const [layouts, setLayouts] = useState<Record<string, BlockBoxLayout>>({
      [BLOCK.id]: initialLayout,
    });
    const options = {
      blockLayouts: layouts,
      contentWidth: 500,
      documentTypographyProfile,
      estimateBlockHeightForText,
      movingBlockIdRef,
      orderedBlocks: [BLOCK],
      pageFrames: [PAGE_FRAME],
      pageOffsetX: 0,
      persistChangedBlockLayouts,
      pushLayoutHistory,
      beginTemporaryLayoutMode: vi.fn(),
      clearTemporaryLayoutMode: vi.fn(),
      setInteractionState,
      setLayoutDrafts: setLayouts,
      setSelectedBlockId,
      setSnapGuide,
      snapEnabled,
      suppressMeasuredReflowUntilRef,
      surfacePolicy: createSurfaceModePolicy(surfaceMode),
      viewportTransform: {
        x: 0,
        y: 0,
        width: 1200,
        height: 900,
        zoom: displayScale,
      },
    } satisfies UseBlockPlacementInteractionsOptions<PlacementTestBlock>;
    const interactions = useBlockPlacementInteractions(options);
    return { layouts, ...interactions };
  });

  return {
    persistChangedBlockLayouts,
    pushLayoutHistory,
    subject,
  };
}

function persistedLayout(persistChangedBlockLayouts: ReturnType<typeof vi.fn>): BlockBoxLayout {
  const layouts = persistChangedBlockLayouts.mock.calls[0]?.[0] as Record<string, BlockBoxLayout>;
  return layouts[BLOCK.id];
}

describe('useBlockPlacementInteractions K-5 release collection', () => {
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
