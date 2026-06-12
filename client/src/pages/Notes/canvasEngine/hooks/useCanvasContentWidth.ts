import { useLayoutEffect, useState, type RefObject } from 'react';
import {
  DEFAULT_PAGE_CONTENT_WIDTH,
  MIN_BLOCK_WIDTH,
  type SurfaceMode,
} from '../runtimeLayout';

export interface UseCanvasContentWidthOptions {
  containerRef: RefObject<HTMLElement>;
  pageOffsetX: number;
  surfaceMode: SurfaceMode;
}

export function useCanvasContentWidth({
  containerRef,
  pageOffsetX,
  surfaceMode,
}: UseCanvasContentWidthOptions): number {
  const [contentWidth, setContentWidth] = useState(DEFAULT_PAGE_CONTENT_WIDTH);

  useLayoutEffect(() => {
    const updateContentWidth = () => {
      const width = containerRef.current?.clientWidth;
      if (width && Number.isFinite(width)) {
        const availableWidth = surfaceMode === 'canvas' ? width - pageOffsetX : width;
        setContentWidth(Math.max(MIN_BLOCK_WIDTH, availableWidth));
      }
    };

    updateContentWidth();

    const element = containerRef.current;
    const observer = typeof ResizeObserver !== 'undefined' && element
      ? new ResizeObserver(updateContentWidth)
      : null;
    if (observer && element) {
      observer.observe(element);
    }

    window.addEventListener('resize', updateContentWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateContentWidth);
    };
  }, [containerRef, pageOffsetX, surfaceMode]);

  return contentWidth;
}
