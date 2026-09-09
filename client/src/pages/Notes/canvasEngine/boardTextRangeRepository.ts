import api from '@/services/api';
import type { BoardTextRangeV1 } from '../../../../../shared/types/boardTextRange';

export async function loadBoardTextRangesForNote(noteId: string): Promise<BoardTextRangeV1[]> {
  const response = await api.get(`/boards/text-ranges/by-note/${noteId}`);
  if (!Array.isArray(response.data?.text_ranges)) throw new Error('Board references could not be loaded');
  return response.data.text_ranges;
}

export async function saveBoardTextRangesForNote(
  noteId: string,
  ranges: BoardTextRangeV1[],
): Promise<BoardTextRangeV1[]> {
  const response = await api.put(`/boards/text-ranges/by-note/${noteId}`, {
    text_ranges: ranges.map((range) => ({
      id: range.id,
      block_id: range.block_id,
      text_flow_id: range.text_flow_id,
      text_unit_id: range.text_unit_id,
      start_offset: range.start_offset,
      end_offset: range.end_offset,
      excerpt: range.excerpt,
      status: range.status,
      pre_edit_offsets: range.pre_edit_offsets,
    })),
  });
  if (!Array.isArray(response.data?.text_ranges)) throw new Error('Board reference sync was not confirmed');
  return response.data.text_ranges;
}
