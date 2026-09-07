import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createSurfaceModePolicy } from '../modePolicyService';
import { useCanvasSurfacePointerController } from './useCanvasSurfacePointerController';

describe('useCanvasSurfacePointerController reading-scale coordinates', () => {
  it.each([
    { surfaceMode: 'page', displayScale: 0.5 },
    { surfaceMode: 'page', displayScale: 1.5 },
    { surfaceMode: 'canvas', displayScale: 0.5 },
    { surfaceMode: 'canvas', displayScale: 1.5 },
  ] as const)('creates a draft at the same local point in $surfaceMode at scale $displayScale', ({ surfaceMode, displayScale }) => {
    const blockList = document.createElement('div');
    const blockRect = new DOMRect(240, -80, 760 * displayScale, 1200 * displayScale);
    vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue(blockRect);
    const activateDraft = vi.fn();
    const policy = createSurfaceModePolicy(surfaceMode);
    const { result } = renderHook(() => useCanvasSurfacePointerController({
      activateDraft,
      clearBlockSelection: vi.fn(),
      contentWidth: 760,
      defaultDraftLayout: { x: 0, y: 0, width: 760, height: 60 },
      pageOffsetX: policy.pageOffsetX,
      snapEnabled: false,
      surfacePolicy: policy,
      viewportTransform: { x: 95, y: 420, width: 960, height: 700, zoom: displayScale },
    }));

    act(() => result.current.handlePageSpaceDoubleClick({
      target: blockList,
      currentTarget: blockList,
      clientX: blockRect.left + (120 + policy.pageOffsetX) * displayScale,
      clientY: blockRect.top + 300 * displayScale,
    } as unknown as MouseEvent<HTMLDivElement>));

    expect(activateDraft).toHaveBeenCalledOnce();
    expect(activateDraft).toHaveBeenCalledWith(expect.objectContaining({ x: 120, y: 300 }));
    expect(activateDraft.mock.calls[0][0].width).toBe(surfaceMode === 'page' ? 640 : 760);
  });
});
