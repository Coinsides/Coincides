import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import type Database from 'better-sqlite3';
import {
  createBoard, getBoard, listBoards, updateBoard,
  mountBoardMember, updateBoardMember, unmountBoardMember, resolveBoardMember,
  createBoardEdge, updateBoardEdge, deleteBoardEdge,
  createBoardVisual, updateBoardVisual, deleteBoardVisual,
} from '../services/boards.js';
import { createPurpose } from '../services/purposes.js';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';

async function fixture(t: TestContext) {
  const db = await createV13BoardsFixture();
  t.after(() => db.close());
  // Board creation now mints an Item and Snapshot against the real migrated schema.
  db.exec(`
    INSERT INTO users (id,email,password_hash,name) VALUES ('user','board-service@example.invalid','synthetic','Fixture');
    INSERT INTO courses (id,user_id,name) VALUES ('project-a','user','Project A'),('project-b','user','Project B');
    INSERT INTO notes (id,user_id,course_id,title) VALUES ('note','user','project-b','Paper');
    INSERT INTO content_groups (id,user_id,course_id,note_id,title) VALUES ('group','user','project-b','note','Bundle');
    INSERT INTO items (id,user_id,plain_text,item_type,topic,origin_note_id)
      VALUES ('item','user','Current item text','claim','Topic','note');
  `);
  return db;
}

function open(db: Database.Database) {
  return db.transaction(() => createBoard(db, 'user', {
    title: 'Clues', project_id: 'project-a', purpose: { title: 'Why do these agree?' },
  }))().board;
}

test('board creation opens a library soul or attaches an unoccupied soul; viewport has no paper boundary', async (t) => {
  const db = await fixture(t);
  const { board, purposeCreated } = db.transaction(() => createBoard(db, 'user', {
    title: 'Clues', purpose: { title: 'Question' },
  }))();
  assert.ok(purposeCreated);
  assert.equal(board.soul_id, purposeCreated.id);
  assert.equal(purposeCreated.project_id, null);
  assert.equal(purposeCreated.note_id, null);
  assert.equal(purposeCreated.is_note_default, false);
  assert.deepEqual(board.viewport, { x: 0, y: 0, zoom: 1 });
  const soul = db.transaction(() => createPurpose(db, 'user', { title: 'Another question' }))();
  const attached = db.transaction(() => createBoard(db, 'user', { title: 'Attached', soul_id: soul.id }))();
  assert.equal(attached.purposeCreated, null);
  assert.equal(attached.board.soul_id, soul.id);
  assert.throws(() => db.transaction(() => createBoard(db, 'user', { title: 'Occupied', soul_id: soul.id }))(),
    /purpose_already_has_board/);
  assert.equal(listBoards(db, 'user').length, 2);
  const beforeNote = db.prepare('SELECT * FROM notes').all();
  const changed = db.transaction(() => updateBoard(db, 'user', board.id,
    { title: 'Renamed', viewport: { x: -100000, y: 200000, zoom: 20 } }))();
  assert.equal(changed.title, 'Renamed');
  assert.deepEqual(changed.viewport, { x: -100000, y: 200000, zoom: 20 });
  assert.deepEqual(db.prepare('SELECT * FROM notes').all(), beforeNote);
});

test('mounts stay references across projects; retries preserve geometry; unmount only removes board edges', async (t) => {
  const db = await fixture(t);
  const board = open(db);
  const contentBefore = db.prepare('SELECT * FROM notes').all();
  const groupBefore = db.prepare('SELECT * FROM content_groups').all();
  const first = db.transaction(() => mountBoardMember(db, 'user', board.id,
    { id: 'mount-note', member_kind: 'note', member_id: 'note', x: 25, w: 400 }))();
  const second = db.transaction(() => mountBoardMember(db, 'user', board.id,
    { member_kind: 'content_group', member_id: 'group' }))();
  assert.equal(first.created, true);
  assert.equal(first.member.reference.state, 'available');
  const retry = db.transaction(() => mountBoardMember(db, 'user', board.id,
    { id: first.member.id, member_kind: 'note', member_id: 'note', x: 999 }))();
  assert.equal(retry.created, false);
  assert.equal(retry.member.x, 25);
  const duplicateProjection = db.transaction(() => mountBoardMember(db, 'user', board.id,
    { member_kind: 'note', member_id: 'note' }))();
  assert.notEqual(duplicateProjection.member.id, first.member.id);
  const placed = db.transaction(() => updateBoardMember(db, 'user', board.id, first.member.id,
    { x: -400, y: 200, w: 320, h: 160, scale: 2, z_index: 10, pinned: true }))();
  assert.equal(placed.pinned, true);
  assert.equal(placed.scale, 2);
  assert.equal('rotation' in placed, false);
  const edge = db.transaction(() => createBoardEdge(db, 'user', board.id,
    { from_member_id: first.member.id, to_member_id: second.member.id, style: { dash: [2, 4] }, label: 'because' }))();
  const changed = db.transaction(() => updateBoardEdge(db, 'user', board.id, edge.id, { label: null }))();
  assert.equal(changed.label, null);
  assert.deepEqual(changed.style, { dash: [2, 4] });
  const removed = db.transaction(() => unmountBoardMember(db, 'user', board.id, first.member.id))();
  assert.equal(removed.removed, true);
  assert.equal(removed.member?.member_id, 'note');
  assert.equal(getBoard(db, 'user', board.id).edges.length, 0);
  assert.equal(db.transaction(() => unmountBoardMember(db, 'user', board.id, first.member.id))().removed, false);
  assert.deepEqual(db.prepare('SELECT * FROM notes').all(), contentBefore);
  assert.deepEqual(db.prepare('SELECT * FROM content_groups').all(), groupBefore);
  assert.equal((db.prepare('SELECT count(*) AS n FROM purpose_members').get() as { n: number }).n, 0);
});

test('member reads retain geometry through trash/restore/missing and text ranges require durable anchor identities', async (t) => {
  const db = await fixture(t);
  const board = open(db);
  const mounted = db.transaction(() => mountBoardMember(db, 'user', board.id,
    { member_kind: 'note', member_id: 'note', x: 123 }))().member;
  db.prepare("UPDATE notes SET status = 'trashed' WHERE id = 'note'").run();
  let detail = getBoard(db, 'user', board.id);
  assert.equal(detail.members[0].reference.state, 'unavailable');
  assert.equal(detail.members[0].x, 123);
  db.prepare("UPDATE notes SET status = 'active' WHERE id = 'note'").run();
  assert.equal(getBoard(db, 'user', board.id).members[0].reference.state, 'available');
  db.prepare("DELETE FROM notes WHERE id = 'note'").run();
  detail = getBoard(db, 'user', board.id);
  assert.equal(detail.members[0].id, mounted.id);
  assert.equal(detail.members[0].reference.state, 'missing');
  assert.equal(resolveBoardMember(db, 'user', 'item', 'item').state, 'available');
  db.prepare("UPDATE items SET status = 'retired' WHERE id = 'item'").run();
  assert.equal(resolveBoardMember(db, 'user', 'item', 'item').state, 'unavailable');
  assert.equal(resolveBoardMember(db, 'user', 'text_range', 'some-block-id').reason, 'reference_missing');
  assert.throws(() => db.transaction(() => mountBoardMember(db, 'user', board.id,
    { member_kind: 'item', member_id: 'item' }))(), /board_member_reference_unavailable/);
  assert.throws(() => db.transaction(() => mountBoardMember(db, 'user', board.id,
    { member_kind: 'text_range', member_id: 'item' }))(), /board_text_range_not_found/);
});

test('visuals preserve rotation, raw connector endpoints and extension data independently of member edges', async (t) => {
  const db = await fixture(t);
  const board = open(db);
  const data = {
    from: { kind: 'point', point: { x: 10, y: 20 } },
    to: { kind: 'point', point: { x: 200, y: 300 } },
    style: { color: '#ab12cd', arrow: 'both', dash: [2, 3] },
    extension: { original_placement: { rotation: 47, boundary_crossing: { side: 'left' } } },
  };
  const visual = db.transaction(() => createBoardVisual(db, 'user', board.id,
    { visual_kind: 'connector', rotation: 47, data, metadata: { source: 'synthetic-tray' } }))();
  assert.deepEqual(visual.data, data);
  assert.equal(visual.rotation, 47);
  assert.equal(getBoard(db, 'user', board.id).edges.length, 0);
  const moved = db.transaction(() => updateBoardVisual(db, 'user', board.id, visual.id,
    { x: 200, scale: 3, pinned: true }))();
  assert.deepEqual(moved.data, data);
  assert.equal(moved.rotation, 47);
  assert.equal(moved.pinned, true);
  const strokeData = { points: [{ x: 1, y: 2, pressure: 0.5, timestamp: 100 }], path: 'M1,2 L3,4', style: { width: 2 } };
  const stroke = db.transaction(() => createBoardVisual(db, 'user', board.id,
    { visual_kind: 'freehand', data: strokeData }))();
  assert.deepEqual(stroke.data, strokeData);
  assert.equal(db.transaction(() => deleteBoardVisual(db, 'user', board.id, visual.id))(), true);
  assert.equal(db.transaction(() => deleteBoardVisual(db, 'user', board.id, visual.id))(), false);
  const a = db.transaction(() => mountBoardMember(db, 'user', board.id, { member_kind: 'note', member_id: 'note' }))().member;
  const b = db.transaction(() => mountBoardMember(db, 'user', board.id, { member_kind: 'content_group', member_id: 'group' }))().member;
  const edge = db.transaction(() => createBoardEdge(db, 'user', board.id, { from_member_id: a.id, to_member_id: b.id }))();
  assert.equal(db.transaction(() => deleteBoardEdge(db, 'user', board.id, edge.id))(), true);
  assert.equal(db.transaction(() => deleteBoardEdge(db, 'user', board.id, edge.id))(), false);
});
