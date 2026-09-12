// From server/: node --import tsx ../docs/audits/2026-09-11-b1b-builder/serve.mjs
// Real human routes, real page components, disposable SQLite. No app database.
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../client/node_modules/vite/dist/node/index.js';
import react from '../../../client/node_modules/@vitejs/plugin-react/dist/index.js';
import { initDb, getDb, closeDb } from '../../../server/src/db/init.ts';
import { createBoardRouter } from '../../../server/src/routes/boards.ts';
import { errorHandler } from '../../../server/src/middleware/errorHandler.ts';
import { createBoard, createBoardLayer, mountBoardMember, createBoardEdge, createBoardVisual } from '../../../server/src/services/boards.ts';
import { createBoardCeremonyNote } from '../../../server/src/services/boardCeremonyNote.ts';
import { createItem } from '../../../server/src/services/items.ts';
import { createBoardViewportBookmark } from '../../../server/src/services/boardViewportBookmarks.ts';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const require = createRequire(new URL('../../../server/package.json', import.meta.url));
const express = require('express');
const parent = resolve(root, '.codex-tmp/b1b-browser'); mkdirSync(parent, { recursive: true });
const database = resolve(mkdtempSync(resolve(parent, 'run-')), 'fixture.sqlite');
await initDb(database);
const OWNER = 'b1b00000-0000-4000-8000-000000000001';
const PROJECT = 'b1b00000-0000-4000-8000-000000000002';
const now = '2026-09-11T12:00:00.000Z';
const db = getDb();
db.prepare("INSERT INTO users(id,email,password_hash,name,settings) VALUES (?, 'b1b@example.invalid','synthetic','B1b reviewer',?)").run(OWNER, JSON.stringify({ theme: 'dark', skin: null }));
db.prepare('INSERT INTO courses(id,user_id,name,color,created_at,updated_at) VALUES (?,?,?, ?,?,?)').run(PROJECT, OWNER, 'Field notes', '#756a5c', now, now);
const initialViewport = { x: 40, y: 20, zoom: 1 };
const frame = { id: 'b1b-primary-frame', role: 'primary_page_frame', exportable: true, x: 84, y: 0, width: 794, height: 1123, pageSize: 'A4', contentInset: { left: 72, right: 72, top: 24, bottom: 96 } };
const seeded = db.transaction(() => {
  const { board } = createBoard(db, OWNER, { title: 'Field notes · Board skins', project_id: PROJECT, purpose: { title: 'Compare observations' }, viewport: initialViewport });
  const { note } = createBoardCeremonyNote(db, OWNER, board.id, { title: 'A field guide to careful observation', project_id: PROJECT, collection: { pageFrames: [frame], primaryFrameId: frame.id } });
  const first = mountBoardMember(db, OWNER, board.id, { member_kind: 'note', member_id: note.id, x: 100, y: 110, w: 300, h: 160, z_index: 1 }).member;
  const item = createItem(db, OWNER, { plain_text: 'Compare the evidence before drawing a conclusion.', item_type: 'Observation', topic: 'Field study' });
  const second = mountBoardMember(db, OWNER, board.id, { member_kind: 'item', member_id: item.id, x: 650, y: 140, w: 300, h: 180, z_index: 2 }).member;
  createBoardEdge(db, OWNER, board.id, { from_member_id: first.id, to_member_id: second.id, label: 'Compare evidence' });
  createBoardVisual(db, OWNER, board.id, { visual_kind: 'sticky', x: 350, y: 450, w: 310, h: 100, data: { text: 'What would change this conclusion?' } });
  createBoardVisual(db, OWNER, board.id, { visual_kind: 'freehand', x: 170, y: 360, w: 700, h: 40, data: { points: [{ x: 0, y: 20 }, { x: 120, y: 0 }, { x: 330, y: 35 }, { x: 610, y: 10 }] } });
  createBoardLayer(db, OWNER, board.id, { name: 'Questions' });
  createBoardViewportBookmark(db, OWNER, board.id, { name: 'Overview', ...initialViewport });
  createBoardViewportBookmark(db, OWNER, board.id, { name: 'Close reading', x: -40, y: 10, zoom: 1.2 });
  return { boardId: board.id, noteId: note.id, projectId: PROJECT, memberId: first.id };
})();
const requests = [];
const state = () => ({ database, syntheticOnly: true, ...seeded,
  user: getDb().prepare('SELECT id,name,settings FROM users WHERE id=?').get(OWNER),
  project: getDb().prepare('SELECT id,skin FROM courses WHERE id=?').get(PROJECT),
  board: getDb().prepare('SELECT * FROM boards WHERE id=?').get(seeded.boardId),
  note: getDb().prepare('SELECT id,title,metadata FROM notes WHERE id=?').get(seeded.noteId),
  scene: Object.fromEntries(['board_members', 'board_edges', 'board_visuals', 'board_layers', 'board_viewport_bookmarks'].map((table) => [table, getDb().prepare(`SELECT * FROM ${table} WHERE board_id=? ORDER BY id`).all(seeded.boardId)])), requests });
const before = state();
writeFileSync(resolve(audit, 'browser-seed.json'), JSON.stringify(before, null, 2));
const app = express(); app.use(express.json());
app.get('/__fixture/bootstrap', (_req, res) => res.json({ ...seeded, user: { id: OWNER, name: 'B1b reviewer', email: 'b1b@example.invalid', settings: JSON.parse(getDb().prepare('SELECT settings FROM users WHERE id=?').get(OWNER).settings) } }));
app.get('/__fixture/state', (_req, res) => res.json(state()));
app.post('/__fixture/reopen', async (_req, res, next) => { try { closeDb(); await initDb(database); res.json(state()); } catch (error) { next(error); } });
app.use('/api', (req, res, next) => {
  req.userId = OWNER;
  const path = req.originalUrl; const body = structuredClone(req.body);
  res.once('finish', () => requests.push({ method: req.method, path, status: res.statusCode, ...(Object.keys(body || {}).length ? { body } : {}) })); next();
});
for (const [path, module] of [
  ['settings', 'settings'], ['courses', 'courses'], ['notes', 'notes'], ['note-blocks', 'noteBlocks'],
  ['canvas-objects', 'canvasObjects'], ['annotation-truths', 'annotationTruths'], ['content-groups', 'contentGroups'],
  ['group-folders', 'groupFolders'], ['purposes', 'purposes'], ['source-anchors', 'sourceAnchors'], ['templates', 'templates'], ['items', 'items'], ['tags', 'tags'],
]) app.use(`/api/${path}`, (await import(`../../../server/src/routes/${module}.ts`)).default);
app.use('/api/boards', createBoardRouter(getDb));
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown synthetic fixture request', path: req.originalUrl }));
app.use(errorHandler);
const server = await createServer({ configFile: false, envFile: false, root: audit,
  plugins: [{ name: 'b1b-real-routes', configureServer(vite) { vite.middlewares.use(app); } }, react()],
  resolve: { alias: { '@': resolve(root, 'client/src'), '@shared': resolve(root, 'shared'),
    'react-dom': resolve(root, 'client/node_modules/react-dom'), 'react-router-dom': resolve(root, 'client/node_modules/react-router-dom'), react: resolve(root, 'client/node_modules/react'), 'lucide-react': resolve(root, 'client/node_modules/lucide-react') } },
  server: { host: '127.0.0.1', port: 5196, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
const response = await fetch(`http://127.0.0.1:5196/api/notes/${seeded.noteId}/blocks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ block_type: 'paragraph', plain_text: 'Keep observations distinct from interpretations. Return to the original evidence when an assumption changes.' }) });
if (!response.ok) throw new Error(`Body seed failed: ${await response.text()}`);
console.log('B1b synthetic SQLite browser ready: http://127.0.0.1:5196');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); closeDb(); process.exit(0); });
