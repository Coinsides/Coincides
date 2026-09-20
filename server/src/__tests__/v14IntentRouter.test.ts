import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { compileIntent, INTENT_COMPILER_RULES } from '../agent/intentCompiler.js';
import { readAttentionContext, ATTENTION_CONTEXT_LIMITS } from '../agent/attentionContext.js';
import { prepareIntentMessage, resolveIntentMessage } from '../services/agentIntentPlans.js';
import { initDb, closeDb } from '../db/init.js';
import { createBoard, getBoard, mountBoardMember } from '../services/boards.js';
import { revertBoardAgentBatch } from '../services/boardAgentBatches.js';
import { agentContextHintSchema } from '../validators/agentContextHint.js';

const selection = { note_id: 'note', block_ids: ['block'] };
const context = { board: { id: 'board', title: '板', members: [
  { id: 'member-a', name: '章节一', x: 400, y: 200, placed: true },
  { id: 'member-b', name: '章节二', x: 0, y: 0, placed: true },
], layers: [{ id: 'layer', name: '重点' }], stickies: [{ id: 'sticky', text: '待核对' }],
visuals: [{ id: 'visual-id', kind: 'shape' }], mountTargets: [{ id: 'note-id', name: '候选笔记', kind: 'note' as const }] }, note: { title: '笔记', units: [{ block_id: 'block', unit_id: 'unit', text: '旧文字' }] } };

test('pure compiler rule table: all three families and all seven existing board targets, ordinary counterexamples', () => {
  const original = structuredClone(context);
  for (const rule of INTENT_COMPILER_RULES) {
    const anchor = rule.id.startsWith('note-') ? selection : undefined;
    const result = compileIntent(rule.positive, anchor, context);
    assert.ok(result, rule.id);
    assert.equal(result.steps[0].verb, rule.target.split(':')[0]);
    assert.deepEqual(compileIntent(rule.positive, anchor, context), result, 'deterministic');
    assert.equal(compileIntent(rule.negative, anchor, context), null, rule.id);
  }
  assert.deepEqual(context, original, 'no mutation');
  assert.equal(compileIntent('把“旧文字”改为“新文字”', undefined, context), null);
  assert.equal(compileIntent('不要整理这块板', undefined, context), null);
  assert.equal(compileIntent('修改这段使它更好', selection, context), null, 'no invented replacement');
  assert.equal(compileIntent('不要把“旧文字”改为“新文字”', selection, context), null);
  assert.equal(compileIntent('他说把“旧文字”改为“新文字”', selection, context), null);
  assert.equal(compileIntent('连接“未知章节”到“章节二”', undefined, context), null);
});

async function fixture(t: TestContext) {
  const db = await initDb(':memory:'); t.after(closeDb);
  db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES('c2-user','c2@example.invalid','synthetic','C2')").run();
  db.prepare("INSERT INTO courses(id,user_id,name) VALUES('course','c2-user','Course')").run();
  db.prepare("INSERT INTO agent_conversations(id,user_id,title) VALUES('conversation','c2-user','C2')").run();
  for (const id of ['note', 'note-two']) db.prepare("INSERT INTO notes(id,user_id,course_id,title) VALUES(?,'c2-user','course',?)").run(id, id);
  const content = { text_flow: { textflow_version: 'TextBlockContentV1', units: [{ id: 'unit', text: '旧文字', writing_role: 'paragraph',
    indent_level: 0, order_index: 0, metadata: {}, status: 'active' }], inline_structures: [], metadata: {} } };
  db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES('block','c2-user','course','paragraph',?,'旧文字')").run(JSON.stringify(content));
  db.prepare("INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES('placement','note','block',0)").run();
  const board = db.transaction(() => {
    const board = createBoard(db, 'c2-user', { title: 'C2 board', purpose: { title: 'Arrange' } }).board;
    mountBoardMember(db, 'c2-user', board.id, { member_kind: 'note', member_id: 'note', x: 500, y: 300 });
    mountBoardMember(db, 'c2-user', board.id, { member_kind: 'note', member_id: 'note-two', x: 0, y: 0 });
    return board;
  })();
  return { db, board };
}

test('selection schema roundtrip, read_note content and declared budget', async t => {
  await fixture(t);
  const hint = { type: 'note_view', data: { note_id: 'note', selection } };
  assert.deepEqual(agentContextHintSchema.parse(hint), hint);
  const attention = readAttentionContext('c2-user', selection);
  assert.equal(attention.blocks[0].text, '旧文字');
  assert.equal(attention.blocks[0].text_units?.[0].id, 'unit');
  assert.equal(attention.truncated, false);
  assert.ok(attention.prompt.length <= ATTENTION_CONTEXT_LIMITS.characters);
});

test('board plan compiles without writes, human discard is zero execution; release shares C1 batch and whole-batch undo', async t => {
  const { db, board } = await fixture(t);
  const hint = { type: 'board_view', data: { board_id: board.id } } as const;
  const positions = () => getBoard(db, 'c2-user', board.id).members.map(member => [member.id, member.x, member.y]);
  const before = positions();
  const plan = prepareIntentMessage('c2-user', 'conversation', '整理这块板，按网格排列', hint)!;
  assert.deepEqual(positions(), before);
  assert.equal((db.prepare('SELECT count(*) AS n FROM operation_batches').get() as { n: number }).n, 0);
  resolveIntentMessage('c2-user', 'conversation', plan.message_id, 'discard');
  assert.deepEqual(positions(), before);
  const accepted = prepareIntentMessage('c2-user', 'conversation', '整理这块板，按网格排列', hint)!;
  const result = resolveIntentMessage('c2-user', 'conversation', accepted.message_id, 'release');
  assert.equal(result.meta.intent_plan?.receipt_ids?.length, 2);
  assert.equal(result.turn_receipt.write_ok_count, 2);
  assert.notDeepEqual(positions(), before);
  assert.throws(() => resolveIntentMessage('c2-user', 'conversation', accepted.message_id, 'release'), /no longer pending/);
  revertBoardAgentBatch('c2-user', board.id, 'conversation');
  assert.deepEqual(positions(), before);
});

test('note plan release only issues pending note_patch; target change invalidates the plan', async t => {
  const { db } = await fixture(t);
  const hint = { type: 'note_view', data: { note_id: 'note', selection } } as const;
  const plan = prepareIntentMessage('c2-user', 'conversation', '把“旧文字”改为“新文字”', hint)!;
  assert.equal((db.prepare('SELECT count(*) AS n FROM proposals').get() as { n: number }).n, 0);
  const result = resolveIntentMessage('c2-user', 'conversation', plan.message_id, 'release');
  const proposal = db.prepare('SELECT type,status FROM proposals WHERE id=?').get(result.meta.intent_plan?.proposal_id);
  assert.deepEqual(proposal, { type: 'note_patch', status: 'pending' });
  assert.equal((db.prepare("SELECT plain_text FROM note_blocks WHERE id='block'").get() as { plain_text: string }).plain_text, '旧文字');
  assert.equal(result.turn_receipt.write_ok_count, 1);
  const stale = prepareIntentMessage('c2-user', 'conversation', '把“旧文字”改为“另一个文字”', hint)!;
  db.prepare("UPDATE notes SET title='Renamed' WHERE id='note'").run();
  assert.throws(() => resolveIntentMessage('c2-user', 'conversation', stale.message_id, 'release'), /计划目标已改变/);
});
