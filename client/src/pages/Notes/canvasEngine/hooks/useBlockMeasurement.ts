import {
  useLayoutEffect,
  type RefObject,
} from 'react';
import {
  measureBlockContentHeight,
  resizeTextareaToContent,
} from '../measurementService';
import { DEFAULT_BLOCK_HEIGHT } from '../runtimeLayout';

interface UseBlockMeasurementOptions {
  blockContentRef: RefObject<HTMLDivElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  width: number;
  active: boolean;
  onMeasuredHeight: (height: number) => void;
}

export function useBlockMeasurement({
  blockContentRef,
  textareaRef,
  text,
  width,
  active,
  onMeasuredHeight,
}: UseBlockMeasurementOptions) {
  useLayoutEffect(() => {
    resizeTextareaToContent(textareaRef.current);
    const element = blockContentRef.current;
    if (!element) {
      onMeasuredHeight(DEFAULT_BLOCK_HEIGHT);
      return undefined;
    }

    const measure = () => onMeasuredHeight(measureBlockContentHeight(element));
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
  }, [active, blockContentRef, onMeasuredHeight, text, textareaRef, width]);
}
