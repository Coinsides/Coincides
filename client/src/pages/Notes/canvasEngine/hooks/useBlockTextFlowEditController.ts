import {
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { textFlowIdForBlock } from '../../../../../../shared/types/textFlow';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import { rebaseAnnotationsForTextUnitEdit } from '../rangeRebaseService';
import {
  restoreAnnotationRangeSnapshots,
  type AnnotationRangeSnapshot,
  type TextFlowEditMetadata,
} from '../textFlowEditSession';
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
  metadata?: TextFlowEditMetadata;
  restoreAnnotationRanges?: AnnotationRangeSnapshot[];
  skipHistory?: boolean;
}

export type BlockTextFlowEditTarget = Pick<NoteBlock, 'id'>
  & Partial<Pick<NoteBlock, 'content_json'>>;

export interface BlockTextFlowEditResult {
  success: boolean;
  beforeAnnotationRanges: AnnotationRangeSnapshot[];
  afterAnnotationRanges: AnnotationRangeSnapshot[];
  error?: unknown;
}

export interface BlockTextFlowEditApplied {
  block: BlockTextFlowEditTarget;
  previousTextFlow: TextBlockContentV1 | null;
  nextTextFlow: TextBlockContentV1;
  options?: ApplyBlockTextFlowEditOptions;
  beforeAnnotationRanges: AnnotationRangeSnapshot[];
  afterAnnotationRanges: AnnotationRangeSnapshot[];
  beforeBoardRanges: BoardTextRangeV1[];
  afterBoardRanges: BoardTextRangeV1[];
}

export type AppliedBlockTextFlowEdit = BlockTextFlowEditApplied;

export type ApplyBlockTextFlowEdit = (
  block: BlockTextFlowEditTarget,
  nextTextFlow: TextBlockContentV1,
  options?: ApplyBlockTextFlowEditOptions,
) => Promise<BlockTextFlowEditResult | void>;

interface UseBlockTextFlowEditControllerOptions {
  annotationTruths: AnnotationTruthV1[];
  blockTextFlowDrafts: Record<string, TextBlockContentV1>;
  saveAnnotationTruths: (annotations: AnnotationTruthV1[]) => Promise<boolean | void> | boolean | void;
  setBlockTextFlowDrafts: Dispatch<SetStateAction<Record<string, TextBlockContentV1>>>;
  rebaseBoardTextRanges?: (blockId: string, previous: TextBlockContentV1 | null, next: TextBlockContentV1) => void;
  captureBoardTextRanges?: (blockId: string) => BoardTextRangeV1[];
  onEditApplied?: (edit: BlockTextFlowEditApplied) => void;
}

export function useBlockTextFlowEditController({
  annotationTruths,
  blockTextFlowDrafts,
  saveAnnotationTruths,
  setBlockTextFlowDrafts,
  rebaseBoardTextRanges,
  captureBoardTextRanges,
  onEditApplied,
}: UseBlockTextFlowEditControllerOptions): (
  block: BlockTextFlowEditTarget,
  nextTextFlow: TextBlockContentV1,
  options?: ApplyBlockTextFlowEditOptions,
) => Promise<BlockTextFlowEditResult> {
  const annotationTruthsRef = useRef(annotationTruths);
  const blockTextFlowDraftsRef = useRef(blockTextFlowDrafts);
  annotationTruthsRef.current = annotationTruths;
  blockTextFlowDraftsRef.current = blockTextFlowDrafts;

  return useCallback(async (block, nextTextFlow, options) => {
    const previousTextFlow = options?.previousTextFlow
      ?? blockTextFlowDraftsRef.current[block.id]
      ?? (block.content_json ? getTextFlowContent(block.content_json) : null);
    const beforeAnnotations = annotationTruthsRef.current;
    const beforeBoardRanges = captureBoardTextRanges?.(block.id) ?? [];
    const nextDrafts = {
      ...blockTextFlowDraftsRef.current,
      [block.id]: nextTextFlow,
    };
    blockTextFlowDraftsRef.current = nextDrafts;
    setBlockTextFlowDrafts(nextDrafts);
    rebaseBoardTextRanges?.(block.id, previousTextFlow, nextTextFlow);
    let nextAnnotations = annotationTruthsRef.current;
    if (options?.restoreAnnotationRanges) {
      nextAnnotations = restoreAnnotationRangeSnapshots(nextAnnotations, options.restoreAnnotationRanges);
    } else previousTextFlow?.units.forEach((previousUnit) => {
      const nextUnit = nextTextFlow.units.find((unit) => unit.id === previousUnit.id);
      if (!nextUnit) {
        nextAnnotations = nextAnnotations.map((annotation) => ({
          ...annotation,
          ranges: annotation.ranges.map((range) => {
            if (range.block_id !== block.id || range.text_flow_id !== textFlowIdForBlock(block.id)
              || range.text_unit_id !== previousUnit.id) return range;
            return {
              ...range,
              start_offset: undefined,
              end_offset: undefined,
              metadata: {
                ...range.metadata,
                pre_edit_offsets: range.metadata?.pre_edit_offsets ?? {
                  text_unit_id: previousUnit.id,
                  start_offset: range.start_offset,
                  end_offset: range.end_offset,
                  range_text_cache: range.range_text_cache,
                },
              },
            };
          }),
        }));
        return;
      }
      if (nextUnit.text === previousUnit.text) return;
      nextAnnotations = rebaseAnnotationsForTextUnitEdit({
        annotations: nextAnnotations,
        blockId: block.id,
        textFlowId: textFlowIdForBlock(block.id),
        textUnitId: previousUnit.id,
        oldText: previousUnit.text,
        newText: nextUnit.text,
      }).next_annotations;
    });

    const beforeAnnotationRanges: AnnotationRangeSnapshot[] = [];
    const afterAnnotationRanges: AnnotationRangeSnapshot[] = [];
    beforeAnnotations.forEach((annotation) => {
      const nextAnnotation = nextAnnotations.find((next) => next.id === annotation.id);
      annotation.ranges.forEach((range) => {
        const nextRange = nextAnnotation?.ranges.find((next) => next.id === range.id);
        if (!nextRange || JSON.stringify(range) === JSON.stringify(nextRange)) return;
        beforeAnnotationRanges.push({ annotationId: annotation.id, range: structuredClone(range) });
        afterAnnotationRanges.push({ annotationId: annotation.id, range: structuredClone(nextRange) });
      });
    });
    annotationTruthsRef.current = nextAnnotations;
    let saving: Promise<boolean | void> | boolean | void = undefined;
    let saveError: unknown;
    let saveThrew = false;
    try {
      if (nextAnnotations !== beforeAnnotations) saving = saveAnnotationTruths(nextAnnotations);
    } catch (error) {
      saveThrew = true;
      saveError = error;
    }
    // Record immediately: async annotation persistence must never reorder text history.
    if (!options?.skipHistory) onEditApplied?.({
      block, previousTextFlow, nextTextFlow, options,
      beforeAnnotationRanges, afterAnnotationRanges,
      beforeBoardRanges,
      afterBoardRanges: captureBoardTextRanges?.(block.id) ?? [],
    });
    const result = { beforeAnnotationRanges, afterAnnotationRanges };
    if (saveThrew) throw saveError;
    if (nextAnnotations === beforeAnnotations) return { ...result, success: true };
    return { ...result, success: (await saving) !== false };
  }, [saveAnnotationTruths, setBlockTextFlowDrafts, rebaseBoardTextRanges, captureBoardTextRanges, onEditApplied]);
}
