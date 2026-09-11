import type { PageFrameModel } from './types';

export const OVERVIEW_GAP = 24;
export const OVERVIEW_PAGE_FOOTER = 24;
export const OVERVIEW_PADDING = 24;
const MIN_PAGE_WIDTH = 280;

/** Display geometry only. The original frames and print fragments stay untouched. */
export function overviewLayout(frames: readonly PageFrameModel[], width: number, height: number) {
  const available = Math.max(1, width);
  const columns = Math.min(Math.max(1, frames.length), 4,
    Math.max(1, Math.floor((available + OVERVIEW_GAP) / (MIN_PAGE_WIDTH + OVERVIEW_GAP))));
  const columnWidth = (available - OVERVIEW_GAP * (columns - 1)) / columns;
  const pageWidth = frames.length === 1
    ? Math.min(columnWidth, Math.max(1, height - OVERVIEW_PAGE_FOOTER) * frames[0].width / frames[0].height)
    : columnWidth;
  let top = 0;
  const pages: { top: number; height: number; scale: number }[] = [];
  for (let start = 0; start < frames.length; start += columns) {
    const row = frames.slice(start, start + columns);
    let rowHeight = 0;
    for (const frame of row) {
      const scale = pageWidth / frame.width;
      const pageHeight = frame.height * scale;
      pages.push({ top, height: pageHeight, scale });
      rowHeight = Math.max(rowHeight, pageHeight + OVERVIEW_PAGE_FOOTER);
    }
    top += rowHeight + OVERVIEW_GAP;
  }
  return { columns, pageWidth, pages, height: Math.max(0, top - OVERVIEW_GAP) };
}

/** One viewport of overscan in each direction; distant page content is unmounted. */
export function overviewPageIsVisible(top: number, height: number, scrollTop: number, viewportHeight: number) {
  return top + height >= scrollTop - viewportHeight && top <= scrollTop + viewportHeight * 2;
}
