import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmdirSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import express from 'express';
import type { AgentContextHint } from '../../../shared/types/agentContextHint.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { ProviderMessage, StreamChunk, ToolDefinition } from '../agent/providers/types.js';
import { buildSystemPrompt } from '../agent/system-prompt.js';
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

async function fixture(t: TestContext, reply: (systemPrompt: string) => string = () => 'Synthetic response.') {
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
    yield { type: 'text', text: reply(systemPrompt) };
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

type PromptContext = Parameters<typeof buildSystemPrompt>[1];
const emptyContext: PromptContext = {
  userName: 'Manual Reader', currentDate: '2026-09-14', courses: [], memories: [], documentSummaries: [],
};
const populatedContext: PromptContext = {
  ...emptyContext,
  courses: [
    { id: 'manual-course', name: 'Reading', code: 'R1' },
    { id: 'manual-course-2', name: 'Research', code: '' },
  ],
  memories: [{ category: 'preference', content: 'Use concise explanations.' }],
  documentSummaries: [{ id: 'manual-doc', filename: 'reading.pdf', summary: 'Reading material.' }],
  decks: [
    { id: 'manual-deck', name: 'Reading cards', course_id: 'manual-course', card_count: 2,
      sections: [{ id: 'manual-section', name: 'Chapter one' }] },
    { id: 'manual-deck-2', name: 'Research cards', course_id: 'manual-course-2', card_count: 0, sections: [] },
  ],
};

function productManual(prompt = buildSystemPrompt('Manual Agent', emptyContext)): string {
  const sections = prompt.match(/## 产品说明\n[\s\S]*?(?=## Current Context\n)/g);
  assert.equal(sections?.length, 1, 'one product manual section before the existing context');
  return sections![0];
}

test('product manual explains notes, projection boards, proposal-only cards and the two libraries', () => {
  const manual = productManual();
  for (const statement of [
    /笔记（Note）是块（blocks）的序列/u,
    /title\/description 只是封面信息，不是笔记正文/u,
    /板（Board）是思考用的投影桌面，不是内容存储/u,
    /卡片（Card）创建的唯一通道是提案/u,
    /材料库（documents）与 Source Library（sources）互不相通/u,
    /search_documents \/ get_document_content 只可检索、读取材料库/u,
    /你今天检索不到 Source Library 的内容/u,
    /用户给了 Source 文件而你找不到时，要如实说明这个边界，并建议用户经材料库上传/u,
  ]) assert.match(manual, statement);
});

test('product manual describes actual proposal visibility and keeps registration distinct from application', () => {
  const prompt = buildSystemPrompt('Manual Agent', emptyContext);
  const manual = productManual(prompt);
  for (const statement of [
    /chat 里发出的待处理提案可在 Agent 面板头部的“提案”收件箱查看/u,
    /用户可逐条采纳或丢弃/u,
    /不可用型会显示“此类提案暂不支持一键采纳”/u,
    /material_reconciliation 仅可“标记已复核”，不代表执行调和动作/u,
    /仅在提案工具成功返回后，才说“提案已登记”/u,
    /material_map \/ organized_note \/ material_reconciliation 仍可在项目页处理/u,
    /用户在 chat 答复确认不等于提案已应用；apply 仍须人门/u,
  ]) assert.match(manual, statement);
  assert.doesNotMatch(prompt, /目前没有可见的提案界面|该面板不存在|需等待产品的提案面上线/u);
  assert.doesNotMatch(prompt, /(?:in|via) the Proposal panel/, 'workflow prose must use the current Agent inbox location');
});

test('product manual requires successful tool receipts for completion claims and saved memory', () => {
  const manual = productManual();
  assert.match(manual, /我已保存／已创建／已发送[\s\S]*必须确认对应工具调用成功返回，以收据和工具事件为准/u);
  assert.match(manual, /工具报错时，如实说明失败与原因；不得宣称成功，不得静默吞错/u);
  assert.match(manual, /记忆保存必须调用 save_memory 并成功返回；在对话里记住不等于已保存/u);
});

test('product manual explains task completion and time block deletion ceremonies in advance', () => {
  const manual = productManual();
  assert.match(manual, /标记任务完成需要用户亲口确认该任务已完成/u);
  assert.match(manual, /用户原话锚 user_utterance_anchor，不能自行推断完成/u);
  assert.match(manual, /删除时间块走两段复述确认：先向用户复述后果，等用户同意才执行/u);
  assert.match(manual, /提前说明这两类操作的确认流程[\s\S]*400\/409/u);
});

test('product manual closes with the current note, card, judgment and irreversible deletion boundaries', () => {
  const manual = productManual();
  assert.match(manual, /不能写改笔记正文；生成笔记只能发 organized_note 提案/u);
  assert.match(manual, /不能直接创建卡片，不能碰人类判断记录，不能无仪式做不可逆删除/u);
});

test('existing prompt bytes including courses, decks, context and L1 remain unchanged except three panel corrections', () => {
  // SHA-256 of rendered prompts captured BEFORE this order's production edit.
  // Strip only the new section and restore the three explicitly corrected UI sentences.
  const cases: Array<[PromptContext, string]> = [
    [emptyContext, 'b17e4e450538ee2355164ccb383c8539b7b5851691047bd684b9bc5ca15d8533'],
    [{ ...emptyContext, language: 'en', decks: [], isNewUser: false }, '384f625cf67e3e1904360269e4505129a9583dc676f2aee40b3537ec6878f5ce'],
    [{ ...emptyContext, language: 'zh', isNewUser: true }, 'e1f7a5141144d4f5c327fbadc88e74a8cb9cd75e50796adaddb629d870d59b1c'],
    [populatedContext, '9b0bb18a5b3766bde8e2aaefea608c7ce1877646a446d6b46d6ee733f9c597e8'],
    [{ ...populatedContext, language: 'en', energyLevel: 'low' }, '5039dedeeccfae4845b09d43e6a4f7d8c0efa02ae23477dc5014f45ded05e353'],
    [{ ...populatedContext, language: 'zh', isNewUser: true }, '1c6c018ab06fe202f059685a71e30ffdf0ce2e210b0a2475fbe26f211799289b'],
  ];
  for (const [context, expectedHash] of cases) {
    const prompt = buildSystemPrompt('Manual Agent', context);
    const legacy = prompt.replace(productManual(prompt), '')
      .replace('3. **Let user decide**: Ask the student to confirm or reject in chat; explain the current proposal visibility and application limits in 产品说明.',
        '3. **Let user decide**: The student reviews, edits, approves, or rejects in the Proposal panel.')
      .replace('- Ask the student for any time adjustments in chat; explain the current proposal visibility and application limits in 产品说明.',
        '- Student can adjust times in the Proposal panel before applying.')
      .replace('   - Ask the student to confirm or reject in chat; explain the current proposal visibility and application limits in 产品说明.',
        '   - The student reviews and approves via the Proposal panel');
    assert.equal(createHash('sha256').update(legacy).digest('hex'), expectedHash);
  }
});

test('product manual has a bounded declared token estimate', () => {
  const manual = productManual();
  // No tokenizer dependency: estimate Han characters at 1–2 tokens each and
  // remaining characters at 4 chars/token. This is a budget estimate, not provider usage.
  const hanCharacters = [...manual].filter(character => /\p{Script=Han}/u.test(character)).length;
  const otherCharacters = [...manual].length - hanCharacters;
  const upperEstimate = hanCharacters * 2 + Math.ceil(otherCharacters / 4);
  assert.ok(upperEstimate <= 2000, `estimated upper budget exceeded: ${upperEstimate}`);
});

test('Source Library question receives the truthful boundary through the isolated message route and provider stub', async t => {
  // This checks prompt delivery + SSE/persistence with a deterministic provider,
  // not whether a real model follows the instruction. No live provider is called.
  const { db, received, request } = await fixture(t, prompt => {
    const manual = productManual(prompt);
    assert.match(manual, /你今天检索不到 Source Library 的内容/u);
    assert.match(manual, /建议用户经材料库上传/u);
    return '目前我不能检索或读取 Source Library 里的文件。我能通过 search_documents / get_document_content 检索和读取材料库；请经材料库上传需要我使用的文件。';
  });
  const question = '你能读我 Source Library 里的文件吗';
  const response = await request({ message: question });
  assert.equal(response.status, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].messages[0].content, question);
  assert.match(response.body, /event: text/);
  assert.match(response.body, /event: done/);
  assert.doesNotMatch(response.body, /event: (?:error|tool_start|tool_end)/);
  const reply = db.prepare("SELECT content FROM agent_messages WHERE conversation_id=? AND role='assistant'")
    .get(response.conversationId) as { content: string };
  assert.match(reply.content, /不能检索或读取 Source Library/u);
  assert.match(reply.content, /材料库.*请经材料库上传/u);
  assert.ok(response.body.includes(reply.content), 'the streamed reply is the reply saved in the isolated conversation');
});
