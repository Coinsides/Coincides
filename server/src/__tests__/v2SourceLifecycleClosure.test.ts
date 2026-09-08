import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import {
  deleteProjectWithSourcePolicy,
  getProjectDeletionImpact,
} from '../services/courseLifecycle.js';
import { assertCourseLifecyclePolicyCoverage } from '../services/courseLifecyclePolicies.js';
import { drainManagedFileCleanupJobs } from '../services/managedFileCleanup.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import {
  deleteSourceWithCompensation,
  getSourceDeletionImpact,
} from '../services/sourceLifecycle.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';
import { createPurpose, getPurpose } from '../services/purposes.js';
import { ensureSourceProjectPlacement } from '../services/sourceRecords.js';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

type Db = Awaited<ReturnType<typeof initDb>>;

async function withLifecycleStorage(
  run: (context: {
    db: Db;
    sourceRootDir: string;
    canvasAssetRootDir: string;
  }) => void | Promise<void>,
) {
  const root = mkdtempSync(join(tmpdir(), 'coincides-source-lifecycle-'));
  const sourceRootDir = join(root, 'source-blobs');
  const canvasAssetRootDir = join(root, 'canvas-assets');
  try {
    const db = await initDb(':memory:');
    await run({ db, sourceRootDir, canvasAssetRootDir });
  } finally {
    closeDb();
    rmSync(root, { recursive: true, force: true });
  }
}

function seedUserCourse(db: Db, name = 'Lifecycle Project') {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', 'Lifecycle User', datetime('now'))")
    .run(userId, `${userId}@example.com`);
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(courseId, userId, name);
  return { userId, courseId };
}

function seedCourse(db: Db, userId: string, name: string) {
  const id = uuidv4();
  db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
    .run(id, userId, name);
  return id;
}

function uploadFile(rootDir: string, filename: string, content: Buffer | string, mimetype: string) {
  const tempDir = join(rootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const path = join(tempDir, `${uuidv4()}.upload`);
  writeFileSync(path, content);
  return { path, originalname: filename, mimetype, size: Buffer.byteLength(content) };
}

async function materializeTextSource(
  db: Db,
  userId: string,
  courseId: string,
  sourceRootDir: string,
  canvasAssetRootDir: string,
) {
  const upload = await intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: uploadFile(sourceRootDir, 'lifecycle.txt', 'Source evidence survives deletion.', 'text/plain'),
  }, { rootDir: sourceRootDir });
  const result = await materializeSourceNow(db, userId, upload.source.id, {
    sourceRootDir,
    canvasAssetRootDir,
    parseArtifact: async () => ({
      schema_version: 'source-artifact.v1',
      artifact_kind: 'document',
      parser_key: 'native-text',
      parser_version: 'utf8-v1',
      blocks: [{
        artifact_block_id: 'paragraph-1',
        kind: 'text',
        text: 'Source evidence survives deletion.',
        writing_role: 'paragraph',
        page_index: null,
        locator: { kind: 'text_paragraph', index: 1 },
        metadata: {},
      }],
      metadata: {},
    }),
  });
  assert.equal(result.status, 'materialized');
  assert.ok(result.projection_note_id);
  return { sourceId: upload.source.id, projectionNoteId: result.projection_note_id! };
}

async function materializeImageSource(
  db: Db,
  userId: string,
  courseId: string,
  sourceRootDir: string,
  canvasAssetRootDir: string,
) {
  const upload = await intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: uploadFile(sourceRootDir, 'pixel.png', ONE_PIXEL_PNG, 'image/png'),
  }, { rootDir: sourceRootDir });
  const result = await materializeSourceNow(db, userId, upload.source.id, {
    sourceRootDir,
    canvasAssetRootDir,
  });
  assert.equal(result.status, 'materialized');
  return { sourceId: upload.source.id, projectionNoteId: result.projection_note_id! };
}

function sourceBlobPath(db: Db, sourceRootDir: string, sourceId: string): string {
  const row = db.prepare('SELECT storage_key FROM source_files WHERE source_record_id = ?')
    .get(sourceId) as { storage_key: string };
  return join(sourceRootDir, row.storage_key);
}

function seedProjectionUserWork(db: Db, userId: string, courseId: string, noteId: string) {
  const annotationId = uuidv4();
  const groupId = uuidv4();
  const purposeId = db.transaction(() => createPurpose(db, userId, {
    title: 'Exam review',
    project_id: courseId,
  }))().id;
  const blockId = uuidv4();
  db.prepare(`
    INSERT INTO annotation_truths (
      id, user_id, course_id, note_id, canvas_id, raw_label, created_by, status
    ) VALUES (?, ?, ?, ?, ?, 'Important', 'human', 'active')
  `).run(annotationId, userId, courseId, noteId, noteId);
  db.prepare(`
    INSERT INTO content_groups (
      id, user_id, course_id, note_id, title, status, created_by
    ) VALUES (?, ?, ?, ?, 'Preserved group', 'active', 'human')
  `).run(groupId, userId, courseId, noteId);
  db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, content_json, plain_text, source_kind, metadata
    ) VALUES (?, ?, ?, 'paragraph', '{}', 'User-side projection note', 'manual', '{}')
  `).run(blockId, userId, courseId);
  db.prepare(`
    INSERT INTO note_block_placements (id, note_id, block_id, order_index)
    VALUES (?, ?, ?, 0)
  `).run(uuidv4(), noteId, blockId);
  return { annotationId, groupId, purposeId, blockId };
}

function seedExternalReceipt(
  db: Db,
  userId: string,
  courseId: string,
  sourceId: string,
) {
  const noteId = uuidv4();
  const blockId = uuidv4();
  const receiptId = uuidv4();
  const materialization = db.prepare('SELECT id FROM source_materializations WHERE source_record_id = ?')
    .get(sourceId) as { id: string };
  db.prepare("INSERT INTO notes (id, user_id, course_id, title, metadata, note_class) VALUES (?, ?, ?, 'User synthesis', '{}', 'user')")
    .run(noteId, userId, courseId);
  db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, content_json, plain_text, source_kind, metadata
    ) VALUES (?, ?, ?, 'paragraph', '{}', 'My retained conclusion', 'manual', '{}')
  `).run(blockId, userId, courseId);
  db.prepare(`
    INSERT INTO note_block_placements (id, note_id, block_id, order_index)
    VALUES (?, ?, ?, 0)
  `).run(uuidv4(), noteId, blockId);
  db.prepare(`
    INSERT INTO note_block_sources (
      id, block_id, source_excerpt, reference_type, metadata,
      source_record_id, source_materialization_id
    ) VALUES (?, ?, 'Evidence excerpt', 'range', '{"locator":"paragraph-1"}', ?, ?)
  `).run(receiptId, blockId, sourceId, materialization.id);
  return { noteId, blockId, receiptId };
}

test('migration 046 and lifecycle registry make Source deletion rules database-enforced', async () => {
  await withLifecycleStorage(({ db }) => {
    assert.doesNotThrow(() => assertCourseLifecyclePolicyCoverage(db));
    const receiptFks = db.prepare('PRAGMA foreign_key_list(note_block_sources)').all() as any[];
    assert.equal(receiptFks.some((fk) => fk.from === 'source_record_id' && fk.on_delete === 'SET NULL'), true);
    assert.equal(receiptFks.some((fk) => fk.from === 'source_materialization_id' && fk.on_delete === 'SET NULL'), true);
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'managed_file_cleanup_jobs'").get());
  });
});

test('Project deletion defaults to deleting a pure projection but never deletes Source identity or blob', async () => {
  await withLifecycleStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const source = await materializeTextSource(db, userId, courseId, sourceRootDir, canvasAssetRootDir);
    const blobPath = sourceBlobPath(db, sourceRootDir, source.sourceId);
    const impact = getProjectDeletionImpact(db, userId, courseId);
    assert.equal(impact.recommended_action, 'delete_projection');

    const result = deleteProjectWithSourcePolicy(db, userId, courseId, undefined, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(result.action, 'delete_projection');
    assert.equal(db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId), undefined);
    assert.ok(db.prepare('SELECT id FROM source_records WHERE id = ?').get(source.sourceId));
    assert.equal(existsSync(blobPath), true);
    assert.equal(db.prepare('SELECT id FROM notes WHERE id = ?').get(source.projectionNoteId), undefined);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM note_blocks WHERE source_kind = 'source_projection'").get() as any).count, 0);
    const materialization = db.prepare('SELECT status, projection_note_id FROM source_materializations WHERE source_record_id = ?')
      .get(source.sourceId) as any;
    assert.equal(materialization.status, 'materialized');
    assert.equal(materialization.projection_note_id, null);
  });
});

test('Project deletion treats a SourceProjection block reused by another Note as protected user work', async () => {
  await withLifecycleStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const externalCourseId = seedCourse(db, userId, 'External reuse lens');
    const source = await materializeTextSource(db, userId, courseId, sourceRootDir, canvasAssetRootDir);
    const projectionBlock = db.prepare('SELECT block_id FROM note_block_placements WHERE note_id = ? LIMIT 1')
      .get(source.projectionNoteId) as { block_id: string };
    const externalNoteId = uuidv4();
    const externalPlacementId = uuidv4();
    db.prepare("INSERT INTO notes (id, user_id, course_id, title, metadata, note_class) VALUES (?, ?, ?, 'Reuse note', '{}', 'user')")
      .run(externalNoteId, userId, externalCourseId);
    db.prepare(`
      INSERT INTO note_block_placements (id, note_id, block_id, order_index)
      VALUES (?, ?, ?, 0)
    `).run(externalPlacementId, externalNoteId, projectionBlock.block_id);

    const impact = getProjectDeletionImpact(db, userId, courseId);
    assert.equal(impact.projections[0]?.user_work.external_block_placement_count, 1);
    assert.equal(impact.recommended_action, 'move_to_home');

    const result = deleteProjectWithSourcePolicy(db, userId, courseId, undefined, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(result.action, 'move_to_home');
    assert.ok(db.prepare('SELECT id FROM note_blocks WHERE id = ?').get(projectionBlock.block_id));
    assert.ok(db.prepare('SELECT id FROM note_block_placements WHERE id = ?').get(externalPlacementId));
    assert.equal(
      (db.prepare('SELECT course_id FROM note_blocks WHERE id = ?').get(projectionBlock.block_id) as any).course_id,
      result.home_course_id,
    );
  });
});

test('Project deletion dynamically protects user work and moves the full SourceProjection graph to Home', async () => {
  await withLifecycleStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const secondCourseId = seedCourse(db, userId, 'Other lens');
    const source = await materializeImageSource(db, userId, courseId, sourceRootDir, canvasAssetRootDir);
    ensureSourceProjectPlacement(db, userId, source.sourceId, secondCourseId);
    const work = seedProjectionUserWork(db, userId, courseId, source.projectionNoteId);
    const impact = getProjectDeletionImpact(db, userId, courseId);
    assert.equal(impact.recommended_action, 'move_to_home');
    assert.equal(impact.projection_user_work_count, 1);
    assert.equal(impact.other_placement_source_count, 1);

    const result = deleteProjectWithSourcePolicy(db, userId, courseId, undefined, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(result.action, 'move_to_home');
    assert.ok(result.home_course_id);
    const homeId = result.home_course_id!;
    assert.equal((db.prepare('SELECT course_id FROM notes WHERE id = ?').get(source.projectionNoteId) as any).course_id, homeId);
    assert.equal((db.prepare('SELECT course_id FROM annotation_truths WHERE id = ?').get(work.annotationId) as any).course_id, homeId);
    assert.equal((db.prepare('SELECT course_id FROM content_groups WHERE id = ?').get(work.groupId) as any).course_id, homeId);
    assert.equal(getPurpose(db, userId, work.purposeId).course_id, null);
    assert.equal(getPurpose(db, userId, work.purposeId).note_id, null);
    assert.equal((db.prepare('SELECT course_id FROM note_blocks WHERE id = ?').get(work.blockId) as any).course_id, homeId);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_objects WHERE note_id = ? AND course_id = ?')
      .get(source.projectionNoteId, homeId) as any).count > 0, true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_assets WHERE origin_note_id = ? AND course_id = ?')
      .get(source.projectionNoteId, homeId) as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_project_placements WHERE source_record_id = ? AND course_id = ?')
      .get(source.sourceId, homeId) as any).count, 1);
    assert.ok(db.prepare('SELECT id FROM source_records WHERE id = ?').get(source.sourceId));
  });
});

test('Source hard delete removes projection and blob while degrading external receipts in place', async () => {
  await withLifecycleStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const source = await materializeTextSource(db, userId, courseId, sourceRootDir, canvasAssetRootDir);
    const receipt = seedExternalReceipt(db, userId, courseId, source.sourceId);
    const blobPath = sourceBlobPath(db, sourceRootDir, source.sourceId);
    const impact = getSourceDeletionImpact(db, userId, source.sourceId);
    assert.equal(impact.retained_receipt_count, 1);

    const result = deleteSourceWithCompensation(db, userId, source.sourceId, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(result.deleted, true);
    assert.equal(result.receipts_degraded, 1);
    assert.equal(db.prepare('SELECT id FROM source_records WHERE id = ?').get(source.sourceId), undefined);
    assert.equal(db.prepare('SELECT id FROM notes WHERE id = ?').get(source.projectionNoteId), undefined);
    assert.equal(existsSync(blobPath), false);
    const degraded = db.prepare(`
      SELECT source_record_id, source_materialization_id, source_excerpt, reference_type, metadata
      FROM note_block_sources WHERE id = ?
    `).get(receipt.receiptId) as any;
    assert.equal(degraded.source_record_id, null);
    assert.equal(degraded.source_materialization_id, null);
    assert.equal(degraded.source_excerpt, 'Evidence excerpt');
    assert.equal(degraded.reference_type, 'range');
    assert.equal(JSON.parse(degraded.metadata).locator, 'paragraph-1');
  });
});

test('Source hard delete restores quarantine on DB failure and queues failed final unlink for retry', async () => {
  await withLifecycleStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const first = await materializeTextSource(db, userId, courseId, sourceRootDir, canvasAssetRootDir);
    const firstBlob = sourceBlobPath(db, sourceRootDir, first.sourceId);
    assert.throws(() => deleteSourceWithCompensation(db, userId, first.sourceId, {
      sourceRootDir,
      canvasAssetRootDir,
      beforeDatabaseCommit: () => { throw new Error('injected DB failure'); },
    }), /injected DB failure/);
    assert.ok(db.prepare('SELECT id FROM source_records WHERE id = ?').get(first.sourceId));
    assert.equal(existsSync(firstBlob), true);

    const secondCourse = seedCourse(db, userId, 'Second lifecycle project');
    const second = await materializeTextSource(db, userId, secondCourse, sourceRootDir, canvasAssetRootDir);
    const result = deleteSourceWithCompensation(db, userId, second.sourceId, {
      sourceRootDir,
      canvasAssetRootDir,
      unlinkFile: () => {
        const error = new Error('injected unlink failure') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        throw error;
      },
    });
    assert.equal(result.cleanup_jobs_created, 1);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM managed_file_cleanup_jobs WHERE status = 'pending'").get() as any).count, 1);
    const drained = drainManagedFileCleanupJobs(db, { sourceRootDir, canvasAssetRootDir });
    assert.equal(drained.completed, 1);
    assert.equal(drained.pending, 0);
  });
});

test('Source deletion refuses to race an active materialization run', async () => {
  await withLifecycleStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const upload = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: uploadFile(sourceRootDir, 'active.txt', 'still parsing', 'text/plain'),
    }, { rootDir: sourceRootDir });
    db.prepare("UPDATE source_materializations SET status = 'parsing', started_at = datetime('now') WHERE source_record_id = ?")
      .run(upload.source.id);
    assert.throws(
      () => deleteSourceWithCompensation(db, userId, upload.source.id, { sourceRootDir, canvasAssetRootDir }),
      (error: any) => error?.statusCode === 409 && error?.details?.code === 'source_materialization_active',
    );
    assert.ok(db.prepare('SELECT id FROM source_records WHERE id = ?').get(upload.source.id));
  });
});

test('physical Source and image asset cleanup runs only after the Source DB transaction commits', async () => {
  await withLifecycleStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const source = await materializeImageSource(db, userId, courseId, sourceRootDir, canvasAssetRootDir);
    let cleanupCalls = 0;
    deleteSourceWithCompensation(db, userId, source.sourceId, {
      sourceRootDir,
      canvasAssetRootDir,
      unlinkFile: (path) => {
        assert.equal(db.prepare('SELECT id FROM source_records WHERE id = ?').get(source.sourceId), undefined);
        cleanupCalls += 1;
        unlinkSync(path);
      },
    });
    assert.equal(cleanupCalls, 2);
  });
});
