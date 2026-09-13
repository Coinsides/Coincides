import axios from 'axios';
import { readCanvasAssetFixture } from '../../test/fixtures/canvasAssetFixture';
import { listNoteBlockTemplates, legacyBlockTypeForTemplate } from '@shared/types';
import type { BoardTextRangeV1 } from '../../../shared/types/boardTextRange';
import { textFlowIdForBlock } from '../../../shared/types/textFlow';
import type { BoardDetail, BoardMember } from '../../src/pages/Boards/boardTypes';
import type { ContentGroupV1, Note, NoteBlock } from '../../src/pages/Notes/canvasEngine/runtimeDataTypes';
import { createTextBlockContentV1, getTextFlowContent } from '../../src/pages/Notes/canvasEngine/textFlowService';
import { createContentGroup, createContentGroupMemberFromBlock } from '../../src/pages/Notes/canvasEngine/contentGroupService';
import { rememberTrayRelocation } from '../../src/pages/Notes/canvasEngine/trayRelocationHistory';

// Browser-only synthetic persistence. Production board and runtime code stay real;
// the server's replay implementation is intentionally not claimed by this fixture.
export const NOTE_A = 'open-smoke-note-a';
export const NOTE_B = 'open-smoke-note-b';
export const BLOCK_A = 'open-smoke-block-a';
export const BOARD_ID = 'open-smoke-board';
export const ITEM_ID = 'open-smoke-staging-item';
export const STATE_EVENT = 'open-note-smoke-state';
const KEY = 'coincides.synthetic.open-note-smoke.v2-staging';
const at = '2026-09-09T12:00:00.000Z';
const firstText = 'Preface. The selected passage stays alive. Closing words.';
const TRAY_BLOCK = 'open-smoke-tray-block';
const SPLIT_NOTE = 'open-smoke-split-note';
const TRAY_SHAPE = 'open-smoke-tray-shape';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const frame = { id: 'open-smoke-frame', role: 'primary_page_frame', pageSize: 'A4', templateId: 'a4_portrait',
  x: 0, y: 0, width: 904, height: 1279, contentInset: { top: 96, right: 72, bottom: 96, left: 72 }, exportable: true };
const layout = { x: 0, y: 60, width: 760, height: 120, coordinate_space: 'page_frame_local' as const, frame_id: frame.id,
  surface: 'formal_page' as const, boundary_role: 'inside' as const };
type Call = { sequence: number; method: string; url: string; phase: 'started' | 'committed' | 'rejected'; input?: unknown };
type StoredBlock = NoteBlock & { note_id: string; status: string };
type WriteKind = 'body' | 'range';
type SyntheticEvent = { verb: 'mounted' | 'unmounted'; member_id: string; sequence: number };
function initial() {
  const notes: Note[] = [NOTE_A, NOTE_B].map((id, index) => ({
    id, course_id: 'open-smoke-project', title: index ? 'Synthetic second note' : 'Synthetic source note',
    description: index ? 'Second note description.' : 'Source note description.',
    status: 'active', note_class: 'user', source_kind: 'manual', metadata: {},
  }));
  const blocks: StoredBlock[] = notes.map((note, index) => {
    const body = index ? 'A second real runtime can take over the same modal.' : firstText;
    return { id: index ? 'open-smoke-block-b' : BLOCK_A, note_id: note.id, placement_id: `open-smoke-placement-${index}`,
      block_type: 'text', title: null, content_json: { body, text_flow: createTextBlockContentV1(body) }, plain_text: body,
      metadata: { template_id: 'text.paragraph' }, order_index: 0, status: 'active', source_references: [],
      display_overrides_json: {}, canvas_layout: { ...layout } };
  });
  const range: BoardTextRangeV1 = {
    id: 'open-smoke-range', board_id: BOARD_ID, note_id: NOTE_A, block_id: BLOCK_A,
    text_flow_id: textFlowIdForBlock(BLOCK_A), text_unit_id: 'tu-1', start_offset: 9,
    end_offset: 9 + 'The selected passage stays alive.'.length,
    excerpt: 'The selected passage stays alive.', at, status: 'active', pre_edit_offsets: null, created_at: at, updated_at: at,
  };
  const geometry = { w: 310, h: 194, scale: 1, z_index: 0, pinned: false, placed: true, mounted_actor: 'human',
    metadata: {}, created_at: at, updated_at: at };
  const members: BoardMember[] = notes.map((note, index) => ({
    ...geometry, id: `open-smoke-member-${index}`, board_id: BOARD_ID, member_kind: 'note', member_id: note.id,
    x: 64 + 370 * index, y: 65, reference: { kind: 'note', id: note.id, title: note.title,
      note_id: note.id, state: 'available', reason: null },
  }));
  members.push({ ...geometry, id: 'open-smoke-member-range', board_id: BOARD_ID, member_kind: 'text_range', member_id: range.id,
    x: 64, y: 318, reference: { kind: 'text_range', id: range.id, title: notes[0].title, note_id: NOTE_A,
      block_id: BLOCK_A, summary: range.excerpt, anchor_status: 'active', state: 'available', reason: null } });
  const board: BoardDetail = { board: { id: BOARD_ID, user_id: 'synthetic-user', title: 'Open note verification board',
    identity_item_id: null, identity_description: null,
    soul_id: 'open-smoke-soul', project_id: null, viewport: { x: 0, y: 0, zoom: 1 }, created_at: at, updated_at: at },
    members, edges: [], visuals: [] };
  const items = [{ id: ITEM_ID, user_id: 'synthetic-user', plain_text: 'Synthetic staging Item ready to place.',
    body_json: {}, item_type: 'Synthetic staging Item', topic: 'Staging smoke', status: 'active' as const,
    origin_note_id: NOTE_A, origin_course_id: 'open-smoke-project', origin_board_id: null, origin_board_title: null,
    created_by: 'human', metadata: {}, created_at: at, updated_at: at }];
  return { notes, blocks, board, items, ranges: [range], sequence: 0, calls: [] as Call[],
    syntheticEvents: [] as SyntheticEvent[], annotations: [] as unknown[],
    navigationTargets: false, groups: [] as ContentGroupV1[] };
}
let state = (() => {
  try { const raw = sessionStorage.getItem(KEY); return raw ? JSON.parse(raw) as ReturnType<typeof initial> : initial(); }
  catch { return initial(); }
})();
let nextWrite: { kind: WriteKind; action: 'hold' | 'fail' } | null = null;
let heldWrite: { kind: WriteKind; resolve: () => void; reject: (error: Error) => void } | null = null;
let failNextNoteLoad = false;
function seedRelocationReceipt() {
  // A completed synthetic receipt exposes the production Tray's Open board link.
  // No board member or user data is added or mutated by this fixture setup.
  rememberTrayRelocation(NOTE_A, { board_id: BOARD_ID, batch_id: 'open-smoke-prior-relocation',
    placement_ids: [], visual_ids: [], member_ids: [], applied: true,
    geometry: { preserved_placement_ids: [], default_grid_placement_ids: [] } });
}
if (state.navigationTargets) seedRelocationReceipt();
function publish() {
  sessionStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(STATE_EVENT));
}
function rangeReference(range: BoardTextRangeV1) {
  const block = state.blocks.find(({ id }) => id === range.block_id)!;
  const note = state.notes.find(({ id }) => id === range.note_id)!;
  const unit = getTextFlowContent(block.content_json)?.units.find(({ id }) => id === range.text_unit_id);
  const matches = unit && typeof range.start_offset === 'number' && typeof range.end_offset === 'number'
    && range.end_offset > range.start_offset && unit.text.slice(range.start_offset, range.end_offset) === range.excerpt;
  const status = block.status !== 'active' || note.status !== 'active' ? 'lost'
    : range.status === 'drifted' || !matches ? 'drifted' : 'active';
  return { kind: 'text_range' as const, id: range.id, title: note.title, note_id: note.id, block_id: block.id,
    summary: range.excerpt, anchor_status: status, state: status === 'active' ? 'available' : 'unavailable',
    reason: status === 'active' ? null : status === 'lost' ? 'source_block_lost' : 'source_changed' };
}
function boardDetail() {
  return { ...state.board, members: state.board.members.map((member) => member.member_kind === 'text_range'
    ? { ...member, reference: rangeReference(state.ranges.find(({ id }) => id === member.member_id)!) }
    : member.member_kind === 'note'
      ? { ...member, reference: { ...member.reference, title: state.notes.find(({ id }) => id === member.member_id)!.title } }
      : member.member_kind === 'item'
        ? { ...member, reference: { ...member.reference,
          summary: state.items.find(({ id }) => id === member.member_id)!.plain_text } }
        : { ...member, reference: { ...member.reference, title: state.groups.find(({ id }) => id === member.member_id)!.title } }) };
}
export function diagnostic() {
  return {
    notes: state.notes.map(({ id, title, description }) => ({ id, title, description })),
    blocks: state.blocks.map(({ id, note_id, plain_text }) => ({ id, note_id, plain_text })),
    ranges: state.ranges.map((range) => ({ ...range, replay_status: rangeReference(range).anchor_status })),
    members: state.board.members.map(({ id, member_kind, member_id, placed, mounted_actor, x, y, w, h, scale }) =>
      ({ id, member_kind, member_id, placed, mounted_actor, x, y, w, h, scale })),
    syntheticEvents: state.syntheticEvents,
    nextWrite, heldWrite: heldWrite?.kind || null, failNextNoteLoad, navigationTargets: Boolean(state.navigationTargets),
    boardReads: state.calls.filter(({ method, url, phase }) => method === 'GET' && url === `/boards/${BOARD_ID}` && phase === 'started').length,
    boardWrites: state.calls.filter(({ method, url, phase }) => method !== 'GET' && url.startsWith(`/boards/${BOARD_ID}`) && phase === 'started'),
    calls: state.calls,
  };
}
export function configureNextWrite(kind: WriteKind, action: 'hold' | 'fail') { nextWrite = { kind, action }; publish(); }
export function configureNextNoteLoadFailure() { failNextNoteLoad = true; publish(); }
export function populateNavigationTargets() {
  if (document.querySelector('[aria-label="Open note"]') || state.navigationTargets) return;
  state.navigationTargets = true;
  state.groups = [createContentGroup({ projectId: 'open-smoke-project', noteId: NOTE_A, canvasId: NOTE_A,
    title: 'Synthetic navigation group', members: [createContentGroupMemberFromBlock(state.blocks[0])] })];
  const body = 'Synthetic tray block for navigation targets.';
  state.blocks.push({ ...clone(state.blocks[0]), id: TRAY_BLOCK, placement_id: 'open-smoke-tray-block-placement',
    plain_text: body, content_json: { body, text_flow: createTextBlockContentV1(body) }, order_index: 1,
    canvas_layout: { x: 0, y: 0, width: 0, height: 0, surface: 'tray', order_index: 0 } });
  seedRelocationReceipt();
  publish();
}
export function settleHeldWrite(reject = false) {
  const held = heldWrite;
  heldWrite = null;
  if (reject) held?.reject(new Error('Synthetic held write rejected'));
  else held?.resolve();
  publish();
}
export function resetSample() {
  if (document.querySelector('[aria-label="Open note"]')) return;
  state = initial(); nextWrite = null;
  publish(); window.location.hash = `/boards/${BOARD_ID}`; window.location.reload();
}
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
  const sequence = ++state.sequence;
  const call = { sequence, method, url, ...(input === undefined ? {} : { input }) };
  state.calls.push({ ...call, phase: 'started' }); publish();
  try {
    const asset = method === 'GET' ? readCanvasAssetFixture(url) : undefined;
    if (asset) {
      state.calls.push({ ...call, phase: 'committed' }); publish();
      return { ...asset, status: 200, statusText: 'OK', headers: {}, config };
    }
    if (failNextNoteLoad && method === 'GET' && /^\/notes\/[^/]+$/.test(url)) {
      failNextNoteLoad = false; throw new Error('Synthetic note load failed');
    }
    const kind = method === 'PUT' && url.startsWith('/note-blocks/') ? 'body'
      : method === 'PUT' && url.startsWith('/boards/text-ranges/by-note/') ? 'range' : null;
    if (kind && nextWrite?.kind === kind) {
      const action = nextWrite.action; nextWrite = null;
      if (action === 'fail') throw new Error(`Synthetic ${kind} write failed`);
      await new Promise<void>((resolve, reject) => { heldWrite = { kind, resolve, reject }; publish(); });
    }
    let data: unknown;
    const noteId = /^\/notes\/([^/]+)(?:\/blocks)?$/.exec(url)?.[1];
    const note = state.notes.find(({ id }) => id === noteId);
    const rangeNoteId = /^\/boards\/text-ranges\/by-note\/([^/]+)$/.exec(url)?.[1];
    const trayBlock = state.blocks.find((block) => block.id === TRAY_BLOCK
      && block.note_id === url.split('/')[3] && block.canvas_layout?.surface === 'tray');
    if (method === 'POST' && url === `/notes/${NOTE_A}/tray/split`) {
      const block = state.blocks.find(({ id }) => id === TRAY_BLOCK);
      if (!block || !input.placement_ids.includes(block.placement_id)) throw new Error('Unknown synthetic tray selection');
      if (!state.notes.some(({ id }) => id === SPLIT_NOTE)) state.notes.push({ ...clone(state.notes[0]), id: SPLIT_NOTE, title: input.title });
      block.note_id = SPLIT_NOTE; block.canvas_layout = { ...layout };
      data = { note_id: SPLIT_NOTE, batch_id: 'open-smoke-split-batch' };
    }
    else if (method === 'GET' && note && url.endsWith('/blocks')) data = state.blocks.filter(({ note_id, status }) => note_id === note.id && status === 'active');
    else if (method === 'GET' && note) data = note;
    else if (method === 'PUT' && note) { Object.assign(note, input); data = note; }
    else if (method === 'GET' && url === '/palette-colors') data = [];
    else if (method === 'GET' && url === '/notes') data = state.notes;
    else if (method === 'GET' && url === '/courses') data = [{ id: 'open-smoke-project', name: 'Synthetic project' }];
    else if (method === 'GET' && url === '/courses/open-smoke-project/summary') data = { course: { id: 'open-smoke-project', name: 'Synthetic project', skin: null }, goals: [], decks: [], documents: [] };
    else if (method === 'GET' && url === '/items') data = state.items;
    else if (method === 'GET' && url === '/purposes') data = { purposes: [{ id: state.board.board.soul_id,
      title: 'Open note verification board', project_id: null, course_id: null, note_id: null, status: 'active',
      is_note_default: false, created_by: 'human', members: [], created_at: at, updated_at: at }] };
    else if (method === 'PUT' && url.startsWith('/note-blocks/')) {
      const block = state.blocks.find(({ id }) => id === url.split('/')[2]);
      if (!block) throw new Error('Unknown synthetic block');
      Object.assign(block, input); data = block;
    } else if (method === 'POST' && note && url.endsWith('/blocks')) {
      const body = input.plain_text || '';
      const block: StoredBlock = { ...input, id: `open-smoke-draft-${sequence}`, note_id: note.id,
        placement_id: `open-smoke-draft-placement-${sequence}`, status: 'active', title: input.title || null,
        content_json: input.content_json || { body, text_flow: createTextBlockContentV1(body) }, plain_text: body,
        order_index: state.blocks.filter(({ note_id }) => note_id === note.id).length,
        source_references: [], display_overrides_json: {}, canvas_layout: { ...layout, y: 220 } };
      state.blocks.push(block); data = block;
    } else if (method === 'GET' && rangeNoteId) data = { text_ranges: state.ranges.filter(({ note_id }) => note_id === rangeNoteId) };
    else if (method === 'PUT' && rangeNoteId) {
      for (const range of input.text_ranges) {
        const stored = state.ranges.find(({ id }) => id === range.id);
        if (!stored) throw new Error('Unknown synthetic range update');
        Object.assign(stored, range);
      }
      data = { text_ranges: state.ranges.filter(({ note_id }) => note_id === rangeNoteId) };
    } else if (method === 'GET' && url === '/boards') data = { boards: state.navigationTargets ? [] : [state.board.board] };
    else if (method === 'GET' && url === `/boards/${BOARD_ID}`) data = boardDetail();
    else if (method === 'GET' && url === `/boards/${BOARD_ID}/viewport-bookmarks`) data = { bookmarks: [] };
    else if (method === 'PATCH' && url === `/boards/${BOARD_ID}`) { Object.assign(state.board.board, input); data = { board: state.board.board }; }
    else if (method === 'POST' && (url === `/boards/${BOARD_ID}/members` || url === `/boards/${BOARD_ID}/text-ranges`)) {
      const existing = input.id && state.board.members.find(({ id }) => id === input.id);
      if (existing) data = { member: existing, created: false };
      else {
        const range = url.endsWith('/text-ranges') ? { ...input.text_range, id: `open-smoke-range-${sequence}`,
          board_id: BOARD_ID, status: 'active' as const, pre_edit_offsets: null, created_at: at, updated_at: at } : null;
        const memberKind = range ? 'text_range' : input.member_kind;
        const targetId = range?.id || input.member_id;
        const targetNote = state.notes.find(({ id }) => id === targetId);
        const item = state.items.find(({ id }) => id === targetId);
        const group = state.groups.find(({ id }) => id === targetId);
        if (!range && !targetNote && !item && !group) throw new Error('Unknown synthetic member target');
        if (range) state.ranges.push(range);
        const member: BoardMember = {
          id: input.id || `open-smoke-mounted-${sequence}`, board_id: BOARD_ID, member_kind: memberKind, member_id: targetId,
          placed: input.placed !== false, mounted_actor: 'human', x: input.x ?? 0, y: input.y ?? 0,
          w: input.w ?? 0, h: input.h ?? 0, scale: input.scale ?? 1, z_index: input.z_index ?? 0,
          pinned: input.pinned ?? false, metadata: input.metadata ?? {}, created_at: at, updated_at: at,
          reference: range ? rangeReference(range) as BoardMember['reference'] : {
            kind: memberKind, id: targetId, title: targetNote?.title ?? group?.title ?? null,
            note_id: targetNote?.id ?? group?.note_id ?? item?.origin_note_id ?? null,
            state: 'available', reason: null,
            ...(item ? { summary: item.plain_text, item_type: item.item_type, item_status: item.status, topic: item.topic } : {}),
          },
        };
        state.board.members.push(member);
        state.syntheticEvents.push({ verb: 'mounted', member_id: member.id, sequence });
        data = { member, created: true };
      }
    }
    else if (method === 'PATCH' && url.startsWith(`/boards/${BOARD_ID}/members/`)) {
      const member = state.board.members.find(({ id }) => id === url.split('/')[4]);
      if (!member) throw new Error('Unknown synthetic member');
      Object.assign(member, input); data = { member };
    } else if (method === 'DELETE' && url.startsWith(`/boards/${BOARD_ID}/members/`)) {
      const member = state.board.members.find(({ id }) => id === url.split('/')[4]);
      if (member) {
        state.board.members = state.board.members.filter(({ id }) => id !== member.id);
        if (member.member_kind === 'text_range') state.ranges = state.ranges.filter(({ id }) => id !== member.member_id);
        state.syntheticEvents.push({ verb: 'unmounted', member_id: member.id, sequence });
      }
      data = { removed: Boolean(member) };
    } else if (method === 'GET' && url === '/canvas-objects/coordinate-contract') data = { coordinate_contract: 'v2' };
    else if (method === 'GET' && url.startsWith('/canvas-objects/by-note/')) data = {
      canvasObjects: [...(state.navigationTargets && url.endsWith(`/${NOTE_A}`)
        ? [{ objectId: TRAY_SHAPE, canvasId: NOTE_A, kind: 'shape', backing: 'none', objectClass: 'pure', status: 'active',
          source: 'entity', metadata: { shapeType: 'rectangle' } }] : []),
        ...(trayBlock ? [{ objectId: `${TRAY_BLOCK}-object`, canvasId: NOTE_A, kind: 'paragraph_block_projection',
          backing: 'note_block', objectClass: 'block_backed', status: 'active', source: 'entity' }] : [])],
      canvasPlacements: [...(state.navigationTargets && url.endsWith(`/${NOTE_A}`)
        ? [{ placementId: `${TRAY_SHAPE}-placement`, objectId: TRAY_SHAPE, canvasId: NOTE_A,
          surface: 'tray', boundaryRole: 'outside', x: 0, y: 0, width: 120, height: 80, rotation: 0, zIndex: 0, orderIndex: 1 }] : []),
        ...(trayBlock ? [{ placementId: trayBlock.placement_id, objectId: `${TRAY_BLOCK}-object`, canvasId: NOTE_A,
          surface: 'tray', boundaryRole: 'outside', x: 0, y: 0, width: 0, height: 0, rotation: 0, zIndex: 0, orderIndex: 0 }] : [])],
      // Tray reads persisted projection records, not the engine's generated block projections.
      contentMounts: trayBlock ? [{ mountId: `${TRAY_BLOCK}-mount`, objectId: `${TRAY_BLOCK}-object`,
        targetKind: 'note_block', targetId: TRAY_BLOCK, projectionMode: 'owned', syncPolicy: 'manual' }] : [],
      visualConnectors: [], imageObjects: [], structuredObjects: [],
      pageFrameCollection: { pageFrames: [frame], primaryFrameId: frame.id, selectedFrameId: frame.id },
      blockLayouts: state.blocks.filter(({ note_id }) => note_id === url.split('/')[3])
        .map((block) => ({ block_id: block.id, placement_id: block.placement_id, layout: block.canvas_layout })),
    };
    else if (method === 'GET' && url === '/templates') data = templates;
    else if (url === '/source-anchors/generate') data = { generated: 0 };
    else if (url.startsWith('/annotation-truths/by-note/')) {
      if (method === 'PUT') state.annotations = input.annotation_truths || input.annotations || [];
      data = state.annotations;
    } else if (method === 'GET' && url === '/content-groups') data = (state.groups || []).filter((group) => group.note_id === config.params?.note_id);
    else if (method === 'GET' && (url === '/source-anchors' || url === '/items/anchors' || url === '/group-folders'
      || url.startsWith('/purposes/by-note/'))) data = [];
    else throw new Error(`Unmapped synthetic transport: ${method} ${url}`);
    state.calls.push({ ...call, phase: 'committed' }); publish();
    return { data: clone(data), status: method === 'POST' ? 201 : 200, statusText: 'OK', headers: {}, config };
  } catch (error) {
    state.calls.push({ ...call, phase: 'rejected' }); publish(); throw error;
  }
} });
export default api;
