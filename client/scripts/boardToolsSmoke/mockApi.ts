import type { BoardDetail, BoardEdge, BoardMember, BoardVisual } from '../../src/pages/Boards/boardTypes';

// Shared synthetic transport for the six UI workflows and the local browser fixture.
// All data lives in this module; the production repository and hook run unchanged.
export const BOARD_ID = 'tools-smoke';
export const BOARD_PATH = `/boards/${BOARD_ID}`;
export const STATE_EVENT = 'board-tools-smoke-state';
export const API_BASE = '/synthetic-api';
export const getToken = () => null;
export const setToken = () => undefined;
const date = '2026-09-09T12:00:00.000Z';
const geometry = { x: 0, y: 0, w: 160, h: 100, scale: 1, z_index: 0, pinned: false };
const copy = <T,>(value: T): T => structuredClone(value);
export let detail: BoardDetail;
export let writes: { method: string; url: string; input?: unknown }[];
export let events: { event_type: string; member_id: string }[];
let sequence = 0;
function changed() { if (typeof window !== 'undefined') window.dispatchEvent(new Event(STATE_EVENT)); }
function response<T>(data: T) { changed(); return { data: copy(data) }; }

export function resetSample(sample: 'empty' | 'group' | 'mixed' = 'empty') {
  sequence = 0; writes = []; events = [];
  detail = {
    board: { id: BOARD_ID, user_id: 'synthetic-user', title: 'Board tools workshop', soul_id: 'synthetic-soul',
      project_id: null, viewport: { x: 0, y: 0, zoom: 1 }, created_at: date, updated_at: date },
    members: [], edges: [], visuals: [],
  };
  if (sample === 'group') {
    seedMember('A', { x: 80, y: 80 });
    seedMember('Pinned B', { x: 310, y: 80, pinned: true });
    seedVisual({ visual_kind: 'sticky', x: 90, y: 250, data: { text: 'Move this chalk with A.' } });
  }
  if (sample === 'mixed') {
    const a = seedMember('A', { x: 80, y: 80 });
    const b = seedMember('B', { x: 480, y: 80 });
    const c = seedMember('C', { x: 480, y: 350 });
    seedEdge(a, b, { label: 'Selected connection', style: { direction: 'forward' } });
    seedEdge(c, a, { label: 'Unselected cascade', style: { direction: 'both' } });
    seedVisual({ x: 80, y: 300 });
  }
  changed();
}
export function seedMember(title: string, input: Partial<BoardMember> = {}) {
  const id = `member-${++sequence}`;
  const member: BoardMember = { ...geometry, id, board_id: BOARD_ID, member_kind: 'item', member_id: `item-${id}`,
    metadata: {}, created_at: date, updated_at: date,
    reference: { kind: 'item', id: `item-${id}`, title, note_id: null, state: 'available', reason: null, item_status: 'active' },
    ...copy(input) };
  detail.members.push(member);
  return member;
}
export function seedVisual(input: Partial<BoardVisual> = {}) {
  const visual: BoardVisual = { ...geometry, id: `visual-${++sequence}`, board_id: BOARD_ID,
    visual_kind: 'freehand', w: 100, h: 20, rotation: 0,
    data: { points: [{ x: 0, y: 0 }, { x: 100, y: 20 }], path: 'M 0 0 L 100 20' },
    metadata: {}, created_at: date, updated_at: date, ...copy(input) };
  detail.visuals.push(visual);
  return visual;
}
export function seedEdge(from: BoardMember, to: BoardMember, input: Partial<BoardEdge> = {}) {
  const edge: BoardEdge = { id: `edge-${++sequence}`, board_id: BOARD_ID, from_member_id: from.id, to_member_id: to.id,
    style: {}, label: null, created_at: date, ...copy(input) };
  detail.edges.push(edge);
  return edge;
}
function missing(url: string): never { throw new Error(`Synthetic transport: object missing at ${url}`); }
function record(method: string, url: string, input?: unknown) { writes.push({ method, url, input: copy(input) }); }
const api = {
  async get(url: string) {
    if (url === BOARD_PATH) return response(detail);
    if (url === '/courses' || url === '/items') return response([]);
    if (url === `${BOARD_PATH}/events`) return response({ events });
    throw new Error(`Unexpected synthetic GET: ${url}`);
  },
  async post(url: string, input: Record<string, unknown>) {
    record('POST', url, input);
    if (url === `${BOARD_PATH}/visuals`) return response({ visual: seedVisual(input) });
    if (url === `${BOARD_PATH}/edges`) {
      const from = detail.members.find(({ id }) => id === input.from_member_id);
      const to = detail.members.find(({ id }) => id === input.to_member_id);
      if (!from || !to) return missing(url);
      return response({ edge: seedEdge(from, to, input) });
    }
    throw new Error(`Unexpected synthetic POST: ${url}`);
  },
  async patch(url: string, input: Record<string, unknown>) {
    record('PATCH', url, input);
    if (url === BOARD_PATH) { Object.assign(detail.board, copy(input)); return response({ board: detail.board }); }
    for (const [kind, objects] of [['member', detail.members], ['visual', detail.visuals], ['edge', detail.edges]] as const) {
      if (!url.startsWith(`${BOARD_PATH}/${kind}s/`)) continue;
      const object = objects.find(({ id }) => url === `${BOARD_PATH}/${kind}s/${id}`);
      if (!object) return missing(url);
      Object.assign(object, copy(input));
      return response({ [kind]: object });
    }
    throw new Error(`Unexpected synthetic PATCH: ${url}`);
  },
  async delete(url: string) {
    record('DELETE', url);
    const member = detail.members.find(({ id }) => url === `${BOARD_PATH}/members/${id}`);
    if (member) {
      detail.members = detail.members.filter(({ id }) => id !== member.id);
      detail.edges = detail.edges.filter((edge) => edge.from_member_id !== member.id && edge.to_member_id !== member.id);
      events.push({ event_type: 'unmounted', member_id: member.id });
      return response({});
    }
    const visual = detail.visuals.find(({ id }) => url === `${BOARD_PATH}/visuals/${id}`);
    if (visual) { detail.visuals = detail.visuals.filter(({ id }) => id !== visual.id); return response({}); }
    const edge = detail.edges.find(({ id }) => url === `${BOARD_PATH}/edges/${id}`);
    if (edge) { detail.edges = detail.edges.filter(({ id }) => id !== edge.id); return response({}); }
    return missing(url);
  },
  async put(url: string) { throw new Error(`Unexpected synthetic PUT: ${url}`); },
};
export function diagnostic() { return copy({ members: detail.members, edges: detail.edges, visuals: detail.visuals, events, writes }); }
resetSample();
export default api;
