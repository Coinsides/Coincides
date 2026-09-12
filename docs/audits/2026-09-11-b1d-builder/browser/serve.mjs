// Run from server/: node --import tsx ../docs/audits/2026-09-11-b1d-builder/serve.mjs
// Actual human routes/components over a disposable database; no application bootstrap.
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { baselinePlugin } from './sourceModes.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../../client/node_modules/vite/dist/node/index.js';
import react from '../../../../client/node_modules/@vitejs/plugin-react/dist/index.js';

const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../../..');
const scratch = resolve(root, '.codex-tmp/b1d-browser');
mkdirSync(scratch, { recursive: true });
const run = mkdtempSync(resolve(scratch, 'run-'));
const database = resolve(run, 'fixture.sqlite');
process.env.DB_PATH = database;
process.env.CANVAS_ASSET_DIR = resolve(run, 'canvas-assets');
process.env.SOURCE_BLOB_DIR = resolve(run, 'source-blobs');
mkdirSync(process.env.CANVAS_ASSET_DIR, { recursive: true });
mkdirSync(process.env.SOURCE_BLOB_DIR, { recursive: true });

const { initDb, getDb, closeDb } = await import('../../../../server/src/db/init.ts');
const { createBoardRouter } = await import('../../../../server/src/routes/boards.ts');
const { errorHandler } = await import('../../../../server/src/middleware/errorHandler.ts');
const { createBoard, mountBoardMember } = await import('../../../../server/src/services/boards.ts');
const { createBoardCeremonyNote } = await import('../../../../server/src/services/boardCeremonyNote.ts');
const { getNoteCanvasPersistence } = await import('../../../../server/src/services/canvasObjects.ts');
const require = createRequire(new URL('../../../../server/package.json', import.meta.url));
const express = require('express');
await initDb(database);

const OWNER = 'b1d00000-0000-4000-8000-000000000001';
const PROJECT = 'b1d00000-0000-4000-8000-000000000002';
const now = '2026-09-11T12:00:00.000Z';
const db = getDb();
// Like paperInkSmoke/startInk.mjs, opt this newly created empty fixture into v2.
// This runs before any synthetic note/placement exists; no stored data is migrated.
if (db.prepare('SELECT COUNT(*) AS count FROM notes').get().count !== 0) {
  throw new Error('B1d coordinate setup requires a newly created empty fixture database.');
}
db.prepare("INSERT INTO database_meta (key, value) VALUES ('coordinate_contract', 'v2')").run();
db.prepare("INSERT INTO users(id,email,password_hash,name,settings) VALUES (?, 'b1d@example.invalid','synthetic','B1d builder',?)")
  .run(OWNER, JSON.stringify({ theme: 'dark', skin: null }));
db.prepare('INSERT INTO courses(id,user_id,name,color,created_at,updated_at) VALUES (?,?,?,?,?,?)')
  .run(PROJECT, OWNER, 'Material study', '#756a5c', now, now);
const frame = {
  id: 'b1d-legacy-primary-frame', role: 'primary_page_frame', templateId: 'a4_portrait',
  exportable: true, x: 84, y: 0, width: 904, height: 1278, pageSize: 'A4',
  contentInset: { left: 72, right: 72, top: 0, bottom: 96 },
};
const seeded = db.transaction(() => {
  const { board } = createBoard(db, OWNER, {
    title: 'Paper presets · Board', project_id: PROJECT,
    purpose: { title: 'Compare paper formats' }, viewport: { x: 40, y: 20, zoom: 1 },
  });
  // Intentionally omit page_format: this historical fixture keeps legacy "flow".
  const { note } = createBoardCeremonyNote(db, OWNER, board.id, {
    title: 'Power series & the champion', project_id: PROJECT,
    collection: { pageFrames: [frame], primaryFrameId: frame.id },
  });
  const member = mountBoardMember(db, OWNER, board.id, {
    member_kind: 'note', member_id: note.id, x: 100, y: 110, w: 320, h: 180, z_index: 1,
  }).member;
  return { boardId: board.id, projectId: PROJECT, legacyNoteId: note.id, memberId: member.id };
})();

const requests = [];
let legacyBaseline = null;
const readNote = (noteId) => ({
  note: getDb().prepare('SELECT * FROM notes WHERE id=? AND user_id=?').get(noteId, OWNER),
  canvas: getNoteCanvasPersistence(getDb(), OWNER, noteId),
});
const state = () => ({
  syntheticOnly: true, database, run, ...seeded, legacyBaseline,
  user: getDb().prepare('SELECT id,name,settings FROM users WHERE id=?').get(OWNER),
  project: getDb().prepare('SELECT * FROM courses WHERE id=?').get(PROJECT),
  board: getDb().prepare('SELECT * FROM boards WHERE id=?').get(seeded.boardId),
  notes: getDb().prepare('SELECT id FROM notes WHERE user_id=? ORDER BY created_at,id').all(OWNER)
    .map(({ id }) => readNote(id)),
  requests,
});
const app = express();
app.use(express.json());
app.get('/__fixture/bootstrap', (_req, res) => res.json({
  ...seeded, user: { id: OWNER, name: 'B1d builder', email: 'b1d@example.invalid',
    settings: JSON.parse(getDb().prepare('SELECT settings FROM users WHERE id=?').get(OWNER).settings) },
}));
app.get('/__fixture/state', (_req, res) => res.json(state()));
app.post('/__fixture/reopen', async (_req, res, next) => {
  try { closeDb(); await initDb(database); res.json(state()); } catch (error) { next(error); }
});
app.use('/api', (req, res, next) => {
  req.userId = OWNER;
  const method = req.method;
  const path = req.originalUrl;
  const body = structuredClone(req.body);
  res.once('finish', () => requests.push({ method, path, status: res.statusCode,
    ...(Object.keys(body || {}).length ? { body } : {}) }));
  next();
});
for (const [path, module] of [
  ['settings', 'settings'], ['courses', 'courses'], ['notes', 'notes'], ['note-blocks', 'noteBlocks'],
  ['canvas-objects', 'canvasObjects'], ['canvas-assets', 'canvasAssets'],
  ['annotation-truths', 'annotationTruths'], ['content-groups', 'contentGroups'],
  ['group-folders', 'groupFolders'], ['purposes', 'purposes'], ['source-anchors', 'sourceAnchors'],
  ['templates', 'templates'], ['items', 'items'], ['tags', 'tags'], ['tag-groups', 'tagGroups'],
  ['course-materials', 'courseMaterials'], ['material-segments', 'materialSegments'],
  ['reconciliation', 'reconciliation'], ['source-snapshots', 'sourceSnapshots'],
  ['source-scopes', 'sourceScopes'], ['source-boards', 'sourceBoards'],
  ['source-board-nodes', 'sourceBoardNodes'], ['sources', 'sources'], ['relations', 'relations'],
]) app.use(`/api/${path}`, (await import(`../../../../server/src/routes/${module}.ts`)).default);
app.use('/api/boards', createBoardRouter(getDb));
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown synthetic fixture request', path: req.originalUrl }));
app.use(errorHandler);

const server = await createServer({
  configFile: false, envFile: false, root: audit,
  plugins: [{ name: 'b1d-real-human-routes', configureServer(vite) { vite.middlewares.use(app); } }, react()],
  resolve: { alias: {
    '@': resolve(root, 'client/src'), '@shared': resolve(root, 'shared'),
    'react-dom': resolve(root, 'client/node_modules/react-dom'),
    'react-router-dom': resolve(root, 'client/node_modules/react-router-dom'),
    react: resolve(root, 'client/node_modules/react'), 'lucide-react': resolve(root, 'client/node_modules/lucide-react'),
  } },
  server: { host: '127.0.0.1', port: 5200, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const seededBody = await fetch(`http://127.0.0.1:5200/api/notes/${seeded.legacyNoteId}/blocks`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ block_type: 'paragraph', plain_text: 'POWER SERIES — A working definition. A power series is a sum of powers centred at a fixed point. Its interval of convergence describes where the series settles to a finite value.' }),
});
if (!seededBody.ok) throw new Error(`Legacy body seed failed: ${await seededBody.text()}`);

for (const plain_text of [
  'Inside the radius, the series converges absolutely. Outside it, the terms cannot settle. Check each endpoint separately.',
  'THE CHAMPION PRINCIPLE — Find the term that governs the limit. Divide by that term, then let the smaller contributions disappear.',
  'A useful question: what remains unchanged when the representation changes? The content and its coordinates stay fixed while the paper takes on a different material.',
]) {
  const response = await fetch('http://127.0.0.1:5200/api/notes/' + seeded.legacyNoteId + '/blocks', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ block_type: 'paragraph', plain_text }),
  });
  if (!response.ok) throw new Error(await response.text());
}
const description = await fetch('http://127.0.0.1:5200/api/notes/' + seeded.legacyNoteId, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: 'A quiet place for definitions, useful tests, and the ideas worth keeping.' }),
});
if (!description.ok) throw new Error(await description.text());
legacyBaseline = structuredClone(readNote(seeded.legacyNoteId));
if (legacyBaseline.note.page_format !== 'flow') throw new Error('Legacy seed must keep flow page_format.');
writeFileSync(resolve(audit, 'browser-seed.json'), JSON.stringify(state(), null, 2));
console.log('B1d isolated browser ready: http://127.0.0.1:5200');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  await server.close(); closeDb(); process.exit(0);
});

for (const [mode, port] of [['baseline', 5202], ['header-baseline', 5203]]) {
  const companion = await createServer({
    configFile: false, envFile: false, root: audit,
    plugins: [baselinePlugin(root, audit, mode), react()],
    resolve: { alias: {
      '@': resolve(root, 'client/src'), '@shared': resolve(root, 'shared'),
      'react-dom': resolve(root, 'client/node_modules/react-dom'),
      'react-router-dom': resolve(root, 'client/node_modules/react-router-dom'),
      react: resolve(root, 'client/node_modules/react'), 'lucide-react': resolve(root, 'client/node_modules/lucide-react'),
    } },
    server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [root] },
      proxy: { '/api': 'http://127.0.0.1:5200', '/__fixture': 'http://127.0.0.1:5200' } },
  });
  await companion.listen();
  console.log(mode + ': http://127.0.0.1:' + port);
}
