import { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import api from '@/services/api';
import {
  createBlockEditRecoveryKey,
  forgetBlockEditRecoveryReceipt,
  listBlockEditRecoveryReceipts,
  rememberBlockEditRecoveryReceipt,
  type BlockEditRecoveryReceipt,
} from '@/pages/Notes/canvasEngine/draftBlockPersistence';
import { useNoteCanvasDataAdapter } from '@/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter';
import { BlockEditRecoveryQueue } from '@/pages/Notes/canvasEngine/layers/BlockEditRecoveryQueue';
import type { Note, NoteBlock } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '@/pages/Notes/canvasEngine/textFlowService';

// Browser-only synthetic transport. All API requests, including unexpected paths,
// terminate here; this harness never contacts the Coincides API or user data.
type Scenario = 'stale' | 'discard' | 'unavailable503' | 'second-conflict';
interface RequestLog {
  sequence: number;
  method: string;
  url: string;
  status: number;
  payload: unknown;
  serverRevision: number;
}

const NOTE_ID = 'f19-synthetic-note';
const BLOCK_ID = 'f19-synthetic-block';
const CURRENT_TEXT = 'Current text saved elsewhere at revision 9.';
const DRAFT_TEXT = 'Recovered draft: retain this carefully written text.';
const RACE_TEXT = 'Another editor saved again while replay was in flight.';
const note: Note = {
  id: NOTE_ID, course_id: '', title: 'F19 synthetic recovery',
  description: null, status: 'active', metadata: {},
};
const noop = () => undefined;
const adapterOptions = {
  noteId: NOTE_ID, onNoteLoaded: noop,
  clearLayoutDraftForBlock: noop, setLayoutDraftForBlock: noop,
};
const listeners = new Set<() => void>();
let dataVersion = 0;
let scenario: Scenario = 'stale';
let requestLog: RequestLog[] = [];
let saveAttempts = 0;
let serverBlock: NoteBlock;
let readAdapterSnapshot: () => unknown = () => null;

function publish() {
  dataVersion += 1;
  listeners.forEach((listener) => listener());
}

function makeBlock(text: string, revision: number): NoteBlock {
  return {
    id: BLOCK_ID, placement_id: 'f19-synthetic-placement', display_overrides_json: {},
    canvas_layout: null, block_type: 'text', title: null,
    content_json: { [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1(text) },
    plain_text: text, metadata: {}, order_index: 0, source_references: [],
    text_save_revision: revision,
  };
}

function resetScenario(next: Scenario) {
  scenario = next;
  requestLog = [];
  saveAttempts = 0;
  serverBlock = makeBlock(CURRENT_TEXT, 9);
  // Only this synthetic note's receipts are replaced; unrelated storage is untouched.
  listBlockEditRecoveryReceipts(NOTE_ID).forEach((receipt) => {
    forgetBlockEditRecoveryReceipt(receipt.recoveryKey);
  });
  const textFlow = createTextBlockContentV1(DRAFT_TEXT);
  const receipt: BlockEditRecoveryReceipt = {
    version: 2, kind: 'block_edit_recovery',
    recoveryKey: createBlockEditRecoveryKey(NOTE_ID, BLOCK_ID, 0, 1, 'f19-old-mount'),
    noteId: NOTE_ID, requestedNoteId: NOTE_ID, blockId: BLOCK_ID,
    mountNonce: 'f19-old-mount', creationGeneration: 0, operationSequence: 1,
    text: DRAFT_TEXT, plainText: DRAFT_TEXT,
    contentJson: { [TEXT_FLOW_CONTENT_KEY]: textFlow }, textFlow,
    baseRevision: next === 'unavailable503' ? 9 : 3,
    annotationRanges: [], boardRangeSnapshot: { ranges: [] },
    hydrationEpoch: 0, queuedAt: '2026-09-11T12:00:00.000Z',
  };
  if (!rememberBlockEditRecoveryReceipt(receipt)) throw new Error('Synthetic recovery receipt could not be persisted');
  publish();
}

api.defaults.adapter = async (config) => {
  const url = config.url ?? '';
  const method = (config.method ?? 'get').toUpperCase();
  const payload: any = typeof config.data === 'string' ? JSON.parse(config.data) : config.data ?? null;
  function respond(data: unknown, status = 200) {
    const response = { data: structuredClone(data), status, statusText: String(status), headers: {}, config };
    requestLog.push({ sequence: requestLog.length + 1, method, url, status,
      payload: structuredClone(payload), serverRevision: serverBlock.text_save_revision! });
    publish();
    if (status >= 400) throw Object.assign(new Error(`Synthetic ${status}`), { response });
    return response;
  }
  if (method === 'GET') {
    if (url === `/notes/${NOTE_ID}`) return respond(note);
    if (url === `/notes/${NOTE_ID}/blocks`) return respond([serverBlock]);
    if (url === '/canvas-objects/coordinate-contract') return respond({ coordinate_contract: 'v1' });
    if (url === `/canvas-objects/by-note/${NOTE_ID}`) return respond({});
    if (url === `/boards/text-ranges/by-note/${NOTE_ID}`) return respond({ text_ranges: [] });
    if (url === `/annotation-truths/by-note/${NOTE_ID}`) return respond([]);
    if (['/content-groups', '/group-folders', '/purposes', '/templates'].includes(url)) return respond([]);
  }
  if (method === 'PUT' && url === `/note-blocks/${BLOCK_ID}/text-save`) {
    saveAttempts += 1;
    if (scenario === 'unavailable503' && saveAttempts === 1) {
      return respond({ error: 'synthetic_service_unavailable' }, 503);
    }
    if (scenario === 'second-conflict' && saveAttempts === 2) {
      serverBlock = makeBlock(RACE_TEXT, serverBlock.text_save_revision! + 1);
    }
    // Strict OCC in this mock: matching current revision is required on every request.
    if (payload.note_id !== NOTE_ID || payload.base_revision !== serverBlock.text_save_revision) {
      return respond({ error: 'stale_revision', details: { code: 'stale_revision',
        current_revision: serverBlock.text_save_revision } }, 409);
    }
    const revision = serverBlock.text_save_revision! + 1;
    serverBlock = { ...serverBlock, ...structuredClone(payload.block), text_save_revision: revision };
    return respond({ block: serverBlock, annotations: [], text_ranges: [], revision });
  }
  return respond({ error: `Unexpected synthetic request: ${method} ${url}` }, 500);
};

Object.defineProperty(window, '__f19Smoke', {
  configurable: true,
  get: () => structuredClone({
    scenario, server: { body: serverBlock.plain_text, revision: serverBlock.text_save_revision, block: serverBlock },
    requests: requestLog,
    saves: requestLog.filter((request) => request.method === 'PUT'),
    receipts: listBlockEditRecoveryReceipts(NOTE_ID),
    adapter: readAdapterSnapshot(),
    expected: { currentText: CURRENT_TEXT, draftText: DRAFT_TEXT, raceText: RACE_TEXT },
  }),
});

function RecoverySurface() {
  const adapter = useNoteCanvasDataAdapter(adapterOptions);
  useEffect(() => {
    readAdapterSnapshot = () => ({ loading: adapter.loading,
      blocks: adapter.blocks,
      receipts: adapter.blockEditRecoveryReceipts,
      conflicts: adapter.blockEditRecoveryConflicts });
  });
  // Dismiss and the post-save receipt removal have no API request of their own.
  // Notify the evidence panel after these local adapter state changes as well.
  useEffect(() => {
    publish();
  }, [adapter.loading, adapter.blocks, adapter.blockEditRecoveryReceipts.length]);
  if (adapter.loading) return <p role="status">Loading the synthetic note…</p>;
  return <section aria-label="Real recovery queue">
    <BlockEditRecoveryQueue
      receipts={adapter.blockEditRecoveryReceipts}
      conflicts={adapter.blockEditRecoveryConflicts}
      onApply={adapter.applyBlockEditRecovery}
      onDismiss={adapter.dismissBlockEditRecovery}
      onInspect={adapter.inspectBlockEditRecovery}
      onReplay={adapter.replayBlockEditRecovery}
    />
    {adapter.blockEditRecoveryReceipts.length === 0 && <p role="status">No recovery drafts remain.</p>}
    <p>Adapter body: <span data-testid="adapter-body">{adapter.blocks[0]?.plain_text ?? '(loading)'}</span></p>
  </section>;
}

function Fixture() {
  const [mount, setMount] = useState(0);
  useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => dataVersion);
  const saves = requestLog.filter((request) => request.method === 'PUT');
  return <main>
    <style>{`
      :root { color-scheme: light; --text-primary:#222; --text-secondary:#555; --bg-primary:#fff;
        --warning:#b8841b; --warning-bg:#fff8df; --border-default:#c8c8c8;
        --accent-primary:#244ea1; --radius-sm:4px; --radius-md:7px; }
      * { box-sizing:border-box; } body { margin:0; background:#f5f5f2; color:#222; font:15px/1.5 system-ui,sans-serif; }
      main { max-width:1120px; margin:32px auto; padding:0 24px; } h1 { font-size:25px; margin-bottom:4px; }
      h2 { font-size:17px; margin:0 0 8px; } .intro { color:#555; margin-top:0; }
      .controls { display:flex; flex-wrap:wrap; gap:8px; margin:20px 0; }
      .controls button { font:inherit; padding:7px 10px; border:1px solid #aaa; border-radius:4px; background:#fff; cursor:pointer; }
      .controls button[aria-pressed=true] { background:#e7eefc; border-color:#244ea1; }
      .evidence { padding:16px; margin-top:20px; border:1px solid #ccc; background:#fff; }
      .evidence p { margin:6px 0; } pre { margin:8px 0 0; white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; }
      code { font-size:13px; }
    `}</style>
    <h1>F19 · Recovery conflict smoke</h1>
    <p className="intro">Synthetic data · real adapter and recovery component · browser-only API transport</p>
    <div className="controls" aria-label="Synthetic scenario controls">
      {(['stale', 'discard', 'unavailable503', 'second-conflict'] as const).map((next) =>
        <button key={next} type="button" aria-pressed={scenario === next} onClick={() => {
          resetScenario(next); setMount((value) => value + 1);
        }}>Reset {next}</button>)}
      <button type="button" onClick={() => setMount((value) => value + 1)}>Remount persisted queue</button>
    </div>
    <MemoryRouter><RecoverySurface key={mount} /></MemoryRouter>
    <section className="evidence" aria-label="Synthetic server state">
      <h2>Current synthetic server state</h2>
      <p>Scenario: <strong>{scenario}</strong> · Revision: <strong data-testid="server-revision">{serverBlock.text_save_revision}</strong></p>
      <p data-testid="server-body">{serverBlock.plain_text}</p>
      <p>Saved requests: <strong>{saves.length}</strong> · Statuses: <strong>{saves.map((request) => request.status).join(' → ') || 'none'}</strong></p>
      <p>Stored recovery entries: <strong>{listBlockEditRecoveryReceipts(NOTE_ID).length}</strong></p>
    </section>
    <section className="evidence" aria-label="Text save request log">
      <h2>Text-save payloads and responses</h2>
      <p>All requests and state are available through <code>window.__f19Smoke</code>.</p>
      <pre data-testid="save-log">{JSON.stringify(saves, null, 2)}</pre>
    </section>
  </main>;
}

resetScenario('stale');
createRoot(document.getElementById('root')!).render(<Fixture />);
