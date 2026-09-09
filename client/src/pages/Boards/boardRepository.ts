import api from '@/services/api';
import type { Course } from '@shared/types';
import type { ContentGroupV1, Note } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import type {
  Board, BoardCandidate, BoardDetail, BoardEdge, BoardMember, BoardVisual,
  CreateBoardInput, CreateBoardEdgeInput, CreateBoardVisualInput, MountBoardMemberInput,
  PatchBoardInput, PatchBoardMemberInput, PatchBoardEdgeInput, PatchBoardVisualInput,
  TrayRelocationResult,
} from './boardTypes';

export type { BoardCandidate } from './boardTypes';

const boardPath = (boardId: string) => `/boards/${encodeURIComponent(boardId)}`;
const childPath = (boardId: string, kind: string, id: string) => `${boardPath(boardId)}/${kind}/${encodeURIComponent(id)}`;

/** The S1 HTTP contract is the only board persistence path. Failures reach the caller. */
export const boardRepository = {
  async list(): Promise<Board[]> {
    const { data } = await api.get<{ boards: Board[] }>('/boards');
    return data.boards;
  },
  async get(boardId: string): Promise<BoardDetail> {
    const { data } = await api.get<BoardDetail>(boardPath(boardId));
    return data;
  },
  async create(input: CreateBoardInput): Promise<Board> {
    const { data } = await api.post<{ board: Board }>('/boards', input);
    return data.board;
  },
  async update(boardId: string, input: PatchBoardInput): Promise<Board> {
    const { data } = await api.patch<{ board: Board }>(boardPath(boardId), input);
    return data.board;
  },
  async delete(boardId: string): Promise<void> {
    await api.delete(boardPath(boardId));
  },
  async mount(boardId: string, input: MountBoardMemberInput): Promise<BoardMember> {
    const { data } = await api.post<{ member: BoardMember; created: boolean }>(`${boardPath(boardId)}/members`, input);
    return data.member;
  },
  async updateMember(boardId: string, id: string, input: PatchBoardMemberInput): Promise<BoardMember> {
    const { data } = await api.patch<{ member: BoardMember }>(childPath(boardId, 'members', id), input);
    return data.member;
  },
  async unmount(boardId: string, id: string): Promise<void> {
    await api.delete(childPath(boardId, 'members', id));
  },
  async createEdge(boardId: string, input: CreateBoardEdgeInput): Promise<BoardEdge> {
    const { data } = await api.post<{ edge: BoardEdge }>(`${boardPath(boardId)}/edges`, input);
    return data.edge;
  },
  async updateEdge(boardId: string, id: string, input: PatchBoardEdgeInput): Promise<BoardEdge> {
    const { data } = await api.patch<{ edge: BoardEdge }>(childPath(boardId, 'edges', id), input);
    return data.edge;
  },
  async deleteEdge(boardId: string, id: string): Promise<void> {
    await api.delete(childPath(boardId, 'edges', id));
  },
  async createVisual(boardId: string, input: CreateBoardVisualInput): Promise<BoardVisual> {
    const { data } = await api.post<{ visual: BoardVisual }>(`${boardPath(boardId)}/visuals`, input);
    return data.visual;
  },
  async updateVisual(boardId: string, id: string, input: PatchBoardVisualInput): Promise<BoardVisual> {
    const { data } = await api.patch<{ visual: BoardVisual }>(childPath(boardId, 'visuals', id), input);
    return data.visual;
  },
  async deleteVisual(boardId: string, id: string): Promise<void> {
    await api.delete(childPath(boardId, 'visuals', id));
  },
  async relocateTray(boardId: string, placementIds: string[]): Promise<TrayRelocationResult> {
    const { data } = await api.post<TrayRelocationResult>(`${boardPath(boardId)}/relocate-tray`, {
      placement_ids: placementIds,
    });
    return data;
  },
  async undoTrayRelocation(boardId: string, batchId: string): Promise<TrayRelocationResult> {
    const { data } = await api.post<TrayRelocationResult>(
      `${childPath(boardId, 'relocate-tray', batchId)}/undo`, {},
    );
    return data;
  },
};

function preview(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 240) : '';
}

function availableNote(note: Note): boolean {
  return note.status === 'active' && note.note_class !== 'system' && note.source_kind !== 'canvas_backing';
}

/** Aggregate existing read APIs across the library; never import note metadata or copy content to a board. */
export async function loadBoardCandidates(): Promise<BoardCandidate[]> {
  const { data: projects } = await api.get<Course[]>('/courses');
  const candidates = await Promise.all(projects.map(async (project) => {
    const [{ data: notes }, { data: groups }] = await Promise.all([
      api.get<Note[]>('/notes', { params: { course_id: project.id, status: 'active' } }),
      api.get<ContentGroupV1[]>('/content-groups', { params: { course_id: project.id, status: 'active' } }),
    ]);
    const visibleNotes = notes.filter(availableNote);
    const noteIds = new Set(visibleNotes.map((note) => note.id));
    const result: BoardCandidate[] = visibleNotes.map((note) => ({
      member_kind: 'note',
      member_id: note.id,
      note_id: note.id,
      title: note.title.trim() || 'Untitled note',
      summary: preview(note.description),
      project_title: project.name,
    }));
    for (const group of groups) {
      // Project-level groups have no paper to open. Their existing projections still remain readable.
      if (group.status !== 'active' || !noteIds.has(group.note_id)) continue;
      const memberText = group.members.map((member) => (
        member.current_content || member.preview_text || member.label || ''
      )).filter(Boolean).join(' / ');
      result.push({
        member_kind: 'content_group',
        member_id: group.id,
        note_id: group.note_id,
        title: group.title.trim() || 'Untitled group',
        summary: preview(group.identity.summary) || preview(memberText),
        project_title: project.name,
      });
    }
    return result;
  }));
  return candidates.flat();
}

/** Show fixed UI copy, never arbitrary server bodies or raw error messages. */
export function boardErrorMessage(error: unknown): string {
  const response = error && typeof error === 'object'
    ? (error as { response?: { status?: number; data?: { error?: unknown } } }).response
    : undefined;
  switch (response?.data?.error) {
    case 'tray_placement_unavailable':
    case 'tray_object_unavailable':
      return 'Some selected items are no longer available in the tray. Refresh the note and try again.';
    case 'tray_blocks_cannot_mount_board':
    case 'tray_object_kind_not_relocatable':
      return 'This selection cannot move to a board. Choose drawings or group mounts.';
    case 'tray_connector_endpoint_ambiguous':
    case 'tray_connector_endpoint_unavailable':
    case 'tray_visual_extension_unavailable':
    case 'tray_shape_backing_unavailable':
      return 'This drawing cannot be moved with all its contents intact. It has been kept in the tray.';
    case 'tray_relocation_target_changed':
    case 'tray_relocation_target_has_edges':
      return 'The moved items have been edited on the board. Undo is unavailable because it would remove those changes.';
    case 'tray_relocation_source_changed':
      return 'The original tray content has changed. Undo is unavailable because it would replace those changes.';
    case 'tray_relocation_not_found':
    case 'tray_relocation_state_conflict':
      return 'This move can no longer be undone. Refresh the note and board.';
    case 'purpose_already_has_board':
      return 'This purpose already has a board. Choose another purpose or open its board.';
    case 'board_member_reference_unavailable':
      return 'This note or group is no longer available. Refresh the library and choose another.';
    case 'board_member_identity_conflict':
    case 'board_member_id_conflict':
      return 'This projection has changed. Reopen the board before trying again.';
    case 'board_not_found':
      return 'This board is no longer available.';
  }
  if (response?.status === 400) return 'That change could not be saved. Check the details and try again.';
  if (response?.status === 404) return 'This board or reference is no longer available.';
  if (response?.status === 409) return 'This change conflicts with the saved board. Reopen it and try again.';
  return 'Could not complete the board action. Try again.';
}
