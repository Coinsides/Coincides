import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import canvasRouter from '../routes/canvasObjects.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { saveCanvasBlockPlacementSchema, saveCanvasObjectSchema } from '../validators/index.js';
import { getNoteCanvasPersistence, saveBlockCanvasPlacement, saveCanvasObject } from '../services/canvasObjects.js';

const geometry = { x: 12, y: 14, width: 300, height: 72 };
const retired = [
  { surface: 'canvas_workspace', boundary_role: 'outside', error: 'canvas_workspace_retired' },
  { surface: 'formal_page', boundary_role: 'crossing', error: 'canvas_crossing_retired' },
] as const;

test('13.6 TD-7/TD-9: Page authority remains after hydration and toggle bridges are removed', () => {
  const readClient = (file: string) => readFileSync(new URL(
    `../../../client/src/pages/Notes/canvasEngine/${file}`, import.meta.url,
  ), 'utf8');
  for (const file of [
    'hooks/useSurfaceModeController.ts',
    'hooks/useRuntimeSurfaceStateController.ts',
    'hooks/useNoteCanvasRuntimeController.ts',
    'hooks/useNoteCanvasLayerProps.ts',
    'layers/NoteChromeLayer.tsx',
  ]) {
    assert.doesNotMatch(readClient(file), /resolveInitialSurfaceMode|toggleSurfaceMode|onToggleSurfaceMode/, file);
  }
  const authority = readClient('hooks/useSurfaceModeController.ts');
  assert.match(authority, /createSurfaceModePolicy\('page'\)/);
  for (const field of ['surfaceMode', 'surfacePolicy', 'pageOffsetX']) assert.ok(authority.includes(field), field);
  assert.doesNotMatch(readClient('hooks/useNoteCanvasRuntimeController.test.tsx'), /resolverCalls|resolverCallCount|layoutPhaseReceipts/);
});

test('S5 validator names both retired values at block and generic placement doors', async () => {
  // CLI is outside the server build root; exercise its existing source entry with tsx.
  const { assertRetiredSurfaceUpdatesAllowed } = await import(new URL('../../scripts/v2Bn12LifecycleMigration.ts', import.meta.url).href);
  for (const { error, ...fields } of retired) {
    const layout = { ...geometry, ...fields };
    for (const parse of [
      () => saveCanvasBlockPlacementSchema.parse({ block_id: 's5-block', layout }),
      () => saveCanvasObjectSchema.parse({ kind: 'paragraph_block_projection', placement: layout, extension: { block_id: 's5-block' } }),
    ]) assert.throws(parse, (e: any) => e.issues.some((issue: any) => issue.message === error));
    assert.throws(() => assertRetiredSurfaceUpdatesAllowed({
      surfaceUpdates: [{ next: { surface: fields.surface, boundaryRole: fields.boundary_role } } as any],
    }), { message: error });
  }
  assert.doesNotThrow(() => assertRetiredSurfaceUpdatesAllowed({ surfaceUpdates: [] }));
});

test('S5 fixture smoke: HTTP and direct writers reject before changing rows; historical rows stay readable', async () => {
  const db = await initDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).userId = 's5-user'; next(); });
  app.use('/canvas-objects', canvasRouter);
  app.use(errorHandler);
  // Kernel chooses an isolated fixture port; never uses the running development servers.
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/canvas-objects/by-note/s5-note`;
    db.exec(`INSERT INTO users(id,email,password_hash,name) VALUES('s5-user','s5@example.test','fixture','S5');
      INSERT INTO courses(id,user_id,name) VALUES('s5-course','s5-user','S5');
      INSERT INTO notes(id,user_id,course_id,title) VALUES('s5-note','s5-user','s5-course','S5');
      INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text)
        VALUES('s5-block','s5-user','s5-course','paragraph','{}','Synthetic S5');
      INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES('s5-placement','s5-note','s5-block',0);`);
    const snapshot = () => ['notes','note_blocks','note_block_placements','canvas_objects','canvas_placements','content_mounts','events']
      .map((table) => db.prepare(`SELECT * FROM ${table}`).all());
    const before = snapshot();
    for (const { error, ...fields } of retired) {
      const layout = { ...geometry, ...fields };
      const object = { kind: 'paragraph_block_projection', placement: { ...layout, placement_id: 's5-placement' }, extension: { block_id: 's5-block' } };
      for (const [path, body] of [
        ['/block-placements/s5-placement', { block_id: 's5-block', layout }],
        ['/objects/s5-object', object],
      ] as const) {
        const response = await fetch(url + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        assert.equal(response.status, 400);
        assert.equal((await response.json() as any).error, error);
        assert.deepEqual(snapshot(), before);
      }
      assert.throws(() => saveBlockCanvasPlacement(db, 's5-user', 's5-note', 's5-placement', { block_id: 's5-block', layout }), { message: error });
      assert.throws(() => saveCanvasObject(db, 's5-user', 's5-note', 's5-object', object), { message: error });
      assert.deepEqual(snapshot(), before);
    }
    // Omission must not regenerate workspace in the service fallback.
    assert.throws(() => saveBlockCanvasPlacement(db, 's5-user', 's5-note', 's5-placement', { block_id: 's5-block', layout: geometry }), { message: 'canvas_workspace_retired' });
    assert.deepEqual(snapshot(), before);
    saveBlockCanvasPlacement(db, 's5-user', 's5-note', 's5-placement', {
      block_id: 's5-block', layout: { ...geometry, surface: 'formal_page', boundary_role: 'inside' },
    });
    assert.deepEqual(db.prepare('SELECT x,y,width,height,surface,boundary_role FROM canvas_placements').get(),
      { ...geometry, surface: 'formal_page', boundary_role: 'inside' });
    // Seed history directly in the in-memory fixture, independent of retired current writers.
    db.exec("UPDATE canvas_placements SET surface='canvas_workspace', boundary_role='crossing'");
    const historical = snapshot();
    const read = getNoteCanvasPersistence(db, 's5-user', 's5-note');
    assert.equal(read.canvasPlacements[0].surface, 'canvas_workspace');
    assert.equal(read.canvasPlacements[0].boundary_role, 'crossing');
    assert.equal(read.blockLayouts[0].layout.surface, 'canvas_workspace');
    assert.deepEqual(snapshot(), historical);
    console.log('S5_FIXTURE_PASS retired_HTTP_400=4 zero_write=true direct_defaults_rejected=true history_readable=true db=:memory:');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    closeDb();
  }
});
