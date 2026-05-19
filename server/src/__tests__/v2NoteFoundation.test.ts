import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-v2-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

test('v2 note foundation migration creates additive tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    for (const tableName of [
      'operation_batches',
      'notes',
      'note_blocks',
      'note_block_placements',
      'note_block_sources',
      'projections',
    ]) {
      assert.equal(tableNames.includes(tableName), true, `${tableName} should exist`);
    }

    assert.equal(tableNames.includes('cards'), true, 'existing cards table should remain');
    assert.equal(tableNames.includes('card_decks'), true, 'existing decks table should remain');
  });
});

test('a note is an ordered view over course-rooted note blocks', async () => {
  await withDb((db) => {
    const userId = uuidv4();
    const courseId = uuidv4();
    const noteId = uuidv4();
    const firstBlockId = uuidv4();
    const secondBlockId = uuidv4();

    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
      .run(userId, 'v2@example.com', 'hash', 'V2 User');
    db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
      .run(courseId, userId, 'Calculus');
    db.prepare('INSERT INTO notes (id, user_id, course_id, title) VALUES (?, ?, ?, ?)')
      .run(noteId, userId, courseId, 'Week 1');
    db.prepare('INSERT INTO note_blocks (id, user_id, course_id, block_type, title, content_json, plain_text) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(firstBlockId, userId, courseId, 'heading', 'Limits', '{"body":"Limits"}', 'Limits');
    db.prepare('INSERT INTO note_blocks (id, user_id, course_id, block_type, title, content_json, plain_text) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(secondBlockId, userId, courseId, 'definition', 'Continuity', '{"body":"Continuous at a point"}', 'Continuous at a point');
    db.prepare('INSERT INTO note_block_placements (id, note_id, block_id, order_index) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), noteId, secondBlockId, 1);
    db.prepare('INSERT INTO note_block_placements (id, note_id, block_id, order_index) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), noteId, firstBlockId, 0);

    const blocks = db.prepare(`
      SELECT nb.block_type, nb.title
      FROM note_block_placements nbp
      JOIN note_blocks nb ON nb.id = nbp.block_id
      WHERE nbp.note_id = ?
      ORDER BY nbp.order_index ASC
    `).all(noteId) as Array<{ block_type: string; title: string }>;

    assert.deepEqual(blocks.map((block) => block.title), ['Limits', 'Continuity']);
  });
});

test('projection snapshots remain stable after a source block changes', async () => {
  await withDb((db) => {
    const userId = uuidv4();
    const courseId = uuidv4();
    const blockId = uuidv4();
    const projectionId = uuidv4();

    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
      .run(userId, 'snapshot@example.com', 'hash', 'Snapshot User');
    db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
      .run(courseId, userId, 'Linear Algebra');
    db.prepare('INSERT INTO note_blocks (id, user_id, course_id, block_type, title, content_json, plain_text) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(blockId, userId, courseId, 'formula', 'Original Formula', '{"body":"a^2+b^2=c^2"}', 'a^2+b^2=c^2');

    const snapshot = {
      blocks: [{ id: blockId, title: 'Original Formula', plain_text: 'a^2+b^2=c^2' }],
    };
    db.prepare('INSERT INTO projections (id, user_id, course_id, type, title, snapshot_json, source_versions_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(projectionId, userId, courseId, 'organized_note', 'Snapshot', JSON.stringify(snapshot), JSON.stringify({ [blockId]: 'initial' }));

    db.prepare('UPDATE note_blocks SET title = ?, plain_text = ? WHERE id = ?')
      .run('Edited Formula', 'changed', blockId);

    const projection = db.prepare('SELECT snapshot_json FROM projections WHERE id = ?').get(projectionId) as { snapshot_json: string };
    assert.deepEqual(JSON.parse(projection.snapshot_json), snapshot);
  });
});
