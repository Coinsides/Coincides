import { presentationKindForBlock } from './blockContentService';
import type { NoteBlock } from './runtimeDataTypes';
import type { DocumentFlowPoint } from './documentTextFlowSelection';

export interface TextFlowBoundaryNavigationRequest {
  direction: 'up' | 'down' | 'left' | 'right';
  /** Screen-space caret column measured by the existing TextFlow mirror. */
  columnX: number | null;
  selectionAnchor?: DocumentFlowPoint;
}

/** The receiving editor owns its visible units, caret affinity and sticky column. */
export type TextFlowNavigationTarget = (request: TextFlowBoundaryNavigationRequest) => boolean;

const textBlockKinds = new Set([
  'text', 'paragraph', 'heading', 'definition', 'theorem', 'proof',
  'example', 'exercise', 'answer', 'sidenote',
]);

export function supportsTextFlowBlockNavigation(block: NoteBlock): boolean {
  return textBlockKinds.has(block.block_type)
    && block.source_kind !== 'source_projection'
    && presentationKindForBlock(block) === 'paragraph';
}

/** Follow the exact rendered Layout order, never geometry, IDs or a second sort. */
export function navigateTextFlowBlockBoundary({
  visibleBlocks,
  fromBlockId,
  request,
  targets,
  disabled = false,
}: {
  visibleBlocks: readonly NoteBlock[];
  fromBlockId: string;
  request: TextFlowBoundaryNavigationRequest;
  targets: ReadonlyMap<string, TextFlowNavigationTarget>;
  disabled?: boolean;
}): boolean {
  if (disabled) return false;
  const sourceIndex = visibleBlocks.findIndex((block) => block.id === fromBlockId);
  if (sourceIndex === -1 || !supportsTextFlowBlockNavigation(visibleBlocks[sourceIndex])) return false;
  const step = request.direction === 'up' || request.direction === 'left' ? -1 : 1;
  for (let index = sourceIndex + step; index >= 0 && index < visibleBlocks.length; index += step) {
    const block = visibleBlocks[index];
    if (!supportsTextFlowBlockNavigation(block)) {
      if (request.selectionAnchor) return false;
      continue;
    }
    // Read-only, unmounted and hidden editors have no live target or refuse focus.
    if (targets.get(block.id)?.(request)) return true;
    if (request.selectionAnchor) return false;
  }
  return false;
}
