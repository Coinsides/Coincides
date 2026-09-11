import { textFlowIdForBlock } from '../../../../../shared/types/textFlow';
import { rebaseAnnotationsForTextUnitEdit } from './rangeRebaseService';
import type { AnnotationTruthV1, TextBlockContentV1 } from './runtimeDataTypes';
import type { AnnotationRangeSnapshot } from './textFlowEditSession';

/** Rebase current annotations as an ordinary edit, without restoring recovery snapshots. */
export function recoveryReplayAnnotationRanges(input: {
  annotations: AnnotationTruthV1[];
  blockId: string;
  previousTextFlow: TextBlockContentV1 | null;
  nextTextFlow: TextBlockContentV1 | null;
}): AnnotationRangeSnapshot[] {
  const { annotations, blockId, previousTextFlow, nextTextFlow } = input;
  let nextAnnotations = annotations;
  previousTextFlow?.units.forEach((previousUnit) => {
    const nextUnit = nextTextFlow?.units.find((unit) => unit.id === previousUnit.id);
    if (!nextUnit) {
      nextAnnotations = nextAnnotations.map((annotation) => ({
        ...annotation,
        ranges: annotation.ranges.map((range) => {
          if (range.block_id !== blockId || range.text_flow_id !== textFlowIdForBlock(blockId)
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
      blockId,
      textFlowId: textFlowIdForBlock(blockId),
      textUnitId: previousUnit.id,
      oldText: previousUnit.text,
      newText: nextUnit.text,
    }).next_annotations;
  });

  const changed: AnnotationRangeSnapshot[] = [];
  annotations.forEach((annotation) => {
    const nextAnnotation = nextAnnotations.find((next) => next.id === annotation.id);
    annotation.ranges.forEach((range) => {
      const nextRange = nextAnnotation?.ranges.find((next) => next.id === range.id);
      if (!nextRange || JSON.stringify(range) === JSON.stringify(nextRange)) return;
      changed.push({ annotationId: annotation.id, range: structuredClone(nextRange) });
    });
  });
  return changed;
}
