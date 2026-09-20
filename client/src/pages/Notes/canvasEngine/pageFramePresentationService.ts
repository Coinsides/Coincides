import { resolveScreenRect, type CoordinateContract } from './placementContractService';
import type { PageFrameModel } from './types';

/** Screen-only spacing. Frame sizes, content insets and the flow plan stay canonical. */
export function createPageGapPresentation(frames: PageFrameModel[], folded: boolean) {
  const enabled = frames.length > 0 && frames.every((frame) => frame.templateId !== 'screen_note'
    && frame.background?.kind !== 'screen');
  const offsetByFrameId = new Map<string, number>();
  const gaps: { beforeFrameId: string; afterFrameId: string; y: number; height: number }[] = [];
  let removed = 0;
  const pageFrames = frames.map((frame, index) => {
    const previous = frames[index - 1];
    if (previous) {
      const gap = Math.max(0, frame.y - previous.y - previous.height);
      if (gap > 0) {
        gaps.push({ beforeFrameId: previous.id, afterFrameId: frame.id,
          y: previous.y + previous.height - removed, height: folded && enabled ? 0 : gap });
        if (folded && enabled) removed += gap;
      }
    }
    offsetByFrameId.set(frame.id, -removed);
    return removed ? { ...frame, y: frame.y - removed } : frame;
  });
  const offsetAt = (y: number, source: PageFrameModel[]) => {
    let offset = 0;
    for (const frame of source) {
      if (y < frame.y) break;
      offset = offsetByFrameId.get(frame.id) || 0;
    }
    return offset;
  };
  return { enabled, pageFrames, offsetByFrameId, gaps,
    toDisplayY: (worldY: number) => {
      if (folded && enabled) for (let index = 1; index < frames.length; index += 1) {
        const previous = frames[index - 1];
        const gapStart = previous.y + previous.height;
        if (worldY >= gapStart && worldY < frames[index].y) {
          return gapStart + (offsetByFrameId.get(previous.id) || 0);
        }
      }
      return worldY + offsetAt(worldY, frames);
    },
    toWorldY: (displayY: number) => displayY - offsetAt(displayY, pageFrames),
  };
}

/** Decoration follows the same continuous-paper column as a frame-local block. */
export function projectPageFrameToReadingSurface(
  frame: PageFrameModel,
  contract: CoordinateContract = 'v1',
  pageOffsetX = 0,
): PageFrameModel {
  const contentOrigin = resolveScreenRect({
    x: 0, y: 0, width: 0, height: 0,
    coordinate_space: 'page_frame_local', frame_id: frame.id, surface: 'formal_page',
  }, frame, contract, pageOffsetX);
  // Vertical positions already share the frame's world y. Reading only replaces
  // the horizontal origin; world frames remain untouched for print and overview.
  return { ...frame, x: contentOrigin.x - frame.contentInset.left };
}
