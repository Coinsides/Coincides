// Run from server/: node --import tsx ../client/scripts/paperInkSmoke/startInk.mjs
// Vite config/env-file loading is disabled below; SQLite is explicitly in memory.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { initDb, closeDb } from '../../../server/src/db/init.ts';
import notes from '../../../server/src/routes/notes.ts';
import canvas from '../../../server/src/routes/canvasObjects.ts';
import blocks from '../../../server/src/routes/noteBlocks.ts';
import { errorHandler } from '../../../server/src/middleware/errorHandler.ts';
import { savePageFrameCollection, saveBlockCanvasPlacement } from '../../../server/src/services/canvasObjects.ts';

const requireServer = createRequire(new URL('../../../server/package.json', import.meta.url));
const express = requireServer('express');
const db = await initDb(':memory:');
const noteId = 'paper-ink-smoke-note';
const userId = 'paper-ink-smoke-user';
db.prepare("INSERT OR REPLACE INTO database_meta (key, value) VALUES ('coordinate_contract', 'v2')").run();
db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?, 'paper-ink@example.test','fixture','Synthetic ink user')").run(userId);
db.prepare("INSERT INTO courses (id,user_id,name) VALUES ('paper-ink-smoke-course',?,'Synthetic paper ink')").run(userId);
db.prepare("INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,'paper-ink-smoke-course','13.5 C4 — paper ink specimen')").run(noteId, userId);

const frames = [0, 1].map((index) => ({
  id: `ink-frame-${index + 1}`,
  role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
  pageSize: 'A4', templateId: 'a4_portrait', exportable: true,
  x: 120, y: 240 + index * 1360, width: 904, height: 1278,
  contentInset: { top: 96, right: 72, bottom: 96, left: 72 },
}));
savePageFrameCollection(db, userId, noteId, {
  pageFrames: frames, primaryFrameId: frames[0].id, selectedFrameId: frames[0].id,
});

const specimens = [
  { id: 'ink-text', page: 0, y: 80, body: 'PAGE ONE — write ink in the blank space and over this text.', template: 'text.paragraph' },
  { id: 'ink-code', page: 0, y: 280, body: 'const paper = "one stroke, one page";\nconst undo = "existing canvas command stack";', template: 'code.snippet', language: 'typescript' },
  { id: 'ink-second-text', page: 1, y: 80, body: 'PAGE TWO — this page owns strokes that begin here.', template: 'text.paragraph' },
];
for (const [index, specimen] of specimens.entries()) {
  db.prepare(`INSERT INTO note_blocks (id,user_id,course_id,block_type,content_json,plain_text,metadata)
    VALUES (?,?,'paper-ink-smoke-course','paragraph',?,?,?)`).run(
    specimen.id, userId,
    JSON.stringify({ body: specimen.body, ...(specimen.language ? { language: specimen.language } : {}) }),
    specimen.body, JSON.stringify({ template_id: specimen.template }),
  );
  const placementId = `${specimen.id}:placement`;
  db.prepare('INSERT INTO note_block_placements (id,note_id,block_id,order_index) VALUES (?,?,?,?)')
    .run(placementId, noteId, specimen.id, index);
  saveBlockCanvasPlacement(db, userId, noteId, placementId, { block_id: specimen.id, layout: {
    x: 0, y: specimen.y, width: 760, height: specimen.language ? 160 : 110,
    surface: 'formal_page', boundary_role: 'inside', coordinate_space: 'page_frame_local',
    frame_id: frames[specimen.page].id,
  } });
}

const app = express();
const requests = [];
app.use(express.json());
app.use((req, _res, next) => {
  req.userId = userId;
  if (req.path !== '/__ink-fixture') requests.push({ method: req.method, path: req.path,
    ...(req.method !== 'GET' ? { body: req.body } : {}) });
  next();
});
// Read-only inspection of this process's synthetic database; no user database is opened.
app.get('/__ink-fixture', (_req, res) => res.json({
  noteId, database: ':memory:', coordinate_contract: db.prepare("SELECT value FROM database_meta WHERE key = 'coordinate_contract'").get().value,
  canvas_objects: db.prepare('SELECT * FROM canvas_objects WHERE note_id = ? ORDER BY id').all(noteId),
  canvas_placements: db.prepare('SELECT * FROM canvas_placements WHERE note_id = ? ORDER BY object_id').all(noteId),
  note_blocks: db.prepare('SELECT id,block_type,content_json,plain_text,metadata FROM note_blocks WHERE user_id = ? ORDER BY id').all(userId),
  note_block_placements: db.prepare('SELECT * FROM note_block_placements WHERE note_id = ? ORDER BY order_index').all(noteId),
  board_visuals_count: db.prepare('SELECT COUNT(*) AS count FROM board_visuals').get().count,
  board_members_count: db.prepare('SELECT COUNT(*) AS count FROM board_members').get().count,
  requests,
}));
app.use('/notes', notes);
app.use('/canvas-objects', canvas);
app.use('/note-blocks', blocks);
app.use((_req, res) => res.status(404).json({ error: 'Unmapped local ink fixture route' }));
app.use(errorHandler);

const clientRoot = fileURLToPath(new URL('../../', import.meta.url));
const realApi = path.resolve(clientRoot, 'src/services/api.ts').replaceAll('\\', '/');
const mockApi = fileURLToPath(new URL('./inkMockApi.ts', import.meta.url));
const server = await createServer({
  configFile: false, envFile: false, root: clientRoot,
  plugins: [{
    name: 'paper-ink-synthetic-api', enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!/(?:^|\/)api(?:\.ts)?$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved?.id.replaceAll('\\', '/') === realApi ? mockApi : null;
    },
    configureServer(vite) { vite.middlewares.use('/api', app); },
  }, react()],
  resolve: { alias: {
    '@': path.resolve(clientRoot, 'src'),
    '@shared/types': path.resolve(clientRoot, '../shared/types/index.ts'),
    '@shared': path.resolve(clientRoot, '../shared'),
  } },
  server: { host: '127.0.0.1', port: 5184, strictPort: true, hmr: false },
});
await server.listen();
console.log('Paper ink smoke: http://127.0.0.1:5184/scripts/paperInkSmoke/ink.html');
console.log('Synthetic DB inspection: http://127.0.0.1:5184/api/__ink-fixture');
const stop = async () => { await server.close(); closeDb(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
