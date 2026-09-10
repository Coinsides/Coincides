import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNoteCanvasResolvedLayoutModel } from './hooks/useNoteCanvasLayoutModel';
import {
  createSurfaceModePolicy, getVisibleBlocksForSurface, isPageFrameAffiliatedWorkspaceBlock,
} from './modePolicyService';
import * as placement from './placementService';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';
import type { PageFrameModel } from './types';

// Synthetic rows only. An unrelated first frame detects accidental first-frame fallback.
const frame: PageFrameModel = {
  id: 'owned-frame', role: 'primary_page_frame', exportable: true,
  x: 1000, y: 2000, width: 904, height: 1278,
  contentInset: { left: 72, right: 72, top: 96, bottom: 96 },
};
const frames = [{ ...frame, id: 'unrelated-frame', x: 0, y: 0, width: 444 }, frame];
const context = { contract: 'v2' as const, pageFrames: frames };
const visibility = { coordinateContract: 'v2' as const, pageFrames: frames };
const policy = createSurfaceModePolicy('page');
const stored: BlockBoxLayout = {
  x: 88, y: 120, width: 672, height: 100,
  coordinate_space: 'page_frame_local', frame_id: frame.id, surface: 'formal_page',
};
function block(layout: Partial<BlockBoxLayout> = {}): NoteBlock {
  return {
    id: 'boundary-block', placement_id: 'boundary-placement', block_type: 'paragraph', title: null,
    content_json: {}, plain_text: 'Synthetic boundary paragraph', metadata: {},
    order_index: 0, source_references: [], display_overrides_json: {},
    canvas_layout: { ...stored, ...layout },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('v2 read-side frame boundary account', () => {
  it('classifies the x=88/w=672 formal row inside a 904/inset72 frame despite contentWidth=646', () => {
    // Red before A3: the render width turns this stored inside row into workspace.
    expect(placement.isCanvasWorkspaceBlock(block(), 646, context)).toBe(false);
    expect(isPageFrameAffiliatedWorkspaceBlock(block(), 646, frames, 'outer', 'v2')).toBe(false);
  });

  it('keeps a frame-local formal row visible in page mode even beyond the frame bottom', () => {
    const row = block({ y: 1400 });
    expect(getVisibleBlocksForSurface([row], policy, 646, visibility)).toEqual([row]);
  });

  it('uses page normalization in both live hook passes for a frame-inside row', () => {
    const normalize = vi.spyOn(placement, 'normalizeBlockLayout');
    const normalizeResolved = vi.spyOn(placement, 'normalizeResolvedBlockLayout');
    const row = block();
    const subject = renderHook(() => useNoteCanvasResolvedLayoutModel({
      coordinateContract: 'v2', contentWidth: 646,
      documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
      layoutDrafts: {}, sortedBlocks: [row], pageFrames: frames,
      surfaceMode: 'page', surfacePolicy: policy,
    }));
    expect(subject.result.current.visibleBlocks).toEqual([row]);
    expect(normalize).toHaveBeenCalledWith(expect.objectContaining({ surfaceMode: 'page' }));
    expect(normalizeResolved).toHaveBeenCalledWith(expect.objectContaining({ surfaceMode: 'page' }));
    expect(subject.result.current.blockLayouts[row.id]).toMatchObject({
      x: 88, width: 646, frame_id: frame.id, surface: 'formal_page', boundary_role: 'inside',
    });
  });

  it.each([
    { name: 'old narrow snapshot', width: 672, oldRight: 646, workspace: false },
    { name: 'old wide snapshot', width: 720, oldRight: 900, workspace: true },
  ])('recomputes $name from current frame geometry', ({ width, oldRight, workspace }) => {
    const row = block({ width, surface_authority: {
      coordinateSpace: 'page_frame_local',
      pageBoundary: { left: 0, right: oldRight, frameId: 'obsolete-receipt-frame' },
    } });
    const before = JSON.stringify(row);
    expect(placement.isCanvasWorkspaceBlock(row, 646, context)).toBe(workspace);
    expect(JSON.stringify(row)).toBe(before);
  });

  it.each([frame.id, undefined])('uses current world boundaries and existing frame selection (frame_id=%s)', (frameId) => {
    const row = block({
      x: 1160, y: 2216, coordinate_space: 'canvas_world', frame_id: frameId,
      surface_authority: {
        coordinateSpace: 'canvas_world', pageBoundary: { left: 72, right: 832, frameId: frame.id },
      },
    });
    expect(placement.isCanvasWorkspaceBlock(row, 646, context)).toBe(false);
  });

  it('keeps tray membership independent of frame geometry', () => {
    const row = block({ surface: 'tray' });
    expect(placement.isCanvasWorkspaceBlock(row, 646, context)).toBe(false);
    expect(getVisibleBlocksForSurface([row], policy, 646, visibility)).toEqual([]);
  });

  it.each([
    { name: 'local without ID', layout: { frame_id: undefined }, pageFrames: frames, expected: '[true,true,["boundary-block"]]' },
    { name: 'local dead ID', layout: { frame_id: 'dead-frame' }, pageFrames: frames, expected: '[true,true,["boundary-block"]]' },
    { name: 'empty frame context', layout: {}, pageFrames: [], expected: '[true,false,[]]' },
    { name: 'world dead ID', layout: { x: 1160, y: 2216, coordinate_space: 'canvas_world', frame_id: 'dead-frame' }, pageFrames: frames, expected: '[false,false,["boundary-block"]]' },
    { name: 'unresolved with old authority', layout: { frame_id: 'dead-frame', surface_authority: {
      coordinateSpace: 'page_frame_local', pageBoundary: { left: 0, right: 760, frameId: frame.id },
    } }, pageFrames: frames, expected: '[false,false,["boundary-block"]]' },
  ] satisfies { name: string; layout: Partial<BlockBoxLayout>; pageFrames: PageFrameModel[]; expected: string }[])(
    'preserves pre-A3 bytes for $name', ({ layout, pageFrames, expected }) => {
      const row = block(layout);
      const before = JSON.stringify(row);
      // These exact serializations are asserted green on unmodified production code first.
      const actual = JSON.stringify([
        placement.isCanvasWorkspaceBlock(row, 646, { contract: 'v2', pageFrames }),
        isPageFrameAffiliatedWorkspaceBlock(row, 646, pageFrames, 'outer', 'v2'),
        getVisibleBlocksForSurface([row], policy, 646, { coordinateContract: 'v2', pageFrames }).map((item) => item.id),
      ]);
      expect(actual).toBe(expected);
      expect(JSON.stringify(row)).toBe(before);
    },
  );

  it('preserves the default and explicit v1 account with frame context', () => {
    const row = block();
    const before = JSON.stringify(row);
    expect(JSON.stringify([
      placement.isCanvasWorkspaceBlock(row, 646),
      placement.isCanvasWorkspaceBlock(row, 646, { contract: 'v1', pageFrames: frames }),
      placement.isCanvasWorkspaceBlock(row, 646, { pageFrames: frames }),
    ])).toBe('[true,true,true]');
    expect(JSON.stringify(row)).toBe(before);
  });
});
