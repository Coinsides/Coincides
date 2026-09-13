import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test, { type TestContext } from 'node:test';
import Database from 'better-sqlite3';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import migration075 from '../db/migrations/075_v14_delete_authorizations.js';
import { recordEvent } from '../db/recordEvent.js';
import { executeTool } from '../agent/tools/executor.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError, errorHandler } from '../middleware/errorHandler.js';
import timeBlockRoutes from '../routes/timeBlocks.js';
import { createToolReceiptsRouter } from '../routes/toolReceipts.js';
import { DELETE_TIME_BLOCK_TOOL, TOOL_REGISTRY } from '../toolFace/registry.js';
import { readToolFaceReceipt } from '../services/toolFaceReceipts.js';
import { hasAgentActionRevert, revertToolReceipt } from '../services/toolFaceReceiptRevert.js';

const userId = 'a2b-user';
const blockId = 'a2b-block';
const taskIds = ['a2b-task-a', 'a2b-task-b'];
const anchor = '确认删除上述时间块，任务解绑，我已了解不可恢复的后果。';
const context = { actor: 'agent', channel: 'chat', conversationId: 'a2b-chat', callId: 'a2b-call' } as const;
type Row = Record<string, any>;

async function fixture(t: TestContext) {
  // All state is synthetic and ephemeral; no application startup or env loading.
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare("INSERT INTO users (id,email,password_hash,name,settings) VALUES (?,?,'synthetic','A2b',?)")
    .run(userId, 'a2b@example.invalid', JSON.stringify({ synthetic: true }));
  db.prepare("INSERT INTO courses (id,user_id,name) VALUES ('a2b-course',?,'A2b course')").run(userId);
  db.prepare(`INSERT INTO time_blocks
    (id,user_id,label,type,date,start_time,end_time,color,created_at,updated_at)
    VALUES (?,?,'Evening study','study','2026-10-01','18:00','19:00','#445566',?,?)`)
    .run(blockId, userId, '2026-09-14T00:00:00.000Z', '2026-09-14T01:00:00.000Z');
  for (const id of [...taskIds].reverse()) {
    db.prepare(`INSERT INTO tasks (id,user_id,course_id,title,date,time_block_id)
      VALUES (?,?,'a2b-course',?,'2026-10-01',?)`).run(id, userId, id, blockId);
  }
  const call = async (args: Row) => JSON.parse(await executeTool('delete_time_block', args, userId, context)) as Row;
  const prepare = () => call({ block_id: blockId });
  const confirm = (authorizationId: string) => call({ block_id: blockId,
    authorization_id: authorizationId, user_confirmation_anchor: anchor });
  return { db, call, prepare, confirm };
}

function snapshot(db: Database.Database) {
  return Object.fromEntries(['time_blocks', 'tasks', 'agent_authorizations', 'events', 'operation_batches']
    .map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
}

function appError(status: number, code?: string) {
  return (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, status);
    if (code) assert.ok(error.message.startsWith(code), error.message);
    return true;
  };
}

test('A2b same-name registry projection has immediate internal admission and executable undo', () => {
  assert.ok(TOOL_REGISTRY.includes(DELETE_TIME_BLOCK_TOOL));
  assert.equal(DELETE_TIME_BLOCK_TOOL.tier, 'immediate');
  assert.equal(DELETE_TIME_BLOCK_TOOL.exposure, 'internal');
  assert.equal(hasAgentActionRevert('delete_time_block'), true);
  const definitions = toolDefinitions.filter(tool => tool.name === 'delete_time_block');
  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].description, DELETE_TIME_BLOCK_TOOL.description);
});

test('A2b first phase stores a 24-hour authorization and returns the full system restatement without deleting', async t => {
  const { db, prepare } = await fixture(t);
  const before = snapshot(db);
  const result = await prepare();
  assert.deepEqual(Object.keys(result).sort(), ['authorization_id', 'expires_at', 'restatement']);
  assert.deepEqual(result.restatement.block, before.time_blocks[0]);
  assert.deepEqual(result.restatement.affected_task_ids, taskIds);
  assert.match(result.restatement.consequences, /不可恢复/);
  assert.match(result.restatement.consequences, /解绑/);
  const authorization = db.prepare('SELECT * FROM agent_authorizations WHERE id = ?').get(result.authorization_id) as Row;
  assert.equal(authorization.user_id, userId);
  assert.equal(authorization.kind, 'time_block_delete');
  assert.deepEqual(JSON.parse(authorization.object_ids), [blockId, ...taskIds]);
  assert.match(authorization.consequence_hash, /^[a-f0-9]{64}$/);
  assert.equal(authorization.consumed_at, null);
  assert.equal(Date.parse(authorization.expires_at) - Date.parse(authorization.created_at), 86_400_000);
  assert.equal(result.expires_at, authorization.expires_at);
  assert.deepEqual(snapshot(db), { ...before, agent_authorizations: [authorization] });
  const repeat = await prepare();
  const second = db.prepare('SELECT consequence_hash FROM agent_authorizations WHERE id = ?').get(repeat.authorization_id) as Row;
  assert.equal(second.consequence_hash, authorization.consequence_hash);
});

test('A2b second phase deletes, consumes, records human chat confirmation and retains complete undo data', async t => {
  const { db, prepare, confirm } = await fixture(t);
  const prepared = await prepare();
  const block = prepared.restatement.block;
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY id').all() as Row[];
  const result = await confirm(prepared.authorization_id);
  assert.equal(result.message, 'Time block deleted');
  assert.equal(result.deleted_block_id, blockId);
  assert.deepEqual(result.unbound_task_ids, taskIds);
  assert.equal(db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(blockId), undefined);
  assert.deepEqual(db.prepare('SELECT * FROM tasks ORDER BY id').all(), tasks.map(task => ({ ...task, time_block_id: null })));
  const authorization = db.prepare('SELECT * FROM agent_authorizations WHERE id = ?').get(prepared.authorization_id) as Row;
  assert.ok(authorization.consumed_at);
  const events = db.prepare("SELECT * FROM events WHERE verb = 'time_block_deleted'").all() as Row[];
  assert.equal(events.length, 1);
  const event = events[0];
  assert.equal(event.actor_kind, 'human');
  assert.equal(event.channel, 'chat');
  assert.deepEqual(JSON.parse(event.objects), [{ kind: 'time_block', id: blockId }, ...taskIds.map(id => ({ kind: 'task', id }))]);
  assert.deepEqual(JSON.parse(event.meta), {
    via: 'chat', conversation_id: context.conversationId, tool: 'delete_time_block',
    authorization_id: prepared.authorization_id, user_confirmation_anchor: anchor,
    consequence_hash: authorization.consequence_hash, block_count: 1, affected_task_count: 2,
  });
  assert.equal(JSON.stringify(event).includes(block.label), false);
  const receipt = readToolFaceReceipt(result.receipt_id, db);
  assert.equal(receipt.source_type, 'agent_chat');
  assert.equal(receipt.metadata.agent_context?.event_seq, event.seq);
  assert.deepEqual(receipt.metadata.resources, [
    { kind: 'time_block', id: blockId, outcome: 'deleted', before: block },
    ...taskIds.map(id => ({ kind: 'task', id, outcome: 'unbound', before: { time_block_id: blockId } })),
  ]);
});

// Ordinary persistence failures exercise the same atomicity regression as A1/A2.
for (const failureTable of ['agent_authorizations', 'events', 'operation_batches']) {
  test(`A2b ${failureTable} storage failure rolls all four execution effects back`, async t => {
    const { db, prepare, confirm } = await fixture(t);
    const prepared = await prepare();
    const before = snapshot(db);
    const operation = failureTable === 'agent_authorizations' ? 'UPDATE' : 'INSERT';
    db.exec(`CREATE TRIGGER synthetic_write_failure BEFORE ${operation} ON ${failureTable}
      BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END`);
    await assert.rejects(confirm(prepared.authorization_id), { message: 'synthetic failure' });
    assert.deepEqual(snapshot(db), before);
  });
}

for (const change of ['block', 'task-list']) {
  test(`A2b changed ${change} consequences require a new restatement (409)`, async t => {
    const { db, prepare, confirm } = await fixture(t);
    const prepared = await prepare();
    if (change === 'block') db.prepare("UPDATE time_blocks SET label = 'New label' WHERE id = ?").run(blockId);
    else db.prepare('UPDATE tasks SET time_block_id = NULL WHERE id = ?').run(taskIds[0]);
    const before = snapshot(db);
    await assert.rejects(confirm(prepared.authorization_id), appError(409, 'authorization_consequences_changed'));
    assert.deepEqual(snapshot(db), before);
  });
}

test('A2b expired authorization returns readable 409 without consuming or deleting', async t => {
  const { db, prepare, confirm } = await fixture(t);
  const prepared = await prepare();
  const row = db.prepare('SELECT expires_at FROM agent_authorizations WHERE id = ?').get(prepared.authorization_id) as Row;
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(row.expires_at) });
  const before = snapshot(db);
  await assert.rejects(confirm(prepared.authorization_id), appError(409, 'authorization_expired'));
  assert.deepEqual(snapshot(db), before);
});

test('A2b used authorization returns readable 409 even after the block has gone', async t => {
  const { db, prepare, confirm } = await fixture(t);
  const prepared = await prepare();
  await confirm(prepared.authorization_id);
  const before = snapshot(db);
  await assert.rejects(confirm(prepared.authorization_id), appError(409, 'authorization_consumed'));
  assert.deepEqual(snapshot(db), before);
});

test('A2b missing authorization ID returns 404 without changing state', async t => {
  const { db, confirm } = await fixture(t);
  const before = snapshot(db);
  await assert.rejects(confirm('missing-auth'), appError(404, 'authorization_not_found'));
  assert.deepEqual(snapshot(db), before);
});

test('A2b execution without confirmation words returns 400 and leaves the authorization available', async t => {
  const { db, prepare, call } = await fixture(t);
  const prepared = await prepare();
  const before = snapshot(db);
  await assert.rejects(call({ block_id: blockId, authorization_id: prepared.authorization_id }), appError(400));
  assert.deepEqual(snapshot(db), before);
});

test('A2b receipt revert restores the exact block and bindings while authorization stays consumed', async t => {
  const { db, prepare, confirm } = await fixture(t);
  const before = snapshot(db);
  const prepared = await prepare();
  const result = await confirm(prepared.authorization_id);
  const receipt = revertToolReceipt({ userId, receiptId: result.receipt_id });
  assert.equal(receipt.status, 'reverted');
  assert.deepEqual(db.prepare('SELECT * FROM time_blocks ORDER BY rowid').all(), before.time_blocks);
  assert.deepEqual(db.prepare('SELECT * FROM tasks ORDER BY rowid').all(), before.tasks);
  assert.ok((db.prepare('SELECT consumed_at FROM agent_authorizations WHERE id = ?').get(prepared.authorization_id) as Row).consumed_at);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM events WHERE verb = 'rolled_back'").get() as Row).n, 1);
});

test('A2b receipt revert refuses an occupied original block ID with 409', async t => {
  const { db, prepare, confirm } = await fixture(t);
  const prepared = await prepare();
  const result = await confirm(prepared.authorization_id);
  db.prepare(`INSERT INTO time_blocks (id,user_id,label,type,date,start_time,end_time)
    VALUES (?,?,'Replacement','rest','2026-10-01','20:00','21:00')`).run(blockId, userId);
  const before = snapshot(db);
  assert.throws(() => revertToolReceipt({ userId, receiptId: result.receipt_id }), appError(409));
  assert.deepEqual(snapshot(db), before);
});

test('A2b human DELETE retains immediate 200 and existing 404 behavior with no authorization ceremony', async t => {
  const { db } = await fixture(t);
  const app = express();
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/time-blocks', timeBlockRoutes);
  app.use('/api/tool-receipts', createToolReceiptsRouter());
  app.use(errorHandler);
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}/api/time-blocks/${blockId}`;
  const response = await fetch(url, { method: 'DELETE' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { message: 'Time block deleted' });
  assert.deepEqual(db.prepare('SELECT time_block_id FROM tasks').all(), [{ time_block_id: null }, { time_block_id: null }]);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM agent_authorizations').get() as Row).n, 0);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM operation_batches').get() as Row).n, 0);
  const missing = await fetch(url, { method: 'DELETE' });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Time block not found' });
});

test('A2b migration 075 upgrades the prior event ledger in place and fresh DB records its application', async t => {
  const { db } = await fixture(t);
  assert.ok(db.prepare('SELECT id FROM db_migrations WHERE id = ?').get(migration075.id));
  const legacy = new Database(':memory:');
  t.after(() => legacy.close());
  legacy.exec('CREATE TABLE users (id TEXT PRIMARY KEY)');
  const eventSchema = db.prepare("SELECT type, sql FROM sqlite_master WHERE tbl_name = 'events' AND sql IS NOT NULL ORDER BY type DESC").all() as Row[];
  const table = eventSchema.find(row => row.type === 'table')!;
  legacy.exec(table.sql.replace(", 'time_block_deleted'", ''));
  for (const row of eventSchema.filter(row => row.type !== 'table')) legacy.exec(row.sql);
  legacy.transaction(() => recordEvent(legacy, {
    user_id: userId, actor_kind: 'human', channel: 'ui', verb: 'goal_created',
    objects: [], summary: 'Existing event',
  }))();
  const before = legacy.prepare('SELECT * FROM events').all();
  legacy.transaction(() => migration075.up(legacy))();
  assert.deepEqual(legacy.prepare('SELECT * FROM events').all(), before);
  assert.deepEqual(legacy.prepare("SELECT name FROM pragma_table_info('agent_authorizations')").all(),
    ['id', 'user_id', 'kind', 'object_ids', 'consequence_hash', 'created_at', 'expires_at', 'consumed_at'].map(name => ({ name })));
  const seq = legacy.transaction(() => recordEvent(legacy, {
    user_id: userId, actor_kind: 'human', channel: 'chat', verb: 'time_block_deleted',
    objects: [], summary: 'Confirmed deletion',
  }))();
  assert.equal(Number(seq), 2);
  const objects = (database: Database.Database) => database.prepare("SELECT type, name FROM sqlite_master WHERE tbl_name = 'events' ORDER BY type, name").all();
  assert.deepEqual(objects(legacy), objects(db));
  legacy.transaction(() => migration075.up(legacy))();
  assert.equal((legacy.prepare('SELECT COUNT(*) AS n FROM events').get() as Row).n, 2);
});
