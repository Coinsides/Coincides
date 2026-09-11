// Synthetic D2 browser fixture. All application Axios requests terminate here;
// no database, server, credentials or real notes are used by this adapter.
import { useEffect, useState } from 'react';
import { createHashRouter, createRoutesFromElements, RouterProvider, Route, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import AppLayout from '@/components/Layout/AppLayout';
import ToastContainer from '@/components/Toast/Toast';
import NoteDetailPage from '@/pages/Notes/NoteDetail';
import BoardNoteModal from '@/pages/Boards/BoardNoteModal';
import { ProjectNotesSection } from '@/pages/Courses/CourseDetail';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { createPageFrameCollectionSeed } from '@/pages/Notes/canvasEngine/pageFrameCollectionService';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '@/pages/Notes/canvasEngine/textFlowService';
import type { Note, NoteBlock } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import type { PageFrameCollectionModel } from '@/pages/Notes/canvasEngine/types';

const KEY = 'coincides-d2-synthetic-browser-v1';
const NOW = '2026-09-11T12:00:00.000Z';
const project = { id: 'd2-project', name: 'D2 synthetic project', color: '#756a5c', status: 'active',
  description: 'Synthetic browser evidence only', user_id: 'd2-user', created_at: NOW, updated_at: NOW };

type StoredBlock = NoteBlock & { note_id: string; status: string };
type Fixture = {
  notes: Note[];
  blocks: StoredBlock[];
  collections: Record<string, PageFrameCollectionModel>;
};

function seed(): Fixture {
  const notes: Note[] = [
    { id: 'd2-note', course_id: project.id, title: 'Paper header field notes', description: null, status: 'active', metadata: {} },
    { id: 'd2-existing', course_id: project.id, title: 'Existing note with description',
      description: 'An existing description loaded through the same note row.', status: 'active', metadata: {} },
    { id: 'd2-source', course_id: project.id, title: 'Locked source projection',
      description: 'Source header fields remain read-only.', status: 'active', metadata: {}, note_class: 'source_projection' },
  ];
  const collections = Object.fromEntries(notes.map((note) => [note.id, createPageFrameCollectionSeed({
    id: 'd2-primary-frame', role: 'primary_page_frame', exportable: true,
    x: 84, y: 0, width: 794, height: 1123, pageSize: 'A4',
    contentInset: { left: 72, right: 72, top: 24, bottom: 96 },
  })]));
  const blocks = notes.map((note, index): StoredBlock => {
    const text = index === 0
      ? 'Existing body at stored x = 0 and y = 0. Edit this paragraph, then immediately choose Projects in the navigator to test the save boundary.'
      : 'This is pre-existing body content. Its stored placement stays unchanged when the header is edited or rendered.';
    return {
      id: `d2-block-${index + 1}`, placement_id: `d2-placement-${index + 1}`,
      note_id: note.id, status: 'active', text_save_revision: 0,
      display_overrides_json: {}, block_type: 'text', title: null,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1(text, 'paragraph') },
      plain_text: text, metadata: {}, order_index: 0, source_references: [],
      canvas_layout: {
        x: 0, y: 0, width: 650, height: 120,
        coordinate_space: 'page_frame_local', surface: 'formal_page', frame_id: 'd2-primary-frame', boundary_role: 'inside',
      },
    };
  });
  return { notes, blocks, collections };
}

let fixture: Fixture;
try { fixture = JSON.parse(localStorage.getItem(KEY) || 'null') || seed(); }
catch { fixture = seed(); }
const requests: { method: string; url: string; payload: unknown }[] = [];
let writesToFail = 0;
const persist = () => localStorage.setItem(KEY, JSON.stringify(fixture));
persist();

function rejectRequest(status: number, message: string): never {
  throw Object.assign(new Error(message), { response: { status, data: { error: message } } });
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function blockPatch(value: unknown, atomic = false): Partial<StoredBlock> {
  if (!object(value)) rejectRequest(400, 'Invalid synthetic block patch');
  const allowed = ['block_type', 'title', 'content_json', 'plain_text', 'metadata', ...(atomic ? [] : ['status'])];
  if (atomic && Object.keys(value).some((key) => !allowed.includes(key))) rejectRequest(400, 'Unknown atomic block field');
  const patch = Object.fromEntries(Object.entries(value).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(patch).length) rejectRequest(400, 'No fields to update');
  if ('plain_text' in patch && patch.plain_text !== null && (typeof patch.plain_text !== 'string' || patch.plain_text.length > 20000)) rejectRequest(400, 'Invalid plain_text');
  if ('title' in patch && patch.title !== null && (typeof patch.title !== 'string' || patch.title.length > 300)) rejectRequest(400, 'Invalid block title');
  if ('content_json' in patch && !object(patch.content_json)) rejectRequest(400, 'Invalid content_json');
  if ('metadata' in patch && !object(patch.metadata)) rejectRequest(400, 'Invalid block metadata');
  return patch as Partial<StoredBlock>;
}

api.defaults.adapter = async (config) => {
  const url = new URL(config.url || '', 'http://d2.synthetic');
  // Axios passes config.params separately to a custom adapter. Merge it before
  // reading/logging so recycle requests exercise the same status filter as HTTP.
  if (config.params instanceof URLSearchParams) {
    config.params.forEach((value, key) => url.searchParams.set(key, value));
  } else {
    for (const [key, value] of Object.entries(config.params || {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  const path = url.pathname;
  const method = (config.method || 'get').toLowerCase();
  const payload = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
  requests.push({ method, url: path + url.search, payload: method === 'get' ? null : structuredClone(payload) });
  if (method === 'put' && writesToFail > 0) { writesToFail -= 1; throw new Error('Synthetic D2 write failure'); }
  let data: unknown;
  const noteMatch = path.match(/^\/notes\/([^/]+)$/);
  const noteBlocks = path.match(/^\/notes\/([^/]+)\/blocks$/);
  const canvasMatch = path.match(/^\/canvas-objects\/by-note\/([^/]+)$/);
  const collectionMatch = path.match(/^\/canvas-objects\/by-note\/([^/]+)\/page-frame-collection$/);
  const placementMatch = path.match(/^\/canvas-objects\/by-note\/([^/]+)\/block-placements\/([^/]+)$/);
  const textSave = path.match(/^\/note-blocks\/([^/]+)\/text-save$/);
  const blockMatch = path.match(/^\/note-blocks\/([^/]+)$/);
  if (path === '/canvas-objects/coordinate-contract' && method === 'get') data = { coordinate_contract: 'v2' };
  else if (path === '/courses' && method === 'get') data = [project];
  else if (path === '/notes' && method === 'get') {
    const courseId = url.searchParams.get('course_id');
    const status = url.searchParams.get('status') || 'active';
    if (!courseId) rejectRequest(400, 'course_id query parameter is required');
    if (!['active', 'archived', 'trashed'].includes(status)) rejectRequest(400, 'Invalid status');
    data = fixture.notes.filter((note) => note.course_id === courseId && note.status === status);
  } else if (noteMatch && ['get', 'put', 'delete'].includes(method)) {
    const note = fixture.notes.find((row) => row.id === noteMatch[1]);
    if (!note) throw new Error('Unknown synthetic note');
    if (method === 'put') {
      if ('title' in payload && (typeof payload.title !== 'string' || !payload.title.length || payload.title.length > 300)) rejectRequest(400, 'Invalid note title');
      if ('description' in payload && payload.description !== null && (typeof payload.description !== 'string' || payload.description.length > 2000)) rejectRequest(400, 'Invalid note description');
      if ('metadata' in payload && !object(payload.metadata)) rejectRequest(400, 'Invalid note metadata');
      const patch = Object.fromEntries(Object.entries(payload).filter(([key]) => ['title', 'description', 'metadata', 'page_format', 'status'].includes(key)));
      if (!Object.keys(patch).length) rejectRequest(400, 'No fields to update');
      Object.assign(note, patch);
    }
    if (method === 'delete') note.status = 'trashed';
    data = method === 'delete' ? { message: 'Note moved to trash' } : note;
  } else if (path.endsWith('/restore') && method === 'post') {
    const note = fixture.notes.find((row) => path === `/notes/${row.id}/restore`);
    if (!note) throw new Error('Unknown synthetic note restore');
    note.status = 'active'; data = { message: 'Note restored' };
  } else if (noteBlocks) {
    if (method === 'get') {
      const status = url.searchParams.get('status') || 'active';
      if (!['active', 'trashed'].includes(status)) rejectRequest(400, 'Unsupported note block status');
      data = fixture.blocks.filter((row) => row.note_id === noteBlocks[1] && row.status === status);
    } else if (method === 'post') {
      const block: StoredBlock = { id: `d2-block-created-${fixture.blocks.length + 1}`,
        placement_id: `d2-placement-created-${fixture.blocks.length + 1}`, note_id: noteBlocks[1],
        status: 'active', text_save_revision: 0, title: null, plain_text: '', block_type: 'text',
        display_overrides_json: {}, canvas_layout: null, source_references: [], content_json: {}, metadata: {},
        order_index: fixture.blocks.length, ...payload };
      fixture.blocks.push(block);
      data = { ...block, client_create_receipt: { client_create_key: payload.client_create_key, status: 'applied', reused: false } };
    }
  } else if (canvasMatch && method === 'get') data = {
    pageFrameCollection: fixture.collections[canvasMatch[1]],
    blockLayouts: fixture.blocks.filter((block) => block.note_id === canvasMatch[1]).map((block) => ({
      block_id: block.id, placement_id: block.placement_id, layout: block.canvas_layout,
    })),
    canvasObjects: [], canvasPlacements: [], contentMounts: [], visualConnectors: [], imageObjects: [], structuredObjects: [],
  };
  else if (collectionMatch && method === 'put') {
    fixture.collections[collectionMatch[1]] = payload.collection;
    for (const update of payload.layout_updates || []) {
      const block = fixture.blocks.find((row) => row.placement_id === update.placement_id);
      if (block) block.canvas_layout = update.layout;
    }
    data = payload.collection;
  } else if (placementMatch && method === 'put') {
    const block = fixture.blocks.find((row) => row.placement_id === placementMatch[2]);
    if (!block) throw new Error('Unknown synthetic placement');
    block.canvas_layout = payload.layout;
    data = { block_id: block.id, placement_id: block.placement_id, layout: block.canvas_layout };
  } else if (textSave && method === 'put') {
    const block = fixture.blocks.find((row) => row.id === textSave[1]);
    if (!block) throw new Error('Unknown synthetic text block');
    if (payload.note_id !== block.note_id) rejectRequest(404, 'Note block not found');
    if (!Number.isSafeInteger(payload.base_revision) || payload.base_revision < 0) rejectRequest(400, 'Invalid base_revision');
    if (payload.base_revision !== block.text_save_revision) rejectRequest(409, 'stale_revision');
    if (!Array.isArray(payload.annotations?.range_updates) || !Array.isArray(payload.text_ranges)) rejectRequest(400, 'Missing atomic range changesets');
    // This fixture seeds no anchors. Refuse unsupported nonempty changesets
    // rather than acknowledge ranges that were never persisted.
    if (payload.annotations.range_updates.length || payload.text_ranges.length) rejectRequest(400, 'Synthetic fixture has no matching anchor rows');
    const patch = blockPatch(payload.block, true);
    if (patch.metadata) patch.metadata = { ...block.metadata, ...patch.metadata };
    Object.assign(block, patch, { text_save_revision: payload.base_revision + 1 });
    data = { block, annotations: [], text_ranges: [], revision: block.text_save_revision };
  } else if (blockMatch && ['put', 'delete'].includes(method)) {
    const block = fixture.blocks.find((row) => row.id === blockMatch[1]);
    if (!block) throw new Error('Unknown synthetic block');
    if (method === 'put') {
      const patch = blockPatch(payload);
      if (patch.metadata) patch.metadata = { ...block.metadata, ...patch.metadata };
      const restoreOnly = Object.keys(patch).length === 1 && patch.status === 'active';
      Object.assign(block, patch, { text_save_revision: (block.text_save_revision || 0) + (restoreOnly ? 0 : 1) });
    }
    if (method === 'delete') block.status = 'trashed';
    data = method === 'delete' ? { message: 'Note block moved to trash' } : block;
  } else if (path.startsWith('/boards/text-ranges/by-note/') && method === 'get') data = { text_ranges: [] };
  else if (path.startsWith('/annotation-truths/by-note/') && method === 'get') data = [];
  else if (path === '/source-anchors/generate' && method === 'post') data = {};
  else if (['/tags', '/templates', '/purposes', '/content-groups', '/group-folders', '/source-anchors', '/items', '/items/anchors', '/relations', '/relations/types', '/boards'].includes(path) && method === 'get') data = [];
  else throw new Error(`Unimplemented synthetic request (never forwarded): ${method.toUpperCase()} ${path}`);
  if (data === undefined) throw new Error(`Unimplemented synthetic method: ${method.toUpperCase()} ${path}`);
  if (method !== 'get') persist();
  return { data: structuredClone(data), status: 200, statusText: 'OK', headers: {}, config };
};

useAuthStore.setState({ token: null, user: null });
useUIStore.setState({ sidebarOpen: true });

function SyntheticProject() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<'active' | 'trashed'>('active');
  const [modalNoteId, setModalNoteId] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const refresh = async () => { const result = await api.get(`/notes?course_id=${project.id}&status=${status}`); setNotes(result.data); };
  useEffect(() => { void refresh(); }, [status, modalNoteId]);
  return <section style={{ padding: 32, overflow: 'auto', height: '100%' }}>
    <h1>D2 synthetic project</h1>
    <p>Production note runtime, navigator, note list and modal. Every request uses synthetic rows stored only in this browser.</p>
    <div style={{ display: 'flex', gap: 12, margin: '20px 0' }}>
      <button onClick={() => setModalNoteId('d2-note')}>Open first note in modal</button>
      <button onClick={() => { fixture = seed(); requests.length = 0; persist(); void refresh(); }}>Reset synthetic rows</button>
      <button onClick={() => { writesToFail = 1; }}>Fail next synthetic write</button>
      <button onClick={() => { writesToFail = 3; }}>Fail next 3 synthetic saves</button>
      <button onClick={() => setShowEvidence(!showEvidence)}>Inspect synthetic saved rows</button>
    </div>
    <ProjectNotesSection notes={notes.map((note) => ({ ...note, updated_at: NOW, block_count: 1 }))}
      status={status} onStatusChange={setStatus} onCreateNote={() => navigate('/notes/d2-note')}
      onOpenNote={(id) => navigate(`/notes/${id}`)} refreshNotes={refresh}
      addToast={useUIStore.getState().addToast} />
    {showEvidence && <pre data-d2-saved-evidence style={{ whiteSpace: 'pre-wrap', marginTop: 24 }}>
      {JSON.stringify({ storage_key: KEY, notes: fixture.notes, blocks: fixture.blocks, collections: fixture.collections,
        requests: requests.filter((request) => request.method !== 'get') }, null, 2)}
    </pre>}
    {modalNoteId && <BoardNoteModal noteId={modalNoteId} onClosed={() => setModalNoteId(null)}
      onOpenFullPage={(id) => { setModalNoteId(null); navigate(`/notes/${id}`); }} onSwitchNote={setModalNoteId} />}
  </section>;
}

const router = createHashRouter(createRoutesFromElements(
  <Route element={<AppLayout />}>
    <Route path="/notes/:noteId" element={<NoteDetailPage />} />
    <Route path="*" element={<SyntheticProject />} />
  </Route>,
));

export function D2BrowserFixture() {
  return <><RouterProvider router={router} /><ToastContainer /></>;
}
