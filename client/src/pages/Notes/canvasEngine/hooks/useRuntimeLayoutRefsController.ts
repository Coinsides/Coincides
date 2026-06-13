import {
  useCallback,
  useRef,
} from 'react';
import {
  LAYOUT_MEASURE_SUPPRESSION_MS,
} from '../runtimeLayout';

export function useRuntimeLayoutRefsController() {
  const blockListRef = useRef<HTMLDivElement | null>(null);
  const movingBlockIdRef = useRef<string | null>(null);
  const suppressMeasuredReflowUntilRef = useRef(0);

  const suppressMeasuredReflowForSelection = useCallback(() => {
    suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
  }, []);

  return {
    blockListRef,
    movingBlockIdRef,
    suppressMeasuredReflowForSelection,
    suppressMeasuredReflowUntilRef,
  };
}
