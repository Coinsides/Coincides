import { useLayoutEffect, useState, type RefObject } from 'react';
import {
  DEFAULT_PAGE_CONTENT_WIDTH,
  MIN_BLOCK_WIDTH,
} from '../runtimeLayout';

export interface UseCanvasContentWidthOptions {
  containerRef: RefObject<HTMLElement>;
}

export function useCanvasContentWidth({
  containerRef,
}: UseCanvasContentWidthOptions): number {
  const [contentWidth, setContentWidth] = useState(DEFAULT_PAGE_CONTENT_WIDTH);

  useLayoutEffect(() => {
    const updateContentWidth = () => {
      const width = containerRef.current?.clientWidth;
      if (width && Number.isFinite(width)) {
        const availableWidth = width;
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
  }, [containerRef]);

  return contentWidth;
}
