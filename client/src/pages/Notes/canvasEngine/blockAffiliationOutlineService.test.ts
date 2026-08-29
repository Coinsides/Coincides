// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  resolveBlockAffiliationOutline,
} from './blockAffiliationOutlineService';
import type { RuntimeInteractionState } from './interactionController';
import type { PageFrameModel } from './types';

const PAGE_FRAME: PageFrameModel = {
  id: 'page-1',
  role: 'primary_page_frame',
  exportable: true,
  x: 100,
  y: 0,
  width: 904,
  height: 1278,
  contentInset: { top: 72, right: 72, bottom: 96, left: 72 },
};

function interactionState(
  mode: Extract<RuntimeInteractionState['mode'], 'draggingBlock' | 'resizingBlock'>,
): RuntimeInteractionState {
  return { mode, target: 'block', blockId: 'block-1' };
}

const PLACEMENTS = {
  inside: { blockId: 'block-1', x: 150, y: 100, width: 100, height: 40 },
  crossing: { blockId: 'block-1', x: 950, y: 100, width: 120, height: 40 },
  workspaceOnly: { blockId: 'block-1', x: 1100, y: 100, width: 120, height: 40 },
};

describe('block affiliation outline state', () => {
  it.each(['draggingBlock', 'resizingBlock'] as const)(
    'pairs page-blue and workspace-gray states during %s',
    (mode) => {
      expect(resolveBlockAffiliationOutline({
        blockId: 'block-1',
        interactionState: interactionState(mode),
        placement: PLACEMENTS.inside,
        pageFrames: [PAGE_FRAME],
      })).toEqual({
        affiliationKind: 'inside',
        tone: 'page',
        colorToken: 'var(--border-focus)',
      });

      expect(resolveBlockAffiliationOutline({
        blockId: 'block-1',
        interactionState: interactionState(mode),
        placement: PLACEMENTS.crossing,
        pageFrames: [PAGE_FRAME],
      })).toEqual({
        affiliationKind: 'crossing',
        tone: 'page',
        colorToken: 'var(--border-focus)',
      });

      expect(resolveBlockAffiliationOutline({
        blockId: 'block-1',
        interactionState: interactionState(mode),
        placement: PLACEMENTS.workspaceOnly,
        pageFrames: [PAGE_FRAME],
      })).toEqual({
        affiliationKind: 'workspace_only',
        tone: 'workspace',
        colorToken: 'var(--border-default)',
      });
    },
  );

  it('does not expose an affiliation outline outside the active block gesture', () => {
    expect(resolveBlockAffiliationOutline({
      blockId: 'block-1',
      interactionState: { mode: 'selectedBlock', blockId: 'block-1' },
      placement: PLACEMENTS.crossing,
      pageFrames: [PAGE_FRAME],
    })).toBeNull();
    expect(resolveBlockAffiliationOutline({
      blockId: 'block-2',
      interactionState: interactionState('draggingBlock'),
      placement: PLACEMENTS.crossing,
      pageFrames: [PAGE_FRAME],
    })).toBeNull();
  });
});
