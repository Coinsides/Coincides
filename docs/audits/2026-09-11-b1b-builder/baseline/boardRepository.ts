import api from '@/services/api';
import { sliceGraphemes } from '../../../../shared/graphemes';
import {
  contentGroupItemIds,
  itemSummaryFromItem,
  itemSummaryPreview,
  loadItemSummaries,
} from '@/services/itemSummaryReader';
import type { Course } from '@shared/types';
import type { BoardViewportBookmark, CreateBoardViewportBookmarkInput } from '@shared/types/boardViewportBookmarks';
import type { ContentGroupV1, ItemV1, Note, NoteBlock } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import { textFromContent } from '@/pages/Notes/canvasEngine/blockContentService';
import type {
  Board, BoardCandidate, BoardDetail, BoardEdge, BoardMember, BoardVisual, BoardLayer,
  CreateBoardInput, CreateBoardEdgeInput, CreateBoardVisualInput, MountBoardMemberInput,
  PatchBoardInput, PatchBoardMemberInput, PatchBoardEdgeInput, PatchBoardVisualInput,
  TrayRelocationResult,
  MountBoardTextRangeInput,
  CreateBoardLayerInput, PatchBoardLayerInput,
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
  async listViewportBookmarks(boardId: string): Promise<BoardViewportBookmark[]> {
    const { data } = await api.get<{ bookmarks: BoardViewportBookmark[] }>(`${boardPath(boardId)}/viewport-bookmarks`);
    return data.bookmarks;
  },
  async createViewportBookmark(boardId: string, input: CreateBoardViewportBookmarkInput): Promise<BoardViewportBookmark> {
    const { data } = await api.post<{ bookmark: BoardViewportBookmark }>(`${boardPath(boardId)}/viewport-bookmarks`, input);
    return data.bookmark;
  },
  async renameViewportBookmark(boardId: string, id: string, name: string): Promise<BoardViewportBookmark> {
    const { data } = await api.patch<{ bookmark: BoardViewportBookmark }>(childPath(boardId, 'viewport-bookmarks', id), { name });
    return data.bookmark;
  },
  async deleteViewportBookmark(boardId: string, id: string): Promise<void> {
    await api.delete(childPath(boardId, 'viewport-bookmarks', id));
  },
  async createLayer(boardId: string, input: CreateBoardLayerInput): Promise<BoardLayer> {
    const { data } = await api.post<{ layer: BoardLayer }>(`${boardPath(boardId)}/layers`, input);
    return data.layer;
  },
  async updateLayer(boardId: string, layerId: string, input: PatchBoardLayerInput): Promise<BoardLayer> {
    const { data } = await api.patch<{ layer: BoardLayer }>(childPath(boardId, 'layers', layerId), input);
    return data.layer;
  },
  async reorderLayers(boardId: string, layerIds: string[]): Promise<BoardLayer[]> {
    const { data } = await api.put<{ layers: BoardLayer[] }>(`${boardPath(boardId)}/layers/order`, { layer_ids: layerIds });
    return data.layers;
  },
  async deleteLayer(boardId: string, layerId: string): Promise<{ removed: boolean; moved_count: number }> {
    const { data } = await api.delete<{ removed: boolean; moved_count: number }>(childPath(boardId, 'layers', layerId));
    return data;
  },
  async mount(boardId: string, input: MountBoardMemberInput): Promise<BoardMember> {
    const { data } = await api.post<{ member: BoardMember; created: boolean }>(`${boardPath(boardId)}/members`, input);
    return data.member;
  },
  async updateMember(boardId: string, id: string, input: PatchBoardMemberInput): Promise<BoardMember> {
    const { data } = await api.patch<{ member: BoardMember }>(childPath(boardId, 'members', id), input);
    return data.member;
  },
  async mountTextRange(boardId: string, input: MountBoardTextRangeInput): Promise<BoardMember> {
    const { data } = await api.post<{ member: BoardMember }>(`${boardPath(boardId)}/text-ranges`, input);
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
  async castVisual(boardId: string, id: string): Promise<{ item: ItemV1; member: BoardMember; removed_visual_id: string }> {
    const { data } = await api.post<{ item: ItemV1; member: BoardMember; removed_visual_id: string }>(
      `${childPath(boardId, 'visuals', id)}/cast`, {},
    );
    return data;
  },
  async relocateTray(boardId: string, placementIds: string[], layerId?: string | null): Promise<TrayRelocationResult> {
    const { data } = await api.post<TrayRelocationResult>(`${boardPath(boardId)}/relocate-tray`, {
      placement_ids: placementIds,
      ...(layerId !== undefined ? { layer_id: layerId } : {}),
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
  return typeof value === 'string' ? sliceGraphemes(value.replace(/\s+/g, ' ').trim(), 0, 240) : '';
}

/** Refresh a closed note's projection from saved TextFlow, without changing note.description. */
export async function loadBoardNotePreview(noteId: string): Promise<string> {
  const { data: blocks } = await api.get<NoteBlock[]>(`/notes/${encodeURIComponent(noteId)}/blocks`);
  return preview(blocks.map(textFromContent).filter(Boolean).join(' '));
}

function availableNote(note: Note): boolean {
  return note.status === 'active' && note.note_class !== 'system' && note.source_kind !== 'canvas_backing';
}

/** Aggregate existing read APIs across the library; never import note metadata or copy content to a board. */
export async function loadBoardCandidates(): Promise<BoardCandidate[]> {
  const [{ data: projects }, { data: items }] = await Promise.all([
    api.get<Course[]>('/courses'),
    api.get<ItemV1[]>('/items', { params: { status: 'active' } }),
  ]);
  const records = await Promise.all(projects.map(async (project) => {
    const [{ data: notes }, { data: groups }] = await Promise.all([
      api.get<Note[]>('/notes', { params: { course_id: project.id, status: 'active' } }),
      api.get<ContentGroupV1[]>('/content-groups', { params: { course_id: project.id, status: 'active' } }),
    ]);
    const visibleNotes = notes.filter(availableNote);
    const noteIds = new Set(visibleNotes.map((note) => note.id));
    return {
      project,
      notes: visibleNotes,
      // Project-level groups have no paper to open. Existing projections remain readable.
      groups: groups.filter((group) => group.status === 'active' && noteIds.has(group.note_id)),
    };
  }));
  const activeItems = items.filter((item) => item.status === 'active');
  const itemSummaries = await loadItemSummaries(
    contentGroupItemIds(records.flatMap((record) => record.groups)),
    activeItems.map(itemSummaryFromItem),
  );
  const candidates = records.flatMap(({ project, notes, groups }) => {
    const result: BoardCandidate[] = notes.map((note) => ({
      member_kind: 'note',
      member_id: note.id,
      note_id: note.id,
      title: note.title.trim() || 'Untitled note',
      summary: preview(note.description),
      project_title: project.name,
    }));
    for (const group of groups) {
      const memberText = group.members.map((member) => member.kind === 'item'
        ? itemSummaryPreview(member.item_id, itemSummaries)
        : member.current_content || member.preview_text || member.label || ''
      ).filter(Boolean).join(' / ');
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
  });
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  for (const item of activeItems) {
    candidates.push({
      member_kind: 'item',
      member_id: item.id,
      note_id: item.origin_note_id,
      title: item.item_type?.trim() || 'Item',
      summary: itemSummaries.get(item.id)!.summary,
      project_title: projectNames.get(item.origin_course_id || '') || 'Standalone items',
      item_type: item.item_type,
      topic: item.topic,
    });
  }
  return candidates;
}

/** Show fixed UI copy, never arbitrary server bodies or raw error messages. */
export function boardErrorMessage(error: unknown): string {
  const response = error && typeof error === 'object'
    ? (error as { response?: { status?: number; data?: { error?: unknown } } }).response
    : undefined;
  switch (response?.data?.error) {
    case 'board_viewport_bookmark_limit_reached':
      return 'All 24 bookmarks are in use. Delete a bookmark to save another view.';
    case 'board_viewport_bookmark_not_found':
      return 'This bookmark is no longer available. Reload the bookmarks and try again.';
    case 'board_layer_limit_reached':
      return 'A board can have up to 12 layers, including Base.';
    case 'board_layer_not_found':
      return 'This layer is no longer available. Choose another layer.';
    case 'Item content is required':
      return 'Add some text to the chalk before casting it to an item.';
    case 'Board chalk is limited to 280 characters':
      return 'Chalk can contain at most 280 characters. Shorten the text and try again.';
    case 'board_text_range_source_changed':
      return 'The copied text has changed. Save the note, select the passage again, and copy a new reference.';
    case 'tray_placement_unavailable':
    case 'tray_object_unavailable':
      return 'Some selected items are no longer available in Staging. Refresh the note and try again.';
    case 'tray_blocks_cannot_mount_board':
    case 'tray_object_kind_not_relocatable':
      return 'This selection cannot move to a board. Choose drawings or group mounts.';
    case 'tray_connector_endpoint_ambiguous':
    case 'tray_connector_endpoint_unavailable':
    case 'tray_visual_extension_unavailable':
    case 'tray_shape_backing_unavailable':
      return 'This drawing cannot be moved with all its contents intact. It has been kept in Staging.';
    case 'tray_relocation_target_changed':
    case 'tray_relocation_target_has_edges':
      return 'The moved items have been edited on the board. Undo is unavailable because it would remove those changes.';
    case 'tray_relocation_source_changed':
      return 'The original Staging content has changed. Undo is unavailable because it would replace those changes.';
    case 'tray_relocation_not_found':
    case 'tray_relocation_state_conflict':
      return 'This move can no longer be undone. Refresh the note and board.';
    case 'purpose_already_has_board':
      return 'This purpose already has a board. Choose another purpose or open its board.';
    case 'board_member_reference_unavailable':
      return 'This note, group, or item is no longer available. Refresh the library and choose another.';
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
