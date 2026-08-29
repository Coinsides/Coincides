import type { RuntimeInteractionState } from './interactionController';
import {
  derivePlacementPageFrameAffiliation,
  type PageFrameAffiliationKind,
} from './pageFrameAffiliationService';
import type { PageFrameModel } from './types';

export type BlockAffiliationOutlineTone = 'page' | 'workspace';

export interface BlockAffiliationOutlineState {
  affiliationKind: PageFrameAffiliationKind;
  tone: BlockAffiliationOutlineTone;
  colorToken: 'var(--border-focus)' | 'var(--border-default)';
}

export interface ResolveBlockAffiliationOutlineInput {
  blockId: string;
  interactionState: Pick<RuntimeInteractionState, 'mode' | 'blockId'>;
  placement: {
    blockId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  pageFrames: PageFrameModel[];
}

export function resolveBlockAffiliationOutline(
  input: ResolveBlockAffiliationOutlineInput,
): BlockAffiliationOutlineState | null {
  const gestureActive = input.interactionState.mode === 'draggingBlock'
    || input.interactionState.mode === 'resizingBlock';
  if (
    !gestureActive
    || input.interactionState.blockId !== input.blockId
    || input.placement?.blockId !== input.blockId
  ) {
    return null;
  }

  const affiliation = derivePlacementPageFrameAffiliation({
    placement: input.placement,
    pageFrames: input.pageFrames,
    boundary: 'outer',
  });
  const workspaceOnly = affiliation.kind === 'workspace_only';
  return {
    affiliationKind: affiliation.kind,
    tone: workspaceOnly ? 'workspace' : 'page',
    colorToken: workspaceOnly ? 'var(--border-default)' : 'var(--border-focus)',
  };
}
