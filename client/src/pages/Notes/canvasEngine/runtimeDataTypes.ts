export interface Note {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: string;
}

export interface SourceReference {
  id?: string;
  document_id?: string | null;
  source_page_start?: number | null;
  source_page_end?: number | null;
  source_excerpt?: string | null;
  confidence?: number | null;
}

export interface SourceAnchor {
  id: string;
  source_snapshot_id: string;
  source_snapshot_page_id: string | null;
  anchor_kind: string;
  page_start: number | null;
  page_end: number | null;
  metadata: {
    note_block_source_id?: string;
    [key: string]: unknown;
  };
}

export interface SourceJumpTarget {
  anchor: SourceAnchor;
  snapshot: {
    id: string;
    title: string;
    source_filename: string;
  };
  page: {
    id: string;
    page_number: number;
    page_label: string | null;
    text_content: string;
  };
  focus: {
    page_start: number | null;
    page_end: number | null;
    text_start_offset: number | null;
    text_end_offset: number | null;
  };
  warnings: string[];
}

export interface NoteBlock {
  id: string;
  placement_id: string;
  display_overrides_json: Record<string, unknown>;
  block_type: string;
  title: string | null;
  content_json: Record<string, unknown>;
  plain_text: string | null;
  metadata: Record<string, unknown>;
  order_index: number;
  source_references: SourceReference[];
}
