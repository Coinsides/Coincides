import api from '@/services/api';
import type { BoardTextRangeV1 } from '../../../../../shared/types/boardTextRange';
import type { AnnotationTruthV1, NoteBlock } from './runtimeDataTypes';
import type { AnnotationRangeSnapshot } from './textFlowEditSession';
import type { BlockTemplatePayload } from './blockTemplateConversionService';

export interface AtomicTextSaveResult {
  block: NoteBlock;
  annotations: AnnotationTruthV1[];
  text_ranges: BoardTextRangeV1[];
  revision: number;
}

export async function saveAtomicText(input: {
  noteId: string;
  blockId: string;
  baseRevision: number;
  block: Partial<BlockTemplatePayload>;
  annotationRanges: AnnotationRangeSnapshot[];
  boardRanges: BoardTextRangeV1[];
}): Promise<AtomicTextSaveResult> {
  const { data } = await api.put<AtomicTextSaveResult>(`/note-blocks/${input.blockId}/text-save`, {
    note_id: input.noteId,
    base_revision: input.baseRevision,
    block: input.block,
    annotations: { range_updates: input.annotationRanges.map(({ annotationId, range }) => ({ annotation_id: annotationId, range })) },
    text_ranges: input.boardRanges.map(({ id, block_id, text_flow_id, text_unit_id, start_offset, end_offset, excerpt, status, pre_edit_offsets }) => ({
      id, block_id, text_flow_id, text_unit_id, start_offset, end_offset, excerpt, status, pre_edit_offsets,
    })),
  });
  if (!data?.block || !Number.isInteger(data.revision) || data.revision <= input.baseRevision
    || data.block.text_save_revision !== data.revision || !Array.isArray(data.annotations) || !Array.isArray(data.text_ranges)) {
    throw new Error('Atomic text save was not confirmed');
  }
  return data;
}
