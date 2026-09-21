import type { CoverPresetId } from '@shared/types/notePresets';
import { BLOCK_HORIZONTAL_CHROME, MIN_BLOCK_WIDTH, type BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';

/** Manual recipes in the existing content-origin coordinate system. No new layout mode. */
export function coverPresetPlacements(id: CoverPresetId, frame: PageFrameModel): Record<'title' | 'description', BlockBoxLayout> {
  const width = frame.width - frame.contentInset.left - frame.contentInset.right;
  const height = frame.height - frame.contentInset.top - frame.contentInset.bottom;
  // The handbook's narrow title column wraps using the existing title projection.
  const titleWidth = id === 'manual' ? Math.min(width, MIN_BLOCK_WIDTH + BLOCK_HORIZONTAL_CHROME * 2) : width;
  const layout = (x: number, y: number, w: number, h: number): BlockBoxLayout => ({
    x, y, width: w, height: h, width_mode: 'manual', frame_id: frame.id,
    coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside',
  });
  return id === 'manual' ? {
    title: layout((width - titleWidth) / 2, height / 8, titleWidth, height * 5 / 8),
    description: layout(width / 8, height * 7 / 8, width * 3 / 4, height / 8),
  } : {
    title: layout(0, height / 4, titleWidth, height / 4),
    description: layout(0, height / 2, width, height / 4),
  };
}
