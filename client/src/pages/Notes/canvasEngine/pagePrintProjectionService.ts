import { getPageFramePhysicalMapping } from './pageFramePrintScaleService';
import { getPageFrameTypographyFamily } from './pageFrameTypographyService';
import type { PageFrameModel, PageStackBlockFragmentProjection } from './types';

const PAPER_MM = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

/** Output geometry has no dependency on the reading viewport or growing screen box. */
export function getPagePrintGeometry(frame: PageFrameModel) {
  const family = getPageFrameTypographyFamily(frame);
  const pageSize = frame.pageSize ?? (frame.templateId === 'letter_portrait' ? 'Letter' : 'A4');
  const paperSize = family === 'paper' && pageSize === 'Letter' ? 'Letter' : 'A4';
  const paper = PAPER_MM[paperSize];
  const width = paper.width / 25.4 * 96;
  const height = paper.height / 25.4 * 96;
  const scale = family === 'paper'
    ? getPageFramePhysicalMapping(pageSize, frame.width, frame.templateId).physicalScale
    : width / frame.width;
  return { paperSize, width, height, scale };
}

/** Both rectangles come from the existing fragment model, in world coordinates. */
export function getPagePrintFragmentGeometry(
  frame: PageFrameModel,
  fragment: PageStackBlockFragmentProjection,
) {
  const { visibleRect, blockRect } = fragment;
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
