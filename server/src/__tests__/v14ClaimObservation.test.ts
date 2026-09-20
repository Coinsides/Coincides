import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import type { AgentTurnReceipt } from '../../../shared/types/agentTurnReceipt.js';
import {
  CLAIM_TERMS_EN, CLAIM_TERMS_ZH, matchClaimTerms, observeClaimWithoutReceipt,
} from '../agent/claimObservation.js';
import migration054 from '../db/migrations/054_v13_events_ledger.js';
import migration058 from '../db/migrations/058_v13_board_deleted_event.js';
import migration073 from '../db/migrations/073_v14_agent_goal_event.js';
import migration074 from '../db/migrations/074_v14_agent_planning_events.js';
import migration075 from '../db/migrations/075_v14_delete_authorizations.js';
import migration076 from '../db/migrations/076_v14_claim_without_receipt_event.js';
import { recordEvent } from '../db/recordEvent.js';
import { projectTurnReceipt, type PersistedAgentMessage } from '../agent/turnReceipt.js';

function ledgerDb(t: TestContext, latest = true): Database.Database {
  const db = new Database(':memory:');
  t.after(() => db.close());
  for (const migration of [migration054, migration058, migration073, migration074, migration075]) {
    db.transaction(() => migration.up(db))();
  }
  if (latest) db.transaction(() => migration076.up(db))();
  return db;
}

function receipt(overrides: Partial<AgentTurnReceipt> = {}): AgentTurnReceipt {
  return {
    write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0,
    ...overrides,
  };
}

function events(db: Database.Database) {
  return db.prepare('SELECT * FROM events ORDER BY seq').all() as Array<{
    seq: number; user_id: string; actor_kind: string; channel: string;
    verb: string; objects: string; summary: string; meta: string;
  }>;
}

test('claim vocabulary stays narrow and English matching uses case-insensitive word boundaries', () => {
  // C1 adds only these literal board claims; the original seven remain intact.
  assert.equal(CLAIM_TERMS_ZH.length, 12);
  assert.equal(CLAIM_TERMS_EN.length, 11);
  assert.deepEqual(CLAIM_TERMS_ZH.slice(7), ['已上件', '已移位', '已连线', '已摆放', '已调整图层']);
  assert.deepEqual(CLAIM_TERMS_EN.slice(7), ['mounted', 'moved', 'connected', 'arranged']);
  assert.deepEqual(matchClaimTerms(CLAIM_TERMS_ZH.join('，')), [...CLAIM_TERMS_ZH]);
  assert.deepEqual(matchClaimTerms(CLAIM_TERMS_EN.join(' ').toUpperCase()), [...CLAIM_TERMS_EN]);
  assert.deepEqual(matchClaimTerms('unsaved recreated unremembered prerecorded notupdated undeleted uncompleted'), []);
  assert.deepEqual(matchClaimTerms('“Saved”, CREATED! saved.'), ['saved', 'created']);
  // It is intentionally literal: negation is not interpreted or rewritten.
  assert.deepEqual(matchClaimTerms('not saved; 尚未已保存'), ['已保存', 'saved']);
});

test('a matching zero-write turn records one observation with message anchors and no reply body', (t) => {
  const db = ledgerDb(t);
  const messages = Object.freeze([
    Object.freeze({ id: 'm-user', role: 'user', content: '已记住？' }),
    Object.freeze({ id: 'm-first', role: 'assistant', content: '已保存偏好。' }),
    Object.freeze({ id: 'm-tool', role: 'tool', content: 'created' }),
    Object.freeze({ id: 'm-last', role: 'assistant', content: 'SAVED. 已更新。' }),
  ]);
  const before = JSON.stringify(messages);
  const turnReceipt = receipt();
  const beforeReceipt = JSON.stringify(turnReceipt);
  observeClaimWithoutReceipt(db, 'synthetic-user', 'synthetic-conv', messages, turnReceipt);
  const rows = events(db);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].verb, 'claim_without_receipt');
  assert.equal(rows[0].user_id, 'synthetic-user');
  assert.equal(rows[0].actor_kind, 'system');
  assert.equal(rows[0].channel, 'chat');
  assert.deepEqual(JSON.parse(rows[0].meta), {
    conversation_id: 'synthetic-conv', message_id: 'm-first',
    matched_terms: ['已保存', '已更新', 'saved'], message_ids: ['m-first', 'm-last'],
  });
  assert.deepEqual(JSON.parse(rows[0].objects), [
    { kind: 'agent_conversation', id: 'synthetic-conv' },
    { kind: 'agent_message', id: 'm-first' }, { kind: 'agent_message', id: 'm-last' },
  ]);
  assert.equal(JSON.stringify(rows).includes('偏好'), false);
  assert.equal(JSON.stringify(messages), before);
  assert.equal(JSON.stringify(turnReceipt), beforeReceipt);
});

test('any successful door or channel write suppresses the observation', (t) => {
  const db = ledgerDb(t);
  for (const name of ['create_goal', 'save_memory', 'create_proposal']) {
    observeClaimWithoutReceipt(db, 'u', 'c', [{ id: 'm', role: 'assistant', content: '已保存。Created.' }], receipt({
      write_calls: [{ name, ok: true }], write_ok_count: 1,
    }));
  }
  assert.deepEqual(events(db), []);
});

test('failed writes and successful reads still allow a zero-write-success observation', (t) => {
  const db = ledgerDb(t);
  observeClaimWithoutReceipt(db, 'u', 'c', [{ id: 'm', role: 'assistant', content: '已记住。' }], receipt({
    write_calls: [{ name: 'save_memory', ok: false }], write_fail_count: 1,
    read_calls: [{ name: 'read_note', ok: true }],
  }));
  assert.equal(events(db).length, 1);
  assert.deepEqual(JSON.parse(events(db)[0].meta), {
    conversation_id: 'c', message_id: 'm', matched_terms: ['已记住'],
  });
});

test('nonmatching assistant text, empty turns, and user/tool claims produce no observation', (t) => {
  const db = ledgerDb(t);
  for (const messages of [
    [], [{ id: 'm', role: 'assistant', content: '可以先查阅。' }],
    [{ id: 'm', role: 'assistant', content: '' }],
    [{ id: 'u', role: 'user', content: '已保存' }, { id: 't', role: 'tool', content: 'saved' }],
  ]) observeClaimWithoutReceipt(db, 'u', 'c', messages, receipt());
  assert.deepEqual(events(db), []);
});

test('separate invocations append separate turn observations without multiplying term matches', (t) => {
  const db = ledgerDb(t);
  for (const id of ['first', 'second']) {
    observeClaimWithoutReceipt(db, 'u', 'c', [{ id, role: 'assistant', content: 'saved saved 已保存 已保存' }], receipt());
  }
  assert.equal(events(db).length, 2);
  assert.deepEqual(events(db).map(({ meta }) => JSON.parse(meta).message_id), ['first', 'second']);
  assert.deepEqual(events(db).map(({ meta }) => JSON.parse(meta).matched_terms), [['已保存', 'saved'], ['已保存', 'saved']]);
});

test('ledger failure remains observation-only and emits no supplied content or diagnostic', (t) => {
  const db = ledgerDb(t, false); // pre-076 CHECK rejects the new observation
  const warning = t.mock.method(console, 'warn', () => undefined);
  const messages = [{ id: 'private-id', role: 'assistant', content: '已保存 private-body' }];
  assert.doesNotThrow(() => observeClaimWithoutReceipt(db, 'private-user', 'private-conv', messages, receipt()));
  assert.equal(warning.mock.callCount(), 1);
  assert.deepEqual(warning.mock.calls[0].arguments, ['claim_without_receipt_observation_failed']);
  assert.deepEqual(events(db), []);
  assert.equal(messages[0].content, '已保存 private-body');
  assert.equal(db.inTransaction, false);
});

function memoryRound(name: string, content: string, result: unknown): PersistedAgentMessage[] {
  return [
    { id: 'call-message', role: 'assistant', content: '', turn_id: 'memory-turn',
      tool_calls: JSON.stringify([{ id: 'memory-call', name, arguments: { category: 'preference', content, query: content } }]), tool_results: null },
    { id: 'result-message', role: 'user', content: '', turn_id: 'memory-turn', tool_calls: null,
      tool_results: JSON.stringify([{ tool_call_id: 'memory-call', content: JSON.stringify(result) }]) },
  ];
}

test('original live specimen replays byte-for-byte with prior successful save receipts and zero flags', (t) => {
  const db = ledgerDb(t); // No memory table: the observer can only use supplied transcript receipts.
  const path = new URL('../../../.eval-runs/2026-09-14T10-54-13-381Z-167e5264/05-memory-journey.json', import.meta.url);
  const bytes = readFileSync(path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '4b357901534adf8115a4c854df5c11eabf94e59509cf4657afe3ab8bef9f2a2b');
  const specimen = JSON.parse(bytes.toString('utf8')) as { turns: Array<{ messages: PersistedAgentMessage[] }> };
  assert.equal(specimen.turns.length, 3);
  const previous: PersistedAgentMessage[] = [];
  for (const [index, turn] of specimen.turns.entries()) {
    const before = JSON.stringify(turn.messages);
    const turnReceipt = projectTurnReceipt(turn.messages);
    assert.equal(turnReceipt.write_ok_count, index < 2 ? 1 : 0);
    if (index === 2) {
      assert.equal(turn.messages.length, 2);
      assert.deepEqual(turnReceipt.read_calls, []);
      assert.ok(turn.messages.every(row => row.tool_calls === null && row.tool_results === null));
    }
    observeClaimWithoutReceipt(db, 'eval-user', 'eval-conversation', turn.messages, turnReceipt, previous);
    assert.deepEqual(events(db), []);
    assert.equal(JSON.stringify(turn.messages), before);
    previous.push(...turn.messages);
  }
  assert.deepEqual(readFileSync(path), bytes);
});

test('current successful memory-search hits support literal quoted references in Chinese and English', (t) => {
  const db = ledgerDb(t);
  for (const [saved, reference] of [
    ['我习惯清晨背诵，晚上做题。', '我已记住你的偏好：「清晨背诵,晚上做题」'],
    ['Morning review.', 'I remembered your preference: "Morning review"'],
  ]) {
    const messages = [...memoryRound('search_memories', saved, [{ id: 'memory', kind: 'memory', content: saved }]),
      { id: 'reference', role: 'assistant', content: reference }];
    const turnReceipt = projectTurnReceipt(messages.map(row => ({ tool_calls: null, tool_results: null, ...row })));
    assert.equal(turnReceipt.read_calls[0].ok, true);
    observeClaimWithoutReceipt(db, 'u', 'c', messages, turnReceipt);
  }
  assert.deepEqual(events(db), []);
});

test('prior save Y cannot support a quoted claim of X (D4 addendum reverse regression)', (t) => {
  const db = ledgerDb(t);
  const previous = memoryRound('save_memory', '我习惯晚上做题。', { id: 'saved-Y' });
  const messages = [{ id: 'claim-X', role: 'assistant', content: '我已记住你的偏好：「我习惯清晨背诵。」' }];
  observeClaimWithoutReceipt(db, 'u', 'c', messages, receipt(), previous);
  assert.equal(events(db).length, 1);
  assert.deepEqual(JSON.parse(events(db)[0].meta).matched_terms, ['已记住']);
});

test('failed saves and searches without a matching memory hit keep reference observations', (t) => {
  const db = ledgerDb(t);
  const content = '清晨背诵';
  const reference = { id: 'reference', role: 'assistant', content: `我已记住你的偏好：「${content}」` };
  const variants = [
    { previous: memoryRound('save_memory', content, { error: 'save failed' }), current: [] },
    ...[[], { error: 'search failed' }, [{ id: 'other', kind: 'memory', content: '晚上做题' }]]
      .map(result => ({ previous: [], current: memoryRound('search_memories', content, result) })),
  ];
  for (const { previous, current } of variants) {
    observeClaimWithoutReceipt(db, 'u', 'c', [...current, reference], receipt(), previous);
  }
  assert.equal(events(db).length, variants.length);
});

test('a supported quotation does not erase another new claim in the same reply', (t) => {
  const db = ledgerDb(t);
  const previous = memoryRound('save_memory', '清晨背诵。', { id: 'saved' });
  for (const content of [
    '我已记住你的偏好：「清晨背诵。」另一个偏好也已记住。',
    '我已记住你的偏好：「清晨背诵。」已创建复习计划。',
  ]) observeClaimWithoutReceipt(db, 'u', 'c', [{ id: 'm', role: 'assistant', content }], receipt(), previous);
  assert.deepEqual(events(db).map(row => JSON.parse(row.meta).matched_terms), [['已记住'], ['已创建']]);
});

test('076 widens only the CHECK and preserves historical rows, seq, indexes, triggers and other tables', (t) => {
  const db = ledgerDb(t, false);
  db.transaction(() => recordEvent(db, {
    user_id: 'u', actor_kind: 'agent', channel: 'chat', verb: 'time_block_deleted',
    objects: [{ kind: 'time_block', id: 'b' }], summary: '  原文\n  ', meta: { synthetic: true },
  }))();
  db.prepare("UPDATE sqlite_sequence SET seq = 40 WHERE name = 'events'").run();
  const before = events(db);
  const columns = db.pragma('table_info(events)');
  const others = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE tbl_name != 'events' ORDER BY name").all();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  const guards = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE tbl_name = 'events' AND type != 'table' ORDER BY name").all();
  db.transaction(() => migration076.up(db))();
  assert.deepEqual(events(db), before);
  assert.deepEqual(db.pragma('table_info(events)'), columns);
  assert.deepEqual(db.prepare("SELECT type, name, sql FROM sqlite_master WHERE tbl_name != 'events' ORDER BY name").all(), others);
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all(), tables);
  assert.deepEqual(db.prepare("SELECT type, name, sql FROM sqlite_master WHERE tbl_name = 'events' AND type != 'table' ORDER BY name").all(), guards);
  assert.deepEqual(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'").get(), { seq: 40 });
  observeClaimWithoutReceipt(db, 'u', 'c', [{ id: 'm', role: 'assistant', content: 'saved' }], receipt());
  assert.equal(events(db)[1].seq, 41);
  for (const sql of ["UPDATE events SET summary = 'changed'", 'DELETE FROM events']) {
    assert.throws(() => db.exec(sql), /events_append_only/);
  }
  const after = events(db);
  const schema = db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all();
  db.transaction(() => migration076.up(db))();
  assert.deepEqual(events(db), after);
  assert.deepEqual(db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all(), schema);
});

test('076 preserves an empty ledger high-water mark and rolls back with its caller transaction', (t) => {
  const db = ledgerDb(t, false);
  db.prepare("UPDATE sqlite_sequence SET seq = 70 WHERE name = 'events'").run();
  const schema = db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all();
  assert.throws(() => db.transaction(() => {
    migration076.up(db);
    throw new Error('synthetic-rollback');
  })(), /synthetic-rollback/);
  assert.deepEqual(db.prepare('SELECT type, name, sql FROM sqlite_master ORDER BY name').all(), schema);
  assert.deepEqual(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'").get(), { seq: 70 });
  db.transaction(() => migration076.up(db))();
  assert.deepEqual(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'events'").get(), { seq: 70 });
  observeClaimWithoutReceipt(db, 'u', 'c', [{ id: 'm', role: 'assistant', content: 'saved' }], receipt());
  assert.equal(events(db)[0].seq, 71);
});
