import axios from 'axios';
import { listNoteBlockTemplates, legacyBlockTypeForTemplate } from '@shared/types';
import { createTextBlockContentV1 } from '../../src/pages/Notes/canvasEngine/textFlowService';
import type { BoardTextRangeV1 } from '@shared/types/boardTextRange';

// This models transport/persistence for the browser only. Its replay is not
// evidence for the server implementation; real SQLite tests cover that boundary.
export const NOTE_ID = 'range-smoke-note';
export const BLOCK_ID = 'range-smoke-block';
export const BOARD_A = 'range-smoke-board-a';
export const BOARD_B = 'range-smoke-board-b';
const KEY = 'coincides.synthetic.text-range-smoke.v1';
const text = 'Preface. The selected passage stays alive. Closing words.';
const at = '2026-09-09T12:00:00.000Z';
const frame = { id: 'range-smoke-frame', role: 'primary_page_frame', pageSize: 'A4', templateId: 'a4_portrait',
  x: 0, y: 0, width: 904, height: 1279, contentInset: { top: 96, right: 72, bottom: 96, left: 72 }, exportable: true };
const layout = { x: 0, y: 60, width: 760, height: 120, coordinate_space: 'page_frame_local', frame_id: frame.id,
  surface: 'formal_page', boundary_role: 'inside' };
function initial() {
  return {
    sequence: 0,
    note: { id: NOTE_ID, course_id: 'range-smoke-project', title: 'Synthetic source note', description: null,
      status: 'active', note_class: 'user', source_kind: 'manual', metadata: {} },
    block: { id: BLOCK_ID, placement_id: 'range-smoke-placement', block_type: 'text', title: null,
      content_json: { body: text, text_flow: createTextBlockContentV1(text) }, plain_text: text,
      metadata: { template_id: 'text.paragraph' }, order_index: 0, status: 'active',
      source_references: [], display_overrides_json: {}, canvas_layout: layout },
    boards: [BOARD_A, BOARD_B].map((id, index) => ({
      board: { id, user_id: 'synthetic-user', title: `Board ${index ? 'B' : 'A'}`, soul_id: `soul-${id}`,
        project_id: null, viewport: { x: 0, y: 0, zoom: 1 }, created_at: at, updated_at: at },
      members: [] as any[], edges: [] as any[], visuals: [] as any[],
    })),
    ranges: [] as BoardTextRangeV1[], annotations: [] as any[], calls: [] as any[],
  };
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let state = (() => {
  try { const raw = sessionStorage.getItem(KEY); return raw ? JSON.parse(raw) as ReturnType<typeof initial> : initial(); }
  catch { return initial(); }
})();
function publish() {
  sessionStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('range-smoke-state'));
}
function reference(range: BoardTextRangeV1) {
  const unit = state.block.content_json.text_flow.units.find((candidate) => candidate.id === range.text_unit_id);
  const lost = state.note.status !== 'active' || state.block.status !== 'active';
  const matches = unit && typeof range.start_offset === 'number' && typeof range.end_offset === 'number'
    && range.end_offset > range.start_offset && unit.text.slice(range.start_offset, range.end_offset) === range.excerpt;
  const status = lost ? 'lost' : range.status === 'drifted' || !matches ? 'drifted' : 'active';
  return { kind: 'text_range', id: range.id, title: state.note.title, note_id: NOTE_ID, block_id: BLOCK_ID,
    summary: range.excerpt, anchor_status: status, state: status === 'active' ? 'available' : 'unavailable',
    reason: status === 'active' ? null : status === 'lost' ? 'source_block_lost' : 'source_changed' };
}
function boardDetail(id: string) {
  const board = state.boards.find((entry) => entry.board.id === id);
  if (!board) throw new Error(`Unknown synthetic board: ${id}`);
  return { ...board, members: board.members.map((member) => ({ ...member,
    reference: reference(state.ranges.find((range) => range.id === member.member_id)!) })) };
}
export function diagnostic() {
  return { body: state.block.content_json.text_flow.units, ranges: state.ranges.map((range) => ({
    ...range, replay_status: reference(range).anchor_status,
  })), members: state.boards.map((entry) => ({ board: entry.board.title, count: entry.members.length })), calls: state.calls.slice(-18) };
}
export function resetSample() { state = initial(); publish(); window.location.hash = `/notes/${NOTE_ID}`; window.location.reload(); }
export const API_BASE = '/api';
export const getToken = () => null;
export const setToken = (_value: unknown) => undefined;
const templates = listNoteBlockTemplates().map((template) => ({ id: `synthetic-${template.template_id}`,
  template_key: template.template_id, version: '1.0.0', origin: 'system_seed', label: template.label,
  description: template.description, system_type: template.system_type, learning_role: template.learning_role,
  legacy_block_type: legacyBlockTypeForTemplate(template.template_id), default_content: template.default_content, status: 'active' }));
const api = axios.create({ adapter: async (config) => {
  const method = (config.method || 'get').toUpperCase();
  const url = config.url || '';
  const input = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  state.calls.push({ method, url, ...(input === undefined ? {} : { input }) });
  let data: unknown;
  const rangeUrl = `/boards/text-ranges/by-note/${NOTE_ID}`;
  if (method === 'GET' && url === `/notes/${NOTE_ID}`) data = state.note;
  else if (method === 'GET' && url === '/notes') data = [state.note];
  else if (method === 'GET' && url === '/courses') data = [{ id: 'range-smoke-project', name: 'Synthetic project' }];
  else if (method === 'GET' && url === '/items') data = [];
  else if (method === 'GET' && url === '/purposes') data = { purposes: state.boards.map(({ board }) => ({
    id: board.soul_id, title: `Question for ${board.title}`, project_id: null, course_id: null, note_id: null,
    status: 'active', is_note_default: false, created_by: 'human', members: [], created_at: at, updated_at: at,
  })) };
  else if (method === 'GET' && url === `/notes/${NOTE_ID}/blocks`) data = [state.block];
  else if (method === 'PUT' && url === `/notes/${NOTE_ID}`) { Object.assign(state.note, input); data = state.note; }
  else if (method === 'PUT' && url === `/note-blocks/${BLOCK_ID}`) { Object.assign(state.block, input); data = state.block; }
  else if (method === 'GET' && url === rangeUrl) data = { text_ranges: state.ranges };
  else if (method === 'PUT' && url === rangeUrl) {
    for (const range of input.text_ranges) {
      const stored = state.ranges.find(({ id }) => id === range.id);
      if (!stored) throw new Error('Unknown synthetic range update');
      Object.assign(stored, range);
    }
    data = { text_ranges: state.ranges };
  } else if (method === 'POST' && /^\/boards\/[^/]+\/text-ranges$/.test(url)) {
    const boardId = url.split('/')[2];
    const target = state.boards.find((entry) => entry.board.id === boardId)!;
    const range: BoardTextRangeV1 = { ...input.text_range, id: `range-${++state.sequence}`, board_id: boardId,
      status: 'active', pre_edit_offsets: null, created_at: at, updated_at: at };
    state.ranges.push(range);
    const { text_range: _selection, ...geometry } = input;
    const member = { id: `member-${state.sequence}`, board_id: boardId, member_kind: 'text_range', member_id: range.id,
      x: 80 + target.members.length * 28, y: 70 + target.members.length * 36, w: 320, h: 210,
      scale: 1, z_index: 0, pinned: false, metadata: {}, created_at: at, updated_at: at,
      ...geometry, reference: reference(range) };
    target.members.push(member);
    data = { member, text_range: range, created: true };
  } else if (method === 'GET' && url === '/boards') data = { boards: state.boards.map(({ board }) => board) };
  else if (method === 'GET' && /^\/boards\/[^/]+$/.test(url)) data = boardDetail(url.split('/')[2]);
  else if (method === 'GET' && state.boards.some(({ board }) => url === `/boards/${board.id}/viewport-bookmarks`)) data = { bookmarks: [] };
  else if (method === 'PATCH' && /^\/boards\/[^/]+$/.test(url)) {
    const target = state.boards.find(({ board }) => board.id === url.split('/')[2])!;
    Object.assign(target.board, input); data = { board: target.board };
  } else if (method === 'PATCH' && /^\/boards\/[^/]+\/members\/[^/]+$/.test(url)) {
    const target = state.boards.find(({ board }) => board.id === url.split('/')[2])!;
    const member = target.members.find(({ id }) => id === url.split('/')[4]);
    Object.assign(member, input); data = { member };
  } else if (method === 'GET' && url === '/canvas-objects/coordinate-contract') data = { coordinate_contract: 'v2' };
  else if (method === 'GET' && url === `/canvas-objects/by-note/${NOTE_ID}`) data = {
    canvasObjects: [], canvasPlacements: [], contentMounts: [], visualConnectors: [], imageObjects: [], structuredObjects: [],
    pageFrameCollection: { pageFrames: [frame], primaryFrameId: frame.id, selectedFrameId: frame.id },
    blockLayouts: [{ block_id: BLOCK_ID, placement_id: state.block.placement_id, layout: state.block.canvas_layout }],
  };
  else if (method === 'GET' && url === '/templates') data = templates;
  else if (url === '/source-anchors/generate') data = { generated: 0 };
  else if (url.startsWith('/annotation-truths/by-note/')) {
    if (method === 'PUT') state.annotations = input.annotation_truths || input.annotations || [];
    data = state.annotations;
  } else if (method === 'GET' && (url === '/source-anchors' || url === '/content-groups' || url === '/group-folders'
    || url.startsWith('/purposes/by-note/'))) data = [];
  else throw new Error(`Unmapped synthetic transport: ${method} ${url}`);
  publish();
  return { data: clone(data), status: method === 'POST' ? 201 : 200, statusText: 'OK', headers: {}, config };
} });
export default api;
