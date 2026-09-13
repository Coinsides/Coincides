import axios from 'axios';
import { readCanvasAssetFixture } from '../../test/fixtures/canvasAssetFixture';
import { listNoteBlockTemplates, legacyBlockTypeForTemplate } from '@shared/types';
import type { Note, NoteBlock } from '../../src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { PageFrameCollectionModel } from '../../src/pages/Notes/canvasEngine/types';
import { normalizePageFrameCollection } from '../../src/pages/Notes/canvasEngine/pageFrameCollectionService';
import { createRuntimePageFrame } from '../../src/pages/Notes/canvasEngine/pageFrameService';

const params = new URLSearchParams(window.location.search);
export const healthy = params.get('healthy') === '1';
export const stale = params.get('stale') === '1';
export const NOTE_ID = healthy ? 'f11-healthy-note' : 'f11-incomplete-note';
const frame = {
  ...createRuntimePageFrame({ contentX: 64, height: 1120 }),
  ...(params.get('misaligned') === '1' ? { x: 80 } : {}),
  ...(params.get('world') === '1' ? { x: 0, contentInset: { left: 72, right: 72, top: 96, bottom: 96 } } : {}),
};
export const fixtureNote: Note = {
  id: NOTE_ID, course_id: 'f11-memory-project', title: 'F11 synthetic paragraph note',
  description: null, status: 'active', note_class: params.get('readonly') === '1' ? 'source_projection' : 'user', source_kind: 'manual', metadata: {},
};
export const fixtureBlocks: NoteBlock[] = [
  'Drag this paragraph on the paper to save its layout.',
  'This untouched paragraph supplies an independent screen rectangle.',
].map((text, index) => ({
  id: `f11-block-${index + 1}`, placement_id: `f11-placement-${index + 1}`,
  display_overrides_json: {}, block_type: 'text', title: null,
  content_json: { body: text }, plain_text: text, metadata: { template_id: 'text.paragraph' },
  order_index: index, source_references: [],
  canvas_layout: params.get('staged') === '1' && index === 0 ? {
    x: 0, y: 0, width: 0, height: 0, surface: 'tray', order_index: 0,
  } : {
    x: 0, y: (params.get('world') === '1' ? 0 : 60) + index * 220, width: 620, height: 100,
    surface: 'formal_page', boundary_role: 'inside',
    ...(healthy || stale ? {
      coordinate_space: params.get('world') === '1' ? 'canvas_world' : 'page_frame_local',
      frame_id: stale ? 'retired-frame' : frame.id,
    } : {}),
  },
}));
let storedCollection: PageFrameCollectionModel | null = healthy || (stale && params.get('missing') !== '1')
  ? normalizePageFrameCollection({ pageFrames: [frame], primaryFrameId: frame.id, selectedFrameId: frame.id }) : null;
export function storedState() {
  return structuredClone({ note: fixtureNote, blocks: fixtureBlocks, collection: storedCollection });
}
function canvasPayload() {
  return {
    coordinateContract: 'v2', pageFrameCollection: storedCollection,
    canvasObjects: fixtureBlocks.map((block) => ({
      objectId: `f11-object-${block.id}`, canvasId: 'primary-note-canvas', kind: 'paragraph_block_projection',
      backing: 'note_block', objectClass: 'projection', status: 'active', source: 'entity', metadata: {},
    })),
    canvasPlacements: fixtureBlocks.map((block) => ({
      ...block.canvas_layout, placementId: block.placement_id, objectId: `f11-object-${block.id}`,
      canvasId: 'primary-note-canvas', rotation: 0, zIndex: block.order_index,
    })),
    contentMounts: fixtureBlocks.map((block) => ({
      mountId: `f11-mount-${block.id}`, objectId: `f11-object-${block.id}`,
      targetKind: 'note_block', targetId: block.id, projectionMode: 'owned', syncPolicy: 'manual',
    })),
    visualConnectors: [], imageObjects: [], structuredObjects: [],
    blockLayouts: fixtureBlocks.map((block) => ({
      block_id: block.id, placement_id: block.placement_id, layout: block.canvas_layout,
    })),
  };
}
const templates = listNoteBlockTemplates().map((template) => ({
  id: `f11-template-${template.template_id}`, template_key: template.template_id,
  version: '1.0.0', origin: 'system_seed', label: template.label, description: template.description,
  system_type: template.system_type, learning_role: template.learning_role,
  legacy_block_type: legacyBlockTypeForTemplate(template.template_id),
  default_content: template.default_content, status: 'active',
}));
export type ApiCall = { method: string; url: string; body: unknown; completed: boolean };
export const apiCalls: ApiCall[] = [];
let holdCollection = params.get('hold') === '1';
let holdPlacement = params.get('holdLayout') === '1';
const pendingReleases: Array<() => void> = [];
const pendingPlacements: Array<() => void> = [];
export const collectionPending = () => pendingReleases.length > 0;
export const placementPending = () => pendingPlacements.length > 0;
export function releaseCollection() { holdCollection = false; pendingReleases.splice(0).forEach((release) => release()); }
export function releasePlacement() { holdPlacement = false; pendingPlacements.splice(0).forEach((release) => release()); }
export const API_BASE = '/api';
export const getToken = () => null;
export const setToken = (_value: unknown) => undefined;
const api = axios.create({ adapter: async (config) => {
  const method = (config.method || 'get').toUpperCase();
  const url = config.url || '';
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  const receipt: ApiCall = { method, url, body: structuredClone(body ?? null), completed: false };
  apiCalls.push(receipt);
  const asset = method === 'GET' ? readCanvasAssetFixture(url) : undefined;
  if (asset) {
    receipt.completed = true;
    return { ...asset, status: 200, statusText: 'OK', headers: {}, config };
  }
  let data: unknown;
  if (method === 'GET') {
    if (url === '/palette-colors') data = [];
    else if (url === '/canvas-objects/coordinate-contract') data = { coordinate_contract: 'v2' };
    else if (url === `/notes/${NOTE_ID}`) data = fixtureNote;
    else if (url === `/courses/${fixtureNote.course_id}/summary`) data = { course: { id: fixtureNote.course_id, name: 'Synthetic healing project', skin: null }, goals: [], decks: [], documents: [] };
    else if (url === `/notes/${NOTE_ID}/blocks`) data = fixtureBlocks;
    else if (url === `/canvas-objects/by-note/${NOTE_ID}`) data = canvasPayload();
    else if (url === `/boards/text-ranges/by-note/${NOTE_ID}`) data = { text_ranges: [] };
    else if (url === '/templates') data = templates;
    else if (url === '/boards') data = { boards: [] };
    else if (url === '/content-groups' || url === '/group-folders'
      || url === '/source-anchors' || url === '/purposes'
      || url === `/annotation-truths/by-note/${NOTE_ID}` || url === `/purposes/by-note/${NOTE_ID}`) data = [];
    else throw new Error(`Unmapped memory read: ${method} ${url}`);
  } else if (method === 'POST' && url === '/source-anchors/generate') data = {};
  else if (method === 'PUT' && url === `/canvas-objects/by-note/${NOTE_ID}/page-frame-collection`) {
    if (holdCollection) await new Promise<void>((resolve) => { pendingReleases.push(resolve); });
    storedCollection = structuredClone(body.collection);
    data = storedCollection;
  } else if (method === 'PUT' && url.startsWith(`/canvas-objects/by-note/${NOTE_ID}/block-placements/`)) {
    if (holdPlacement) await new Promise<void>((resolve) => { pendingPlacements.push(resolve); });
    const block = fixtureBlocks.find((item) => url.endsWith(`/${item.placement_id}`));
    if (!block || block.id !== body.block_id) throw new Error('Unknown synthetic block placement');
    block.canvas_layout = structuredClone(body.layout);
    data = { block_id: block.id, placement_id: block.placement_id, layout: block.canvas_layout };
  } else if (method === 'PUT' && url.startsWith('/note-blocks/')) {
    const block = fixtureBlocks.find((item) => url === `/note-blocks/${item.id}`);
    if (!block) throw new Error('Unknown synthetic block');
    Object.assign(block, structuredClone(body));
    data = block;
  } else throw new Error(`Unmapped memory write: ${method} ${url}`);
  receipt.completed = true;
  return { data: structuredClone(data), status: 200, statusText: 'OK', headers: {}, config };
} });
export default api;
