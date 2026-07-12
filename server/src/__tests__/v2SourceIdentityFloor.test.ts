import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import sourceIdentityMigration from '../db/migrations/045_v2_source_identity_floor.js';
import {
  createSourceIdentityFloor,
  ensureSourceProjectPlacement,
  findSourceRecordByContentHash,
} from '../services/sourceRecords.js';
import {
  assertCourseCanDelete,
  assertCourseCanRename,
  ensureHomeCourse,
} from '../services/systemCourses.js';
import { createLearningCanvas, createCanvasNoteBlock } from '../services/learningCanvases.js';
import { createCourseSchema, createNoteSchema, updateCourseSchema, updateNoteSchema } from '../validators/index.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-floor-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUserCourse(db: Awaited<ReturnType<typeof initDb>>, label = 'Source User') {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', label);
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(courseId, userId, `${label} Project`);
  return { userId, courseId };
}

function sourceInput(courseId: string, suffix: string, hash = `hash-${suffix}`) {
  return {
    course_id: courseId,
    display_name: `Source ${suffix}.pdf`,
    origin_entry_kind: 'project_upload' as const,
    file: {
      original_filename: `source-${suffix}.pdf`,
      storage_key: `source-user/file-${suffix}.pdf`,
      storage_state: 'ready' as const,
      mime_type: 'application/pdf',
      byte_size: 128,
      content_hash: hash,
    },
    materialization: {
      parser_key: 'native-pdf',
      parser_version: '2.4.5',
    },
  };
}

function tableColumns(db: Awaited<ReturnType<typeof initDb>>, tableName: string): string[] {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((row: any) => row.name);
}

test('V2.BN.10.1 migration creates four Source layers, additive seams, and idempotent backing-note backfill', async () => {
  await withDb((db) => {
    const tables = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[])
      .map((row) => row.name));
    for (const table of [
      'source_records',
      'source_files',
      'source_materializations',
      'source_project_placements',
    ]) {
      assert.equal(tables.has(table), true, `missing ${table}`);
    }

    assert.equal(tableColumns(db, 'notes').includes('note_class'), true);
    assert.equal(tableColumns(db, 'courses').includes('system_kind'), true);
    assert.equal(tableColumns(db, 'note_block_sources').includes('source_record_id'), true);
    assert.equal(tableColumns(db, 'note_block_sources').includes('source_materialization_id'), true);

    const { userId, courseId } = seedUserCourse(db, 'Backfill User');
    const noteId = uuidv4();
    db.prepare(`
      INSERT INTO notes (id, user_id, course_id, title, page_format, note_class, metadata)
      VALUES (?, ?, ?, 'Legacy canvas backing', 'canvas_backing', 'user', '{}')
    `).run(noteId, userId, courseId);

    sourceIdentityMigration.up(db);
    sourceIdentityMigration.up(db);

    const note = db.prepare('SELECT note_class FROM notes WHERE id = ?').get(noteId) as { note_class: string };
    assert.equal(note.note_class, 'system');
  });
});

test('Source identity service creates one record, file, run, and idempotent Project placement', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const created = createSourceIdentityFloor(db, userId, sourceInput(courseId, 'a'));

    assert.equal(created.source_record.display_name, 'Source a.pdf');
    assert.equal(created.source_record.origin_course_id, courseId);
    assert.equal(created.source_record.origin_course_name_snapshot, 'Source User Project');
    assert.equal(created.source_file.source_record_id, created.source_record.id);
    assert.equal(created.materialization.source_record_id, created.source_record.id);
    assert.equal(created.materialization.status, 'received');
    assert.equal(created.placement.course_id, courseId);

    const match = findSourceRecordByContentHash(db, userId, 'hash-a');
    assert.equal(match?.source_record_id, created.source_record.id);
    assert.equal(match?.source_file_id, created.source_file.id);
    assert.equal(match?.storage_state, 'ready');

    const repeated = ensureSourceProjectPlacement(db, userId, created.source_record.id, courseId);
    assert.equal(repeated.placement.id, created.placement.id);
    assert.equal(repeated.created, false);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_project_placements').get() as any).count, 1);
  });
});

test('database constraints enforce per-user hash, placement, and v1 materialization uniqueness', async () => {
  await withDb((db) => {
    const first = seedUserCourse(db, 'First Source User');
    const created = createSourceIdentityFloor(db, first.userId, sourceInput(first.courseId, 'first', 'shared-hash'));

    assert.throws(() => createSourceIdentityFloor(
      db,
      first.userId,
      sourceInput(first.courseId, 'duplicate', 'shared-hash'),
    ));

    const second = seedUserCourse(db, 'Second Source User');
    assert.doesNotThrow(() => createSourceIdentityFloor(
      db,
      second.userId,
      sourceInput(second.courseId, 'other-user', 'shared-hash'),
    ));

    assert.throws(() => db.prepare(`
      INSERT INTO source_materializations (
        id, source_record_id, source_file_id, user_id, parser_key, parser_version, status
      ) VALUES (?, ?, ?, ?, 'native-pdf', '2.4.5', 'received')
    `).run(uuidv4(), created.source_record.id, created.source_file.id, first.userId));

    assert.throws(() => db.prepare(`
      INSERT INTO source_project_placements (id, source_record_id, course_id, user_id)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), created.source_record.id, first.courseId, first.userId));
  });
});

test('materialization state constraint permits a missing projection only after materialization', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const created = createSourceIdentityFloor(db, userId, sourceInput(courseId, 'state'));
    const noteId = uuidv4();
    db.prepare(`
      INSERT INTO notes (id, user_id, course_id, title, metadata)
      VALUES (?, ?, ?, 'Projection', '{}')
    `).run(noteId, userId, courseId);

    assert.doesNotThrow(() => db.prepare(`
      UPDATE source_materializations
      SET status='materialized', projection_note_id=NULL
      WHERE id=?
    `).run(created.materialization.id));

    db.prepare(`
      UPDATE source_materializations
      SET status='materialized', projection_note_id=?
      WHERE id=?
    `).run(noteId, created.materialization.id);

    assert.throws(() => db.prepare(`
      UPDATE source_materializations
      SET status='received'
      WHERE id=?
    `).run(created.materialization.id));
  });
});

test('Project deletion removes only its placement and preserves Source origin receipt', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db, 'Origin User');
    const secondCourseId = uuidv4();
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, 'Second Project', datetime('now'), datetime('now'))
    `).run(secondCourseId, userId);
    const created = createSourceIdentityFloor(db, userId, sourceInput(courseId, 'origin'));
    ensureSourceProjectPlacement(db, userId, created.source_record.id, secondCourseId);

    db.prepare('DELETE FROM courses WHERE id = ?').run(secondCourseId);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_project_placements WHERE source_record_id = ?')
      .get(created.source_record.id) as any).count, 1);

    db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    const record = db.prepare(`
      SELECT origin_course_id, origin_course_name_snapshot
      FROM source_records
      WHERE id = ?
    `).get(created.source_record.id) as any;
    assert.equal(record.origin_course_id, null);
    assert.equal(record.origin_course_name_snapshot, 'Origin User Project');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_files WHERE source_record_id = ?')
      .get(created.source_record.id) as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_project_placements WHERE source_record_id = ?')
      .get(created.source_record.id) as any).count, 0);
  });
});

test('Home is unique and protected while ordinary Project mutations remain valid', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const first = ensureHomeCourse(db, userId);
    const second = ensureHomeCourse(db, userId);
    assert.equal(first.id, second.id);
    assert.equal(first.system_kind, 'home');

    assert.throws(() => db.prepare(`
      INSERT INTO courses (id, user_id, name, system_kind, created_at, updated_at)
      VALUES (?, ?, 'Another Home', 'home', datetime('now'), datetime('now'))
    `).run(uuidv4(), userId));

    assert.throws(() => assertCourseCanRename(first, 'Renamed Home'), /cannot be renamed/i);
    assert.throws(() => assertCourseCanDelete(first), /cannot be deleted/i);

    const ordinary = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as any;
    assert.doesNotThrow(() => assertCourseCanRename(ordinary, 'Renamed Project'));
    assert.doesNotThrow(() => assertCourseCanDelete(ordinary));

    assert.equal('system_kind' in createCourseSchema.parse({ name: 'Normal', system_kind: 'home' }), false);
    assert.equal('system_kind' in updateCourseSchema.parse({ description: 'Safe', system_kind: 'home' }), false);
    assert.equal('note_class' in createNoteSchema.parse({
      course_id: courseId,
      title: 'Normal note',
      note_class: 'system',
    }), false);
    assert.equal('note_class' in updateNoteSchema.parse({
      title: 'Normal note',
      note_class: 'system',
    }), false);
  });
});

test('learning-canvas forward path creates a system-class backing note', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId, title: 'Source floor canvas' }) as any;
    const result = createCanvasNoteBlock(db, userId, canvas.id, {
      template_id: 'text.paragraph',
      plain_text: 'Forward-path check',
      content_json: { body: 'Forward-path check' },
    }) as any;
    const note = db.prepare('SELECT note_class FROM notes WHERE id = ?').get(result.note.id) as any;
    assert.equal(note.note_class, 'system');
  });
});
