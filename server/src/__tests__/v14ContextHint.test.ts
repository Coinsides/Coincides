import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import express from 'express';
import type { AgentContextHint } from '../../../shared/types/agentContextHint.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderMessage, StreamChunk, ToolDefinition } from '../agent/providers/types.js';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import agentRouter from '../routes/agent.js';
import { sendMessageSchema } from '../validators/index.js';

const USER = 'b2-user';
const MESSAGE = 'Explain the current view.';
const hints = [
  { type: 'l1_onboarding', data: { isNewUser: true } },
  { type: 'calendar', data: { date: '2026-09-14' } },
  { type: 'deck', data: { deck_id: 'b2-deck', deck_name: 'Reading cards' } },
  { type: 'note_view', data: { note_id: 'b2-note', page_index: 2 } },
  { type: 'board_view', data: { board_id: 'b2-board' } },
] satisfies AgentContextHint[];

test('context hint schema preserves all five types, optional fields and an omitted hint', () => {
  const optionalHints: AgentContextHint[] = [
    { type: 'l1_onboarding', data: { isNewUser: false } },
    { type: 'deck', data: { deck_id: 'b2-deck' } },
    { type: 'note_view', data: { note_id: 'b2-note' } },
    { type: 'note_view', data: { note_id: 'b2-note', page_index: 0 } },
  ];
  for (const hint of [...hints, ...optionalHints]) {
    assert.deepEqual(sendMessageSchema.parse({ message: MESSAGE, context_hint: hint }).context_hint, hint);
  }
  assert.deepEqual(sendMessageSchema.parse({ message: MESSAGE }), { message: MESSAGE });
});

async function fixture(t: TestContext) {
  // Synthetic post-auth fixture: in-memory DB, no application bootstrap or .env.
  // The empty temporary directory keeps provider lookup away from machine credentials.
  const credentialDirectory = mkdtempSync(join(tmpdir(), 'coincides-b2-hint-'));
  const originalEnv = process.env;
  process.env = { ...originalEnv, COINCIDES_APP_DATA_DIR: credentialDirectory, OPENAI_API_KEY: 'b2-synthetic' };
  t.after(() => { process.env = originalEnv; rmdirSync(credentialDirectory); });
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
    .run(USER, 'b2@example.invalid', 'synthetic', 'Synthetic B2', JSON.stringify({ active_provider: 'openai' }));

  const received: Array<{ messages: ProviderMessage[]; tools: ToolDefinition[]; systemPrompt: string }> = [];
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (
    messages: ProviderMessage[], tools: ToolDefinition[], systemPrompt: string,
  ): AsyncGenerator<StreamChunk> {
    received.push({ messages: structuredClone(messages), tools, systemPrompt });
    yield { type: 'text', text: 'Synthetic response.' };
    yield { type: 'done' };
  });
  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
  app.use('/api/agent', agentRouter);
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const port = address.port;
  let conversationIndex = 0;
  async function request(body: unknown) {
    const conversationId = `b2-conv-${conversationIndex++}`;
    db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)')
      .run(conversationId, USER, 'Synthetic B2 conversation');
    const response = await fetch(`http://127.0.0.1:${port}/api/agent/conversations/${conversationId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.text(), conversationId };
  }
  return { db, received, request };
}

test('the actual message route returns 400 for a type outside the closed set', async t => {
  const { received, request } = await fixture(t);
  const response = await request({ message: MESSAGE, context_hint: { type: 'unknown_view', data: {} } });
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, 'Validation error');
  assert.equal(received.length, 0);
});

test('the actual message route returns 400 for a malformed hint data shape', async t => {
  const { received, request } = await fixture(t);
  const response = await request({ message: MESSAGE, context_hint: { type: 'note_view', data: { note_id: 42 } } });
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, 'Validation error');
  assert.equal(received.length, 0);
});

test('all hint types reach the provider through the actual message route and retain [Context]', async t => {
  const { db, received, request } = await fixture(t);
  for (const hint of hints) {
    const response = await request({ message: MESSAGE, context_hint: hint });
    assert.equal(response.status, 200);
    assert.match(response.body, /event: text/);
    assert.match(response.body, /event: done/);
    assert.doesNotMatch(response.body, /event: (?:error|tool_start|tool_end)/);
    const call = received[received.length - 1];
    assert.equal(call.messages.length, 1);
    const content = call.messages[0].content;
    assert.equal(typeof content, 'string');
    assert.ok((content as string).startsWith('[Context: '));
    assert.ok((content as string).endsWith(`]\n\n${MESSAGE}`));
    if (hint.type === 'note_view') {
      assert.match(content as string, /user is viewing note "b2-note", page 3 \(page_index 2\)/);
      assert.match(content as string, /You may use read_note with \{"note_id":"b2-note","page_index":2\}/);
      assert.ok(call.tools.some(tool => tool.name === 'read_note'));
    } else if (hint.type === 'board_view') {
      assert.match(content as string, /user is viewing board "b2-board"/);
      assert.match(content as string, /You may use read_board with \{"board_id":"b2-board"\}/);
      assert.ok(call.tools.some(tool => tool.name === 'read_board'));
    } else {
      assert.equal(content, `[Context: user is viewing ${hint.type} — ${JSON.stringify(hint.data)}]\n\n${MESSAGE}`);
    }
    assert.equal(call.systemPrompt.includes('## L1 Protocol'), hint.type === 'l1_onboarding');
    const saved = db.prepare('SELECT role,content,tool_calls,tool_results FROM agent_messages WHERE conversation_id=? ORDER BY rowid')
      .all(response.conversationId);
    assert.deepEqual(saved, [
      { role: 'user', content, tool_calls: null, tool_results: null },
      { role: 'assistant', content: 'Synthetic response.', tool_calls: null, tool_results: null },
    ]);
  }
  assert.equal(received.length, hints.length, 'one provider round per user message with no automatic tool call');
});

test('omitted hints, note page omission, image messages and type-only onboarding remain compatible', async t => {
  const { received, request } = await fixture(t);
  await request({ message: MESSAGE });
  assert.equal(received[0].messages[0].content, MESSAGE);
  assert.equal(received[0].systemPrompt.includes('## L1 Protocol'), false);

  await request({ message: MESSAGE, context_hint: { type: 'note_view', data: { note_id: 'b2-note' } },
    image: { media_type: 'image/png', data: 'AA==' } });
  assert.deepEqual(received[1].messages[0].content, [
    { type: 'text', text: `[Context: user is viewing note "b2-note". You may use read_note with {"note_id":"b2-note"} to read it when relevant to the user's message]\n\n${MESSAGE}` },
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA==' } },
  ]);

  await request({ message: MESSAGE, context_hint: { type: 'l1_onboarding', data: { isNewUser: false } } });
  assert.equal(received[2].systemPrompt.includes('## L1 Protocol'), true, 'onboarding still branches on type alone');
});
