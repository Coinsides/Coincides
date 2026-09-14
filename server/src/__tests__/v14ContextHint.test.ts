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

function promptSection(heading: string, prompt = buildSystemPrompt('Manual Agent', emptyContext)): string {
  const lines = prompt.split('\n');
  const starts = lines.flatMap((line, index) => line === heading ? [index] : []);
  assert.equal(starts.length, 1, `one authoritative ${heading} section`);
  const level = heading.match(/^#+/)![0].length;
  const end = lines.findIndex((line, index) => index > starts[0]
    && new RegExp(`^#{1,${level}} `).test(line));
  return lines.slice(starts[0], end === -1 ? undefined : end).join('\n');
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
    /按提交门分域：经材料库门提交的 material_map \/ organized_note \/ material_reconciliation 可在项目页处理/u,
    /经 chat 门提交的提案（含 organized_note）在 Agent 面板收件箱处理，不指向项目页/u,
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

test('product manual maps the four readers to their scope and discloses partial reads', () => {
  const perception = promptSection('### 感知能力');
  assert.match(perception, /read_note[^\n]*one page at a time[^\n]*next_page_index/);
  assert.match(perception, /read_board[^\n]*members, links and geometry[^\n]*without screenshots/);
  assert.match(perception, /read_content_groups[^\n]*group membership and text previews[^\n]*course or note/);
  assert.match(perception, /read_annotations_relations[^\n]*annotations and Item Relation judgments\/receipts/);
  assert.match(perception, /Check truncated\/has_more on every result/);
  assert.match(perception, /Only read_note offers paging/);
  assert.match(perception, /disclose any remaining truncation[^\n]*instead of claiming a complete read[^\n]*even when next_page_index is null/);
});

test('ordinary tool errors get one bounded correction while ceremony errors follow confirmation', () => {
  const claims = promptSection('### 宣称纪律');
  assert.match(claims, /先读结构化错误、修正参数，再在本轮工具预算内重试一次/u);
  assert.match(claims, /同一调用连续两次失败就停止重试，并如实报告失败与原因/u);
  assert.match(claims, /仪式类 400\/409 走确认流程，不当作故障重试/u);
  assert.match(claims, /若对象或清单漂移，重新复述并等待用户确认/u);
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

test('planning uses real date parameters and collects special constraints in chat', () => {
  const prompt = buildSystemPrompt('Manual Agent', emptyContext);
  assert.doesNotMatch(prompt, /week_of|extra_notes|energyLevel/);
  assert.match(prompt, /get_time_blocks[^\n]*from_date[^\n]*to_date/);
  assert.match(prompt, /(?:chat[^\n]*special constraints|special constraints[^\n]*chat)/i);
  for (const question of ['scheduling_mode', 'study_dates', 'documents', 'daily_task_limit', 'granularity']) {
    assert.ok(prompt.includes(`| ${question} |`), `preserve the ${question} preference question`);
  }
  assert.doesNotMatch(prompt, /number_input[^\n]*(?:open text|special constraints|补充要求)/iu);
});

test('generated work uses proposal rules while explicit individual actions have a direct route', () => {
  const rules = promptSection('## Key Rules');
  assert.match(rules, /生成批走提案优先 \(Proposal-first generation\)/u);
  for (const proposalType of ['batch_cards', 'study_plan', 'goal_breakdown', 'schedule_adjustment', 'time_block_setup']) {
    assert.ok(rules.includes(proposalType), `preserve ${proposalType} proposal routing`);
  }
  assert.match(rules, /Cards, including a single card[^\n]*batch_cards/);
  assert.match(rules, /study_plan[^\n]*never build a generated plan with create_task/);
  assert.match(rules, /Direct-action rules[^\n]*individual task explicitly requested by the student may use create_task/);
  for (const action of ['create_deck', 'create_section', 'create_goal', 'create_sub_goal', 'create_time_blocks', 'update_time_block', 'link_task_cards']) {
    assert.ok(rules.includes(action), `preserve the ${action} direct action rule`);
  }
  assert.match(rules, /confirm or reject in chat[^\n]*visibility\/application limits[^\n]*chat confirmation does not apply a proposal/);
});

test('organized notes require a course and real source selectors without authored blocks', () => {
  const rules = promptSection('## Key Rules');
  const row = rules.split('\n').find(line => line.includes('| Organized notes |'));
  assert.ok(row);
  assert.match(row, /organized_note with course_id and source selection/);
  for (const selector of ['document_ids', 'source_material_ids', 'segment_ids', 'source_scope_ids', 'source_board_id']) {
    assert.ok(row.includes(selector), `preserve the ${selector} source selector`);
  }
  assert.match(row, /optional note_title, never author blocks/);
  assert.doesNotMatch(row, /source_document_ids/);
});

test('minute locks are scoped to Time Block mode and selected Calendar Event times remain adjustable', () => {
  const prompt = buildSystemPrompt('Manual Agent', emptyContext);
  const constitution = promptSection('## Design Constitution — HARD RULES (不可违反)', prompt);
  assert.match(constitution, /Time Block 模式不锁任务到分钟；Calendar Event 模式由学生显式选择时刻并可调整/u);
  const prohibitions = promptSection('## Things You Must NEVER Do', prompt);
  assert.match(prohibitions, /In Time Block mode, lock tasks to specific minutes[^\n]*Calendar Event mode is an explicit student choice with adjustable start\/end times/);
  const scheduling = promptSection('### Scheduling rules and dual modes', prompt);
  assert.match(scheduling, /Time Block mode:[^\n]*scheduled_date[^\n]*time_block_id[^\n]*no start_time\/end_time and NEVER lock tasks to specific minutes/);
  assert.match(scheduling, /Calendar Event mode:[^\n]*student explicitly selects this mode[^\n]*suggested start_time\/end_time[^\n]*adjustable/);
  assert.match(scheduling, /Only dates whose proposed gap setup was rejected may omit time_block_id/);
  assert.doesNotMatch(prompt, /Never lock schedules|^- Lock schedules to specific minutes/gm);
});

test('cards, study planning and document questions each have one authoritative flow with a compact table', () => {
  const prompt = buildSystemPrompt('Manual Agent', emptyContext);
  const cards = promptSection('## Card Generation（卡片生成）', prompt);
  const planning = promptSection('## Study Planning（学习规划）', prompt);
  const documents = promptSection('## Document Questions（文档问答）', prompt);
  for (const flow of [cards, planning, documents]) assert.match(flow, /^\|---/m);
  assert.match(cards, /Every item MUST include deck_id AND section_id/);
  assert.match(cards, /definition[^\n]*example\?: string/);
  assert.match(cards, /theorem[^\n]*proof_sketch\?: string/);
  assert.match(cards, /formula[^\n]*variables\?: Record<string,string>/);
  assert.match(cards, /general[^\n]*body: string/);
  assert.match(planning, /Goal → Sub-goals \(stages\/phases\) → Tasks/);
  assert.match(planning, /Never read more than 100 total pages per session/);
  assert.match(planning, /MUST use collect_preferences before generating a study_plan or goal_breakdown/);
  assert.match(documents, /relevant_chunks[^\n]*if sufficient, answer immediately without get_document_content/);
  assert.match(documents, /otherwise use get_document_content under the detailed-reading rule/);
  assert.match(documents, /≤50 pages: full read; >50 pages: semantic search \+ first 5 chunks/u);
  assert.doesNotMatch(prompt, /^## (?:MWF Study Plan Creation Flow|Document-Based Card Generation|Document Search & RAG|Planning Protocol|Scheduling Protocol|Pre-Planning Preference Collection|Dual Scheduling Mode)/m);
  assert.doesNotMatch(prompt, /^### Playbook — (?:Card Generation|Study Plan Creation|Simple Question)/m);
});

test('prompt states current behavior without obsolete version comparisons', () => {
  const prompt = buildSystemPrompt('Manual Agent', emptyContext);
  assert.doesNotMatch(prompt, /v1\.7\.3|now enhanced|now uses semantic|are now DATE-BASED|old manual Q&A|replaced by the structured form/i);
  assert.doesNotMatch(prompt, /MANDATORY — no exceptions|Submit[^\n]*for student review|student reviews and approves/i);
});

test('identity and dynamic context bytes remain unchanged across the six existing prompt cases', () => {
  // SHA-256 of unchanged sections captured BEFORE the prompt repair production edit.
  // Preserve all six former whole-prompt cases while allowing the ordered body repairs.
  const cases: Array<[PromptContext, string, string]> = [
    [emptyContext,
      'fc55691a922334004acffb54babc7af5020922ee28ca82aa0a9429367cbc78d6',
      'd12151750484303fc65d6d7a18d27303f12928014c5a7b33a43f5e95002ce6d9'],
    [{ ...emptyContext, language: 'en', decks: [], isNewUser: false },
      'f103dc1ad73b20993922fd914e7c407d8a88a356e56e97feaf181d3345fa41ee',
      'd12151750484303fc65d6d7a18d27303f12928014c5a7b33a43f5e95002ce6d9'],
    [{ ...emptyContext, language: 'zh', isNewUser: true },
      'e669e3cb04bb252554612460cc7a7686e48f745818b6ae5c451b35c30f57c0f0',
      'd12151750484303fc65d6d7a18d27303f12928014c5a7b33a43f5e95002ce6d9'],
    [populatedContext,
      'fc55691a922334004acffb54babc7af5020922ee28ca82aa0a9429367cbc78d6',
      '6c1fc6e13b48ce8913d6a874132e988d61fc2748f4dc8dd097922d9c00b6e539'],
    [{ ...populatedContext, language: 'en' },
      'f103dc1ad73b20993922fd914e7c407d8a88a356e56e97feaf181d3345fa41ee',
      '6c1fc6e13b48ce8913d6a874132e988d61fc2748f4dc8dd097922d9c00b6e539'],
    [{ ...populatedContext, language: 'zh', isNewUser: true },
      'e669e3cb04bb252554612460cc7a7686e48f745818b6ae5c451b35c30f57c0f0',
      '6c1fc6e13b48ce8913d6a874132e988d61fc2748f4dc8dd097922d9c00b6e539'],
  ];
  for (const [context, expectedIdentityHash, expectedContextHash] of cases) {
    const prompt = buildSystemPrompt('Manual Agent', context);
    const identity = prompt.slice(0, prompt.indexOf('## Design Constitution'));
    const dynamicContext = prompt.slice(prompt.indexOf('## Current Context'), prompt.indexOf('## Key Rules'));
    assert.equal(createHash('sha256').update(identity).digest('hex'), expectedIdentityHash);
    assert.equal(createHash('sha256').update(dynamicContext).digest('hex'), expectedContextHash);
    assert.equal(prompt.includes('## L1 Protocol'), Boolean(context.isNewUser));
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
