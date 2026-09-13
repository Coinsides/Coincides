import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import type Database from 'better-sqlite3';
import express from 'express';
import { ZodError } from 'zod';
import { initDb, closeDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderMessage, StreamChunk, ToolDefinition } from '../agent/providers/types.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError, errorHandler } from '../middleware/errorHandler.js';
import agentRoutes from '../routes/agent.js';
import goalRoutes from '../routes/goals.js';
import taskRoutes from '../routes/tasks.js';
import deckRoutes from '../routes/decks.js';
import sectionRoutes from '../routes/sections.js';
import timeBlockRoutes from '../routes/timeBlocks.js';
import { createToolReceiptsRouter } from '../routes/toolReceipts.js';
import {
  TOOL_REGISTRY, createAgentSubGoalInputSchema, createAgentTimeBlocksInputSchema,
  updateAgentTimeBlockInputSchema, linkAgentTaskCardsInputSchema,
} from '../toolFace/registry.js';
import {
  createGoalSchema, createTaskSchema, createDeckSchema, createSectionSchema,
  createTimeBlockSchema, updateTimeBlockSchema, linkTaskCardSchema,
} from '../validators/index.js';
import { hasAgentActionRevert } from '../services/toolFaceReceiptRevert.js';
import { readToolFaceReceipt } from '../services/toolFaceReceipts.js';

const userId = 'a2-synthetic-user';
const conversationId = 'a2-conversation';
const courseId = '11111111-1111-4111-8111-111111111111';
const parentId = '22222222-2222-4222-8222-222222222222';
const deckId = '33333333-3333-4333-8333-333333333333';
const taskId = '44444444-4444-4444-8444-444444444444';
const otherTaskId = '55555555-5555-4555-8555-555555555555';
const blockId = '66666666-6666-4666-8666-666666666666';
const otherBlockId = '77777777-7777-4777-8777-777777777777';
const cardId = '88888888-8888-4888-8888-888888888888';
const otherCardId = '99999999-9999-4999-8999-999999999999';
const missingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const groupId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const sectionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const anchor = '这个任务已经完成了。';
const context = { actor: 'agent', channel: 'chat', conversationId, callId: 'a2-call' } as const;
const blockInput = { label: 'Study', date: '2026-10-01', start_time: '08:00', end_time: '09:00' };
const updatedBlock = { label: 'Reading', type: 'study', start_time: '10:00', end_time: '11:00', color: '#445566' };
const taskInput = { title: 'Task', date: '2026-10-01', course_id: courseId, description: 'Two steps',
  checklist: [{ text: 'Read', done: false }] };

type Row = Record<string, any>;
type VerbCase = {
  name: string; table: string; event: string; input: Row;
  path: string; humanInput: Row; method?: string; humanStatus?: number;
  invalid: { path?: string; humanInput: Row; input: Row; status?: number };
  ids: (result: Row) => string[];
};

const cases: VerbCase[] = [
  { name: 'create_sub_goal', table: 'goals', event: 'goal_created',
    input: { parent_id: parentId, title: 'Child', description: 'Details' },
    path: '/goals', humanInput: { parent_id: parentId, course_id: courseId, title: 'Child', description: 'Details' },
    invalid: { humanInput: { parent_id: parentId, course_id: courseId, title: '' }, input: { parent_id: parentId, title: '' } },
    ids: result => [result.id] },
  { name: 'create_task', table: 'tasks', event: 'task_created', input: taskInput,
    path: '/tasks', humanInput: taskInput,
    invalid: { humanInput: { ...taskInput, title: '' }, input: { ...taskInput, title: '' } }, ids: result => [result.id] },
  { name: 'create_deck', table: 'card_decks', event: 'deck_created', input: { name: 'Deck', course_id: courseId },
    path: '/decks', humanInput: { name: 'Deck', course_id: courseId },
    invalid: { humanInput: { name: '', course_id: courseId }, input: { name: '', course_id: courseId } }, ids: result => [result.id] },
  { name: 'create_section', table: 'card_sections', event: 'section_created', input: { name: 'Section', deck_id: deckId },
    path: '/sections', humanInput: { name: 'Section', deck_id: deckId },
    invalid: { humanInput: { name: '', deck_id: deckId }, input: { name: '', deck_id: deckId } }, ids: result => [result.id] },
  { name: 'create_time_blocks', table: 'time_blocks', event: 'time_blocks_created',
    input: { blocks: [blockInput, { ...blockInput, label: 'Rest', type: 'rest', start_time: '09:00', end_time: '09:30' }] },
    path: '/time-blocks', humanInput: { blocks: [blockInput, { ...blockInput, label: 'Rest', type: 'rest', start_time: '09:00', end_time: '09:30' }] },
    invalid: { humanInput: { blocks: [{ ...blockInput, date: 'tomorrow' }] }, input: { blocks: [{ ...blockInput, date: 'tomorrow' }] } },
    ids: result => result.created.map((row: Row) => row.id) },
  { name: 'update_time_block', table: 'time_blocks', event: 'time_block_updated', input: { block_id: blockId, ...updatedBlock },
    path: `/time-blocks/${otherBlockId}`, humanInput: updatedBlock, method: 'PUT', humanStatus: 200,
    invalid: { humanInput: {}, input: { block_id: blockId } }, ids: result => [result.updated.id] },
  { name: 'link_task_cards', table: 'task_cards', event: 'task_cards_linked',
    input: { task_id: taskId, links: [{ card_id: cardId, checklist_index: 0 }] },
    path: `/tasks/${otherTaskId}/cards`, humanInput: { card_id: cardId, checklist_index: 0 },
    invalid: { humanInput: {}, input: { task_id: taskId, links: [{}] } }, ids: result => result.links.map((row: Row) => row.id) },
  { name: 'complete_task', table: 'tasks', event: 'task_completed', input: { task_id: taskId, user_utterance_anchor: anchor },
    path: `/tasks/${otherTaskId}`, humanInput: { status: 'completed' }, method: 'PUT', humanStatus: 200,
    invalid: { path: `/tasks/${missingId}`, humanInput: { status: 'completed' }, input: { task_id: missingId, user_utterance_anchor: anchor }, status: 404 },
    ids: result => [result.task_id] },
];

const domainTables = ['goals', 'tasks', 'card_decks', 'card_sections', 'time_blocks', 'task_cards', 'study_activity_log', 'recurring_task_groups'];
function snapshot(db: Database.Database, tables = domainTables): Record<string, unknown[]> {
  return Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table}`).all()
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
}

async function fixture(t: TestContext) {
  // Explicit disposable DB. No application startup, user DB, auth token, or .env loading.
  const db = await initDb(':memory:');
  db.prepare("INSERT INTO users (id,email,password_hash,name,settings) VALUES (?,?,'synthetic','A2 synthetic',?)")
    .run(userId, 'a2@example.invalid', JSON.stringify({ synthetic: true, active_provider: 'openai' }));
  db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run(courseId, userId, 'A2 course');
  db.prepare('INSERT INTO agent_conversations (id,user_id,title) VALUES (?,?,?)').run(conversationId, userId, 'A2 conversation');
  db.prepare('INSERT INTO goals (id,user_id,course_id,title) VALUES (?,?,?,?)').run(parentId, userId, courseId, 'Parent');
  db.prepare('INSERT INTO card_decks (id,user_id,course_id,name) VALUES (?,?,?,?)').run(deckId, userId, courseId, 'Existing deck');
  db.prepare('INSERT INTO card_sections (id,user_id,deck_id,name,order_index) VALUES (?,?,?,?,7)')
    .run(sectionId, userId, deckId, 'Existing section');
  db.prepare('INSERT INTO recurring_task_groups (id,user_id,title,total_tasks,start_date,end_date) VALUES (?,?,?,2,?,?)')
    .run(groupId, userId, 'Repeating', '2026-10-01', '2026-10-02');
  for (const id of [taskId, otherTaskId]) {
    db.prepare('INSERT INTO tasks (id,user_id,course_id,recurring_group_id,title,date) VALUES (?,?,?,?,?,?)')
      .run(id, userId, courseId, groupId, 'Existing task', '2026-10-01');
  }
  for (const id of [cardId, otherCardId]) {
    db.prepare("INSERT INTO cards (id,user_id,deck_id,title,content) VALUES (?,?,?,'Card','{}')").run(id, userId, deckId);
  }
  for (const id of [blockId, otherBlockId]) {
    db.prepare('INSERT INTO time_blocks (id,user_id,label,type,date,start_time,end_time,color) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, userId, 'Original', 'custom', '2026-10-01', '06:00', '07:00', null);
  }
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/agent', agentRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/decks', deckRoutes);
  app.use('/api/sections', sectionRoutes);
  app.use('/api/time-blocks', timeBlockRoutes);
  app.use('/api/tool-receipts', createToolReceiptsRouter());
  app.use(errorHandler);
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    closeDb();
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const request = async (path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, body: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) as any : text };
  };
  return { db, request };
}

function normalized(row: Row): Row {
  const { id, created_at, updated_at, completed_at, order_index, sort_order, task_id, ...rest } = row;
  if (typeof rest.checklist === 'string') rest.checklist = JSON.parse(rest.checklist);
  return rest;
}

test('A2 registry projection registers all eight immediate internal tools with executable undo and retires create_card', async () => {
  for (const spec of cases) {
    const registered = TOOL_REGISTRY.find(entry => entry.name === spec.name);
    assert.ok(registered, spec.name);
    assert.equal(registered.tier, 'immediate');
    assert.equal(registered.exposure, 'internal');
    assert.equal(hasAgentActionRevert(spec.name), true);
    const projected = toolDefinitions.filter(entry => entry.name === spec.name);
    assert.equal(projected.length, 1);
    assert.equal(projected[0].description, registered.description);
    assert.equal(registered.input_schema.safeParse(spec.input).success, true, spec.name);
  }
  assert.equal(toolDefinitions.some(entry => entry.name === 'create_card'), false);
  assert.equal(TOOL_REGISTRY.some(entry => entry.name === 'create_card'), false);
});

test('A2 registry projections reuse human Zod schemas and field validators', () => {
  for (const [name, schema] of [
    ['create_task', createTaskSchema], ['create_deck', createDeckSchema], ['create_section', createSectionSchema],
  ] as const) assert.equal(TOOL_REGISTRY.find(entry => entry.name === name)!.input_schema, schema);
  for (const field of ['title', 'deadline', 'description'] as const) {
    assert.equal(createAgentSubGoalInputSchema.shape[field], createGoalSchema.shape[field]);
  }
  assert.equal(createAgentSubGoalInputSchema.shape.parent_id, createGoalSchema.shape.parent_id.unwrap());
  assert.equal(createAgentSubGoalInputSchema.shape.course_id.unwrap(), createGoalSchema.shape.course_id);
  assert.equal(createAgentTimeBlocksInputSchema.shape.blocks.element, createTimeBlockSchema);
  for (const field of ['label', 'type', 'start_time', 'end_time', 'color'] as const) {
    assert.equal(updateAgentTimeBlockInputSchema.shape[field], updateTimeBlockSchema.shape[field]);
  }
  assert.equal(linkAgentTaskCardsInputSchema.shape.links.element, linkTaskCardSchema);
});

for (const spec of cases) {
  test(`${spec.name}: human API and chat share functional row semantics and ordinary input validation`, async t => {
    const { db, request } = await fixture(t);
    const human = await request(spec.path, spec.humanInput, spec.method);
    assert.equal(human.status, spec.humanStatus ?? 201, JSON.stringify(human.body));
    const result = JSON.parse(await executeTool(spec.name, spec.input, userId, context));
    const rows = spec.ids(result).map(id => db.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).get(id) as Row);
    const humanRows = Array.isArray(human.body) ? human.body : [human.body];
    assert.deepEqual(rows.map(normalized), humanRows.map(normalized));
    if (spec.name === 'create_sub_goal') {
      assert.equal(rows[0].course_id, courseId);
      assert.equal(rows[0].parent_id, parentId);
      assert.equal(rows[0].sort_order, 1);
    }
    if (spec.name === 'create_section') {
      assert.equal(human.body.order_index, 8);
      assert.equal(rows[0].order_index, 9);
    }
    if (spec.name === 'complete_task') {
      assert.ok(rows[0].completed_at);
      assert.equal((db.prepare('SELECT completed_tasks FROM recurring_task_groups WHERE id = ?').get(groupId) as Row).completed_tasks, 2);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM study_activity_log').get() as Row).n, 2);
    }
    const beforeInvalid = snapshot(db, [...domainTables, 'events', 'operation_batches']);
    const invalidHuman = await request(spec.invalid.path ?? spec.path, spec.invalid.humanInput, spec.method);
    assert.equal(invalidHuman.status, spec.invalid.status ?? 400);
    await assert.rejects(executeTool(spec.name, spec.invalid.input, userId, context), (error: unknown) => {
      assert.ok(error instanceof ZodError || error instanceof AppError);
      assert.equal(error instanceof ZodError ? 400 : error.statusCode, invalidHuman.status);
      return true;
    });
    assert.deepEqual(snapshot(db, [...domainTables, 'events', 'operation_batches']), beforeInvalid);
  });

  for (const failureTable of ['events', 'operation_batches']) {
    test(`${spec.name}: ${failureTable} storage failure rolls domain writes, events and receipt back together`, async t => {
      const { db } = await fixture(t);
      const before = snapshot(db, [...domainTables, 'events', 'operation_batches']);
      db.exec(`CREATE TRIGGER synthetic_write_failure BEFORE INSERT ON ${failureTable}
        BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END`);
      await assert.rejects(executeTool(spec.name, spec.input, userId, context), { message: 'synthetic failure' });
      assert.deepEqual(snapshot(db, [...domainTables, 'events', 'operation_batches']), before);
    });
  }

  test(`${spec.name}: isolated HTTP conversation/provider-stub -> actual-ID receipt -> HTTP revert -> restored state`, async t => {
    const { db, request } = await fixture(t);
    const before = snapshot(db);
    const credentialDirectory = mkdtempSync(join(tmpdir(), 'a2-synthetic-'));
    const credentialFile = join(credentialDirectory, 'provider-credentials.json');
    const previousDirectory = process.env.COINCIDES_APP_DATA_DIR;
    // A private synthetic local store avoids reading or replacing environment keys.
    writeFileSync(credentialFile, JSON.stringify({ version: 1, providers: { openai: 'a2-synthetic' } }), 'utf8');
    process.env.COINCIDES_APP_DATA_DIR = credentialDirectory;
    t.after(() => {
      if (previousDirectory === undefined) delete process.env.COINCIDES_APP_DATA_DIR;
      else process.env.COINCIDES_APP_DATA_DIR = previousDirectory;
      unlinkSync(credentialFile);
      rmdirSync(credentialDirectory);
    });
    let rounds = 0;
    const message = spec.name === 'complete_task' ? anchor : `执行 ${spec.name}`;
    t.mock.method(OpenAIProvider.prototype, 'chat', async function* (
      messages: ProviderMessage[], definitions: ToolDefinition[],
    ): AsyncGenerator<StreamChunk> {
      assert.ok(definitions.some(entry => entry.name === spec.name));
      if (rounds++ === 0) {
        assert.equal(messages.at(-1)?.content, message);
        yield { type: 'tool_call_end', tool_call: { id: context.callId, name: spec.name, arguments: spec.input } };
      } else yield { type: 'text', text: '已完成。' };
      yield { type: 'done' };
    });
    const chat = await request(`/agent/conversations/${conversationId}/messages`, { message });
    assert.equal(chat.status, 200);
    assert.equal(chat.body.includes('event: error'), false, chat.body);
    assert.equal(rounds, 2);
    const messages = await request(`/agent/conversations/${conversationId}/messages`);
    assert.equal(messages.status, 200);
    const stored = messages.body.find((row: Row) => row.tool_results);
    assert.ok(stored);
    const result = JSON.parse(JSON.parse(stored.tool_results)[0].content);
    assert.ok(result.receipt_id, JSON.stringify(result));
    TOOL_REGISTRY.find(entry => entry.name === spec.name)!.output_schema.parse(result);
    const ids = spec.ids(result);
    assert.ok(ids.length > 0);
    const applied = await request('/tool-receipts?status=applied');
    assert.equal(applied.status, 200);
    assert.equal(applied.body.receipts.length, 1);
    const queueItem = applied.body.receipts[0];
    const receipt = readToolFaceReceipt(queueItem.id);
    assert.equal(receipt.id, result.receipt_id);
    assert.deepEqual(queueItem.resources, receipt.metadata.resources);
    assert.equal(receipt.source_type, 'agent_chat');
    assert.equal(receipt.source_id, context.callId);
    assert.equal(receipt.metadata.tool, spec.name);
    assert.deepEqual(receipt.metadata.resources.map((resource: Row) => resource.id).sort(), [...ids].sort());
    for (const id of ids) assert.ok(db.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).get(id));
    const event = db.prepare('SELECT * FROM events').get() as Row;
    assert.equal(event.verb, spec.event);
    assert.equal(event.actor_kind, spec.name === 'complete_task' ? 'human' : 'agent');
    assert.equal(event.channel, 'chat');
    assert.equal(JSON.parse(event.meta).conversation_id, conversationId);
    assert.equal(receipt.metadata.agent_context?.actor, 'agent');
    assert.equal(receipt.metadata.agent_context?.event_seq, event.seq);
    if (spec.name === 'complete_task') assert.equal(JSON.parse(event.meta).user_utterance_anchor, anchor);
    if (spec.name === 'update_time_block') {
      const resourceText = JSON.stringify(receipt.metadata.resources);
      assert.ok(resourceText.includes('Original'));
      assert.ok(resourceText.includes('06:00'));
    }
    if (spec.name === 'complete_task') {
      assert.ok(JSON.stringify(receipt.metadata.resources).includes('pending'));
      assert.ok(JSON.stringify(receipt.metadata.resources).includes('completed_at'));
    }
    const appliedDomain = snapshot(db);
    db.exec(`CREATE TRIGGER synthetic_revert_failure BEFORE UPDATE ON operation_batches
      BEGIN SELECT RAISE(ABORT, 'synthetic undo failure'); END`);
    assert.equal((await request(`/tool-receipts/${receipt.id}/revert`, {})).status, 500);
    assert.deepEqual(snapshot(db), appliedDomain);
    assert.deepEqual(db.prepare('SELECT * FROM events').all(), [event]);
    assert.equal(readToolFaceReceipt(receipt.id).status, 'applied');
    db.exec('DROP TRIGGER synthetic_revert_failure');
    const reverted = await request(`/tool-receipts/${receipt.id}/revert`, {});
    assert.equal(reverted.status, 200, JSON.stringify(reverted.body));
    assert.equal(reverted.body.status, 'reverted');
    assert.equal(reverted.body.metadata.revert_outcome, 'complete');
    assert.deepEqual(snapshot(db), before);
    assert.deepEqual(db.prepare('SELECT actor_kind,channel,verb FROM events ORDER BY seq').all(), [
      { actor_kind: spec.name === 'complete_task' ? 'human' : 'agent', channel: 'chat', verb: spec.event },
      { actor_kind: 'human', channel: 'ui', verb: 'rolled_back' },
    ]);
    assert.equal((await request('/tool-receipts?status=reverted')).body.receipts[0].id, receipt.id);
    t.diagnostic(`A2 API smoke PASS ${spec.name}: ${ids.length} actual resource ID(s), receipt applied -> reverted, domain restored`);
  });
}

test('complete_task requires a user utterance anchor before any completion write', async t => {
  const { db } = await fixture(t);
  const before = snapshot(db, [...domainTables, 'events', 'operation_batches']);
  await assert.rejects(executeTool('complete_task', { task_id: taskId }, userId, context), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /user_utterance_anchor/);
    return true;
  });
  assert.deepEqual(snapshot(db, [...domainTables, 'events', 'operation_batches']), before);
});

for (const failure of ['missing', 'duplicate'] as const) {
  test(`link_task_cards: ${failure} later card fails the entire batch with culprit card_id and no receipt`, async t => {
    const { db, request } = await fixture(t);
    const culprit = failure === 'missing' ? missingId : otherCardId;
    if (failure === 'duplicate') {
      assert.equal((await request(`/tasks/${taskId}/cards`, { card_id: otherCardId })).status, 201);
    }
    const before = snapshot(db, [...domainTables, 'events', 'operation_batches']);
    await assert.rejects(executeTool('link_task_cards', {
      task_id: taskId, links: [{ card_id: cardId }, { card_id: culprit }],
    }, userId, context), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, failure === 'missing' ? 404 : 409);
      assert.ok(`${error.message} ${JSON.stringify(error.details)}`.includes(culprit));
      return true;
    });
    assert.deepEqual(snapshot(db, [...domainTables, 'events', 'operation_batches']), before);
  });
}

test('link_task_cards successful batch receipts contain every new link and revert preserves earlier human links', async t => {
  const { db, request } = await fixture(t);
  const human = await request(`/tasks/${taskId}/cards`, { card_id: cardId, checklist_index: 1 });
  assert.equal(human.status, 201);
  const before = snapshot(db);
  const result = JSON.parse(await executeTool('link_task_cards', {
    task_id: taskId, links: [{ card_id: cardId }, { card_id: otherCardId, checklist_index: 0 }],
  }, userId, context));
  assert.equal(result.created, 2);
  assert.equal(result.links.length, 2);
  const receipt = readToolFaceReceipt(result.receipt_id);
  assert.deepEqual(receipt.metadata.resources.map(resource => resource.id).sort(), result.links.map((row: Row) => row.id).sort());
  assert.equal((await request(`/tool-receipts/${receipt.id}/revert`, {})).status, 200);
  assert.deepEqual(snapshot(db), before);
});

for (const spec of cases.filter(entry => entry.name.startsWith('create_'))) {
  test(`${spec.name}: a subsequent ordinary edit makes create undo return 409 without deleting the resource`, async t => {
    const { db, request } = await fixture(t);
    const result = JSON.parse(await executeTool(spec.name, spec.input, userId, context));
    const id = spec.ids(result)[0];
    const field = spec.name === 'create_time_blocks' ? 'label' : ['create_deck', 'create_section'].includes(spec.name) ? 'name' : 'title';
    db.prepare(`UPDATE ${spec.table} SET ${field} = ? WHERE id = ?`).run('Edited by user', id);
    const before = snapshot(db, [...domainTables, 'events', 'operation_batches']);
    assert.equal((await request(`/tool-receipts/${result.receipt_id}/revert`, {})).status, 409);
    assert.deepEqual(snapshot(db, [...domainTables, 'events', 'operation_batches']), before);
  });

  test(`${spec.name}: a later reference makes create undo return 409 and preserves both rows`, async t => {
    const { db, request } = await fixture(t);
    const result = JSON.parse(await executeTool(spec.name, spec.input, userId, context));
    const id = spec.ids(result)[0];
    if (spec.name === 'create_sub_goal') {
      assert.equal((await request('/tasks', { ...taskInput, goal_id: id })).status, 201);
    } else if (spec.name === 'create_task') {
      assert.equal((await request(`/tasks/${id}/cards`, { card_id: cardId })).status, 201);
    } else if (spec.name === 'create_deck') {
      assert.equal((await request('/sections', { deck_id: id, name: 'Later section' })).status, 201);
    } else if (spec.name === 'create_section') {
      db.prepare('UPDATE cards SET section_id = ? WHERE id = ?').run(id, cardId);
    } else {
      assert.equal((await request('/tasks', { ...taskInput, time_block_id: id })).status, 201);
    }
    const before = snapshot(db, [...domainTables, 'cards', 'events', 'operation_batches']);
    assert.equal((await request(`/tool-receipts/${result.receipt_id}/revert`, {})).status, 409);
    assert.deepEqual(snapshot(db, [...domainTables, 'cards', 'events', 'operation_batches']), before);
  });
}

test('create_section explicit human order is preserved and subsequent default uses MAX+1', async t => {
  const { request } = await fixture(t);
  const explicit = await request('/sections', { deck_id: deckId, name: 'Explicit', order_index: 20 });
  assert.equal(explicit.status, 201);
  assert.equal(explicit.body.order_index, 20);
  const next = await request('/sections', { deck_id: deckId, name: 'Next' });
  assert.equal(next.status, 201);
  assert.equal(next.body.order_index, 21);
});

test('retired create_card reaches unknown-tool behavior and makes no domain write', async t => {
  const { db } = await fixture(t);
  const before = snapshot(db, [...domainTables, 'cards', 'events', 'operation_batches']);
  const response = await executeTool('create_card', {}, userId, context);
  assert.match(response, /[Uu]nknown tool/);
  assert.deepEqual(snapshot(db, [...domainTables, 'cards', 'events', 'operation_batches']), before);
});
