import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import type { CapturedSelectionRange } from '../selectionRangeService';
import {
  activateSelectionDraft,
  annotationContainsDraftRanges,
  appendSelectionDraftRange,
  createSelectionDraftRangeFromCapturedSelection,
  replaceSelectionDraft,
  selectionDraftRangesToAnnotationRanges,
  type SelectionDraftV1,
} from '../selectionDraftService';
import type { AnnotationTruthV1 } from '../runtimeDataTypes';

export function useSelectionDraftController() {
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraftV1 | null>(null);

  const replaceDraft = useCallback((input: {
    range: CapturedSelectionRange;
    anchorRect: DOMRect;
    parentAnnotationId?: string;
  }) => {
    const draftRange = createSelectionDraftRangeFromCapturedSelection(input.range);
    if (!draftRange) return;
    setSelectionDraft(replaceSelectionDraft({
      range: draftRange,
      anchorRect: input.anchorRect,
      parentAnnotationId: input.parentAnnotationId,
    }));
  }, []);

  const appendDraftRange = useCallback((input: {
    range: CapturedSelectionRange;
    anchorRect: DOMRect;
    parentAnnotationId?: string;
  }) => {
    const draftRange = createSelectionDraftRangeFromCapturedSelection(input.range);
    if (!draftRange) return;
    setSelectionDraft((current) => appendSelectionDraftRange({
      draft: current,
      range: draftRange,
      anchorRect: input.anchorRect,
      parentAnnotationId: input.parentAnnotationId,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    setSelectionDraft(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const activateDraft = useCallback(() => {
    setSelectionDraft((current) => (current ? activateSelectionDraft(current) : current));
    window.getSelection()?.removeAllRanges();
  }, []);

  const draftAnnotationRanges = useMemo(
    () => selectionDraftRangesToAnnotationRanges(selectionDraft?.ranges || []),
    [selectionDraft],
  );

  const draftRangeCount = selectionDraft?.ranges.length || 0;
  const latestDraftRange = selectionDraft?.ranges[selectionDraft.ranges.length - 1] || null;

  const isDraftInsideAnnotation = useCallback((annotation: AnnotationTruthV1 | null): boolean => {
    if (!annotation || !selectionDraft) return false;
    return annotationContainsDraftRanges({
      annotation,
      ranges: selectionDraft.ranges,
    });
  }, [selectionDraft]);

  return {
    selectionDraft,
    draftAnnotationRanges,
    draftRangeCount,
    latestDraftRange,
    setSelectionDraft,
    replaceDraft,
    appendDraftRange,
    activateDraft,
    clearDraft,
    isDraftInsideAnnotation,
  };
}
