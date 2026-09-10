import { resolveScreenRect, type CoordinateContract } from './placementContractService';
import type { PageFrameModel } from './types';

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
