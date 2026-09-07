import type { CanvasRect, CanvasViewport } from './types';

/** The page block list keeps its existing layout coordinates; only its display changes. */
export function pageReadingViewportFromDom(
  blockRect: Pick<DOMRect, 'left' | 'top'>,
  scrollRect: Pick<DOMRect, 'left' | 'top'>,
  width: number,
  height: number,
  displayScale: number,
): CanvasViewport {
  return {
    x: (scrollRect.left - blockRect.left) / displayScale,
    y: (scrollRect.top - blockRect.top) / displayScale,
    width,
    height,
    zoom: displayScale,
  };
}

export function scrollPageReadingToRect(blockList: HTMLElement | null, rect: CanvasRect): void {
  const appMain = blockList?.closest<HTMLElement>('[data-app-main-scroll="true"]');
  if (!blockList || !appMain) return;
  const scale = Number(blockList.closest<HTMLElement>('[data-page-display-scale]')?.dataset.pageDisplayScale) || 1;
  const blockRect = blockList.getBoundingClientRect();
  const scrollRect = appMain.getBoundingClientRect();
  appMain.scrollTo({
    top: Math.max(0, appMain.scrollTop + blockRect.top - scrollRect.top + rect.y * scale - 24),
    left: Math.max(0, appMain.scrollLeft + blockRect.left - scrollRect.left + rect.x * scale - 24),
    behavior: 'auto',
  });
}
