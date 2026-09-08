import { resolveFlowFrameStartLayout, resolveWorldRect, toStoredLayout, type CoordinateContract } from './placementContractService';
import {
  getPageFrameContentRect,
} from './pageFrameService';
import {
  appendPageFrameToStack,
  resolvePageStackContext,
} from './pageStackCollectionService';
import {
  estimateTypographyTextBlockHeight,
} from './typographyMeasurementService';
import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
} from './typographyProfileService';
import type { BlockBoxLayout } from './runtimeLayout';
import type {
  DocumentTypographyProfile,
  PageFrameCollectionModel,
  PageFrameModel,
} from './types';

interface ResolvePageStackContentFlowPlanInput {
  coordinateContract?: CoordinateContract;
  collection: PageFrameCollectionModel;
  currentFrameId: string | null | undefined;
  draftLayout: BlockBoxLayout;
  draftText?: string;
  documentTypography?: DocumentTypographyProfile;
  blockWorldOffsetX?: number;
}

interface PageStackContentFlowPlanBase {
  targetFrameId: string | null;
  targetLayout: BlockBoxLayout;
}

export type PageStackContentFlowPlan =
  | (PageStackContentFlowPlanBase & {
    kind: 'stay_on_current_page';
    targetFrameId: string;
  })
  | (PageStackContentFlowPlanBase & {
    kind: 'move_to_existing_next_page';
    targetFrameId: string;
  })
  | (PageStackContentFlowPlanBase & {
    kind: 'append_next_page';
    stackId: string;
    afterFrameId: string;
  })
  | (PageStackContentFlowPlanBase & {
    kind: 'no_page_stack_target';
    targetFrameId: null;
  });

function findPageFrame(
  collection: PageFrameCollectionModel,
  frameId: string | null | undefined,
): PageFrameModel | null {
  if (!frameId) return null;
  return collection.pageFrames.find((frame) => frame.id === frameId) || null;
}

function createDraftLayoutAtFrameStart(
  pageFrame: PageFrameModel,
  draftLayout: BlockBoxLayout,
  blockWorldOffsetX: number,
  contract: CoordinateContract,
): BlockBoxLayout {
  return resolveFlowFrameStartLayout(pageFrame, draftLayout, blockWorldOffsetX, contract, () => {
    const contentRect = getPageFrameContentRect(pageFrame);
    const {
      coordinate_space: _coordinateSpace,
      surface_authority: _surfaceAuthority,
      ...runtimeLayout
    } = draftLayout;
    return {
      ...runtimeLayout,
      x: contentRect.x - blockWorldOffsetX,
      y: contentRect.y,
      width: Math.min(draftLayout.width, contentRect.width || draftLayout.width),
      surface: 'formal_page',
      frame_id: pageFrame.id,
      boundary_role: 'inside',
    };
  });
}

function bindDraftLayoutToFrame(
  pageFrame: PageFrameModel,
  draftLayout: BlockBoxLayout,
): BlockBoxLayout {
  const contentRect = getPageFrameContentRect(pageFrame);
  return {
    ...draftLayout,
    surface: 'formal_page',
    coordinate_space: 'page_frame_local',
    frame_id: pageFrame.id,
    boundary_role: 'inside',
    surface_authority: {
      coordinateSpace: 'page_frame_local',
      pageBoundary: {
        left: 0,
        right: contentRect.width,
        frameId: pageFrame.id,
      },
    },
  };
}

function estimateDraftBottom({
  draftLayout,
  draftText = '',
  documentTypography = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
}: {
  draftLayout: BlockBoxLayout;
  draftText?: string;
  documentTypography?: DocumentTypographyProfile;
}): number {
  const estimate = estimateTypographyTextBlockHeight({
    text: draftText,
    width: draftLayout.width,
    typography: documentTypography,
  });
  return draftLayout.y + Math.max(draftLayout.height, estimate.heightPx);
}

export function resolvePageStackContentFlowPlan({
  collection,
  currentFrameId,
  draftLayout,
  draftText,
  documentTypography,
  blockWorldOffsetX = 0,
  coordinateContract = 'v1',
}: ResolvePageStackContentFlowPlanInput): PageStackContentFlowPlan {
  const currentFrame = findPageFrame(collection, currentFrameId);
  if (!currentFrame) {
    return {
      kind: 'no_page_stack_target',
      targetFrameId: null,
      targetLayout: draftLayout,
    };
  }

  const contentRect = getPageFrameContentRect(currentFrame);
  const contentBottom = contentRect.y + contentRect.height;
  const draftBottom = estimateDraftBottom({
    draftLayout: { ...draftLayout, ...resolveWorldRect(draftLayout, currentFrame, coordinateContract, blockWorldOffsetX) },
    draftText,
    documentTypography,
  });
  if (draftBottom <= contentBottom) {
    return {
      kind: 'stay_on_current_page',
      targetFrameId: currentFrame.id,
      targetLayout: bindDraftLayoutToFrame(currentFrame, toStoredLayout(draftLayout, [currentFrame], coordinateContract)),
    };
  }

  const context = resolvePageStackContext(collection, currentFrame.id);
  if (!context) {
    return {
      kind: 'no_page_stack_target',
      targetFrameId: null,
      targetLayout: draftLayout,
    };
  }

  const nextFrameId = context.stack.frameIds[context.index + 1] || null;
  const nextFrame = findPageFrame(collection, nextFrameId);
  if (nextFrame) {
    return {
      kind: 'move_to_existing_next_page',
      targetFrameId: nextFrame.id,
      targetLayout: createDraftLayoutAtFrameStart(nextFrame, draftLayout, blockWorldOffsetX, coordinateContract),
    };
  }

  const simulatedCollection = appendPageFrameToStack(collection, context.stack.id, currentFrame.id);
  const appendedFrame = findPageFrame(simulatedCollection, simulatedCollection.selectedFrameId);
  return {
    kind: 'append_next_page',
    stackId: context.stack.id,
    afterFrameId: currentFrame.id,
    targetFrameId: appendedFrame?.id || null,
    targetLayout: appendedFrame
      ? createDraftLayoutAtFrameStart(appendedFrame, draftLayout, blockWorldOffsetX, coordinateContract)
      : draftLayout,
  };
}
