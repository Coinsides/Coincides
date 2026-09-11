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
import { listAnnotationTruths, replaceNoteAnnotationTruths } from '../services/annotationTruths.js';
import { createClientNoteBlock } from '../services/noteBlockLifecycle.js';

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

function boardRangeHistoryInput(db: Awaited<ReturnType<typeof initDb>>, drifted = false) {
  const input = composite(db, drifted ? 'before  after' : 'before target after');
  return { ...input, annotations: { range_updates: [] }, text_ranges: input.text_ranges.map((range) => ({
    ...range, start_offset: drifted ? null : 7, end_offset: drifted ? null : 13,
    status: drifted ? 'drifted' : 'active',
    pre_edit_offsets: drifted ? { start_offset: 7, end_offset: 13 } : null,
  })) };
}

test('F17 history undo/redo restores exact board ranges with consecutive revisions and per-range intent', async () => {
  await withFixture(async ({ db, put }) => {
    const original = boardRangeHistoryInput(db);
    const board = db.prepare('SELECT board_id FROM board_text_ranges').get() as { board_id: string };
    const peer = db.transaction(() => createBoardTextRange(db, USER, board.board_id, {
      note_id: NOTE, block_id: BLOCK, text_flow_id: `textflow-${BLOCK}`, text_unit_id: 'unit',
      start_offset: 7, end_offset: 13, excerpt: 'target', at: '2026-09-10T12:00:00.000Z',
    }))();
    const stored = (id: string) => db.prepare(`SELECT block_id, text_flow_id, text_unit_id,
      start_offset, end_offset, excerpt, status, pre_edit_offsets FROM board_text_ranges WHERE id = ?`).get(id);
    const originalState = stored(original.text_ranges[0].id);
    const edit = boardRangeHistoryInput(db, true);
    edit.text_ranges.push({ ...edit.text_ranges[0], id: peer.id });
    const changed = await put(`/note-blocks/${BLOCK}/text-save`, edit);
    assert.equal(changed.revision, 1);
    const driftedState = stored(original.text_ranges[0].id);
    assert.equal((driftedState as any).status, 'drifted');

    const undone = await put(`/note-blocks/${BLOCK}/text-save`, { ...original, base_revision: 1,
      text_ranges: [{ ...original.text_ranges[0], history_restore: true }, { ...original.text_ranges[0], id: peer.id }],
    });
    assert.equal(undone.revision, 2);
    assert.deepEqual(stored(original.text_ranges[0].id), originalState);
    assert.equal(undone.text_ranges.find((range: any) => range.id === original.text_ranges[0].id).status, 'active');
    assert.equal(undone.text_ranges.find((range: any) => range.id === original.text_ranges[0].id).pre_edit_offsets, null);
    // Intent on one range cannot revive another range in the same transaction.
    assert.equal((stored(peer.id) as any).status, 'drifted');
    assert.equal((stored(peer.id) as any).pre_edit_offsets, JSON.stringify({ start_offset: 7, end_offset: 13 }));

    const redone = await put(`/note-blocks/${BLOCK}/text-save`, { ...edit, base_revision: 2,
      text_ranges: [{ ...edit.text_ranges[0], history_restore: true }],
    });
    assert.equal(redone.revision, 3);
    assert.deepEqual(stored(original.text_ranges[0].id), driftedState);
    assert.equal(redone.text_ranges.find((range: any) => range.id === original.text_ranges[0].id).status, 'drifted');
    assert.equal(db.prepare('SELECT text_save_revision FROM note_blocks WHERE id = ?').pluck().get(BLOCK), 3);
  });
});

test('F17 ordinary atomic saves retain drift status, original excerpt and pre-edit evidence', async () => {
  await withFixture(async ({ db, put }) => {
    await put(`/note-blocks/${BLOCK}/text-save`, boardRangeHistoryInput(db, true));
    for (const status of ['active', 'drifted', 'lost']) {
      const input = boardRangeHistoryInput(db);
      input.text_ranges[0] = { ...input.text_ranges[0], excerpt: 'replacement evidence', status,
        pre_edit_offsets: status === 'active' ? null : { start_offset: 1, end_offset: 2 } };
      await put(`/note-blocks/${BLOCK}/text-save`, input);
      const row = db.prepare('SELECT status, excerpt, pre_edit_offsets FROM board_text_ranges').get();
      assert.deepEqual(row, { status: 'drifted', excerpt: 'target',
        pre_edit_offsets: JSON.stringify({ start_offset: 7, end_offset: 13 }) });
    }
  });
});

test('F17 late history range failure rolls back body, annotations and revision and permits the same retry', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    await put(`/note-blocks/${BLOCK}/text-save`, boardRangeHistoryInput(db, true));
    const input = boardRangeHistoryInput(db);
    const restoredAnnotation = { ...annotation.ranges[0], start_offset: 0, end_offset: 6, range_text_cache: 'before' };
    const restore = { ...input,
      annotations: { range_updates: [{ annotation_id: annotation.id, range: restoredAnnotation }] },
      text_ranges: input.text_ranges.map((range) => ({ ...range, history_restore: true })),
    };
    const before = snapshot();
    // The board failure fires only after this transaction has changed the annotation range.
    db.exec(`CREATE TRIGGER history_restore_failure BEFORE UPDATE ON board_text_ranges
      WHEN EXISTS (SELECT 1 FROM annotation_ranges WHERE id = 'range'
        AND start_offset = 0 AND end_offset = 6 AND range_text_cache = 'before')
      BEGIN SELECT RAISE(ABORT, 'Synthetic history range failure'); END`);
    await put(`/note-blocks/${BLOCK}/text-save`, restore, 500);
    assert.deepEqual(snapshot(), before);
    assert.equal(db.inTransaction, false);
    db.exec('DROP TRIGGER history_restore_failure');
    const retried = await put(`/note-blocks/${BLOCK}/text-save`, restore);
    assert.equal(retried.revision, 2);
    assert.equal(retried.text_ranges[0].status, 'active');
    assert.equal(retried.text_ranges[0].pre_edit_offsets, null);
    assert.deepEqual(db.prepare(`SELECT start_offset, end_offset, range_text_cache
      FROM annotation_ranges WHERE id = 'range'`).get(),
    { start_offset: 0, end_offset: 6, range_text_cache: 'before' });
  });
});

test('F17 the standalone board range PUT does not accept atomic history intent', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    await put(`/note-blocks/${BLOCK}/text-save`, boardRangeHistoryInput(db, true));
    const before = snapshot();
    const range = boardRangeHistoryInput(db).text_ranges[0];
    await put(`/boards/text-ranges/by-note/${NOTE}`, { text_ranges: [{ ...range, history_restore: true }] }, 400);
    assert.deepEqual(snapshot(), before);
  });
});

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

function crossBlockFixture(db: Awaited<ReturnType<typeof initDb>>, lastSourceUnit = false) {
  const fixture = transferFixture(db, 'bullet_item');
  const moving = fixture.original.content_json.text_flow.units[1];
  const first = { ...flow('target first').units[0], id: 'target-first', writing_role: 'heading',
    metadata: { level: 2, sentinel: 'target first metadata' } };
  const last = { ...flow('target last').units[0], id: 'target-last', order_index: 1,
    writing_role: 'todo_item', metadata: { checked: true, sentinel: 'target last metadata' } };
  const targetInline = { ...fixture.extracted.content_json.text_flow.inline_structures[0],
    id: 'target-inline', parent_text_unit_id: first.id, anchor_text: 'target',
    anchor_range: { start: 0, end: 6 }, metadata: { sentinel: 'target inline metadata' } };
  const target = { content_json: { custom_body: 'target body metadata', text_flow: {
    ...flow(''), metadata: { sentinel: 'target flow metadata' },
    units: [first, last], inline_structures: [targetInline],
  } }, plain_text: 'target first\ntarget last' };
  const merged = { content_json: { ...target.content_json, text_flow: { ...target.content_json.text_flow,
    units: [first, { ...moving, order_index: 1 }, { ...last, order_index: 2 }],
    inline_structures: [targetInline, ...fixture.extracted.content_json.text_flow.inline_structures],
  } }, plain_text: 'target first\nbefore target after\ntarget last' };
  const original = lastSourceUnit ? { ...fixture.original, content_json: {
    ...fixture.original.content_json, text_flow: { ...fixture.original.content_json.text_flow,
      units: [{ ...moving, order_index: 0 }],
    },
  }, plain_text: moving.text } : fixture.original;
  const remainder = lastSourceUnit ? fixture.empty : fixture.remainder;
  const setBody = db.prepare('UPDATE note_blocks SET content_json = ?, plain_text = ?, title = ?, metadata = ? WHERE id = ?');
  setBody.run(JSON.stringify(original.content_json), original.plain_text, 'Source title',
    JSON.stringify({ sentinel: 'source block metadata' }), BLOCK);
  setBody.run(JSON.stringify(target.content_json), target.plain_text, 'Existing target title',
    JSON.stringify({ sentinel: 'target block metadata' }), TRANSFER_TARGET);
  const currentAnnotations = listAnnotationTruths(db, USER, NOTE);
  replaceNoteAnnotationTruths(db, USER, NOTE, [{ ...currentAnnotations[0], ranges: [
    ...currentAnnotations[0].ranges,
    { id: 'target-range', target_kind: 'text_span', block_id: TRANSFER_TARGET,
      text_flow_id: `textflow-${TRANSFER_TARGET}`, text_unit_id: first.id,
      start_offset: 0, end_offset: 6, range_text_cache: 'target', metadata: { sentinel: 'target range' } },
    { id: 'target-inline-range', target_kind: 'inline_structure', block_id: TRANSFER_TARGET,
      text_flow_id: `textflow-${TRANSFER_TARGET}`, inline_structure_id: targetInline.id,
      metadata: { sentinel: 'target inline range' } },
  ] }]);
  const board = db.prepare('SELECT board_id FROM board_text_ranges LIMIT 1').get() as { board_id: string };
  db.transaction(() => createBoardTextRange(db, USER, board.board_id, { note_id: NOTE, block_id: TRANSFER_TARGET,
    text_flow_id: `textflow-${TRANSFER_TARGET}`, text_unit_id: first.id, start_offset: 0, end_offset: 6,
    excerpt: 'target', at: '2026-09-10T12:00:00.000Z' }))();
  return { original, target, remainder, merged,
    input: { ...fixture.input, source_block: remainder, target_block: merged } };
}

test('C3 smoke 1/2/3: existing target gap insertion and one transfer undo/redo preserve both blocks and every anchor field', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const fixture = crossBlockFixture(db);
    const before = snapshot();
    const placementsBefore = db.prepare('SELECT * FROM note_block_placements ORDER BY rowid').all();
    const blockFields = (rows: unknown[]) => rows.map((row) => {
      const { updated_at: _at, text_save_revision: _revision, ...fields } = row as Record<string, unknown>;
      return fields;
    });
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
    assert.deepEqual(saved.target_block.content_json, fixture.merged.content_json);
    assert.deepEqual(saved.target_block.content_json.text_flow.units.map((unit: any) => [unit.id, unit.writing_role]),
      [['target-first', 'heading'], ['unit', 'bullet_item'], ['target-last', 'todo_item']]);
    const after = snapshot();
    assert.deepEqual(after.annotation_truths, before.annotation_truths);
    assert.deepEqual(after.annotation_ranges, movedAnchors(before.annotation_ranges));
    assert.deepEqual(after.board_text_ranges, movedAnchors(before.board_text_ranges));
    assert.deepEqual(db.prepare('SELECT * FROM note_block_placements ORDER BY rowid').all(), placementsBefore);

    const undone = await put(`/note-blocks/${BLOCK}/unit-transfer`, { ...fixture.input,
      source_block_id: TRANSFER_TARGET, source_base_revision: 1, target_base_revision: 1,
      source_block: fixture.target, target_block: fixture.original,
    });
    assert.equal(undone.source_revision, 2);
    assert.equal(undone.target_revision, 2);
    const restored = snapshot();
    assert.deepEqual(blockFields(restored.note_blocks), blockFields(before.note_blocks));
    for (const table of ['annotation_truths', 'annotation_ranges', 'board_text_ranges']) {
      assert.deepEqual(restored[table], before[table], table);
    }
    await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, { ...fixture.input,
      source_base_revision: 2, target_base_revision: 2,
    });
    const replayed = snapshot();
    assert.deepEqual(blockFields(replayed.note_blocks), blockFields(after.note_blocks));
    for (const table of ['annotation_truths', 'annotation_ranges', 'board_text_ranges']) {
      assert.deepEqual(replayed[table], after[table], table);
    }
    assert.deepEqual(db.prepare('SELECT * FROM note_block_placements ORDER BY rowid').all(), placementsBefore);
  });
});

test('C3 smoke 4: moving the final source unit into an existing target leaves its active empty block and placement', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const fixture = crossBlockFixture(db, true);
    const before = snapshot();
    const placements = db.prepare('SELECT * FROM note_block_placements ORDER BY rowid').all();
    const saved = await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, fixture.input);
    assert.equal(saved.source_block.status, 'active');
    assert.equal(saved.source_block.plain_text, '');
    assert.deepEqual(saved.source_block.content_json, fixture.remainder.content_json);
    assert.equal(snapshot().note_blocks.length, before.note_blocks.length);
    assert.deepEqual(db.prepare('SELECT * FROM note_block_placements ORDER BY rowid').all(), placements);
    const undone = await put(`/note-blocks/${BLOCK}/unit-transfer`, { ...fixture.input,
      source_block_id: TRANSFER_TARGET, source_base_revision: 1, target_base_revision: 1,
      source_block: fixture.target, target_block: fixture.original,
    });
    assert.deepEqual(undone.target_block.content_json, fixture.original.content_json);
    assert.deepEqual(snapshot().annotation_ranges, before.annotation_ranges);
    assert.deepEqual(snapshot().board_text_ranges, before.board_text_ranges);
  });
});

test('C3 existing-target stale revisions and late anchor failure leave both populated blocks unchanged', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const fixture = crossBlockFixture(db);
    const before = snapshot();
    for (const stale of [{ source_base_revision: 1 }, { target_base_revision: 1 }]) {
      const failure = await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, { ...fixture.input, ...stale }, 409);
      assert.equal(failure.error, 'stale_revision');
      assert.deepEqual(snapshot(), before);
    }
    db.exec(`CREATE TRIGGER cross_block_range_failure BEFORE UPDATE ON board_text_ranges
      BEGIN SELECT RAISE(ABORT, 'Synthetic existing-target anchor failure'); END`);
    await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, fixture.input, 500);
    assert.deepEqual(snapshot(), before);
    assert.equal(db.inTransaction, false);
    db.exec('DROP TRIGGER cross_block_range_failure');
    await put(`/note-blocks/${TRANSFER_TARGET}/unit-transfer`, fixture.input);
  });
});

function ordinaryCrossBlockFixture(db: Awaited<ReturnType<typeof initDb>>, reverse = false) {
  // Both ordinary drafts use the real creation door and keep its local tu-1 naming.
  const create = (label: string, role: string) => {
    const text = `${label} target`;
    const inline = { id: 'inline-1', parent_text_unit_id: 'tu-1', semantic_kind: 'inline_code',
      anchor_text: 'target', anchor_range: { start: text.indexOf('target'), end: text.length },
      field_values: { code: 'target', sentinel: label }, metadata: { sentinel: label }, status: 'active' };
    const block = { content_json: { custom_body: label, text_flow: { ...flow(text),
      textflow_version: 'TextBlockContentV1', metadata: { sentinel: label },
      units: [{ ...flow(text).units[0], id: 'tu-1', writing_role: role, indent_level: 2,
        metadata: { checked: true, sentinel: label } }],
      inline_structures: [inline, { ...inline, id: `${label}-stable-inline` }],
    } }, plain_text: text };
    const created = createClientNoteBlock(db, USER, NOTE, 'project', {
      client_create_key: `c3-default-${label}`, block_type: 'paragraph', title: `${label} title`,
      metadata: { sentinel: `${label} block metadata` }, ...block,
    });
    assert.equal(created.status, 'applied');
    assert.ok(created.status === 'applied');
    const blockId = String(created.block.id);
    assert.deepEqual(JSON.parse(String(created.block.content_json)), block.content_json);
    const ownership = { block_id: blockId, text_flow_id: `textflow-${blockId}` };
    const ranges = [
      { id: `${label}-span`, target_kind: 'text_span', ...ownership, text_unit_id: 'tu-1',
        start_offset: text.indexOf('target'), end_offset: text.length, range_text_cache: 'target',
        metadata: { sentinel: `${label} span` } },
      { id: `${label}-inline`, target_kind: 'inline_structure', ...ownership,
        inline_structure_id: inline.id, metadata: { sentinel: `${label} inline` } },
      { id: `${label}-combined`, target_kind: 'inline_structure', ...ownership, text_unit_id: 'tu-1',
        inline_structure_id: inline.id, start_offset: text.indexOf('target'), end_offset: text.length,
        range_text_cache: 'target', metadata: { sentinel: `${label} combined` } },
      { id: `${label}-flow-only-inline`, target_kind: 'inline_structure', text_flow_id: ownership.text_flow_id,
        inline_structure_id: inline.id, metadata: { sentinel: `${label} flow ownership` } },
      { id: `${label}-stable-inline`, target_kind: 'inline_structure', inline_structure_id: `${label}-stable-inline`,
        metadata: { sentinel: `${label} unscoped unique inline` } },
      { id: `${label}-block`, target_kind: 'block', ...ownership, metadata: { sentinel: `${label} block anchor` } },
    ];
    const board = db.prepare('SELECT board_id FROM board_text_ranges LIMIT 1').get() as { board_id: string };
    db.transaction(() => createBoardTextRange(db, USER, board.board_id, { note_id: NOTE, ...ownership,
      text_unit_id: 'tu-1', start_offset: text.indexOf('target'), end_offset: text.length,
      excerpt: 'target', at: '2026-09-10T12:00:00.000Z' }))();
    return { label, blockId, block, ranges };
  };
  const left = create('left', 'bullet_item');
  const right = create('right', 'todo_item');
  const existing = listAnnotationTruths(db, USER, NOTE);
  replaceNoteAnnotationTruths(db, USER, NOTE, [...existing,
    { id: 'left-annotation', raw_label: 'Left annotation', ranges: left.ranges },
    { id: 'right-annotation', raw_label: 'Right annotation', ranges: right.ranges },
  ]);
  const source = reverse ? right : left;
  const target = reverse ? left : right;
  const idMapping = { unit_id: 'tu-1-moved', inline_ids: { 'inline-1': 'inline-1-moved' } };
  const remainder = { content_json: { ...source.block.content_json, text_flow: {
    ...source.block.content_json.text_flow, units: [], inline_structures: [],
  } }, plain_text: '' };
  const merged = { content_json: { ...target.block.content_json, text_flow: {
    ...target.block.content_json.text_flow,
    units: [...target.block.content_json.text_flow.units,
      { ...source.block.content_json.text_flow.units[0], id: idMapping.unit_id, order_index: 1 }],
    inline_structures: [...target.block.content_json.text_flow.inline_structures,
      ...source.block.content_json.text_flow.inline_structures.map((inline) => ({ ...inline,
        id: inline.id === 'inline-1' ? idMapping.inline_ids['inline-1'] : inline.id,
        parent_text_unit_id: idMapping.unit_id,
      }))],
  } }, plain_text: `${target.block.plain_text}\n${source.block.plain_text}` };
  return { source, target, remainder, merged, idMapping,
    input: { note_id: NOTE, source_block_id: source.blockId, text_unit_id: 'tu-1', id_mapping: idMapping,
      source_base_revision: 0, target_base_revision: 0, source_block: remainder, target_block: merged } };
}

test('C3 HQ smoke: ordinary tu-1 blocks move first lines in both directions with reversible IDs and every anchor field intact', async () => {
  for (const reverse of [false, true]) {
    await withFixture(async ({ db, put, snapshot }) => {
      const fixture = ordinaryCrossBlockFixture(db, reverse);
      const { source, target, remainder, merged, idMapping } = fixture;
      const before = snapshot();
      const placementsBefore = db.prepare('SELECT * FROM note_block_placements ORDER BY rowid').all();
      const blockFields = (rows: unknown[]) => rows.map((row) => {
        const { updated_at: _at, text_save_revision: _revision, ...fields } = row as Record<string, unknown>;
        return fields;
      });
      const movedAnchors = (rows: unknown[]) => rows.map((row) => {
        const entry = row as Record<string, unknown>;
        const belongsToSource = entry.block_id === source.blockId || entry.text_flow_id === `textflow-${source.blockId}`
          || entry.inline_structure_id === `${source.label}-stable-inline`;
        if (!belongsToSource || (entry.text_unit_id !== 'tu-1' && !entry.inline_structure_id)) return entry;
        return { ...entry, block_id: entry.block_id === null ? null : target.blockId,
          text_flow_id: entry.text_flow_id === null ? null : `textflow-${target.blockId}`,
          text_unit_id: entry.text_unit_id === 'tu-1' ? idMapping.unit_id : entry.text_unit_id,
          ...(Object.prototype.hasOwnProperty.call(entry, 'inline_structure_id') ? {
            inline_structure_id: entry.inline_structure_id === 'inline-1' ? 'inline-1-moved' : entry.inline_structure_id,
          } : {}),
        };
      });
      const assertResolvable = () => {
        const blocks = db.prepare('SELECT id, content_json FROM note_blocks').all() as { id: string; content_json: string }[];
        for (const table of ['annotation_ranges', 'board_text_ranges']) {
          for (const row of db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[]) {
            const owning = blocks.find((block) => block.id === row.block_id || `textflow-${block.id}` === row.text_flow_id);
            const candidates = owning ? [owning] : blocks;
            if (row.text_unit_id) assert.ok(candidates.some((block) =>
              JSON.parse(block.content_json).text_flow.units.some((unit: any) => unit.id === row.text_unit_id)));
            if (row.inline_structure_id) assert.ok(candidates.some((block) =>
              JSON.parse(block.content_json).text_flow.inline_structures.some((inline: any) =>
                inline.id === row.inline_structure_id && (!row.text_unit_id || inline.parent_text_unit_id === row.text_unit_id))));
          }
        }
      };
      const saved = await put(`/note-blocks/${target.blockId}/unit-transfer`, fixture.input);
      assert.equal(saved.source_revision, 1);
      assert.equal(saved.target_revision, 1);
      assert.equal(saved.source_block.status, 'active');
      assert.equal(saved.source_block.plain_text, '');
      assert.deepEqual(saved.source_block.content_json, remainder.content_json);
      assert.deepEqual(saved.target_block.content_json, merged.content_json);
      const after = snapshot();
      assert.deepEqual(after.annotation_truths, before.annotation_truths);
      assert.deepEqual(after.annotation_ranges, movedAnchors(before.annotation_ranges));
      assert.deepEqual(after.board_text_ranges, movedAnchors(before.board_text_ranges));
      assert.deepEqual(db.prepare('SELECT * FROM note_block_placements ORDER BY rowid').all(), placementsBefore);
      assertResolvable();

      const undone = await put(`/note-blocks/${source.blockId}/unit-transfer`, { ...fixture.input,
        source_block_id: target.blockId, text_unit_id: idMapping.unit_id,
        id_mapping: { unit_id: 'tu-1', inline_ids: { 'inline-1-moved': 'inline-1' } },
        source_base_revision: 1, target_base_revision: 1, source_block: target.block, target_block: source.block,
      });
      assert.equal(undone.source_revision, 2);
      assert.equal(undone.target_revision, 2);
      const restored = snapshot();
      assert.deepEqual(blockFields(restored.note_blocks), blockFields(before.note_blocks));
      for (const table of ['annotation_truths', 'annotation_ranges', 'board_text_ranges']) {
        assert.deepEqual(restored[table], before[table], `${source.label} undo ${table}`);
      }
      assertResolvable();
      const redone = await put(`/note-blocks/${target.blockId}/unit-transfer`, {
        ...fixture.input, source_base_revision: 2, target_base_revision: 2,
      });
      assert.equal(redone.source_revision, 3);
      assert.equal(redone.target_revision, 3);
      const replayed = snapshot();
      assert.deepEqual(blockFields(replayed.note_blocks), blockFields(after.note_blocks));
      for (const table of ['annotation_truths', 'annotation_ranges', 'board_text_ranges']) {
        assert.deepEqual(replayed[table], after[table], `${source.label} redo ${table}`);
      }
      assert.deepEqual(db.prepare('SELECT * FROM note_block_placements ORDER BY rowid').all(), placementsBefore);
      assertResolvable();
    });
  }
});

test('C3 mapped transfers reject unusable addresses or changed inline content and roll back late anchor writes', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const fixture = ordinaryCrossBlockFixture(db);
    const before = snapshot();
    const occupiedUnit = structuredClone(fixture.input);
    occupiedUnit.id_mapping.unit_id = 'tu-1';
    occupiedUnit.target_block.content_json.text_flow.units[1].id = 'tu-1';
    await put(`/note-blocks/${fixture.target.blockId}/unit-transfer`, occupiedUnit, 409);
    assert.deepEqual(snapshot(), before);
    const occupiedInline = structuredClone(fixture.input);
    occupiedInline.id_mapping.inline_ids['inline-1'] = 'inline-1';
    occupiedInline.target_block.content_json.text_flow.inline_structures[2].id = 'inline-1';
    await put(`/note-blocks/${fixture.target.blockId}/unit-transfer`, occupiedInline, 409);
    assert.deepEqual(snapshot(), before);
    const alteredInline = structuredClone(fixture.input);
    alteredInline.target_block.content_json.text_flow.inline_structures[2].anchor_range.end += 1;
    await put(`/note-blocks/${fixture.target.blockId}/unit-transfer`, alteredInline, 409);
    assert.deepEqual(snapshot(), before);
    db.exec(`CREATE TRIGGER mapped_transfer_range_failure BEFORE UPDATE ON board_text_ranges
      BEGIN SELECT RAISE(ABORT, 'Synthetic mapped transfer anchor failure'); END`);
    await put(`/note-blocks/${fixture.target.blockId}/unit-transfer`, fixture.input, 500);
    assert.deepEqual(snapshot(), before);
    assert.equal(db.inTransaction, false);
    db.exec('DROP TRIGGER mapped_transfer_range_failure');
    await put(`/note-blocks/${fixture.target.blockId}/unit-transfer`, fixture.input);
  });
});

test('C3 an inline-only range with no ownership cannot choose between colliding blocks', async () => {
  await withFixture(async ({ db, put, snapshot }) => {
    const fixture = ordinaryCrossBlockFixture(db);
    const annotations = listAnnotationTruths(db, USER, NOTE);
    replaceNoteAnnotationTruths(db, USER, NOTE, [...annotations, {
      id: 'unresolvable-annotation', raw_label: 'Missing ownership', ranges: [{
        id: 'unresolvable-inline-range', target_kind: 'inline_structure', inline_structure_id: 'inline-1', metadata: {},
      }],
    }]);
    const before = snapshot();
    const result = await put(`/note-blocks/${fixture.target.blockId}/unit-transfer`, fixture.input, 409);
    assert.equal(result.error, 'Unit transfer cannot resolve inline anchor ownership');
    assert.deepEqual(snapshot(), before);
  });
});
