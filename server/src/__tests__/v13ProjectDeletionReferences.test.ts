import assert from 'node:assert/strict';
import test from 'node:test';
import { createV13BoardsFixture } from './helpers/v13BoardsFixture.js';
import { createBoard, createBoardLayer, createBoardVisual, castBoardSticky, getBoard, mountBoardMember, mountBoardTextRange } from '../services/boards.js';
import { createItem } from '../services/items.js';
import { deleteProjectWithSourcePolicy } from '../services/courseLifecycle.js';
import { assertCourseLifecyclePolicyCoverage } from '../services/courseLifecyclePolicies.js';
import { AppError } from '../middleware/errorHandler.js';
import migration057 from '../db/migrations/057_v13_boards.js';
import migration058 from '../db/migrations/058_v13_board_deleted_event.js';
import migration059 from '../db/migrations/059_v13_board_text_ranges.js';
import migration060 from '../db/migrations/060_v13_board_chalk_items.js';
import migration061 from '../db/migrations/061_v13_board_staging.js';
import migration062 from '../db/migrations/062_v13_board_layers.js';

function seed(db: Awaited<ReturnType<typeof createV13BoardsFixture>>) {
  db.exec(`INSERT INTO users(id,email,password_hash,name) VALUES('fixture','project-delete@example.test','fixture','Fixture');
    INSERT INTO courses(id,user_id,name) VALUES('project','fixture','Project');
    INSERT INTO notes(id,user_id,course_id,title) VALUES('note','fixture','project','Origin note');`);
}

test('Project deletion retains ranges, Item bodies, boards, souls and layers with visible reference degradation', async (t) => {
  const db = await createV13BoardsFixture(); t.after(() => db.close()); seed(db);
  assertCourseLifecyclePolicyCoverage(db);
  const excerpt = 'Keep the original passage.';
  db.prepare(`INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text)
    VALUES('block','fixture','project','paragraph',?,?)`).run(JSON.stringify({ text_flow: { units: [{ id: 'unit', text: excerpt }] } }), excerpt);
  db.exec("INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES('placement','note','block',0)");
  const fixture = db.transaction(() => {
    const { board } = createBoard(db, 'fixture', { title: 'Surviving board', project_id: 'project', purpose: { title: 'Library soul', project_id: 'project' } });
    const layer = createBoardLayer(db, 'fixture', board.id, { name: 'Surviving layer' });
    const item = createItem(db, 'fixture', { plain_text: 'The Item body survives.', origin_note_id: 'note' });
    mountBoardMember(db, 'fixture', board.id, { member_kind: 'note', member_id: 'note', layer_id: layer.id });
    mountBoardMember(db, 'fixture', board.id, { member_kind: 'item', member_id: item.id, placed: false });
    mountBoardTextRange(db, 'fixture', board.id, { text_range: { note_id: 'note', block_id: 'block', text_flow_id: 'textflow-block',
      text_unit_id: 'unit', start_offset: 0, end_offset: excerpt.length, excerpt, at: new Date().toISOString() } });
    const chalk = createBoardVisual(db, 'fixture', board.id, { visual_kind: 'sticky', data: { text: 'Board-born body.' } });
    const cast = castBoardSticky(db, 'fixture', board.id, chalk.id);
    return { board, layer, item, cast };
  })();
  const beforeRanges = db.prepare('SELECT * FROM board_text_ranges').all();
  deleteProjectWithSourcePolicy(db, 'fixture', 'project', 'delete_projection');
  const after = getBoard(db, 'fixture', fixture.board.id);
  assert.equal(db.prepare("SELECT id FROM courses WHERE id='project'").get(), undefined);
  assert.equal(after.board.project_id, null);
  assert.deepEqual(db.prepare('SELECT course_id FROM purposes WHERE id=?').get(fixture.board.soul_id), { course_id: null });
  assert.equal(after.layers[0].id, fixture.layer.id);
  assert.deepEqual(db.prepare('SELECT * FROM board_text_ranges').all(), beforeRanges);
  assert.equal(after.members.find((m) => m.member_kind === 'text_range')?.reference.anchor_status, 'lost');
  assert.equal(after.members.find((m) => m.member_kind === 'text_range')?.reference.summary, excerpt);
  assert.equal(after.members.find((m) => m.member_kind === 'note')?.reference.state, 'missing');
  const item = after.members.find((m) => m.member_id === fixture.item.id)!;
  assert.equal(item.reference.note_id, null);
  assert.equal(item.reference.plain_text, 'The Item body survives.');
  assert.deepEqual(db.prepare('SELECT origin_course_id FROM items WHERE id=?').get(fixture.item.id), { origin_course_id: null });
  assert.equal(after.members.find((m) => m.member_id === fixture.cast.item.id)?.reference.origin_board_id, fixture.board.id);
});

test('an upgraded legacy soul with a board still blocks deletion, with an actionable conflict and no partial work', async (t) => {
  const db = await createV13BoardsFixture({ beforeBoardsMigration: true }); t.after(() => db.close()); seed(db);
  db.exec(`INSERT INTO purposes(id,user_id,course_id,note_id,title,is_note_default,created_at,updated_at)
    VALUES('legacy','fixture','project','note','Existing legacy soul',1,'before','before')`);
  for (const migration of [migration057, migration058, migration059, migration060, migration061, migration062]) db.transaction(() => migration.up(db))();
  const { board } = db.transaction(() => createBoard(db, 'fixture', { title: 'Legacy board', soul_id: 'legacy' }))();
  const before = ['courses','notes','purposes','boards'].map((table) => db.prepare(`SELECT * FROM ${table}`).all());
  for (const action of ['delete_projection', 'move_to_home'] as const) {
    assert.throws(() => deleteProjectWithSourcePolicy(db, 'fixture', 'project', action), (error: unknown) =>
      error instanceof AppError && error.statusCode === 409 && error.message.includes('legacy note-bound purpose'));
    assert.deepEqual(['courses','notes','purposes','boards'].map((table) => db.prepare(`SELECT * FROM ${table}`).all()), before);
  }
  assert.equal(getBoard(db, 'fixture', board.id).board.soul_id, 'legacy');
});
