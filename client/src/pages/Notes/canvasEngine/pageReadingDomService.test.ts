import { describe, expect, it, vi } from 'vitest';
import { worldToScreen } from './geometry';
import { pageReadingViewportFromDom, scrollPageReadingToRect } from './pageReadingDomService';
import { viewportPointToWorldPoint } from './viewportService';

describe('page reading DOM coordinate boundary', () => {
  it.each([0.5, 1.5])('round-trips a world point through the actual scrolled DOM viewport at scale %s', (displayScale) => {
    const blockRect = new DOMRect(280, -160, 760 * displayScale, 1600 * displayScale);
    const scrollRect = new DOMRect(200, 60, 980, 720);
    const viewport = pageReadingViewportFromDom(blockRect, scrollRect, 980, 720, displayScale);
    const worldPoint = { x: 270, y: 640 };
    const screenPoint = worldToScreen(worldPoint, viewport);

    expect(screenPoint).toEqual({
      x: blockRect.left + worldPoint.x * displayScale - scrollRect.left,
      y: blockRect.top + worldPoint.y * displayScale - scrollRect.top,
    });
    expect(viewportPointToWorldPoint(screenPoint, viewport)).toEqual(worldPoint);
    expect(viewport.zoom).toBe(displayScale);
    expect(viewport.width).toBe(980);
    expect(viewport.height).toBe(720);
  });

  it.each([0.5, 1.5])('focuses a target by scrolling the app container without changing scale or layout at scale %s', (displayScale) => {
    const appMain = document.createElement('main');
    appMain.dataset.appMainScroll = 'true';
    appMain.scrollTop = 300;
    appMain.scrollLeft = 50;
    appMain.scrollTo = vi.fn();
    vi.spyOn(appMain, 'getBoundingClientRect').mockReturnValue(new DOMRect(200, 70, 980, 720));

    const wrapper = document.createElement('div');
    wrapper.dataset.pageDisplayScale = String(displayScale);
    wrapper.style.transform = `scale(${displayScale})`;
    const blockList = document.createElement('div');
    blockList.style.width = '760px';
    vi.spyOn(blockList, 'getBoundingClientRect').mockReturnValue(new DOMRect(260, -90, 760 * displayScale, 1600 * displayScale));
    wrapper.append(blockList);
    appMain.append(wrapper);
    const target = Object.freeze({ x: 100, y: 400, width: 300, height: 80 });
    const beforeHtml = appMain.innerHTML;

    scrollPageReadingToRect(blockList, target);

    expect(appMain.scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 116 + 400 * displayScale,
      left: 86 + 100 * displayScale,
      behavior: 'auto',
    });
    expect(appMain.innerHTML).toBe(beforeHtml);
    expect(target).toEqual({ x: 100, y: 400, width: 300, height: 80 });
  });
});
