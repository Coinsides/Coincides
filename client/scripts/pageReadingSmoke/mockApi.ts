import axios from 'axios';
import { listNoteBlockTemplates, legacyBlockTypeForTemplate } from '@shared/types';
import type { Note, NoteBlock } from '../../src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { PageFrameModel } from '../../src/pages/Notes/canvasEngine/types';
import { createPageFramePrintProfile } from '../../src/pages/Notes/canvasEngine/pageFramePrintScaleService';
import { createPrintSpecimen, PRINT_NOTE_ID } from './printSpecimen';
import { createOverviewSpecimen, OVERVIEW_NOTE_ID } from './overviewSpecimen';

const isPrintFixture = typeof window !== 'undefined' && window.location.pathname.endsWith('/print.html');
const isTrayFixture = typeof window !== 'undefined' && window.location.pathname.endsWith('/tray.html');
const isOverviewFixture = typeof window !== 'undefined' && window.location.pathname.endsWith('/overview.html');
const overviewParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const overviewPageCount = Number(overviewParams?.get('pages'));
export const overviewSpecimen = createOverviewSpecimen(overviewPageCount === 1 || overviewPageCount === 4 ? overviewPageCount : 9, overviewParams?.get('long') === '1', overviewParams?.get('blank') === '1');
const requestedPaper = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('paper') : null;
export const printSpecimen = createPrintSpecimen(requestedPaper === 'Letter' || requestedPaper === 'web' ? requestedPaper : 'A4');
export const NOTE_ID = isOverviewFixture ? OVERVIEW_NOTE_ID : isPrintFixture ? PRINT_NOTE_ID : 'page-reading-smoke-note';
const FRAME_ID = 'page-reading-smoke-a4';
const print = createPageFramePrintProfile('A4');
export const fixtureFrame: PageFrameModel = {
  id: FRAME_ID,
  role: 'primary_page_frame',
  templateId: 'a4_portrait',
  pageSize: 'A4',
  exportable: true,
  x: 0,
  y: 0,
  width: print.width,
  height: print.height,
  contentInset: { ...print.contentInset },
};
export const fixtureNote: Note = {
  id: NOTE_ID,
  course_id: 'page-reading-smoke-project',
  title: '13.1 reading gears — isolated browser specimen',
  description: null,
  status: 'active',
  note_class: 'user',
  source_kind: 'manual',
  metadata: {},
};
export const fixtureBlocks: NoteBlock[] = [
  'A fixed page layout stays fixed while the reading scale changes.',
  'This second block gives the smoke an independent geometry check.',
  'Canvas visits before and after the reading gears must agree.',
].map((text, index) => ({
  id: `reading-block-${index + 1}`,
  placement_id: `reading-placement-${index + 1}`,
  display_overrides_json: {},
  block_type: 'text',
  title: null,
  content_json: { body: text },
  plain_text: text,
  metadata: { template_id: 'text.paragraph' },
  order_index: index,
  source_references: [],
  canvas_layout: {
    x: 0,
    y: 40 + index * 180,
    width: 760,
    height: 120,
    coordinate_space: 'page_frame_local',
    frame_id: FRAME_ID,
    surface: 'formal_page',
    boundary_role: 'inside',
    surface_authority: {
      coordinateSpace: 'page_frame_local',
      pageBoundary: { left: 0, right: 760, frameId: FRAME_ID },
    },
  },
}));
const fixtureCanvas = {
  canvasObjects: [], canvasPlacements: [], contentMounts: [], visualConnectors: [],
  imageObjects: [], structuredObjects: [],
  pageFrameCollection: {
    pageFrames: [fixtureFrame], primaryFrameId: FRAME_ID, selectedFrameId: FRAME_ID,
  },
  blockLayouts: fixtureBlocks.map((block) => ({
    block_id: block.id, placement_id: block.placement_id, layout: block.canvas_layout,
  })),
};
const templates = listNoteBlockTemplates().map((template) => ({
  id: `smoke-template-${template.template_id}`,
  template_key: template.template_id,
  version: '1.0.0',
  origin: 'system_seed',
  label: template.label,
  description: template.description,
  system_type: template.system_type,
  learning_role: template.learning_role,
  legacy_block_type: legacyBlockTypeForTemplate(template.template_id),
  default_content: template.default_content,
  status: 'active',
}));

export const apiCalls: Array<{ method: string; url: string }> = [];
export const API_BASE = '/api';
export const getToken = () => null;
export const setToken = (_value: unknown) => undefined;
const api = axios.create({
  adapter: async (config) => {
    const method = (config.method || 'get').toUpperCase();
    const url = config.url || '';
    apiCalls.push({ method, url });
    if (isTrayFixture && (url.startsWith('/notes/') || url.startsWith('/canvas-objects/') || url.startsWith('/note-blocks/'))) {
      const response = await fetch(`/api${url}`, {
        method, headers: { 'content-type': 'application/json' },
        body: method === 'GET' ? undefined : config.data,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Synthetic tray API failed: ${response.status}`);
      return { data, status: response.status, statusText: response.statusText, headers: {}, config };
    }
    let data: unknown;
    if (method !== 'GET' && url !== '/source-anchors/generate') {
      // The specimen is read-only. Keep attempted mutations visible to the smoke.
      throw new Error(`Unexpected fixture mutation: ${method} ${url}`);
    }
    if ((isPrintFixture || isOverviewFixture) && url === '/canvas-objects/coordinate-contract') data = { coordinate_contract: 'v2' };
    else if (url === `/notes/${NOTE_ID}`) data = isOverviewFixture ? overviewSpecimen.note : isPrintFixture ? printSpecimen.note : fixtureNote;
    else if (['/courses/page-reading-smoke-project/summary', '/courses/page-print-smoke-project/summary', '/courses/overview-smoke-project/summary', '/courses/tray-smoke-course/summary'].includes(url)) data = { course: { id: url.split('/')[2], name: 'Synthetic reading project', skin: null }, goals: [], decks: [], documents: [] };
    else if (url === `/notes/${NOTE_ID}/blocks`) data = isOverviewFixture ? overviewSpecimen.blocks : isPrintFixture ? printSpecimen.blocks : fixtureBlocks;
    else if (url === `/boards/text-ranges/by-note/${NOTE_ID}`) data = { text_ranges: [] };
    else if (url === `/canvas-objects/by-note/${NOTE_ID}`) data = isOverviewFixture ? overviewSpecimen.canvas : isPrintFixture ? printSpecimen.canvas : fixtureCanvas;
    else if (url === '/templates') data = templates;
    else if (url === '/source-anchors/generate') data = {};
    else if ((isTrayFixture && (url.startsWith('/annotation-truths/by-note/') || url.startsWith('/purposes/by-note/')))
      || url === '/content-groups' || url === '/group-folders' || url === '/source-anchors' || url === '/purposes'
      || url === `/annotation-truths/by-note/${NOTE_ID}` || url === `/purposes/by-note/${NOTE_ID}`) data = [];
    else throw new Error(`Unmapped fixture request: ${method} ${url}`);
    return { data: structuredClone(data), status: 200, statusText: 'OK', headers: {}, config };
  },
});
export default api;
