import { resolveAffiliationRect, selectPlacementFrame, moveAffiliatedLayout, type CoordinateContract } from './placementContractService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { CanvasRect, PageFrameModel } from './types';

export type LayoutContainerKind = 'page_frame' | 'workspace';
export type LayoutAffiliationRelation = 'fully_contained' | 'crossing' | 'floating';

export interface LayoutAffiliation {
  objectId: string;
  containerKind: LayoutContainerKind;
  containerId: string | null;
  relation: LayoutAffiliationRelation;
  source: 'geometry';
}

export interface PageFrameLayoutAffiliationInput {
  pageFrame: PageFrameModel;
  blockLayouts: Record<string, BlockBoxLayout>;
  blockWorldOffsetX?: number;
  coordinateContract?: CoordinateContract;
  pageFrames?: PageFrameModel[];
}

export interface MovePageFrameAffiliatedBlockLayoutsInput extends PageFrameLayoutAffiliationInput {
  delta: { x: number; y: number };
}

function rectRight(rect: CanvasRect): number {
  return rect.x + rect.width;
}

function rectBottom(rect: CanvasRect): number {
  return rect.y + rect.height;
}

function rectFullyContains(container: CanvasRect, target: CanvasRect): boolean {
  return target.x >= container.x
    && target.y >= container.y
    && rectRight(target) <= rectRight(container)
    && rectBottom(target) <= rectBottom(container);
}

function rectIntersects(a: CanvasRect, b: CanvasRect): boolean {
  return a.x < rectRight(b)
    && rectRight(a) > b.x
    && a.y < rectBottom(b)
    && rectBottom(a) > b.y;
}

function createWorkspaceAffiliation(objectId: string): LayoutAffiliation {
  return {
    objectId,
    containerKind: 'workspace',
    containerId: null,
    relation: 'floating',
    source: 'geometry',
  };
}

export function deriveLayoutAffiliationsForPageFrame({
  pageFrame,
  blockLayouts,
  blockWorldOffsetX = 0,
  coordinateContract = 'v1',
  pageFrames = [pageFrame],
}: PageFrameLayoutAffiliationInput): Record<string, LayoutAffiliation> {
  return Object.fromEntries(
    Object.entries(blockLayouts).map(([objectId, layout]) => {
      const blockRect = resolveAffiliationRect(layout, selectPlacementFrame(layout, pageFrames, coordinateContract, pageFrame), coordinateContract, blockWorldOffsetX);
      if (rectFullyContains(pageFrame, blockRect)) {
        return [objectId, {
          objectId,
          containerKind: 'page_frame',
          containerId: pageFrame.id,
          relation: 'fully_contained',
          source: 'geometry',
        } satisfies LayoutAffiliation];
      }

      if (rectIntersects(pageFrame, blockRect)) {
        return [objectId, {
          objectId,
          containerKind: 'page_frame',
          containerId: pageFrame.id,
          relation: 'crossing',
          source: 'geometry',
        } satisfies LayoutAffiliation];
      }

      return [objectId, createWorkspaceAffiliation(objectId)];
    }),
  );
}

export function derivePageFrameMoveCohort(input: PageFrameLayoutAffiliationInput): string[] {
  const affiliations = deriveLayoutAffiliationsForPageFrame(input);
  return Object.values(affiliations)
    .filter((affiliation) => (
      affiliation.containerKind === 'page_frame'
      && affiliation.containerId === input.pageFrame.id
      && affiliation.relation === 'fully_contained'
    ))
    .map((affiliation) => affiliation.objectId);
}

export function movePageFrameAffiliatedBlockLayouts({
  pageFrame,
  blockLayouts,
  blockWorldOffsetX = 0,
  coordinateContract = 'v1',
  pageFrames = [pageFrame],
  delta,
}: MovePageFrameAffiliatedBlockLayoutsInput): Record<string, BlockBoxLayout> {
  const cohort = new Set(derivePageFrameMoveCohort({
    pageFrame,
    blockLayouts,
    blockWorldOffsetX,
    coordinateContract,
    pageFrames,
  }));

  return Object.fromEntries(
    Object.entries(blockLayouts)
      .filter(([blockId]) => cohort.has(blockId))
      .map(([blockId, layout]) => [
        blockId,
        moveAffiliatedLayout(layout, pageFrame, delta, coordinateContract),
      ]),
  );
}
