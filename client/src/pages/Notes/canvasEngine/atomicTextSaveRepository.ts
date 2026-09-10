import api from '@/services/api';
import type { BoardTextRangeV1 } from '../../../../../shared/types/boardTextRange';
import type { AnnotationTruthV1, NoteBlock } from './runtimeDataTypes';
import type { AnnotationRangeSnapshot } from './textFlowEditSession';
import type { BlockTemplatePayload } from './blockTemplateConversionService';
import type { TextUnitIdMapping } from './textUnitMoveService';

export interface AtomicTextSaveResult {
  block: NoteBlock;
  annotations: AnnotationTruthV1[];
  text_ranges: BoardTextRangeV1[];
  revision: number;
}

export interface TextUnitTransferResult {
  source_block: NoteBlock;
  target_block: NoteBlock;
  annotations: AnnotationTruthV1[];
  text_ranges: BoardTextRangeV1[];
  source_revision: number;
  target_revision: number;
}

export async function saveTextUnitTransfer(input: {
  noteId: string;
  sourceBlockId: string;
  targetBlockId: string;
  textUnitId: string;
  idMapping?: TextUnitIdMapping;
  sourceBaseRevision: number;
  targetBaseRevision: number;
  sourceBlock: Partial<BlockTemplatePayload>;
  targetBlock: Partial<BlockTemplatePayload>;
}): Promise<TextUnitTransferResult> {
  const { data } = await api.put<TextUnitTransferResult>(`/note-blocks/${input.targetBlockId}/unit-transfer`, {
    note_id: input.noteId,
    source_block_id: input.sourceBlockId,
    text_unit_id: input.textUnitId,
    ...(input.idMapping ? { id_mapping: input.idMapping } : {}),
    source_base_revision: input.sourceBaseRevision,
    target_base_revision: input.targetBaseRevision,
    source_block: input.sourceBlock,
    target_block: input.targetBlock,
  });
  if (data?.source_block?.id !== input.sourceBlockId || data?.target_block?.id !== input.targetBlockId
    || data.source_revision !== input.sourceBaseRevision + 1 || data.target_revision !== input.targetBaseRevision + 1
    || data.source_block.text_save_revision !== data.source_revision || data.target_block.text_save_revision !== data.target_revision
    || !Array.isArray(data.annotations) || !Array.isArray(data.text_ranges)) {
    throw new Error('Text unit transfer was not confirmed');
  }
  return data;
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
