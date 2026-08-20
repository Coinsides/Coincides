import { describe, expect, it } from 'vitest';
import { createPrimaryPageFrame } from './engineModel';
import { getPageFrameContentRect } from './pageFrameService';
import { appendPageFrameToStack } from './pageStackCollectionService';
import { resolvePageStackContentFlowPlan } from './pageStackContentFlowService';
import type { PageFrameCollectionModel, PageFrameModel } from './types';
import { resolvePageDraftSessionAuthority } from './hooks/useRuntimeNaturalWritingController';

function frame(id: string, y: number, role: PageFrameModel['role']): PageFrameModel {
  return {
    ...createPrimaryPageFrame({ id, y }),
    role,
  };
}

function collectionWithFrames(pageFrames: PageFrameModel[]): PageFrameCollectionModel {
  return {
    pageFrames,
    pageStacks: [{
      id: 'stack-a',
      displayName: 'Stack A',
      frameIds: pageFrames.map((pageFrame) => pageFrame.id),
      primaryFrameId: pageFrames[0]?.id || null,
      selectedFrameId: pageFrames[0]?.id || null,
      collapsed: false,
      numbering: { enabled: true, startAt: 1 },
      layout: { direction: 'vertical', gap: 80, collapsedPreviewPages: 1 },
      createdFrom: 'a4_note_seed',
    }],
    primaryFrameId: pageFrames[0]?.id || null,
    primaryStackId: 'stack-a',
    selectedFrameId: pageFrames[0]?.id || null,
    selectedStackId: 'stack-a',
  };
}

describe('page stack draft content flow authority', () => {
  it.each([
    { mode: 'existing' as const, expectedKind: 'move_to_existing_next_page' as const },
    { mode: 'append' as const, expectedKind: 'append_next_page' as const },
  ])('stamps the $mode F1 to F2 target frame into the planned layout', ({ mode, expectedKind }) => {
    const pageOffsetX = 96;
    const frameA = frame('owner-frame-a', 0, 'primary_page_frame');
    const frameB = frame('target-frame-b', frameA.height + 80, 'secondary_page_frame');
    const input = collectionWithFrames(mode === 'existing' ? [frameA, frameB] : [frameA]);
    const contentRectA = getPageFrameContentRect(frameA);

    const plan = resolvePageStackContentFlowPlan({
      collection: input,
      currentFrameId: frameA.id,
      draftLayout: {
        x: 0,
        y: contentRectA.y + contentRectA.height - 20,
        width: 540,
        height: 80,
      },
      draftText: 'overflowing draft',
      blockWorldOffsetX: pageOffsetX,
    });

    expect(plan.kind).toBe(expectedKind);
    expect(plan.targetFrameId).toBeTruthy();
    expect(plan.targetFrameId).not.toBe(frameA.id);
    expect(plan.targetLayout).toEqual(expect.objectContaining({
      surface: 'formal_page',
      frame_id: plan.targetFrameId,
      boundary_role: 'inside',
    }));
    if (mode === 'existing') expect(plan.targetFrameId).toBe(frameB.id);
    else expect(input.pageFrames.some((candidate) => candidate.id === plan.targetFrameId)).toBe(false);

    const targetCollection = mode === 'existing'
      ? input
      : appendPageFrameToStack(input, 'stack-a', frameA.id);
    const targetFrame = targetCollection.pageFrames
      .find((candidate) => candidate.id === plan.targetFrameId);
    expect(targetFrame).toBeTruthy();
    const targetRect = getPageFrameContentRect(targetFrame!);
    const authority = resolvePageDraftSessionAuthority({
      collection: input,
      layout: plan.targetLayout,
      selectedFrameId: frameA.id,
      pageOffsetX,
      pageFrameOverride: targetFrame,
      layoutCoordinates: 'runtime_surface',
    });
    expect(authority?.frameId).toBe(plan.targetFrameId);
    if (mode === 'append') {
      expect(resolvePageDraftSessionAuthority({
        collection: input,
        layout: plan.targetLayout,
        selectedFrameId: frameA.id,
        pageOffsetX,
        layoutCoordinates: 'runtime_surface',
      })).toBeNull();
    }
    expect(resolvePageDraftSessionAuthority({
      collection: input,
      layout: plan.targetLayout,
      selectedFrameId: frameA.id,
      pageOffsetX,
      pageFrameOverride: frameA,
      layoutCoordinates: 'runtime_surface',
    })).toBeNull();

    const canonical = authority!.canonicalizeLayout(plan.targetLayout);
    expect(canonical).toEqual(expect.objectContaining({
      x: targetRect.x,
      y: targetRect.y,
      coordinate_space: 'canvas_world',
      frame_id: plan.targetFrameId,
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: {
          left: targetRect.x,
          right: targetRect.x + targetRect.width,
          frameId: plan.targetFrameId,
        },
      },
    }));
  });
});
