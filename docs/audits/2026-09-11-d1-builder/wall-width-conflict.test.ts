import { afterAll, describe, expect, it } from '../../../client/node_modules/vitest/dist/index.js';
import { renderHook } from '../../../client/node_modules/@testing-library/react/dist/index.js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyCanvasLayoutsToBlocks } from '../../../client/src/pages/Notes/canvasEngine/canvasObjectRepository';
import { isCanvasWorkspaceBlock, normalizeResolvedBlockLayout } from '../../../client/src/pages/Notes/canvasEngine/placementService';
import { useNoteCanvasResolvedLayoutModel } from '../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel';
import { createSurfaceModePolicy } from '../../../client/src/pages/Notes/canvasEngine/modePolicyService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../../../client/src/pages/Notes/canvasEngine/typographyProfileService';
import type { BlockBoxLayout } from '../../../client/src/pages/Notes/canvasEngine/runtimeLayout';
import type { NoteBlock } from '../../../client/src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { PageFrameModel } from '../../../client/src/pages/Notes/canvasEngine/types';

const frame: PageFrameModel = {
  id: 'synthetic-frame', role: 'primary_page_frame', exportable: true,
  x: 0, y: 0, width: 904, height: 1278, pageSize: 'A4',
  contentInset: { left: 72, right: 72, top: 0, bottom: 96 },
};
const evidence: Record<string, unknown>[] = [];

function probe(name: string, width: number, right: number, widthMode?: 'manual') {
  const layout: BlockBoxLayout = {
    x: 0, y: 120, width, height: 100, coordinate_space: 'page_frame_local',
    frame_id: frame.id, surface: 'formal_page', ...(widthMode ? { width_mode: widthMode } : {}),
  };
  const block = {
    id: 'synthetic-block', placement_id: 'synthetic-placement', block_type: 'paragraph', title: null,
    content_json: {}, plain_text: 'Synthetic wall width probe', metadata: {}, order_index: 0,
    source_references: [], display_overrides_json: {},
  } as NoteBlock;
  const row = { block_id: block.id, placement_id: block.placement_id!, layout };
  const bytes = JSON.stringify(row);
  const nextFrame = { ...frame, contentInset: { ...frame.contentInset, right } };
  function hydrate(currentFrame: PageFrameModel) {
    return applyCanvasLayoutsToBlocks([block], [row], {
      coordinateContract: 'v2',
      pageFrameCollection: { primaryFrameId: frame.id, pageFrames: [currentFrame], pageStacks: [] },
    })[0];
  }
  const initial = hydrate(frame);
  const current = hydrate(nextFrame);
  const span = nextFrame.width - nextFrame.contentInset.left - nextFrame.contentInset.right;
  const hydrated = current.canvas_layout as unknown as BlockBoxLayout;
  const normalized = normalizeResolvedBlockLayout({
    block: current, layout: hydrated, contentWidth: span, surfaceMode: 'page',
    contract: 'v2', pageFrames: [nextFrame], estimateHeight: () => 100,
  });
  const mounted = renderHook(() => useNoteCanvasResolvedLayoutModel({
    coordinateContract: 'v2', contentWidth: span,
    documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    layoutDrafts: {}, sortedBlocks: [current], pageFrames: [nextFrame],
    surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page'),
  }));
  const liveLayout = mounted.result.current.blockLayouts[block.id];
  const liveVisible = mounted.result.current.visibleBlocks.map((item) => item.id);
  mounted.unmount();
  const actual = {
    name, span, storedWidth: width, widthMode: widthMode || 'auto', inputBytesUnchanged: JSON.stringify(row) === bytes,
    initial: initial.canvas_layout,
    current: hydrated,
    isWorkspace: isCanvasWorkspaceBlock(current, span, { contract: 'v2', pageFrames: [nextFrame] }),
    normalized,
    liveLayout,
    liveVisible,
  };
  evidence.push(actual);
  return actual;
}

describe('D1 synthetic conflict evidence (current behavior, no database)', () => {
  it('auto 760 remains 760/workspace after only shrinking frame span to 600 and rehydrating', () => {
    const actual = probe('auto shrink across persisted width', 760, 232);
    expect(actual.inputBytesUnchanged).toBe(true);
    expect(actual.initial).toMatchObject({ surface: 'formal_page', width: 760 });
    expect(actual.current).toMatchObject({ surface: 'canvas_workspace', boundary_role: 'crossing', width: 760 });
    expect(actual.isWorkspace).toBe(true);
    // The direct page normalization does narrow; the actual hook selects its
    // existing affiliated-workspace path from the hydrated classification.
    expect(actual.normalized.width).toBe(600);
    expect(actual.liveVisible).toEqual(['synthetic-block']);
    expect(actual.liveLayout).toMatchObject({ width: 760, surface: 'canvas_workspace' });
  });

  it('legal manual width stays formal when the same wall shrinks', () => {
    const actual = probe('manual legal control', 500, 232, 'manual');
    expect(actual.inputBytesUnchanged).toBe(true);
    expect(actual.current).toMatchObject({ surface: 'formal_page', boundary_role: 'inside', width: 500 });
    expect(actual.isWorkspace).toBe(false);
    expect(actual.normalized.width).toBe(500);
    expect(actual.liveLayout.width).toBe(500);
  });

  it('a previously narrow auto row can shrink to the new span without crossing classification', () => {
    const actual = probe('auto narrow snapshot control', 500, 232);
    expect(actual.inputBytesUnchanged).toBe(true);
    expect(actual.isWorkspace).toBe(false);
    expect(actual.normalized.width).toBe(600);
    expect(actual.liveLayout.width).toBe(600);
  });

  it('widening to 808 keeps auto formal but current 760 cap still applies', () => {
    const actual = probe('auto widening control', 760, 24);
    expect(actual.inputBytesUnchanged).toBe(true);
    expect(actual.span).toBe(808);
    expect(actual.isWorkspace).toBe(false);
    expect(actual.normalized.width).toBe(760);
    expect(actual.liveLayout.width).toBe(760);
  });
});

afterAll(() => writeFileSync(resolve(process.cwd(), '../docs/audits/2026-09-11-d1-builder/wall-width-conflict.json'), `${JSON.stringify({
  scope: 'Synthetic in-memory hydration and normalization; no API or database calls',
  productChanges: [],
  firstAttempt: 'Direct surfaceMode=page normalization returned 600, disproving the initial direct-normalizer assertion. The final probe invokes the real useNoteCanvasResolvedLayoutModel hook to observe its selected path.',
  cases: evidence,
}, null, 2)}\n`));
