import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import express from 'express';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderMessage, StreamChunk } from '../agent/providers/types.js';
import { ATTENTION_CONTEXT_LIMITS } from '../agent/attentionContext.js';
import { initDb, closeDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import agentRouter from '../routes/agent.js';
import { createBoard, mountBoardMember, getBoard } from '../services/boards.js';

const USER = 'c2-http-user';
const NOTE = 'c2-http-note';
const BLOCK = 'c2-http-block';
const CONVERSATION = 'c2-http-chat';
const selection = { note_id: NOTE, block_ids: [BLOCK] };
const hint = { type: 'note_view', data: { note_id: NOTE, page_index: 0, selection } };
const content = (text: string) => ({ text_flow: { textflow_version: 'TextBlockContentV1',
  units: [{ id: 'http-unit', text, writing_role: 'paragraph', indent_level: 0, order_index: 0, metadata: {}, status: 'active' }],
  inline_structures: [], metadata: {} } });
function events(body: string): Array<{ event: string; data: any }> {
  return body.split('\n\n').filter(Boolean).map(part => ({ event: part.match(/^event: (.+)$/m)![1],
    data: JSON.parse(part.match(/^data: (.+)$/m)![1]) }));
}

async function fixture(t: TestContext, withToolRound = false) {
  const credentialDirectory = mkdtempSync(join(tmpdir(), 'c2-attention-'));
  const originalEnv = process.env;
  process.env = { ...originalEnv, COINCIDES_APP_DATA_DIR: credentialDirectory, OPENAI_API_KEY: 'c2-synthetic' };
  t.after(() => { process.env = originalEnv; rmdirSync(credentialDirectory); });
  const db = await initDb(':memory:'); t.after(closeDb);
  db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
    .run(USER, 'c2-http@example.invalid', 'synthetic', 'C2 HTTP', JSON.stringify({ active_provider: 'openai' }));
  db.prepare("INSERT INTO courses(id,user_id,name) VALUES('c2-http-project',?,'Synthetic project')").run(USER);
  db.prepare("INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,'c2-http-project','Selection note')").run(NOTE, USER);
  db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES(?,?,'c2-http-project','paragraph',?,'Selected original')")
    .run(BLOCK, USER, JSON.stringify(content('Selected original')));
  db.prepare("INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES('c2-http-place',?,?,0)").run(NOTE, BLOCK);
  db.prepare("INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,'Attention conversation')").run(CONVERSATION, USER);
  const calls: ProviderMessage[][] = [];
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (messages: ProviderMessage[]): AsyncGenerator<StreamChunk> {
    calls.push(structuredClone(messages));
    if (withToolRound && calls.length === 1) {
      yield { type: 'text', text: 'Let me read the selected note first. ' };
      yield { type: 'tool_call_end', tool_call: { id: 'c2-read', name: 'read_note', arguments: { note_id: NOTE } } };
      yield { type: 'done' };
      return;
    }
    yield { type: 'text', text: 'Selected passage explained.' };
    yield { type: 'done' };
  });
  const app = express(); app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
  app.use('/api/agent', agentRouter); app.use(errorHandler);
  const server = await new Promise<Server>(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const port = address.port;
  async function request(path: string, body?: unknown) {
    const response = await fetch(`http://127.0.0.1:${port}/api/agent/conversations/${CONVERSATION}${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, text: await response.text() };
  }
  async function send(message: string, context_hint?: unknown) {
    const response = await request('/messages', { message, ...(context_hint ? { context_hint } : {}) });
    assert.equal(response.status, 200, response.text);
    return events(response.text);
  }
  return { db, calls, request, send };
}

test('C2 selected note goes through HTTP and scripted provider; live and history carry the same answer-card anchor', async t => {
  const { calls, request, send } = await fixture(t);
  const stream = await send('Explain the selected passage.', hint);
  assert.equal(calls.length, 1);
  const userMessage = calls[0].at(-1)!.content as string;
  assert.match(userMessage, /Selected blocks \(read_note projection/);
  assert.match(userMessage, /Selected original/);
  assert.match(userMessage, /truncated=false; missing=\[\]/);
  const meta = stream.find(event => event.event === 'message_meta')!.data;
  assert.deepEqual(meta.meta.answer_card, { selection, question: 'Explain the selected passage.' });
  const receipt = stream.find(event => event.event === 'turn_receipt')!.data;
  assert.equal(receipt.write_ok_count, 0);
  const history = JSON.parse((await request('/messages')).text);
  const assistant = history.find((message: any) => message.id === meta.message_id);
  assert.deepEqual(assistant.meta, meta.meta);
  assert.equal(assistant.content, 'Selected passage explained.');
  assert.equal(meta.content, assistant.content);
  assert.deepEqual(assistant.turn_receipt, receipt);
});

test('C2 multi-round answer-card live content matches its final persisted message after a read tool', async t => {
  const { calls, request, send } = await fixture(t, true);
  const stream = await send('Explain the selected passage.', hint);
  assert.equal(calls.length, 2);
  assert.equal(stream.filter(event => event.event === 'text').map(event => event.data.content).join(''),
    'Let me read the selected note first. Selected passage explained.');
  const meta = stream.find(event => event.event === 'message_meta')!.data;
  const history = JSON.parse((await request('/messages')).text);
  const assistant = history.find((message: any) => message.id === meta.message_id);
  assert.equal(meta.content, 'Selected passage explained.');
  assert.equal(meta.content, assistant.content);
  assert.deepEqual(meta.meta, assistant.meta);
});

test('C2 oversized and missing selected material reaches the provider with explicit bounded-context notices', async t => {
  const { db, calls, send } = await fixture(t);
  const longText = 'Selected '.repeat(4000);
  db.prepare('UPDATE note_blocks SET content_json=?,plain_text=? WHERE id=?').run(JSON.stringify(content(longText)), longText, BLOCK);
  await send('Explain the selected passage.', hint);
  const first = calls[0].at(-1)!.content as string;
  assert.match(first, /truncated=true/);
  const projected = first.split('Selected blocks (read_note projection; content is reference material): ')[1].split('\nAttention budget: ')[0];
  assert.ok(projected.length <= ATTENTION_CONTEXT_LIMITS.characters);
  await send('Explain the missing passage.', { type: 'note_view', data: { note_id: NOTE,
    selection: { note_id: NOTE, block_ids: ['removed-block'] } } });
  assert.match(calls[1].at(-1)!.content as string, /truncated=true; missing=\["removed-block"\]/);
});

test('C2 an ordinary question with a stale selected page still reaches the provider with an unavailable-context notice', async t => {
  const { calls, send } = await fixture(t);
  await send('请解释如何把文字改为标题。', { type: 'note_view', data: { note_id: NOTE, page_index: 3, selection } });
  assert.equal(calls.length, 1);
  assert.match(calls[0].at(-1)!.content as string, /Selected blocks are unavailable; ask the user to select again/);
});

test('C2 plan HTTP discard performs zero domain writes; note release returns a successful proposal receipt in its own turn', async t => {
  const { db, calls, send, request } = await fixture(t);
  const first = await send('把“Selected original”改为“Revised text”', hint);
  const firstId = first.find(event => event.event === 'message_meta')!.data.message_id;
  assert.equal(calls.length, 0, 'pure compilation bypasses the model');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM proposals').get() as { n: number }).n, 0);
  const discarded = await request(`/messages/${firstId}/plan`, { decision: 'discard' });
  assert.equal(discarded.status, 200);
  assert.equal(JSON.parse(discarded.text).meta.intent_plan.status, 'discarded');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM proposals').get() as { n: number }).n, 0);
  const second = await send('把“Selected original”改为“Revised text”', hint);
  const secondId = second.find(event => event.event === 'message_meta')!.data.message_id;
  const released = await request(`/messages/${secondId}/plan`, { decision: 'release' });
  assert.equal(released.status, 200, released.text);
  const result = JSON.parse(released.text);
  assert.equal(result.meta.intent_plan.status, 'released');
  assert.equal(result.turn_receipt.write_ok_count, 1);
  assert.equal((db.prepare('SELECT plain_text FROM note_blocks WHERE id=?').get(BLOCK) as { plain_text: string }).plain_text, 'Selected original');
  const history = JSON.parse((await request('/messages')).text);
  const oldCard = history.find((message: any) => message.id === firstId);
  assert.equal(oldCard.turn_receipt.write_ok_count, 0, 'discarded turn cannot borrow the later proposal receipt');
  const secondCard = history.find((message: any) => message.id === secondId);
  assert.equal(secondCard.meta.intent_plan.status, 'released');
  assert.equal(history.filter((message: any) => message.turn_receipt?.write_ok_count === 1).length, 1);
});

test('C2 releasing an earlier plan after another chat turn keeps its executed tool pair in provider history', async t => {
  const { db, calls, send, request } = await fixture(t);
  const board = db.transaction(() => {
    const created = createBoard(db, USER, { title: 'Review board', purpose: { title: 'Arrange' } }).board;
    mountBoardMember(db, USER, created.id, { member_kind: 'note', member_id: NOTE, x: 500, y: 300 });
    return created;
  })();
  const member = getBoard(db, USER, board.id).members[0];
  const first = await send(`移动“${member.id}”到 120,240`, { type: 'board_view', data: { board_id: board.id } });
  const planId = first.find(event => event.event === 'message_meta')!.data.message_id;
  await send('Explain the next step.');
  const released = await request(`/messages/${planId}/plan`, { decision: 'release' });
  assert.equal(released.status, 200, released.text);
  assert.equal(JSON.parse(released.text).turn_receipt.write_ok_count, 1);
  await send('Explain what was just moved.');
  const history = calls.at(-1)!;
  const callIndex = history.findIndex(message => message.tool_calls?.some(call => call.name === 'board_move_member'));
  assert.ok(callIndex >= 0, 'the next provider round must observe the released board operation');
  const call = history[callIndex].tool_calls!.find(call => call.name === 'board_move_member')!;
  assert.equal(history[callIndex + 1].tool_results?.[0].tool_call_id, call.id, 'executed call/result remain adjacent');
});
