import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { closeDb, initDb } from '../db/init.js';
import { MemoryManager, sanitizeConversationHistory } from '../agent/memory/manager.js';
import { deleteEpisode, insertEpisode, listConversationMessages, listEpisodes } from '../agent/memory/episodes.js';
import {
  estimateEpisodeTokens, fallbackEpisodeSummary, groupEpisodeTurns, prepareEpisodeContext,
  selectResidentEpisodes, summarizeEpisode,
} from '../agent/memory/episode-context.js';
import { AGENT_EPISODE_BUDGET } from '../agent/runtime-budget.js';
import { runAgent } from '../agent/orchestrator.js';
import { executeTool } from '../agent/tools/executor.js';
import { OpenAIProvider } from '../agent/providers/openai.js';
import type { AIProvider, ProviderMessage, StreamChunk, ToolDefinition } from '../agent/providers/types.js';
import type { AgentEpisodeRecord } from '../../../shared/types/agentEpisodes.js';

const USER = 'synthetic-c3';
const CONVERSATION = 'synthetic-c3-chat';
const emptyManifest = () => ({ note_ids: [], board_ids: [], item_ids: [], proposal_ids: [], memory_ids: [] });

async function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'c3-context-'));
  const originalEnv = process.env;
  process.env = { ...originalEnv, COINCIDES_APP_DATA_DIR: directory, NODE_ENV: 'test',
    OPENAI_API_KEY: 'syn-c3', ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '',
    GENERIC_API_KEY: '', DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '' };
  t.after(() => { process.env = originalEnv; rmdirSync(directory); });
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
    .run(USER, 'c3@example.invalid', 'synthetic', 'C3 fixture', '{"active_provider":"openai"}');
  db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)')
    .run(CONVERSATION, USER, 'C3 synthetic conversation');
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network in C3 fixture'); });
  return { db, manager: new MemoryManager(USER) };
}

function seedTurns(manager: MemoryManager, count: number, length = 10) {
  for (let turn = 0; turn < count; turn++) {
    manager.saveMessage(CONVERSATION, 'user', `Question ${turn}. ${'x'.repeat(length)}`, null, null, `turn-${turn}`);
    manager.saveMessage(CONVERSATION, 'assistant', `Answer ${turn}.`, null, null, `turn-${turn}`);
  }
}

function options(systemPrompt = 'Resident facts') {
  return { systemPrompt, currentMessage: 'Continue.', deadline: Date.now() + 30_000 };
}

function episode(seq: number, summary = `Summary ${seq}.`): AgentEpisodeRecord {
  return { id: `episode-${seq}`, conversation_id: CONVERSATION, seq, summary_text: summary,
    message_range: { first_message_id: `first-${seq}`, last_message_id: `last-${seq}`,
      started_at: '2026-09-20T00:00:00Z', ended_at: '2026-09-20T01:00:00Z' },
    anchor_manifest: emptyManifest(), token_estimate: estimateEpisodeTokens(summary), created_at: '2026-09-20T01:00:00Z' };
}

test('watchdog threshold is strict: at 24000 no compression; one token above compacts oldest complete turns', async t => {
  const { manager } = await fixture(t);
  seedTurns(manager, 6);
  const rows = listConversationMessages(USER, CONVERSATION);
  const base = estimateEpisodeTokens('Continue.' + JSON.stringify(sanitizeConversationHistory(rows)));
  const atThreshold = options('a'.repeat((AGENT_EPISODE_BUDGET.triggerTokens - base) * 4));
  const boundary = await prepareEpisodeContext(USER, CONVERSATION, atThreshold);
  assert.equal(boundary.estimatedTokens, AGENT_EPISODE_BUDGET.triggerTokens);
  assert.equal(boundary.createdEpisodes.length, 0);
  const above = await prepareEpisodeContext(USER, CONVERSATION, { ...atThreshold, systemPrompt: atThreshold.systemPrompt + 'aaaa' });
  assert.equal(above.createdEpisodes.length, 1);
  const stored = listEpisodes(USER, CONVERSATION)[0];
  assert.equal(stored.message_range.first_message_id, rows[0].id);
  assert.equal(stored.message_range.last_message_id, rows[3].id);
  assert.equal(above.history.length, 8, 'four most recent turns remain whole even if the resident facts alone are too large');
});

test('history below threshold is complete beyond the old 50-row cap', async t => {
  const { manager } = await fixture(t);
  seedTurns(manager, 31);
  const result = await prepareEpisodeContext(USER, CONVERSATION, options());
  assert.equal(result.history.length, 62);
  assert.equal(result.createdEpisodes.length, 0);
});

test('fallback summary is deterministic across same-timestamp turns and never invokes a provider in tests', async t => {
  const { manager } = await fixture(t);
  manager.saveMessage(CONVERSATION, 'user', '第一句。第二句。', null, null, 'one');
  manager.saveMessage(CONVERSATION, 'assistant', 'Done. Further detail.', null, null, 'one');
  manager.saveMessage(CONVERSATION, 'user', 'Next question? More.', null, null, 'two');
  const rows = listConversationMessages(USER, CONVERSATION);
  assert.equal(fallbackEpisodeSummary(rows), 'user: 第一句。\nuser: Next question?');
  let calls = 0;
  const provider: AIProvider = { async *chat() { calls++; throw new Error('Summary must not call provider'); } };
  const first = await summarizeEpisode(rows, provider, Date.now() + 1000);
  assert.equal(await summarizeEpisode(rows, provider, Date.now() + 1000), first);
  assert.equal(calls, 0);
});

test('turn grouping preserves interleaved turn spans and legacy assistant/tool-result pairs', async t => {
  const { manager } = await fixture(t);
  manager.saveMessage(CONVERSATION, 'user', 'A', null, null, 'A');
  manager.saveMessage(CONVERSATION, 'user', 'B', null, null, 'B');
  manager.saveMessage(CONVERSATION, 'assistant', 'A reply', null, null, 'A');
  manager.saveMessage(CONVERSATION, 'assistant', 'B reply', null, null, 'B');
  manager.saveMessage(CONVERSATION, 'user', 'Legacy');
  manager.saveMessage(CONVERSATION, 'assistant', '', '[{"id":"call","name":"read_note","arguments":{"note_id":"note"}}]');
  manager.saveMessage(CONVERSATION, 'user', '', null, '[{"tool_call_id":"call","content":"{}"}]');
  manager.saveMessage(CONVERSATION, 'assistant', 'Legacy reply');
  manager.saveMessage(CONVERSATION, 'user', 'Next legacy');
  assert.deepEqual(groupEpisodeTurns(listConversationMessages(USER, CONVERSATION)).map(group => group.length), [4, 4, 1]);
  assert.equal(fallbackEpisodeSummary(listConversationMessages(USER, CONVERSATION)), 'user: A\nuser: B\nuser: Legacy\nuser: Next legacy');
});

test('resident episodes are chronological latest K, preserve complete anchor IDs, and drop whole oldest views over budget', () => {
  const records = [1, 2, 3, 4, 5].map(seq => episode(seq));
  records[4].anchor_manifest.note_ids.push('note:original/id_全文');
  const normal = selectResidentEpisodes(records);
  assert.deepEqual(normal.episodes.map(row => row.seq), [3, 4, 5]);
  assert.ok(normal.prompt.indexOf('Summary 3') < normal.prompt.indexOf('Summary 5'));
  assert.ok(normal.prompt.includes('note:original/id_全文'));
  records[4].anchor_manifest.note_ids = ['a'.repeat(AGENT_EPISODE_BUDGET.episodeTokens * 4 + 1)];
  assert.deepEqual(selectResidentEpisodes(records), { episodes: [], prompt: '' }, 'no partial identifier or skipped newest episode');
  const big = episode(1, 'x'.repeat(6000));
  const bounded = selectResidentEpisodes([big, episode(2, 'x'.repeat(2000)), episode(3)]);
  assert.deepEqual(bounded.episodes.map(row => row.seq), [2, 3]);
  assert.ok(estimateEpisodeTokens(bounded.prompt) <= AGENT_EPISODE_BUDGET.episodeTokens);
});

test('long conversation journey: automatic assembly compresses, reconciles anchors, preserves every original byte and remains idempotent', async t => {
  const { db, manager } = await fixture(t);
  seedTurns(manager, 24, 9000);
  const before = db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all();
  const oldRows = listConversationMessages(USER, CONVERSATION);
  const result = await prepareEpisodeContext(USER, CONVERSATION, options());
  assert.ok(result.createdEpisodes.length >= 2);
  assert.deepEqual(db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all(), before);
  assert.ok(result.episodePrompt.includes('Question 0.'));
  assert.ok(!JSON.stringify(result.history).includes('Question 0.'));
  const recentIds = new Set(oldRows.slice(-8).map(row => row.content));
  for (const content of recentIds) assert.ok(result.history.some(message => message.content === content));
  const records = listEpisodes(USER, CONVERSATION);
  assert.deepEqual(records[0].anchor_manifest, emptyManifest());
  assert.equal(records[0].summary_text, fallbackEpisodeSummary(oldRows.slice(0, 16)));
  const again = await prepareEpisodeContext(USER, CONVERSATION, options());
  assert.equal(again.createdEpisodes.length, 0);
  assert.deepEqual(listEpisodes(USER, CONVERSATION), records);
});

test('deleting a middle episode exposes its originals and rebuilding preserves its stable seq', async t => {
  const { db, manager } = await fixture(t);
  seedTurns(manager, 20, 9000);
  await prepareEpisodeContext(USER, CONVERSATION, options());
  const records = listEpisodes(USER, CONVERSATION);
  assert.ok(records.length >= 2);
  const before = db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all();
  assert.equal(deleteEpisode(USER, records[0].id), true);
  const reconstructed = await prepareEpisodeContext(USER, CONVERSATION, options());
  assert.ok(reconstructed.createdEpisodes.length > 0);
  assert.deepEqual(listEpisodes(USER, CONVERSATION).map(row => row.seq), records.map(row => row.seq));
  assert.deepEqual(db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all(), before);
});

test('overlapping watchdog requests create one projection per segment', async t => {
  const { manager } = await fixture(t);
  seedTurns(manager, 16, 9000);
  const results = await Promise.all([prepareEpisodeContext(USER, CONVERSATION, options()), prepareEpisodeContext(USER, CONVERSATION, options())]);
  const records = listEpisodes(USER, CONVERSATION);
  assert.equal(records.length, results.flatMap(result => result.createdEpisodes).length);
  assert.equal(new Set(records.map(row => row.seq)).size, records.length);
});

test('recall journey: old episode is absent from resident prompt and automatic memories but search_memories recalls kind and anchors', async t => {
  const { manager } = await fixture(t);
  seedTurns(manager, 8);
  const rows = listConversationMessages(USER, CONVERSATION);
  for (let index = 0; index < 4; index++) insertEpisode(USER, CONVERSATION, rows.slice(index * 2, index * 2 + 2), index === 0 ? 'Lunar apricot decision.' : `Recent episode ${index}.`, 8);
  const resident = await prepareEpisodeContext(USER, CONVERSATION, options());
  assert.ok(!resident.episodePrompt.includes('Lunar apricot'));
  assert.deepEqual(await manager.retrieveMemories('Lunar apricot'), []);
  const found = JSON.parse(await executeTool('search_memories', { query: 'Lunar apricot' }, USER));
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'episode');
  assert.equal(found[0].conversation_id, CONVERSATION);
  assert.deepEqual(found[0].anchor_manifest, emptyManifest());
  assert.equal(found[0].message_range.first_message_id, rows[0].id);
});

test('actual agent loop sends resident facts then episode context then recent messages, with only the scripted reply call', async t => {
  const { manager } = await fixture(t);
  seedTurns(manager, 12, 5000);
  let providerCalls = 0;
  t.mock.method(OpenAIProvider.prototype, 'chat', async function* (messages: ProviderMessage[], _tools: ToolDefinition[], prompt: string): AsyncGenerator<StreamChunk> {
    providerCalls++;
    assert.ok(prompt.indexOf('## Current Context') < prompt.indexOf('## Recent conversation episodes'));
    assert.ok(prompt.includes('Question 0.'));
    assert.equal(messages.at(-1)?.content, 'Continue C3.');
    assert.ok(!JSON.stringify(messages).includes('Question 0.'));
    yield { type: 'text', text: 'Scripted response.' };
    yield { type: 'done' };
  });
  const events: StreamChunk[] = [];
  for await (const event of runAgent(USER, CONVERSATION, 'Continue C3.')) events.push(event);
  assert.equal(events.at(-1)?.type, 'done');
  assert.equal(providerCalls, 1, 'no summary model call under test');
  assert.ok(listEpisodes(USER, CONVERSATION).length > 0);
});
