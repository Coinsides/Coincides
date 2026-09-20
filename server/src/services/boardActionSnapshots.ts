import type { getBoard } from './boards.js';

export type BoardActionKind = 'board_member' | 'board_sticky' | 'board_edge' | 'board_visual';
export const boardPatchFields = {
  board_member: ['x', 'y', 'w', 'h', 'scale', 'z_index', 'pinned', 'placed', 'layer_id'],
  board_sticky: ['text', 'x', 'y', 'w', 'h', 'weight', 'color_index', 'z_index', 'pinned', 'placed', 'layer_id'],
  board_visual: ['x', 'y', 'w', 'h', 'scale', 'rotation', 'z_index', 'pinned', 'layer_id', 'data', 'metadata'],
  board_edge: ['from', 'to', 'bend', 'dash', 'weight', 'cap_start', 'cap_end', 'color_index', 'label_position', 'visual_version', 'style', 'label'],
} satisfies Record<BoardActionKind, string[]>;
export function pickBoardFields(value: object, fields: readonly string[]): Record<string, unknown> {
  const record = value as Record<string, unknown>;
  return Object.fromEntries(fields.filter(key => record[key] !== undefined).map(key => [key, record[key]]));
}
export function boardActionSnapshot(kind: BoardActionKind, value: object): Record<string, unknown> {
  return pickBoardFields(value, ['id', 'board_id', ...boardPatchFields[kind],
    ...(kind === 'board_member' ? ['member_kind', 'member_id', 'mounted_actor', 'metadata'] : []),
    ...(kind === 'board_sticky' ? ['mounted_actor'] : []),
    ...(kind === 'board_visual' ? ['visual_kind'] : []),
  ]);
}
export function findBoardActionObject(detail: ReturnType<typeof getBoard>, kind: BoardActionKind, id: string) {
  const entries = kind === 'board_member' ? detail.members : kind === 'board_sticky' ? detail.stickies
    : kind === 'board_edge' ? detail.edges : detail.visuals;
  return entries.find(entry => entry.id === id);
}
