/** Current Item read projection for Gallery previews and board candidates. */
export interface ItemSummary {
  id: string;
  summary: string;
  /** Full body for reference surfaces; summary remains the compact preview. */
  plain_text?: string;
  status: 'active' | 'retired';
  item_type: string | null;
  topic: string | null;
  origin_note_id: string | null;
  origin_course_id: string | null;
  origin_board_id: string | null;
  origin_board_title: string | null;
}
