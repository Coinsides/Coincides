import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import sourceRoutes from '../routes/sources.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';
import { previewSourceReprojection, rematerializeSource } from '../services/sourceReprojection.js';
import { parseSourceArtifact, type SourceArtifact } from '../services/sourceArtifact.js';
import { createBoard, mountBoardMember } from '../services/boards.js';
import { sweepOrphanSourceProjectionAssets } from '../services/sourceProjectionMaterializer.js';

async function fixture(run: (context: {
  db: Awaited<ReturnType<typeof initDb>>; userId: string; courseId: string;
  sourceId: string; noteId: string; sourceRootDir: string; canvasAssetRootDir: string;
}) => Promise<void>, image = false) {
  const root = mkdtempSync(join(tmpdir(), 'coincides-reprojection-'));
  const sourceRootDir = join(root, 'sources');
  const canvasAssetRootDir = join(root, 'assets');
  const userId = uuidv4();
  const courseId = uuidv4();
  try {
    const db = await initDb(':memory:');
    db.prepare("INSERT INTO database_meta (key, value) VALUES ('coordinate_contract', 'v2')").run();
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')")
      .run(userId, `${userId}@example.test`);
    db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Synthetic project')").run(courseId, userId);
    mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });
    const body = image
      ? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
      : Buffer.from('# Synthetic heading\n\nFirst body.\n\nSecond body.');
    const path = join(sourceRootDir, '.tmp', 'synthetic.upload');
    writeFileSync(path, body);
    const intake = await intakeSourceTempFile(db, userId, {
      course_id: courseId, origin_entry_kind: 'project_upload',
      file: { path, originalname: image ? 'Synthetic.png' : 'Synthetic.md',
        mimetype: image ? 'image/png' : 'text/markdown', size: body.length },
    }, { rootDir: sourceRootDir });
    const sourceId = intake.source.id;
    const published = await materializeSourceNow(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir });
    assert.equal(published.status, 'materialized');
    await run({ db, userId, courseId, sourceId, noteId: published.projection_note_id!, sourceRootDir, canvasAssetRootDir });
  } finally {
    closeDb();
    const absoluteRoot = resolve(root);
    assert.ok(absoluteRoot.startsWith(`${resolve(tmpdir())}${sep}`));
    rmSync(absoluteRoot, { recursive: true, force: true });
  }
}

function identities(db: Awaited<ReturnType<typeof initDb>>, noteId: string) {
  return {
    blocks: db.prepare('SELECT block_id FROM note_block_placements WHERE note_id = ? ORDER BY order_index').all(noteId),
    frames: db.prepare('SELECT frame_id FROM page_frame_extensions WHERE note_id = ? ORDER BY page_index').all(noteId),
  };
}

test('preview is read-only; replacement snapshots every annotation row, removes old note, and repeats stable identities', async (t) => {
  await fixture(async ({ db, userId, courseId, sourceId, noteId, ...options }) => {
    for (const status of ['active', 'hidden', 'deleted']) {
      db.prepare(`INSERT INTO annotation_truths
        (id,user_id,course_id,note_id,canvas_id,raw_label,status,metadata) VALUES (?,?,?,?,?,?,?,?)`)
        .run(`ann-${status}`, userId, courseId, noteId, noteId, `label ${status}`, status, '{"synthetic":true}');
      db.prepare(`INSERT INTO annotation_ranges
        (id,user_id,annotation_id,course_id,note_id,target_kind,range_text_cache,metadata)
        VALUES (?,?,?,?,?,'text_span',?,?)`)
        .run(`range-${status}`, userId, `ann-${status}`, courseId, noteId, status, '{"retained":"exact"}');
    }
    const expectedSnapshot = {
      annotation_truths: db.prepare('SELECT * FROM annotation_truths ORDER BY id').all(),
      annotation_ranges: db.prepare('SELECT * FROM annotation_ranges ORDER BY id').all(),
    };
    const originalIds = identities(db, noteId);
    const before = db.prepare('SELECT total_changes() AS n').get();
    const preview = previewSourceReprojection(db, userId, sourceId);
    assert.equal(preview.user_work.annotation_count, 1);
    assert.deepEqual(db.prepare('SELECT total_changes() AS n').get(), before);
    const started = performance.now();
    const first = await rematerializeSource(db, userId, sourceId, options);
    t.diagnostic(`Synthetic replacement including parse and transaction: ${(performance.now() - started).toFixed(2)} ms`);
    assert.notEqual(first.projection_note_id, noteId);
    assert.equal(db.prepare('SELECT 1 FROM notes WHERE id = ?').get(noteId), undefined);
    assert.deepEqual(db.prepare('SELECT * FROM annotation_truths').all(), []);
    assert.deepEqual(db.prepare('SELECT * FROM annotation_ranges').all(), []);
    const receipt = db.prepare('SELECT * FROM source_reprojection_receipts WHERE id = ?').get(first.receipt_id) as any;
    assert.equal(receipt.old_note_id, noteId);
    assert.equal(receipt.source_record_id, sourceId);
    assert.deepEqual(JSON.parse(receipt.user_work_json), preview.user_work);
    assert.deepEqual(JSON.parse(receipt.annotation_snapshot_json), expectedSnapshot);
    assert.deepEqual(identities(db, first.projection_note_id), originalIds);
    const second = await rematerializeSource(db, userId, sourceId, options);
    assert.notEqual(second.projection_note_id, first.projection_note_id);
    assert.deepEqual(identities(db, second.projection_note_id), originalIds);
    const current = await materializeSourceNow(db, userId, sourceId, options);
    assert.equal(current.operation_batch_id, second.operation_batch_id);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM notes').get() as any).n, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM note_blocks').get() as any).n, originalIds.blocks.length);
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM source_reprojection_receipts').get() as any).n, 2);
    assert.deepEqual(db.pragma('foreign_key_check'), []);
  });
});

test('a publication failure rolls back receipt, note deletion, blocks, annotations, and materialization status', async () => {
  await fixture(async ({ db, userId, courseId, sourceId, noteId, ...options }) => {
    db.prepare(`INSERT INTO annotation_truths (id,user_id,course_id,note_id,canvas_id,raw_label)
      VALUES ('rollback-annotation',?,?,?,?,'keep me')`).run(userId, courseId, noteId, noteId);
    const tables = ['notes', 'note_blocks', 'note_block_placements', 'annotation_truths', 'source_materializations', 'source_reprojection_receipts'];
    const snapshot = () => tables.map((table) => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
    const before = snapshot();
    await assert.rejects(rematerializeSource(db, userId, sourceId, {
      ...options, hooks: { insidePublish: (stage) => { if (stage === 'after_content') throw new Error('synthetic publication failure'); } },
    }), /synthetic publication failure/);
    assert.deepEqual(snapshot(), before);
  });
});

test('external note placement refuses replacement before parsing or writing', async () => {
  await fixture(async ({ db, userId, courseId, sourceId, noteId, ...options }) => {
    const blockId = (identities(db, noteId).blocks[0] as any).block_id;
    db.prepare("INSERT INTO notes (id,user_id,course_id,title) VALUES ('external-note',?,?,'Other note')").run(userId, courseId);
    db.prepare("INSERT INTO note_block_placements (id,note_id,block_id,order_index) VALUES ('external-placement','external-note',?,0)").run(blockId);
    assert.equal(previewSourceReprojection(db, userId, sourceId).user_work.external_block_placement_count, 1);
    const before = db.prepare('SELECT total_changes() AS n').get();
    await assert.rejects(rematerializeSource(db, userId, sourceId, {
      ...options, parseArtifact: async () => { throw new Error('must not parse'); },
    }), (error: any) => error.statusCode === 409 && error.details.code === 'reprojection_blocked_external_refs');
    assert.deepEqual(db.prepare('SELECT total_changes() AS n').get(), before);
  });
});

test('board note references and board text ranges are included in external-reference refusal', async () => {
  await fixture(async ({ db, userId, sourceId, noteId, ...options }) => {
    const { board } = db.transaction(() => createBoard(db, userId, {
      title: 'Synthetic board', purpose: { title: 'Synthetic purpose' },
    }))();
    db.transaction(() => mountBoardMember(db, userId, board.id, { member_kind: 'note', member_id: noteId }))();
    await assert.rejects(rematerializeSource(db, userId, sourceId, options),
      (error: any) => error.details.code === 'reprojection_blocked_external_refs');
    db.prepare('DELETE FROM board_members WHERE board_id = ?').run(board.id);
    const blockId = (identities(db, noteId).blocks[0] as any).block_id;
    db.prepare(`INSERT INTO board_text_ranges
      (id,user_id,board_id,note_id,block_id,text_flow_id,text_unit_id,excerpt,at,created_at,updated_at)
      VALUES ('board-range',?,?,?,?,?,'tu-1','Synthetic','now','now','now')`)
      .run(userId, board.id, noteId, blockId, blockId);
    assert.equal(previewSourceReprojection(db, userId, sourceId).user_work.external_block_placement_count, 1);
    await assert.rejects(rematerializeSource(db, userId, sourceId, options),
      (error: any) => error.details.code === 'reprojection_blocked_external_refs');
  });
});

test('parsing/publishing sources refuse replacement, and overlapping requests cannot replace twice', async () => {
  await fixture(async ({ db, userId, sourceId, noteId, ...options }) => {
    for (const status of ['parsing', 'publishing']) {
      db.prepare('UPDATE source_materializations SET status = ?, projection_note_id = NULL').run(status);
      await assert.rejects(rematerializeSource(db, userId, sourceId, options),
        (error: any) => error.details.code === 'reprojection_in_progress');
    }
    db.prepare("UPDATE source_materializations SET status = 'materialized', projection_note_id = ?").run(noteId);
    let release!: (value: SourceArtifact) => void;
    let parsed!: SourceArtifact;
    let notify!: () => void;
    const waiting = new Promise<void>((done) => { notify = done; });
    const first = rematerializeSource(db, userId, sourceId, {
      ...options, parseArtifact: async (input) => {
        parsed = await parseSourceArtifact(input);
        return new Promise<SourceArtifact>((done) => { release = done; notify(); });
      },
    });
    await waiting;
    await assert.rejects(rematerializeSource(db, userId, sourceId, options),
      (error: any) => error.details.code === 'reprojection_in_progress');
    release(parsed);
    await first;
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM source_reprojection_receipts').get() as any).n, 1);
  });
});

test('external references added during parsing are rechecked before the transaction writes', async () => {
  await fixture(async ({ db, userId, courseId, sourceId, noteId, ...options }) => {
    await assert.rejects(rematerializeSource(db, userId, sourceId, {
      ...options, hooks: { afterParse: () => {
        db.prepare("INSERT INTO notes (id,user_id,course_id,title) VALUES ('late-note',?,?,'Other')").run(userId, courseId);
        db.prepare("INSERT INTO note_block_placements (id,note_id,block_id,order_index) VALUES ('late-ref','late-note',?,0)")
          .run((identities(db, noteId).blocks[0] as any).block_id);
      } },
    }), (error: any) => error.details.code === 'reprojection_blocked_external_refs');
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM source_reprojection_receipts').get() as any).n, 0);
    assert.ok(db.prepare('SELECT 1 FROM notes WHERE id = ?').get(noteId));
  });
});

test('image replacement reuses the managed asset and remains protected from the ten-minute orphan sweep', async () => {
  await fixture(async ({ db, userId, sourceId, ...options }) => {
    const original = db.prepare('SELECT * FROM canvas_assets').get() as any;
    const bytes = readFileSync(join(options.canvasAssetRootDir, original.storage_key));
    const result = await rematerializeSource(db, userId, sourceId, options);
    const asset = db.prepare('SELECT * FROM canvas_assets').get() as any;
    assert.equal(asset.id, original.id);
    assert.equal(asset.origin_note_id, result.projection_note_id);
    assert.equal(sweepOrphanSourceProjectionAssets(db, {
      canvasAssetRootDir: options.canvasAssetRootDir, now: new Date(Date.now() + 20 * 60 * 1000),
    }), 0);
    assert.deepEqual(readFileSync(join(options.canvasAssetRootDir, asset.storage_key)), bytes);
  }, true);
});

test('HTTP rematerialize requires literal confirm true, returns counts, and exposes external-reference 409', async () => {
  await fixture(async ({ db, userId, courseId, sourceId, noteId, sourceRootDir, canvasAssetRootDir }) => {
    const priorSource = process.env.SOURCE_BLOB_DIR;
    const priorAsset = process.env.CANVAS_ASSET_DIR;
    process.env.SOURCE_BLOB_DIR = sourceRootDir;
    process.env.CANVAS_ASSET_DIR = canvasAssetRootDir;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { (req as any).userId = userId; next(); });
    app.use('/api/sources', sourceRoutes);
    app.use(errorHandler);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((done) => server.once('listening', done));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sources/${sourceId}/rematerialize`;
    const post = (body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    try {
      const before = db.prepare('SELECT total_changes() AS n').get();
      for (const body of [{}, { confirm: false }, { confirm: 'true' }]) {
        const response = await post(body);
        assert.equal(response.status, 200);
        assert.equal(typeof (await response.json() as any).user_work.annotation_count, 'number');
      }
      assert.deepEqual(db.prepare('SELECT total_changes() AS n').get(), before);
      const confirmed = await post({ confirm: true });
      assert.equal(confirmed.status, 200);
      const result = await confirmed.json() as any;
      assert.notEqual(result.projection_note_id, noteId);
      assert.ok(result.receipt_id);
      db.prepare("INSERT INTO notes (id,user_id,course_id,title) VALUES ('http-other',?,?,'Other')").run(userId, courseId);
      db.prepare("INSERT INTO note_block_placements (id,note_id,block_id,order_index) VALUES ('http-ref','http-other',?,0)")
        .run((identities(db, result.projection_note_id).blocks[0] as any).block_id);
      const blocked = await post({ confirm: true });
      assert.equal(blocked.status, 409);
      assert.equal((await blocked.json() as any).details.code, 'reprojection_blocked_external_refs');
    } finally {
      await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
      if (priorSource === undefined) delete process.env.SOURCE_BLOB_DIR; else process.env.SOURCE_BLOB_DIR = priorSource;
      if (priorAsset === undefined) delete process.env.CANVAS_ASSET_DIR; else process.env.CANVAS_ASSET_DIR = priorAsset;
    }
  });
});
