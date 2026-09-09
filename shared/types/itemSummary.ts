/** Current Item read projection for Gallery previews and board candidates. */
export interface ItemSummary {
  id: string;
  summary: string;
  status: 'active' | 'retired';
  item_type: string | null;
  topic: string | null;
  origin_note_id: string | null;
  origin_course_id: string | null;
}
