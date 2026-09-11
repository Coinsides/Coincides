import api from '@/services/api';

export interface NoteTag {
  id: string;
  note_id: string;
  user_id: string;
  label: string;
  actor: 'user' | 'agent';
  created_at: string;
}

export interface NoteSourceSummary {
  document_id: string | null;
  source_record_id: string | null;
  projection_note_id: string | null;
  block_id: string;
  reference_id: string;
  title: string;
  course_id: string | null;
  count: number;
}

export interface NoteMetadata {
  upstream: {
    sources: NoteSourceSummary[];
    notes: { note_id: string; title: string; course_id: string; count: number }[];
    count: number;
  };
  downstream: {
    boards: { board_id: string; title: string; count: number }[];
    content_groups: { content_group_id: string; note_id: string | null; course_id: string; title: string; count: number }[];
    count: number;
  };
}

const notePath = (noteId: string) => `/notes/${encodeURIComponent(noteId)}`;
export const noteMetadataRepository = {
  async tags(noteId: string): Promise<NoteTag[]> {
    return (await api.get<{ tags: NoteTag[] }>(`${notePath(noteId)}/tags`)).data.tags;
  },
  async addTag(noteId: string, label: string): Promise<NoteTag> {
    return (await api.post<{ tag: NoteTag }>(`${notePath(noteId)}/tags`, { label })).data.tag;
  },
  async deleteTag(noteId: string, tagId: string): Promise<void> {
    await api.delete(`${notePath(noteId)}/tags/${encodeURIComponent(tagId)}`);
  },
  async metadata(noteId: string): Promise<NoteMetadata> {
    return (await api.get<NoteMetadata>(`${notePath(noteId)}/metadata`)).data;
  },
};
