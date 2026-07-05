import {
  resolvePageStackContext,
} from './pageStackCollectionService';
import {
  getPageFrameContentRect,
} from './pageFrameService';
import type {
  CanvasRect,
  PageFrameCollectionModel,
  PageStackBlockFragmentProjection,
  PageStackBlockFragmentRole,
} from './types';

interface FragmentBlockLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DerivePageStackBlockFragmentsInput {
  collection: PageFrameCollectionModel;
  blockId: string;
  layout: FragmentBlockLayout;
  blockWorldOffsetX?: number;
}

function rectFromLayout(layout: FragmentBlockLayout, blockWorldOffsetX: number): CanvasRect {
  return {
    x: layout.x + blockWorldOffsetX,
    y: layout.y,
    width: layout.width,
    height: layout.height,
  };
}

function intersectRects(a: CanvasRect, b: CanvasRect): CanvasRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - x;
  const height = bottom - y;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function fragmentRole(index: number, total: number): PageStackBlockFragmentRole {
  if (total <= 1) return 'single';
  if (index === 0) return 'start';
  if (index === total - 1) return 'end';
  return 'middle';
}

export function derivePageStackBlockFragments({
  collection,
  blockId,
  layout,
  blockWorldOffsetX = 0,
}: DerivePageStackBlockFragmentsInput): PageStackBlockFragmentProjection[] {
  const blockRect = rectFromLayout(layout, blockWorldOffsetX);
  const candidatesByStack = new Map<string, PageStackBlockFragmentProjection[]>();

  collection.pageFrames.forEach((pageFrame) => {
    const context = resolvePageStackContext(collection, pageFrame.id);
    if (!context) return;

    const pageContentRect = getPageFrameContentRect(pageFrame);
    const visibleRect = intersectRects(blockRect, pageContentRect);
    if (!visibleRect) return;

    const projection: PageStackBlockFragmentProjection = {
      blockId,
      blockRect,
      pageContentRect,
      pageStackId: context.stack.id,
      pageFrameId: pageFrame.id,
      pageIndex: context.index,
      pageTotal: context.total,
      fragmentIndex: 0,
      fragmentTotal: 0,
      role: 'single',
      visibleRect,
      clippedTop: visibleRect.y > blockRect.y,
      clippedBottom: visibleRect.y + visibleRect.height < blockRect.y + blockRect.height,
    };

    const existing = candidatesByStack.get(context.stack.id) || [];
    candidatesByStack.set(context.stack.id, [...existing, projection]);
  });

  if (candidatesByStack.size !== 1) return [];

  const fragments = [...candidatesByStack.values()][0]!
    .sort((a, b) => a.pageIndex - b.pageIndex);
  const fragmentTotal = fragments.length;
  return fragments.map((fragment, index) => ({
    ...fragment,
    fragmentIndex: index,
    fragmentTotal,
    role: fragmentRole(index, fragmentTotal),
  }));
}
