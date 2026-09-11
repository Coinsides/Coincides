import { afterAll, describe, expect, it } from '../../../client/node_modules/vitest/dist/index.js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyCanvasLayoutsToBlocks } from '../../../client/src/pages/Notes/canvasEngine/canvasObjectRepository';
import { isCanvasWorkspaceBlock } from '../../../client/src/pages/Notes/canvasEngine/placementService';
import type { BlockBoxLayout } from '../../../client/src/pages/Notes/canvasEngine/runtimeLayout';
import type { NoteBlock } from '../../../client/src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { PageFrameModel } from '../../../client/src/pages/Notes/canvasEngine/types';

// Audit of the paused A implementation only: synthetic rows, no API/database.
const frame: PageFrameModel = {
  id: 'result-2-control-frame', role: 'primary_page_frame', exportable: true,
  x: 0, y: 0, width: 904, height: 1278,
  contentInset: { left: 72, right: 232, top: 96, bottom: 96 },
};
const evidence: Record<string, unknown>[] = [];

describe('Result 2 paused auto classifier / manual positive control', () => {
  it.each([
    { name: 'stale auto snapshot derives inside', x: 0, manual: false, surface: 'formal_page', boundary: 'inside' },
    { name: 'same stale manual snapshot remains crossing', x: 0, manual: true, surface: 'canvas_workspace', boundary: 'crossing' },
    { name: 'auto stored x crosses left wall', x: -20, manual: false, surface: 'canvas_workspace', boundary: 'crossing' },
    { name: 'auto stored x exceeds right wall', x: 620, manual: false, surface: 'canvas_workspace', boundary: 'outside' },
  ])('$name', ({ name, x, manual, surface, boundary }) => {
    const layout: BlockBoxLayout = {
      x, y: 120.25, width: 760, height: 100,
      coordinate_space: 'page_frame_local', frame_id: frame.id, surface: 'formal_page',
      ...(manual ? { width_mode: 'manual' as const } : {}),
    };
    const block: NoteBlock = {
      id: 'result-2-control-block', placement_id: 'result-2-control-placement', block_type: 'paragraph',
      title: null, content_json: {}, plain_text: 'Synthetic manual control', metadata: {},
      order_index: 0, source_references: [], display_overrides_json: {}, canvas_layout: null,
    };
    const row = { block_id: block.id, placement_id: block.placement_id!, layout };
    const before = JSON.stringify(row);
    const hydrated = applyCanvasLayoutsToBlocks([block], [row], {
      coordinateContract: 'v2',
      pageFrameCollection: { primaryFrameId: frame.id, pageFrames: [frame], pageStacks: [] },
    })[0];
    const classified = hydrated.canvas_layout as unknown as BlockBoxLayout;
    const workspace = isCanvasWorkspaceBlock(hydrated, 646, { contract: 'v2', pageFrames: [frame] });
    const unchanged = JSON.stringify(row) === before;
    evidence.push({
      name, status: 'paused-partial-implementation', span: 600,
      input: row, hydrated: classified, workspace,
      storedBytesUnchanged: unchanged,
    });
    expect(classified).toMatchObject({ x, y: 120.25, width: 760, surface, boundary_role: boundary });
    expect(workspace).toBe(surface === 'canvas_workspace');
    expect(unchanged).toBe(true);
    expect(classified.width_mode).toBe(manual ? 'manual' : undefined);
  });
});

afterAll(() => writeFileSync(resolve(process.cwd(), '../docs/audits/2026-09-11-d1-builder/result-2-manual-control.json'),
  JSON.stringify({ scope: 'Classifier evidence only; D1 stopped and incomplete', cases: evidence }, null, 2)));
