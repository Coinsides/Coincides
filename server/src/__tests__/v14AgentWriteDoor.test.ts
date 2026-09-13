import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import express from 'express';
import { ZodError } from 'zod';
import { initDb, closeDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import { runAgent } from '../agent/orchestrator.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderMessage, StreamChunk, ToolDefinition } from '../agent/providers/types.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import goalRoutes from '../routes/goals.js';
import { createToolReceiptsRouter } from '../routes/toolReceipts.js';
import { createGoalSchema } from '../validators/index.js';
import { CREATE_GOAL_TOOL, createAgentGoalInputSchema } from '../toolFace/registry.js';
import { hasAgentActionRevert } from '../services/toolFaceReceiptRevert.js';
import { readToolFaceReceipt } from '../services/toolFaceReceipts.js';

const userId = 'a1-synthetic-user';
const courseId = '11111111-1111-4111-8111-111111111111';
const conversationId = 'a1-conversation';
const context = { actor: 'agent', channel: 'chat', conversationId, callId: 'a1-call' } as const;

async function fixture(t: TestContext) {
  const db = await initDb(':memory:');
  // Disposable in-memory fixture; no application startup, auth token or .env.
  db.prepare("INSERT INTO users (id,email,password_hash,name,settings) VALUES (?,?,'synthetic','A1 synthetic',?)")
    .run(userId, 'a1@example.invalid', JSON.stringify({ synthetic: true, active_provider: 'openai' }));
  db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run(courseId, userId, 'A1 synthetic course');
  db.prepare('INSERT INTO agent_conversations (id,user_id,title) VALUES (?,?,?)')
    .run(conversationId, userId, 'A1 synthetic conversation');
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/goals', goalRoutes);
  app.use('/api/tool-receipts', createToolReceiptsRouter());
  app.use(errorHandler);
  const server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    closeDb();
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const request = async (path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() as any };
  };
  return { db, request };
}

test('create_goal registry projection shares human field validators and executable undo coverage', () => {
  for (const field of ['title', 'course_id', 'deadline', 'description'] as const) {
    assert.equal(createAgentGoalInputSchema.shape[field], createGoalSchema.shape[field]);
  }
  const projected = toolDefinitions.find((entry) => entry.name === 'create_goal')!;
  assert.equal(projected.description, CREATE_GOAL_TOOL.description);
  assert.deepEqual(Object.keys(projected.parameters.properties as object).sort(),
    ['course_id', 'deadline', 'description', 'title']);
  assert.equal(CREATE_GOAL_TOOL.exposure, 'internal');
  assert.equal(hasAgentActionRevert(CREATE_GOAL_TOOL.name), true);
});

test('human and agent creation share row semantics, sibling ordering and ordinary validation errors', async (t) => {
  const { db, request } = await fixture(t);
  const input = { course_id: courseId, title: '  Goal X  ', description: 'First\nSecond', deadline: '2026-10-01' };
  const human = await request('/goals', input);
  assert.equal(human.status, 201);
  const agent = JSON.parse(await executeTool('create_goal', input, userId, context));
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(agent.id) as Record<string, unknown>;
  const normalize = ({ id, created_at, updated_at, sort_order, ...row }: Record<string, unknown>) => row;
  assert.deepEqual(normalize(goal), normalize(human.body));
  assert.equal(human.body.sort_order, 0);
  assert.equal(goal.sort_order, 1);
  assert.equal(goal.exam_mode, 0);
  assert.equal(goal.parent_id, null);
  const list = await request('/goals');
  assert.deepEqual(list.body.map((row: { id: string }) => row.id), [human.body.id, agent.id]);
  assert.deepEqual(list.body.map((row: { dependencies: string[] }) => row.dependencies), [[], []]);
  for (const invalid of [{ ...input, title: '' }, { ...input, deadline: 'tomorrow' }]) {
    const response = await request('/goals', invalid);
    assert.equal(response.status, 400);
    await assert.rejects(executeTool('create_goal', invalid, userId, context), (error: unknown) => {
      assert.ok(error instanceof ZodError);
      assert.deepEqual(response.body, { error: 'Validation error', details: error.errors });
      return true;
    });
  }
  const missingCourse = { ...input, course_id: '22222222-2222-4222-8222-222222222222' };
  assert.equal((await request('/goals', missingCourse)).status, 404);
  await assert.rejects(executeTool('create_goal', missingCourse, userId, context), { message: 'Course not found' });
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM goals').get() as { n: number }).n, 2);
});

test('human POST retains parent, exam mode, empty-description defaults and exact entity response', async (t) => {
  const { db, request } = await fixture(t);
  const parent = await request('/goals', { course_id: courseId, title: 'Parent' });
  const input = { course_id: courseId, parent_id: parent.body.id, title: 'Child', exam_mode: true, description: '' };
  const child = await request('/goals', input);
  assert.equal(child.status, 201);
  assert.deepEqual(child.body, db.prepare('SELECT * FROM goals WHERE id = ?').get(child.body.id) as Record<string, unknown>);
  assert.deepEqual(Object.keys(child.body).sort(), [
    'id', 'user_id', 'course_id', 'parent_id', 'title', 'description', 'deadline',
    'exam_mode', 'status', 'sort_order', 'created_at', 'updated_at',
  ].sort());
  assert.equal(child.body.parent_id, parent.body.id);
  assert.equal(child.body.exam_mode, 1);
  assert.equal(child.body.description, null);
  assert.equal(child.body.deadline, null);
  assert.equal(child.body.status, 'active');
  assert.equal(child.body.sort_order, 0);
  assert.equal((await request('/goals', { ...input, title: 'Second child' })).body.sort_order, 1);
  assert.deepEqual((await request(`/goals?parent_id=${parent.body.id}`)).body.map((row: { title: string }) => row.title),
    ['Child', 'Second child']);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n, 0);
});

for (const failureTable of ['events', 'operation_batches'] as const) {
  test(`agent ${failureTable} storage failure rolls back the goal, event and receipt together`, async (t) => {
    const { db } = await fixture(t);
    db.exec(`CREATE TRIGGER synthetic_write_failure BEFORE INSERT ON ${failureTable}
      BEGIN SELECT RAISE(ABORT, 'synthetic storage failure'); END`);
    await assert.rejects(executeTool('create_goal', { title: 'Goal X', course_id: courseId }, userId, context),
      { message: 'synthetic storage failure' });
    for (const table of ['goals', 'events', 'operation_batches']) {
      assert.equal((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n, 0);
    }
  });
}

test('synthetic agent conversation creates goal/event/receipt and existing HTTP revert completes the round trip', async (t) => {
  const { db, request } = await fixture(t);
  const credentialDirectory = mkdtempSync(join(tmpdir(), 'a1-synthetic-'));
  const previousDirectory = process.env.COINCIDES_APP_DATA_DIR;
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.COINCIDES_APP_DATA_DIR = credentialDirectory;
  process.env.OPENAI_API_KEY = 'a1-synthetic';
  t.after(() => {
    if (previousDirectory === undefined) delete process.env.COINCIDES_APP_DATA_DIR;
    else process.env.COINCIDES_APP_DATA_DIR = previousDirectory;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    rmSync(credentialDirectory, { recursive: true, force: true });
  });
  let rounds = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (
    messages: ProviderMessage[], definitions: ToolDefinition[],
  ): AsyncGenerator<StreamChunk> {
    assert.ok(definitions.some((entry) => entry.name === 'create_goal'));
    if (rounds++ === 0) {
      assert.equal(messages.at(-1)?.content, '帮我建目标 X');
      yield { type: 'tool_call_end', tool_call: {
        id: 'a1-call', name: 'create_goal', arguments: { title: '目标 X', course_id: courseId },
      } };
    } else {
      yield { type: 'text', text: '已创建目标 X。' };
    }
    yield { type: 'done' };
  });
  const chunks: StreamChunk[] = [];
  for await (const chunk of runAgent(userId, conversationId, '帮我建目标 X')) chunks.push(chunk);
  assert.equal(chunks.filter((chunk) => chunk.type === 'error').length, 0);
  assert.equal(rounds, 2);
  const storedResult = db.prepare('SELECT tool_results FROM agent_messages WHERE tool_results IS NOT NULL').get() as { tool_results: string };
  const result = JSON.parse(JSON.parse(storedResult.tool_results)[0].content);
  assert.equal(result.title, '目标 X');
  const created = db.prepare('SELECT * FROM goals WHERE id = ?').get(result.id);
  assert.ok(created);
  const event = db.prepare('SELECT * FROM events').get() as Record<string, any>;
  assert.equal(event.actor_kind, 'agent');
  assert.equal(event.channel, 'chat');
  assert.equal(event.verb, 'goal_created');
  assert.deepEqual(JSON.parse(event.objects), [{ kind: 'goal', id: result.id }]);
  assert.equal(JSON.parse(event.meta).conversation_id, conversationId);
  const receipt = readToolFaceReceipt(result.receipt_id);
  assert.equal(receipt.source_type, 'agent_chat');
  assert.equal(receipt.source_id, 'a1-call');
  assert.equal(receipt.metadata.resources[0].id, result.id);
  assert.equal(receipt.metadata.agent_context?.event_seq, event.seq);
  assert.equal((await request('/tool-receipts?status=applied')).body.receipts[0].id, receipt.id);
  // A storage failure during undo must not leave the goal deleted without its receipt.
  db.exec(`CREATE TRIGGER synthetic_revert_failure BEFORE UPDATE ON operation_batches
    BEGIN SELECT RAISE(ABORT, 'synthetic undo failure'); END`);
  assert.equal((await request(`/tool-receipts/${receipt.id}/revert`, {})).status, 500);
  assert.deepEqual(db.prepare('SELECT * FROM goals WHERE id = ?').get(result.id), created);
  assert.deepEqual(db.prepare('SELECT * FROM events').all(), [event]);
  assert.equal(readToolFaceReceipt(receipt.id).status, 'applied');
  db.exec('DROP TRIGGER synthetic_revert_failure');
  const reverted = await request(`/tool-receipts/${receipt.id}/revert`, {});
  assert.equal(reverted.status, 200);
  assert.equal(reverted.body.status, 'reverted');
  assert.equal(reverted.body.metadata.revert_outcome, 'complete');
  assert.deepEqual(reverted.body.metadata.revert_details.deleted, [result.id]);
  assert.equal(db.prepare('SELECT * FROM goals WHERE id = ?').get(result.id), undefined);
  assert.deepEqual((db.prepare('SELECT actor_kind,channel,verb FROM events ORDER BY seq').all()), [
    { actor_kind: 'agent', channel: 'chat', verb: 'goal_created' },
    { actor_kind: 'human', channel: 'ui', verb: 'rolled_back' },
  ]);
  assert.equal((await request('/tool-receipts?status=reverted')).body.receipts[0].id, receipt.id);
});
