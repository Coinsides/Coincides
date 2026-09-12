import {
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react';
import {
  measureBlockContentHeight,
  resizeTextareaToContent,
} from '../measurementService';
import { DEFAULT_BLOCK_HEIGHT } from '../runtimeLayout';

interface UseBlockMeasurementOptions {
  enabled?: boolean;
  blockContentRef: RefObject<HTMLDivElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  width: number;
  active: boolean;
  onMeasuredHeight: (height: number) => void;
}

export function useBlockMeasurement({
  enabled = true,
  blockContentRef,
  textareaRef,
  text,
  width,
  active,
  onMeasuredHeight,
}: UseBlockMeasurementOptions) {
  const lastMeasuredHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;
    resizeTextareaToContent(textareaRef.current);
    const reportMeasuredHeight = (height: number) => {
      const lastMeasuredHeight = lastMeasuredHeightRef.current;
      if (lastMeasuredHeight !== null && Math.abs(height - lastMeasuredHeight) <= 1) return;
      lastMeasuredHeightRef.current = height;
      onMeasuredHeight(height);
    };

    const element = blockContentRef.current;
    if (!element) {
      reportMeasuredHeight(DEFAULT_BLOCK_HEIGHT);
      return undefined;
    }

    const measure = () => reportMeasuredHeight(measureBlockContentHeight(element));
    measure();
    const frameId = window.requestAnimationFrame(measure);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.cancelAnimationFrame(frameId);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [active, blockContentRef, enabled, onMeasuredHeight, text, textareaRef, width]);
}
