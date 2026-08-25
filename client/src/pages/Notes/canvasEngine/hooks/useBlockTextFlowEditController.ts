import {
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { textFlowIdForBlock } from '../../../../../../shared/types/textFlow';
import { rebaseAnnotationsForTextUnitEdit } from '../rangeRebaseService';
import type {
  AnnotationTruthV1,
  NoteBlock,
  TextBlockContentV1,
} from '../runtimeDataTypes';
import {
  getTextFlowContent,
} from '../textFlowService';

export interface ApplyBlockTextFlowEditOptions {
  previousTextFlow?: TextBlockContentV1 | null;
}

export type BlockTextFlowEditTarget = Pick<NoteBlock, 'id'>
  & Partial<Pick<NoteBlock, 'content_json'>>;

export type ApplyBlockTextFlowEdit = (
  block: BlockTextFlowEditTarget,
  nextTextFlow: TextBlockContentV1,
  options?: ApplyBlockTextFlowEditOptions,
) => Promise<void>;

interface UseBlockTextFlowEditControllerOptions {
  annotationTruths: AnnotationTruthV1[];
  blockTextFlowDrafts: Record<string, TextBlockContentV1>;
  saveAnnotationTruths: (annotations: AnnotationTruthV1[]) => Promise<void> | void;
  setBlockTextFlowDrafts: Dispatch<SetStateAction<Record<string, TextBlockContentV1>>>;
}

export function useBlockTextFlowEditController({
  annotationTruths,
  blockTextFlowDrafts,
  saveAnnotationTruths,
  setBlockTextFlowDrafts,
}: UseBlockTextFlowEditControllerOptions): ApplyBlockTextFlowEdit {
  const annotationTruthsRef = useRef(annotationTruths);
  const blockTextFlowDraftsRef = useRef(blockTextFlowDrafts);
  annotationTruthsRef.current = annotationTruths;
  blockTextFlowDraftsRef.current = blockTextFlowDrafts;

  return useCallback(async (block, nextTextFlow, options) => {
    const previousTextFlow = options?.previousTextFlow
      ?? blockTextFlowDraftsRef.current[block.id]
      ?? (block.content_json ? getTextFlowContent(block.content_json) : null);
    const nextDrafts = {
      ...blockTextFlowDraftsRef.current,
      [block.id]: nextTextFlow,
    };
    blockTextFlowDraftsRef.current = nextDrafts;
    setBlockTextFlowDrafts(nextDrafts);
    if (!previousTextFlow) return;

    let nextAnnotations = annotationTruthsRef.current;
    previousTextFlow.units.forEach((previousUnit) => {
      const nextUnit = nextTextFlow.units.find((unit) => unit.id === previousUnit.id);
      if (!nextUnit || nextUnit.text === previousUnit.text) return;
      nextAnnotations = rebaseAnnotationsForTextUnitEdit({
        annotations: nextAnnotations,
        blockId: block.id,
        textFlowId: textFlowIdForBlock(block.id),
        textUnitId: previousUnit.id,
        oldText: previousUnit.text,
        newText: nextUnit.text,
      }).next_annotations;
    });

    if (nextAnnotations === annotationTruthsRef.current) return;
    annotationTruthsRef.current = nextAnnotations;
    await saveAnnotationTruths(nextAnnotations);
  }, [saveAnnotationTruths, setBlockTextFlowDrafts]);
}
