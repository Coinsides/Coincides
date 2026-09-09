export type BoardTextRangeStatus = 'active' | 'drifted' | 'lost';

/** A copied note selection. Offsets are local to the addressed TextFlow unit. */
export interface BoardTextRangeSelection {
  note_id: string;
  block_id: string;
  text_flow_id: string;
  text_unit_id: string;
  start_offset: number;
  end_offset: number;
  excerpt: string;
  at: string;
}

/** Board-owned durable anchor; never an AnnotationRange foreign key. */
export interface BoardTextRangeV1 extends Omit<BoardTextRangeSelection, 'start_offset' | 'end_offset'> {
  id: string;
  board_id: string;
  start_offset: number | null;
  end_offset: number | null;
  status: BoardTextRangeStatus;
  pre_edit_offsets: { start_offset: number | null; end_offset: number | null } | null;
  created_at: string;
  updated_at: string;
}
