import { getPageFramePhysicalMapping, PAPER_PHYSICAL_SIZES_MM } from './pageFramePrintScaleService';
import { getPageFrameTypographyFamily } from './pageFrameTypographyService';
import type { PageFrameModel, PageStackBlockFragmentProjection } from './types';

/** Output geometry has no dependency on the reading viewport or growing screen box. */
export function getPagePrintGeometry(frame: PageFrameModel, useFlowPageGeometry = false) {
  const family = getPageFrameTypographyFamily(frame);
  const pageSize = frame.pageSize ?? (frame.templateId === 'letter_portrait' ? 'Letter' : 'A4');
  const paperSize = family === 'paper' && pageSize !== 'Custom' ? pageSize : 'A4';
  const paper = PAPER_PHYSICAL_SIZES_MM[paperSize];
  const landscape = frame.templateId?.endsWith('_landscape');
  const width = (landscape ? paper.height : paper.width) / 25.4 * 96;
  const height = (landscape ? paper.width : paper.height) / 25.4 * 96;
  const scale = family === 'paper'
    ? getPageFramePhysicalMapping(pageSize, frame.width, frame.templateId, frame.paperSizeReferenceWidth).physicalScale
    : width / frame.width;
  if ((useFlowPageGeometry || frame.paperSizeOverride) && frame.templateId !== 'screen_note') {
    return { paperSize, width: frame.width * scale, height: frame.height * scale, scale };
  }
  return { paperSize, width, height, scale };
}

/** New Web notes opt into print-only slices; historical frames keep one page. */
export function getPagePrintSlices(frame: PageFrameModel, continuousWeb = false) {
  const geometry = getPagePrintGeometry(frame);
  const sliceHeight = geometry.height / geometry.scale;
  const count = continuousWeb && frame.templateId === 'screen_note'
    ? Math.max(1, Math.ceil(frame.height / sliceHeight - 1e-9))
    : 1;
  return Array.from({ length: count }, (_, index) => ({
    index,
    offsetY: index * sliceHeight,
    height: sliceHeight,
    printTop: -index * geometry.height,
  }));
}

/** Both rectangles come from the existing fragment model, in world coordinates. */
export function getPagePrintFragmentGeometry(
  frame: PageFrameModel,
  fragment: PageStackBlockFragmentProjection,
) {
  const { visibleRect, blockRect } = fragment;
  // A1 fragments are complete projected pieces at the target page width. Their
  // text range comes from the shared flow plan, never a second print paginator.
  if (fragment.flowFragment) return {
    clip: { left: visibleRect.x - frame.x, top: visibleRect.y - frame.y,
      width: visibleRect.width, height: visibleRect.height },
    block: { x: 0, y: 0, width: visibleRect.width, height: visibleRect.height },
  };
  return {
    clip: {
      left: visibleRect.x - frame.x,
      top: visibleRect.y - frame.y,
      width: visibleRect.width,
      height: visibleRect.height,
    },
    block: {
      x: blockRect.x - visibleRect.x,
      y: blockRect.y - visibleRect.y,
      width: blockRect.width,
      height: blockRect.height,
    },
  };
}
