import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import noteBlockRoutes from '../routes/noteBlocks.js';
import annotationRoutes from '../routes/annotationTruths.js';
import { createBoardRouter } from '../routes/boards.js';
import { createBoard } from '../services/boards.js';
import { createBoardTextRange } from '../services/boardTextRanges.js';
import { replaceNoteAnnotationTruths } from '../services/annotationTruths.js';

const USER = 'atomic-user';
const NOTE = 'atomic-note';
const BLOCK = 'atomic-block';
const flow = (text: string) => ({ textflow_version: 1, units: [{ id: 'unit', text,
  writing_role: 'paragraph', indent_level: 0, order_index: 0, metadata: {}, status: 'active' }],
  inline_structures: [], metadata: {} });
const body = (text: string) => ({ content_json: { text_flow: flow(text) }, plain_text: text });
const annotation = { id: 'annotation', raw_label: 'Keep label', ranges: [{ id: 'range',
  target_kind: 'text_span', block_id: BLOCK, text_flow_id: `textflow-${BLOCK}`,
  text_unit_id: 'unit', start_offset: 7, end_offset: 13, range_text_cache: 'target', metadata: {} }] };

async function withFixture(run: (fixture: {
  db: Awaited<ReturnType<typeof initDb>>;
  snapshot: () => Record<string, unknown[]>;
  put: (path: string, input: unknown, status?: number) => Promise<any>;
}) => Promise<void>) {
  const db = await initDb(':memory:');
  let server: Server | undefined;
  try {
    db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?, 'atomic@example.test', 'synthetic', 'Atomic')").run(USER);
    db.prepare("INSERT INTO courses(id,user_id,name) VALUES('project',?,'Synthetic project')").run(USER);
    db.prepare("INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,'project','Synthetic note')").run(NOTE, USER);
    db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES(?,?,'project','paragraph',?,?)")
      .run(BLOCK, USER, JSON.stringify(body('before target after').content_json), 'before target after');
    db.prepare("INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES('placement',?,?,0)").run(NOTE, BLOCK);
    replaceNoteAnnotationTruths(db, USER, NOTE, [annotation]);
    db.transaction(() => {
      const { board } = createBoard(db, USER, { title: 'Synthetic board', purpose: { title: 'Assembly' } });
      createBoardTextRange(db, USER, board.id, { note_id: NOTE, block_id: BLOCK,
        text_flow_id: `textflow-${BLOCK}`, text_unit_id: 'unit', start_offset: 7, end_offset: 13,
        excerpt: 'target', at: '2026-09-10T12:00:00.000Z' });
    })();
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
    app.use('/api/note-blocks', noteBlockRoutes);
    app.use('/api/annotation-truths', annotationRoutes);
    app.use('/api/boards', createBoardRouter(() => db));
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    await run({ db,
      snapshot: () => Object.fromEntries(['notes', 'note_blocks', 'annotation_truths', 'annotation_ranges', 'board_text_ranges']
        .map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()])),
      put: async (path, input, status = 200) => {
        const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
        });
        const result = await response.json();
        assert.equal(response.status, status, JSON.stringify(result));
        return result;
      },
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    closeDb();
  }
}

test('B7 smoke 1 pre-fix: split body then annotation rejection cannot roll back body', async () => {
  await withFixture(async ({ put, snapshot }) => {
    const before = snapshot();
    await put(`/note-blocks/${BLOCK}`, body('insert before target after'));
    await put(`/annotation-truths/by-note/${NOTE}`, { annotations: [annotation, annotation] }, 400);
    // The first pre-implementation run used deepEqual here and failed as required.
    // Keep the old public consumers' split semantics explicit after the cutover.
    const after = snapshot();
    assert.notDeepEqual(after.note_blocks, before.note_blocks);
    assert.equal((after.note_blocks[0] as any).plain_text, 'insert before target after');
    for (const table of ['notes', 'annotation_truths', 'annotation_ranges', 'board_text_ranges']) {
      assert.deepEqual(after[table], before[table], table);
    }
  });
});

function composite(db: Awaited<ReturnType<typeof initDb>>, text = 'insert before target after') {
  const { text_save_revision } = db.prepare('SELECT text_save_revision FROM note_blocks WHERE id = ?').get(BLOCK) as any;
  const range = db.prepare('SELECT * FROM board_text_ranges').get() as any;
  return { note_id: NOTE, base_revision: text_save_revision, block: body(text),
    annotations: { range_updates: [{ annotation_id: annotation.id,
      range: { ...annotation.ranges[0], start_offset: 14, end_offset: 20 } }] },
    text_ranges: [{ id: range.id, block_id: BLOCK, text_flow_id: range.text_flow_id, text_unit_id: 'unit',
      start_offset: 14, end_offset: 20, excerpt: 'target', status: 'active', pre_edit_offsets: null }],
  };
}

test('B7 smoke 1: annotation validation after body and first range write rolls back every field', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const before = snapshot();
    const input = composite(db);
    input.annotations.range_updates.push(input.annotations.range_updates[0]);
    const failure = await put(`/note-blocks/${BLOCK}/text-save`, input, 400);
    assert.equal(failure.error, 'Invalid annotation range text edit');
    assert.deepEqual(snapshot(), before);
    assert.equal(db.inTransaction, false);
  });
});

test('B7 smoke 1: late board range storage failure rolls back body, annotation range and revision', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const before = snapshot();
    db.exec(`CREATE TRIGGER atomic_range_failure BEFORE UPDATE ON board_text_ranges
      BEGIN SELECT RAISE(ABORT, 'Synthetic late board range failure'); END`);
    await put(`/note-blocks/${BLOCK}/text-save`, composite(db), 500);
    assert.deepEqual(snapshot(), before);
    db.exec('DROP TRIGGER atomic_range_failure');
    const saved = await put(`/note-blocks/${BLOCK}/text-save`, composite(db));
    assert.equal(saved.revision, 1);
  });
});

test('B7 smoke 2: old revision returns explicit 409 and preserves the first complete result', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const input = composite(db);
    const first = await put(`/note-blocks/${BLOCK}/text-save`, input);
    assert.equal(first.revision, input.base_revision + 1);
    const beforeStale = snapshot();
    const stale = await put(`/note-blocks/${BLOCK}/text-save`, { ...input, block: body('stale second write') }, 409);
    assert.deepEqual(stale, { error: 'stale_revision', details: { code: 'stale_revision', current_revision: first.revision } });
    assert.deepEqual(snapshot(), beforeStale);
  });
});

test('B7 smoke 3: five fields, flow, annotations and board references commit together with the new revision', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const before = snapshot();
    const input = composite(db);
    const saved = await put(`/note-blocks/${BLOCK}/text-save`, { ...input,
      block: { ...input.block, block_type: 'heading', title: 'Atomic title', metadata: { sentinel: 'preserved' } },
    });
    const after = snapshot();
    const stored = after.note_blocks[0] as any;
    assert.equal(stored.title, 'Atomic title');
    assert.equal(stored.block_type, 'heading');
    assert.deepEqual(JSON.parse(stored.content_json), input.block.content_json);
    assert.equal(stored.plain_text, input.block.plain_text);
    assert.equal(JSON.parse(stored.metadata).sentinel, 'preserved');
    assert.equal(saved.revision, 1);
    assert.equal(saved.block.text_save_revision, 1);
    assert.equal(stored.text_save_revision, 1);
    assert.equal(saved.annotations[0].ranges[0].start_offset, 14);
    assert.equal((after.annotation_ranges[0] as any).start_offset, 14);
    assert.equal(saved.text_ranges[0].start_offset, 14);
    assert.equal(saved.text_ranges[0].status, 'active');
    assert.equal((after.board_text_ranges[0] as any).start_offset, 14);
    // Annotation truth identity/labels/relationships are not rewritten by range edits.
    assert.deepEqual(after.annotation_truths, before.annotation_truths);
    assert.equal(db.inTransaction, false);
  });
});

test('B7 body-only saves use the same door and allow empty annotation and board change sets', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const before = snapshot();
    const saved = await put(`/note-blocks/${BLOCK}/text-save`, {
      note_id: NOTE, base_revision: 0, block: body('before target after'),
      annotations: { range_updates: [] }, text_ranges: [],
    });
    assert.equal(saved.revision, 1);
    assert.equal(saved.block.plain_text, 'before target after');
    const after = snapshot();
    for (const table of ['annotation_truths', 'annotation_ranges', 'board_text_ranges']) {
      assert.deepEqual(after[table], before[table], table);
    }
  });
});

test('B7 range patches preserve other blocks and do not recreate independently deleted ranges', async () => {
  await withFixture(async ({ db, put }) => {
    db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,plain_text) VALUES('peer',?,'project','paragraph','peer text')").run(USER);
    replaceNoteAnnotationTruths(db, USER, NOTE, [{ ...annotation, ranges: [...annotation.ranges,
      { ...annotation.ranges[0], id: 'peer-range', block_id: 'peer' }] }]);
    const peerBefore = db.prepare("SELECT * FROM annotation_ranges WHERE id = 'peer-range'").get();
    const labelsBefore = db.prepare('SELECT * FROM annotation_truths').all();
    await put(`/note-blocks/${BLOCK}/text-save`, composite(db));
    assert.deepEqual(db.prepare("SELECT * FROM annotation_ranges WHERE id = 'peer-range'").get(), peerBefore);
    assert.deepEqual(db.prepare('SELECT * FROM annotation_truths').all(), labelsBefore);
    db.prepare("DELETE FROM annotation_ranges WHERE id = 'range'").run();
    await put(`/note-blocks/${BLOCK}/text-save`, composite(db));
    assert.equal(db.prepare("SELECT * FROM annotation_ranges WHERE id = 'range'").get(), undefined);
    assert.deepEqual(db.prepare("SELECT * FROM annotation_ranges WHERE id = 'peer-range'").get(), peerBefore);
  });
});

test('B7 smoke 5: legacy body, annotation and board range PUT consumers still work', async () => {
  await withFixture(async ({ db, put }) => {
    const input = composite(db);
    const saved = await put(`/note-blocks/${BLOCK}`, body('insert before target after'));
    assert.equal(saved.text_save_revision, 1);
    const stale = await put(`/note-blocks/${BLOCK}/text-save`, input, 409);
    assert.equal(stale.details.current_revision, 1);
    const annotations = await put(`/annotation-truths/by-note/${NOTE}`, {
      annotations: [{ ...annotation, ranges: [input.annotations.range_updates[0].range] }],
    });
    assert.equal(annotations[0].ranges[0].start_offset, 14);
    const ranges = await put(`/boards/text-ranges/by-note/${NOTE}`, { text_ranges: input.text_ranges });
    assert.equal(ranges.text_ranges[0].start_offset, 14);
    assert.equal(ranges.text_ranges[0].status, 'active');
  });
});

test('B7 a board range deleted before save is acknowledged as absent without recreating it', async () => {
  await withFixture(async ({ db, put }) => {
    const input = composite(db);
    db.prepare('DELETE FROM board_text_ranges WHERE id = ?').run(input.text_ranges[0].id);
    const saved = await put(`/note-blocks/${BLOCK}/text-save`, input);
    assert.equal(saved.revision, 1);
    assert.equal(saved.block.plain_text, input.block.plain_text);
    assert.equal(saved.annotations[0].ranges[0].start_offset, 14);
    assert.deepEqual(saved.text_ranges, []);
    assert.deepEqual(db.prepare('SELECT * FROM board_text_ranges').all(), []);
  });
});

test('B7 read-only source projection content stays closed in both text-save and legacy PUT', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    db.prepare("UPDATE note_blocks SET source_kind = 'source_projection' WHERE id = ?").run(BLOCK);
    const before = snapshot();
    const atomic = await put(`/note-blocks/${BLOCK}/text-save`, composite(db), 409);
    assert.equal(atomic.details.code, 'source_projection_read_only');
    const legacy = await put(`/note-blocks/${BLOCK}`, body('cannot change'), 409);
    assert.equal(legacy.details.code, 'source_projection_read_only');
    assert.deepEqual(snapshot(), before);
  });
});

const TRANSFER_TARGET = 'extracted-block';
function transferFixture(db: Awaited<ReturnType<typeof initDb>>, role = 'todo_item') {
  const unit = { ...flow('before target after').units[0], writing_role: role,
    order_index: 1, metadata: { checked: true, sentinel: 'unit metadata' } };
  const inline = { id: 'inline', parent_text_unit_id: unit.id, semantic_kind: 'inline_code',
    anchor_text: 'target', anchor_range: { start: 7, end: 13 }, field_values: { code: 'target' },
    metadata: { sentinel: 'inline metadata' }, status: 'active' };
  const peer = { ...flow('peer unit').units[0], id: 'peer-unit', order_index: 0 };
  const original = { content_json: { text_flow: { ...flow(''), units: [peer, unit], inline_structures: [inline] } },
    plain_text: 'peer unit\nbefore target after' };
  const remainder = { content_json: { text_flow: { ...flow(''), units: [peer], inline_structures: [] } }, plain_text: 'peer unit' };
  const empty = { content_json: { text_flow: { ...flow(''), units: [], inline_structures: [] } }, plain_text: '' };
  const extracted = { content_json: { text_flow: { ...flow(''), units: [{ ...unit, order_index: 0 }], inline_structures: [inline] } },
    plain_text: unit.text };
  db.prepare('UPDATE note_blocks SET content_json = ?, plain_text = ? WHERE id = ?')
    .run(JSON.stringify(original.content_json), original.plain_text, BLOCK);
  db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES(?,?,'project','paragraph',?,'')")
    .run(TRANSFER_TARGET, USER, JSON.stringify(empty.content_json));
  db.prepare("INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES('extracted-placement',?,?,1)")
    .run(NOTE, TRANSFER_TARGET);
  replaceNoteAnnotationTruths(db, USER, NOTE, [{ ...annotation, ranges: [...annotation.ranges,
    { id: 'inline-range', target_kind: 'inline_structure', block_id: BLOCK,
      text_flow_id: `textflow-${BLOCK}`, inline_structure_id: inline.id, metadata: { sentinel: 'inline anchor' } },
    { id: 'inline-only-range', target_kind: 'inline_structure', inline_structure_id: inline.id,
      metadata: { sentinel: 'inline identity without optional ownership columns' } },
    { id: 'peer-range', target_kind: 'text_unit', block_id: BLOCK,
      text_flow_id: `textflow-${BLOCK}`, text_unit_id: peer.id, metadata: { sentinel: 'peer anchor' } },
    { id: 'block-range', target_kind: 'block', block_id: BLOCK, metadata: { sentinel: 'block anchor' } },
  ] }]);
  return { original, remainder, empty, extracted,
    input: { note_id: NOTE, source_block_id: BLOCK, text_unit_id: unit.id,
      source_base_revision: 0, target_base_revision: 0, source_block: remainder, target_block: extracted } };
}

test('B10 extraction, undo and redo preserve todo/bullet units, inline and every anchor field', async () => {
  for (const role of ['todo_item', 'bullet_item']) {
    await withFixture(async ({ db, put, snapshot }) => {
      const fixture = transferFixture(db, role);
      const before = snapshot();
      const movedAnchors = (rows: unknown[]) => rows.map((row) => {
        const entry = row as Record<string, unknown>;
        return entry.text_unit_id === 'unit' || entry.inline_structure_id === 'inline'
          ? { ...entry, block_id: entry.block_id === null ? null : TRANSFER_TARGET,
            text_flow_id: entry.text_flow_id === null ? null : `textflow-${TRANSFER_TARGET}` } : entry;
      });
      const saved = await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, fixture.input);
      assert.equal(saved.source_revision, 1);
      assert.equal(saved.target_revision, 1);
      assert.deepEqual(saved.source_block.content_json, fixture.remainder.content_json);
      assert.deepEqual(saved.target_block.content_json, fixture.extracted.content_json);
      const after = snapshot();
      assert.deepEqual(after.annotation_truths, before.annotation_truths);
      assert.deepEqual(after.annotation_ranges, movedAnchors(before.annotation_ranges));
      assert.deepEqual(after.board_text_ranges, movedAnchors(before.board_text_ranges));
      assert.equal(saved.annotations[0].ranges.find((range: any) => range.id === 'range').block_id, TRANSFER_TARGET);
      assert.equal(saved.text_ranges[0].block_id, TRANSFER_TARGET);
      assert.equal(saved.text_ranges[0].status, 'active');
      const undone = await put(`/note-blocks/${BLOCK}/unit-transfer`, {
        ...fixture.input, source_block_id: TRANSFER_TARGET, source_base_revision: 1, target_base_revision: 1,
        source_block: fixture.empty, target_block: fixture.original,
      });
      assert.equal(undone.source_revision, 2);
      assert.equal(undone.target_revision, 2);
      assert.deepEqual(undone.source_block.content_json, fixture.empty.content_json);
      assert.deepEqual(undone.target_block.content_json, fixture.original.content_json);
      const undoSnapshot = snapshot();
      for (const table of ['annotation_truths', 'annotation_ranges', 'board_text_ranges']) {
        assert.deepEqual(undoSnapshot[table], before[table], `${role}: ${table}`);
      }
      await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, {
        ...fixture.input, source_base_revision: 2, target_base_revision: 2,
      });
      assert.deepEqual(snapshot().annotation_ranges, after.annotation_ranges);
      assert.deepEqual(snapshot().board_text_ranges, after.board_text_ranges);
    });
  }
});

test('B10 late anchor failure rolls back both block bodies, revisions and all anchor fields', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const fixture = transferFixture(db);
    const before = snapshot();
    db.exec(`CREATE TRIGGER transfer_range_failure BEFORE UPDATE ON board_text_ranges
      BEGIN SELECT RAISE(ABORT, 'Synthetic transfer anchor failure'); END`);
    await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, fixture.input, 500);
    assert.deepEqual(snapshot(), before);
    assert.equal(db.inTransaction, false);
    db.exec('DROP TRIGGER transfer_range_failure');
    await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, fixture.input);
  });
});

test('B10 stale source or target revisions and altered unit/inline payload never apply a partial move', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const fixture = transferFixture(db);
    const before = snapshot();
    for (const stale of [{ source_base_revision: 1 }, { target_base_revision: 1 }]) {
      const failure = await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, { ...fixture.input, ...stale }, 409);
      assert.equal(failure.error, 'stale_revision');
      assert.deepEqual(snapshot(), before);
    }
    const alteredUnit = structuredClone(fixture.input);
    alteredUnit.target_block.content_json.text_flow.units[0].writing_role = 'paragraph';
    await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, alteredUnit, 409);
    assert.deepEqual(snapshot(), before);
    const alteredInline = structuredClone(fixture.input);
    alteredInline.target_block.content_json.text_flow.inline_structures[0].anchor_range.end = 14;
    await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, alteredInline, 409);
    assert.deepEqual(snapshot(), before);
  });
});
