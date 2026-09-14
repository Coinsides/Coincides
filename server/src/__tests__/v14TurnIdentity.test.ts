import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import Database from 'better-sqlite3';
import type { Response } from 'express';
import migration077 from '../db/migrations/077_v14_agent_message_turn_id.js';
import { closeDb, initDb } from '../db/init.js';
import { MemoryManager } from '../agent/memory/manager.js';
import { projectMessageReceipts, type PersistedAgentMessage } from '../agent/turnReceipt.js';
import type { AgentTurnReceipt } from '../../../shared/types/agentTurnReceipt.js';
import type { AuthRequest } from '../middleware/auth.js';
import agentRouter from '../routes/agent.js';

const empty: AgentTurnReceipt = { write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0 };

function legacyDb(t: TestContext): Database.Database {
  const db = new Database(':memory:');
  t.after(() => db.close());
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE agent_conversations (id TEXT PRIMARY KEY);
    CREATE TABLE agent_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL, content TEXT NOT NULL, tool_calls TEXT, tool_results TEXT,
      token_count INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_agent_messages_conversation_id ON agent_messages(conversation_id);
    CREATE TABLE untouched (value TEXT);
    INSERT INTO untouched VALUES ('preserved');
    INSERT INTO agent_conversations VALUES ('conversation');
    INSERT INTO agent_messages (id, conversation_id, role, content)
      VALUES ('legacy', 'conversation', 'assistant', '已保存。');
  `);
  return db;
}

test('077 adds exactly one nullable TEXT column with no historical backfill, index, or other schema change', t => {
  const db = legacyDb(t);
  const rows = db.prepare('SELECT rowid, * FROM agent_messages').all() as Record<string, unknown>[];
  const columns = db.pragma('table_info(agent_messages)') as Record<string, unknown>[];
  const others = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name != 'agent_messages' ORDER BY name").all();
  const foreignKeys = db.pragma('foreign_key_list(agent_messages)');
  const changes = db.prepare('SELECT total_changes() AS n').get();
  db.transaction(() => migration077.up(db))();
  assert.deepEqual(db.pragma('table_info(agent_messages)'), [...columns, {
    cid: columns.length, name: 'turn_id', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0,
  }]);
  assert.deepEqual(db.prepare('SELECT rowid, * FROM agent_messages').all(), rows.map(row => ({ ...row, turn_id: null })));
  assert.deepEqual(db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name != 'agent_messages' ORDER BY name").all(), others);
  assert.deepEqual(db.pragma('foreign_key_list(agent_messages)'), foreignKeys);
  assert.deepEqual(db.prepare('SELECT total_changes() AS n').get(), changes);
});

test('077 rerun is idempotent and caller rollback removes the new column', t => {
  const db = legacyDb(t);
  const before = db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all();
  assert.throws(() => db.transaction(() => {
    migration077.up(db);
    throw new Error('synthetic rollback');
  })(), /synthetic rollback/);
  assert.deepEqual(db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all(), before);
  db.transaction(() => migration077.up(db))();
  const after = db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all();
  db.transaction(() => migration077.up(db))();
  assert.deepEqual(db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all(), after);
});

function row(id: string, turnId: string | null | undefined, role = 'assistant', toolCalls: unknown = null, toolResults: unknown = null): PersistedAgentMessage {
  return { id, role, content: '', tool_calls: toolCalls, tool_results: toolResults, turn_id: turnId };
}
const calls = (name: string) => JSON.stringify([{ id: 'reused-call', name, arguments: {} }]);
const result = (value: unknown) => JSON.stringify([{ tool_call_id: 'reused-call', content: JSON.stringify(value) }]);

test('interleaved turns keep identical tool IDs isolated and attach only to each turn last assistant', () => {
  const rows = [
    row('user-a', 'a', 'user'), row('user-b', 'b', 'user'),
    row('call-a', 'a', 'assistant', calls('save_memory')),
    row('call-b', 'b', 'assistant', calls('save_memory')),
    row('result-b', 'b', 'user', null, result({ error: 'denied' })),
    row('result-a', 'a', 'user', null, result({ id: 'memory' })),
    row('final-b', 'b'), row('call-a-2', 'a', 'assistant', calls('list_courses')),
    row('result-a-2', 'a', 'user', null, result([])), row('final-a', 'a'),
  ];
  const before = JSON.stringify(rows);
  const projected = projectMessageReceipts(rows);
  assert.deepEqual(projected.filter(message => message.turn_receipt).map(message => message.id), ['final-b', 'final-a']);
  assert.deepEqual(projected[6].turn_receipt, { ...empty, write_calls: [{ name: 'save_memory', ok: false }], write_fail_count: 1 });
  assert.deepEqual(projected[9].turn_receipt, { ...empty,
    write_calls: [{ name: 'save_memory', ok: true }], read_calls: [{ name: 'list_courses', ok: true }], write_ok_count: 1,
  });
  assert.equal(JSON.stringify(rows), before);
});

test('NULL and missing turn IDs never receive or contribute receipts, even beside registered turns', () => {
  const rows = [row('old-call', null, 'assistant', calls('save_memory')),
    row('old-result', null, 'user', null, result({ id: 'memory' })), row('old-final', null),
    row('user-new', 'new', 'user'), row('old-unregistered', undefined), row('new-final', 'new')];
  const projected = projectMessageReceipts(rows);
  assert.deepEqual(projected.filter(message => message.turn_receipt).map(message => message.id), ['new-final']);
  assert.deepEqual(projected[5].turn_receipt, empty);
});

test('an interrupted turn with no final text uses its last assistant; user-only turns produce no receipt', () => {
  const rows = [row('only-user', 'user-only', 'user'), row('interrupted-user', 'interrupted', 'user'),
    row('interrupted-call', 'interrupted', 'assistant', calls('save_memory'))];
  const projected = projectMessageReceipts(rows);
  assert.deepEqual(projected.filter(message => message.turn_receipt).map(message => message.id), ['interrupted-call']);
  assert.deepEqual(projected[2].turn_receipt, { ...empty, write_calls: [{ name: 'save_memory', ok: false }], write_fail_count: 1 });
});

async function fixture(t: TestContext) {
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare('INSERT INTO users(id,email,password_hash,name) VALUES(?,?,?,?)')
    .run('identity-user', 'identity@example.invalid', 'synthetic', 'Identity');
  db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)')
    .run('identity-conv', 'identity-user', 'Synthetic identity');
  return { db, memory: new MemoryManager('identity-user') };
}

test('fresh startup applies 077 and saveMessage persists optional turn IDs without changing message IDs or history order', async t => {
  const { db, memory } = await fixture(t);
  assert.deepEqual(db.prepare('SELECT id FROM db_migrations WHERE id = ?').all(migration077.id), [{ id: migration077.id }]);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-14T12:00:00Z') });
  const legacy = memory.saveMessage('identity-conv', 'assistant', 'legacy');
  const first = memory.saveMessage('identity-conv', 'user', 'first', null, null, 'turn-a');
  const second = memory.saveMessage('identity-conv', 'assistant', 'second', null, null, 'turn-a');
  assert.equal(new Set([legacy, first, second]).size, 3);
  for (const id of [legacy, first, second]) assert.match(id, /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
  assert.deepEqual(db.prepare('SELECT id, turn_id FROM agent_messages ORDER BY rowid').all(), [
    { id: legacy, turn_id: null }, { id: first, turn_id: 'turn-a' }, { id: second, turn_id: 'turn-a' },
  ]);
  assert.deepEqual(memory.getConversationHistory('identity-conv').map(message => message.content), ['legacy', 'first', 'second']);
});

test('GET projects exact persisted ownership at identical timestamps and leaves NULL legacy history unchanged', async t => {
  const { db, memory } = await fixture(t);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-14T12:00:00Z') });
  const save = (role: string, content: string, turnId?: string, toolCalls?: string | null, toolResults?: string | null) =>
    memory.saveMessage('identity-conv', role, content, toolCalls, toolResults, turnId);
  save('user', 'old request');
  save('assistant', '', undefined, calls('save_memory'));
  save('user', '', undefined, null, result({ id: 'old-memory' }));
  const oldFinal = save('assistant', 'old saved');
  save('user', 'request a', 'a');
  save('user', 'request b', 'b');
  const aCall = save('assistant', '', 'a', calls('save_memory'));
  save('user', '', 'a', null, result({ id: 'a-memory' }));
  const aFinal = save('assistant', 'a saved', 'a');
  const bFinal = save('assistant', 'b no tools', 'b');
  type Handler = (req: AuthRequest, res: Response) => void;
  const layers = agentRouter.stack as Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Handler }> } }>;
  const route = layers.find(layer => layer.route?.path === '/conversations/:id/messages' && layer.route.methods.get)?.route;
  assert.ok(route);
  const before = db.prepare('SELECT rowid, * FROM agent_messages ORDER BY rowid').all();
  const changes = db.prepare('SELECT total_changes() AS n').get();
  let history: Array<PersistedAgentMessage & { turn_receipt?: AgentTurnReceipt }> = [];
  route.stack[0].handle({ userId: 'identity-user', params: { id: 'identity-conv' } } as unknown as AuthRequest,
    { json: (data: typeof history) => { history = data; } } as Response);
  assert.deepEqual(history.filter(message => message.turn_receipt).map(message => message.id), [aFinal, bFinal]);
  assert.equal(history.find(message => message.id === oldFinal)?.turn_receipt, undefined);
  assert.equal(history.find(message => message.id === aCall)?.turn_receipt, undefined);
  assert.equal(history.find(message => message.id === aFinal)?.turn_receipt?.write_ok_count, 1);
  assert.deepEqual(history.find(message => message.id === bFinal)?.turn_receipt, empty);
  assert.deepEqual(db.prepare('SELECT total_changes() AS n').get(), changes);
  assert.deepEqual(db.prepare('SELECT rowid, * FROM agent_messages ORDER BY rowid').all(), before);
});
