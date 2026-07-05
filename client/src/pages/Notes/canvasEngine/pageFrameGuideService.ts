import {
  SNAP_THRESHOLD,
} from './runtimeLayout';
import {
  getPageFrameContentRect,
  getPageFrameOuterRect,
} from './pageFrameService';
import type {
  CanvasRect,
  PageFrameGuideSet,
  PageFrameGuideVisibility,
  PageFrameModel,
  PageFrameSnapResult,
} from './types';

export interface SnapRectToPageFrameGuidesInput {
  rect: CanvasRect;
  pageFrame: PageFrameModel;
  snapEnabled?: boolean;
  threshold?: number;
}

export interface ShouldShowPageFrameGuidesInput {
  surfaceMode: 'page' | 'canvas';
  layoutMode: boolean;
  interactionMode: string;
}

function guideId(frameId: string, kind: string): string {
  return `${frameId}:guide:${kind}`;
}

export function createPageFrameGuides(pageFrame: PageFrameModel): PageFrameGuideSet {
  const outerRect = getPageFrameOuterRect(pageFrame);
  const contentRect = getPageFrameContentRect(pageFrame);
  const leftX = contentRect.x;
  const rightX = contentRect.x + contentRect.width;
  const centerX = contentRect.x + contentRect.width / 2;
  const topY = contentRect.y;

  return {
    frameId: pageFrame.id,
    outerRect,
    contentRect,
    topRuler: {
      id: guideId(pageFrame.id, 'top-ruler'),
      frameId: pageFrame.id,
      kind: 'top_ruler',
      axis: 'y',
      x: contentRect.x,
      y: topY,
      length: contentRect.width,
    },
    leftMargin: {
      id: guideId(pageFrame.id, 'left-margin'),
      frameId: pageFrame.id,
      kind: 'left_margin',
      axis: 'x',
      x: leftX,
      y: contentRect.y,
      length: contentRect.height,
    },
    rightMargin: {
      id: guideId(pageFrame.id, 'right-margin'),
      frameId: pageFrame.id,
      kind: 'right_margin',
      axis: 'x',
      x: rightX,
      y: contentRect.y,
      length: contentRect.height,
    },
    centerLine: {
      id: guideId(pageFrame.id, 'center-line'),
      frameId: pageFrame.id,
      kind: 'center_line',
      axis: 'x',
      x: centerX,
      y: contentRect.y,
      length: contentRect.height,
    },
  };
}

function noSnap(rect: CanvasRect): PageFrameSnapResult {
  return {
    rect,
    guide: null,
    snapState: 'free',
    snappedAxes: { x: false, y: false },
  };
}

export function snapRectToPageFrameGuides({
  rect,
  pageFrame,
  snapEnabled = true,
  threshold = SNAP_THRESHOLD,
}: SnapRectToPageFrameGuidesInput): PageFrameSnapResult {
  if (!snapEnabled) return noSnap(rect);

  const guides = createPageFrameGuides(pageFrame);
  const rectRight = rect.x + rect.width;
  const rectCenter = rect.x + rect.width / 2;
  const candidates = [
    {
      distance: Math.abs(rect.x - guides.leftMargin.x),
      x: guides.leftMargin.x,
      guideX: guides.leftMargin.x,
    },
    {
      distance: Math.abs(rectRight - guides.rightMargin.x),
      x: guides.rightMargin.x - rect.width,
      guideX: guides.rightMargin.x,
    },
    {
      distance: Math.abs(rectCenter - guides.centerLine.x),
      x: guides.centerLine.x - rect.width / 2,
      guideX: guides.centerLine.x,
    },
  ].sort((a, b) => a.distance - b.distance);

  const best = candidates[0];
  if (!best || best.distance > threshold) return noSnap(rect);

  return {
    rect: {
      ...rect,
      x: best.x,
    },
    guide: { x: best.guideX },
    snapState: 'snapped',
    snappedAxes: { x: true, y: false },
  };
}

export function shouldShowPageFrameGuides({
  layoutMode,
  interactionMode,
}: ShouldShowPageFrameGuidesInput): PageFrameGuideVisibility {
  const activeLayoutGesture = interactionMode === 'draggingBlock' || interactionMode === 'resizingBlock';
  const showGuides = layoutMode || activeLayoutGesture;
  return {
    topRuler: showGuides,
    leftRight: showGuides,
    center: showGuides,
  };
}
