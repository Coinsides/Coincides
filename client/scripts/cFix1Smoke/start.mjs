// From server/: node --import tsx ../client/scripts/cFix1Smoke/start.mjs
// All rows belong to this process's :memory: database. Vite never loads env files.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const clientRoot = fileURLToPath(new URL('../../', import.meta.url));
const temporaryParent = path.resolve(clientRoot, '../.codex-tmp');
mkdirSync(temporaryParent, { recursive: true });
const temporaryAssets = mkdtempSync(path.join(temporaryParent, 'c-fix1-assets-'));
process.env.CANVAS_ASSET_DIR = path.join(temporaryAssets, 'canvas-assets');
process.env.SOURCE_BLOB_DIR = path.join(temporaryAssets, 'source-blobs');
mkdirSync(process.env.CANVAS_ASSET_DIR, { recursive: true });
mkdirSync(process.env.SOURCE_BLOB_DIR, { recursive: true });

const [database, noteRoutes, canvasRoutes, blockRoutes, annotationRoutes, errors, canvasService,
  annotationService, boardService, rangeService] = await Promise.all([
  import('../../../server/src/db/init.ts'), import('../../../server/src/routes/notes.ts'),
  import('../../../server/src/routes/canvasObjects.ts'), import('../../../server/src/routes/noteBlocks.ts'),
  import('../../../server/src/routes/annotationTruths.ts'), import('../../../server/src/middleware/errorHandler.ts'),
  import('../../../server/src/services/canvasObjects.ts'), import('../../../server/src/services/annotationTruths.ts'),
  import('../../../server/src/services/boards.ts'), import('../../../server/src/services/boardTextRanges.ts'),
]);
const requireServer = createRequire(new URL('../../../server/package.json', import.meta.url));
const express = requireServer('express');
const db = await database.initDb(':memory:');
const noteId = 'c-fix1-note';
const userId = 'c-fix1-user';
db.prepare("INSERT OR REPLACE INTO database_meta (key,value) VALUES ('coordinate_contract','v2')").run();
db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?,'c-fix1@example.test','synthetic','Synthetic C fix 1')").run(userId);
db.prepare("INSERT INTO courses(id,user_id,name) VALUES('c-fix1-course',?,'Synthetic interaction course')").run(userId);
db.prepare("INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,'c-fix1-course','C fix 1 — handles, borders, and ink')").run(noteId, userId);

const frames = [0, 1, 2].map((index) => ({
  id: `c-fix1-frame-${index + 1}`, role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
  pageSize: 'A4', templateId: 'a4_portrait', exportable: true,
  x: 120, y: 240 + index * 1360, width: 904, height: 1278,
  contentInset: { top: 96, right: 72, bottom: 96, left: 72 },
}));
canvasService.savePageFrameCollection(db, userId, noteId, {
  pageFrames: frames, primaryFrameId: frames[0].id, selectedFrameId: frames[0].id,
});

function textFlow(lines, roles = [], withInline = false) {
  return { textflow_version: 'TextBlockContentV1',
    units: lines.map((text, index) => ({ id: `tu-${index + 1}`, text,
      writing_role: roles[index] || 'paragraph', indent_level: 0, order_index: index,
      metadata: { fixture: true }, status: 'active' })),
    inline_structures: withInline ? [{ id: 'inline-1', parent_text_unit_id: 'tu-1',
      semantic_kind: 'inline_code', anchor_text: lines[0].slice(0, 2), anchor_range: { start: 0, end: 2 },
      field_values: { language: 'text' }, metadata: { fixture: 'C3 collision witness' }, status: 'active' }] : [],
    metadata: { fixture: 'persisted units, not legacy body-only content' },
  };
}
const specimens = [
  { id: 'c-fix1-a', page: 0, y: 30, height: 155, lines: [
    'We are the Champions of the world.',
    'A second ordinary paragraph for arrow navigation and reorder.',
    'A third paragraph: A👩‍👩‍👧‍👦é中B tests grapheme boundaries.',
  ], inline: true },
  { id: 'c-fix1-b', page: 0, y: 225, height: 140, lines: [
    'Target alpha has its own tu-1 and inline-1.',
    'Target bravo — drop another unit before or after this line.',
    'Target charlie — the next text block remains independent.',
  ], inline: true },
  { id: 'c-fix1-roles', page: 0, y: 405, height: 350,
    lines: ['Heading specimen', 'Quote specimen', 'Bullet specimen', 'Numbered specimen',
      'Todo specimen', 'Toggle specimen', 'const role = "code_line";', 'Ordinary text specimen'],
    roles: ['heading', 'quote', 'bullet_item', 'numbered_item', 'todo_item', 'toggle_item', 'code_line', 'paragraph'] },
  { id: 'c-fix1-page2', page: 1, y: 35, height: 160, lines: [
    'PAGE TWO — a separate page-owned text block.',
    'The blank page area accepts extracted units and pen strokes.',
    'Normal and Layout mode share the production runtime.',
  ] },
  { id: 'c-fix1-code', page: 1, y: 235, height: 150,
    code: 'const paper = "production runtime";\nconst store = "synthetic memory only";' },
  { id: 'c-fix1-long', page: 1, y: 815, height: 180,
    lines: Array.from({ length: 16 }, (_, index) => `Long unit ${index + 1}: a page-edge measurement specimen for continuation inspection.`) },
];
for (const [index, specimen] of specimens.entries()) {
  const flow = specimen.lines ? textFlow(specimen.lines, specimen.roles, specimen.inline) : null;
  const body = flow ? flow.units.map((unit) => unit.text).join('\n') : specimen.code;
  const content = flow ? { body, text_flow: flow } : { body, language: 'typescript' };
  db.prepare(`INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text,metadata)
    VALUES(?,?,'c-fix1-course','paragraph',?,?,?)`).run(specimen.id, userId,
    JSON.stringify(content), body, JSON.stringify({ template_id: flow ? 'text.paragraph' : 'code.snippet' }));
  const placementId = `${specimen.id}:placement`;
  db.prepare('INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES(?,?,?,?)')
    .run(placementId, noteId, specimen.id, index);
  canvasService.saveBlockCanvasPlacement(db, userId, noteId, placementId, { block_id: specimen.id, layout: {
    x: 0, y: specimen.y, width: 760, height: specimen.height,
    surface: 'formal_page', boundary_role: 'inside', coordinate_space: 'page_frame_local', frame_id: frames[specimen.page].id,
  } });
}
annotationService.replaceNoteAnnotationTruths(db, userId, noteId, ['a', 'b'].map((suffix) => ({
  id: `c-fix1-annotation-${suffix}`, raw_label: `Synthetic ${suffix.toUpperCase()} anchor`,
  visual_style: { color_token: suffix === 'a' ? 'amber' : 'blue', marker_kind: 'highlight' },
  ranges: [{ id: `c-fix1-range-${suffix}`, target_kind: 'text_span', block_id: `c-fix1-${suffix}`,
    text_flow_id: `textflow-c-fix1-${suffix}`, text_unit_id: 'tu-1', inline_structure_id: 'inline-1',
    start_offset: 0, end_offset: 2, range_text_cache: suffix === 'a' ? 'We' : 'Ta', metadata: { fixture: true } }],
})));
db.transaction(() => {
  const { board } = boardService.createBoard(db, userId, { title: 'Synthetic anchor board', purpose: { title: 'C fix 1 regression' } });
  for (const suffix of ['a', 'b']) rangeService.createBoardTextRange(db, userId, board.id, {
    note_id: noteId, block_id: `c-fix1-${suffix}`, text_flow_id: `textflow-c-fix1-${suffix}`,
    text_unit_id: 'tu-1', start_offset: 0, end_offset: 2, excerpt: suffix === 'a' ? 'We' : 'Ta',
    at: '2026-09-10T12:00:00.000Z',
  });
})();

const app = express();
const requests = [];
app.use(express.json());
app.use((req, _res, next) => {
  req.userId = userId;
  if (req.path !== '/__c-fix1-fixture') requests.push({ method: req.method, path: req.path,
    ...(req.method !== 'GET' ? { body: req.body } : {}) });
  next();
});
app.get('/__c-fix1-fixture', (_req, res) => res.json({
  noteId, database: ':memory:', coordinate_contract: 'v2',
  canvas_objects: db.prepare('SELECT * FROM canvas_objects WHERE note_id=? ORDER BY id').all(noteId),
  canvas_placements: db.prepare('SELECT * FROM canvas_placements WHERE note_id=? ORDER BY object_id').all(noteId),
  note_blocks: db.prepare('SELECT id,status,block_type,content_json,plain_text,metadata,text_save_revision FROM note_blocks WHERE user_id=? ORDER BY id').all(userId),
  note_block_placements: db.prepare('SELECT * FROM note_block_placements WHERE note_id=? ORDER BY order_index').all(noteId),
  annotation_truths: db.prepare('SELECT * FROM annotation_truths WHERE note_id=? ORDER BY id').all(noteId),
  annotation_ranges: db.prepare('SELECT * FROM annotation_ranges ORDER BY id').all(),
  board_text_ranges: rangeService.listBoardTextRanges(db, userId, noteId), requests,
}));
app.get('/boards/text-ranges/by-note/:noteId', (req, res) => res.json({
  text_ranges: rangeService.listBoardTextRanges(db, userId, req.params.noteId),
}));
app.put('/boards/text-ranges/by-note/:noteId', (req, res) => res.json({
  text_ranges: db.transaction(() => rangeService.updateBoardTextRanges(db, userId, req.params.noteId, req.body))(),
}));
app.use('/notes', noteRoutes.default);
app.use('/canvas-objects', canvasRoutes.default);
app.use('/note-blocks', blockRoutes.default);
app.use('/annotation-truths', annotationRoutes.default);
app.use((_req, res) => res.status(404).json({ error: 'Unmapped synthetic C fix 1 route' }));
app.use(errors.errorHandler);

const realApi = path.resolve(clientRoot, 'src/services/api.ts').replaceAll('\\', '/');
const mockApi = fileURLToPath(new URL('./mockApi.ts', import.meta.url));
const vite = await createServer({
  configFile: false, envFile: false, root: clientRoot,
  plugins: [{ name: 'c-fix1-synthetic-api', enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!/(?:^|\/)api(?:\.ts)?$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved?.id.replaceAll('\\', '/') === realApi ? mockApi : null;
    },
    configureServer(server) { server.middlewares.use('/api', app); },
  }, react()],
  resolve: { alias: { '@': path.resolve(clientRoot, 'src'),
    '@shared/types': path.resolve(clientRoot, '../shared/types/index.ts'), '@shared': path.resolve(clientRoot, '../shared') } },
  server: { host: '127.0.0.1', port: 5185, strictPort: true, hmr: false },
});
await vite.listen();
console.log('C fix 1 smoke: http://127.0.0.1:5185/scripts/cFix1Smoke/index.html');
console.log('Synthetic DB inspection: http://127.0.0.1:5185/api/__c-fix1-fixture');
const stop = async () => { await vite.close(); database.closeDb(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
