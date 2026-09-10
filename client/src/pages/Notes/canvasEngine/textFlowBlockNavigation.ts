import { presentationKindForBlock } from './blockContentService';
import type { NoteBlock } from './runtimeDataTypes';
import type { DocumentFlowPoint } from './documentTextFlowSelection';
import { resolveScreenRect, selectPlacementFrame, type CoordinateContract } from './placementContractService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';

export interface TextFlowLayoutOrder {
  obstacles?: readonly { id: string; x: number; y: number }[];
  blockLayouts?: Record<string, BlockBoxLayout>;
  pageFrames?: PageFrameModel[];
  coordinateContract?: CoordinateContract;
  pageOffsetX?: number;
}

/** Moving a placement does not change order_index. Share its reading order with selection. */
export function textFlowReadingOrder(blocks: readonly NoteBlock[], layout: TextFlowLayoutOrder): { id: string; block?: NoteBlock }[] {
  const entries = blocks.map((block, index) => {
    const box = layout.blockLayouts?.[block.id];
    return { id: block.id, block, index, rect: box ? resolveScreenRect(box,
      selectPlacementFrame(box, layout.pageFrames ?? [], layout.coordinateContract), layout.coordinateContract, layout.pageOffsetX) : null };
  });
  const obstacles = (layout.obstacles ?? []).map((obstacle, index) => ({
    id: obstacle.id, block: undefined, index: blocks.length + index, rect: obstacle,
  }));
  return [...entries, ...obstacles].sort((a, b) => a.rect && b.rect
    ? a.rect.y - b.rect.y || a.rect.x - b.rect.x || a.index - b.index
    : a.index - b.index).map(({ id, block }) => ({ id, block }));
}

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

/** Use the same placement reading order for navigation and document selections. */
export function navigateTextFlowBlockBoundary({
  visibleBlocks,
  fromBlockId,
  request,
  targets,
  disabled = false,
  ...layout
}: {
  visibleBlocks: readonly NoteBlock[];
  fromBlockId: string;
  request: TextFlowBoundaryNavigationRequest;
  targets: ReadonlyMap<string, TextFlowNavigationTarget>;
  disabled?: boolean;
} & TextFlowLayoutOrder): boolean {
  if (disabled) return false;
  const entries = textFlowReadingOrder(visibleBlocks, layout);
  const sourceIndex = entries.findIndex((entry) => entry.id === fromBlockId);
  const source = entries[sourceIndex]?.block;
  if (sourceIndex === -1 || (request.selectionAnchor && (!source || !supportsTextFlowBlockNavigation(source)))) return false;
  const step = request.direction === 'up' || request.direction === 'left' ? -1 : 1;
  for (let index = sourceIndex + step; index >= 0 && index < entries.length; index += step) {
    const { id, block } = entries[index];
    if (!block || !supportsTextFlowBlockNavigation(block)) {
      if (request.selectionAnchor) return false;
      return targets.get(id)?.(request) ?? false;
    }
    // Read-only, unmounted and hidden editors have no live target or refuse focus.
    if (targets.get(id)?.(request)) return true;
    if (request.selectionAnchor) return false;
  }
  return false;
}
