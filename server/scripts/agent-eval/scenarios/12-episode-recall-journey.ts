import assert from 'node:assert/strict';
import { MemoryManager } from '../../../src/agent/memory/manager.js';
import { estimateEpisodeTokens, fallbackEpisodeSummary, selectResidentEpisodes } from '../../../src/agent/memory/episode-context.js';
import { insertEpisode, listConversationMessages, listEpisodes } from '../../../src/agent/memory/episodes.js';
import { answer, tool } from '../helpers.js';
import type { Row, Scenario } from '../types.js';

const marker = 'c3quartzarchive';
const summaries = [`${marker} recorded the decision to compare the early draft with the final checklist.`,
  'The next phase reviewed the chapter headings.', 'The third phase listed unresolved reading questions.',
  'The latest phase prepared the next study session.'];

export default {
  name: '12-episode-recall-journey',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  setup(ctx) {
    assert.equal(ctx.mode, 'scripted', 'C3 episode evaluations only run deterministic summary fallback');
    assert.equal(process.env.NODE_ENV, 'test');
    for (const [index, text] of summaries.entries()) {
      const turnId = `eval-episode-turn-${index}`;
      const createdAt = `2026-09-20T00:00:0${index}.000Z`;
      const firstId = `eval-episode-user-${index}`;
      const secondId = `eval-episode-assistant-${index}`;
      // Append fixture history, then use the actual projection service; no original row is rewritten.
      const insert = ctx.db.prepare(`INSERT INTO agent_messages
        (id, conversation_id, role, content, created_at, turn_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      insert.run(firstId, ctx.conversationId, 'user', text, createdAt, turnId, '{}');
      insert.run(secondId, ctx.conversationId, 'assistant', 'The phase has been reviewed.', createdAt, turnId, '{}');
      const rows = listConversationMessages(ctx.userId, ctx.conversationId).slice(-2);
      const summary = fallbackEpisodeSummary(rows);
      insertEpisode(ctx.userId, ctx.conversationId, rows, summary, estimateEpisodeTokens(summary));
    }
    ctx.state.originals = ctx.db.prepare('SELECT * FROM agent_messages ORDER BY rowid').all();
    ctx.state.originalEpisodes = listEpisodes(ctx.userId, ctx.conversationId);
  },
  turns: [{
    user: '请检索最早阶段的决定，并说明它来自历史情节摘要。',
    *script(ctx) {
      assert.ok(ctx.definitions.length > 0, 'summary generation must not call the scripted chat provider');
      if (ctx.round === 0) {
        ctx.state.residentPrompt = ctx.prompt;
        ctx.state.initialMessages = structuredClone(ctx.messages);
        yield* tool('episode-recall', 'search_memories', { query: marker });
      } else {
        ctx.state.recalledMessages = structuredClone(ctx.messages);
        yield* answer('历史情节摘要记录了把早期草稿与最终清单对照的决定。');
      }
    },
  }],
  async assertions(ctx) {
    const turn = ctx.turns[0];
    const episodes = listEpisodes(ctx.userId, ctx.conversationId);
    const oldest = episodes[0];
    await ctx.check('the oldest of four episodes is absent from the actual resident prompt and replay history', () => {
      assert.equal(episodes.length, 4);
      assert.equal(oldest.summary_text.includes(marker), true);
      const resident = selectResidentEpisodes(episodes);
      assert.deepEqual(resident.episodes.map(episode => episode.id), episodes.slice(1).map(episode => episode.id));
      assert.ok(ctx.state.residentPrompt.endsWith(resident.prompt));
      assert.equal(ctx.state.residentPrompt.includes(marker), false);
      assert.equal(ctx.state.residentPrompt.includes(oldest.id), false);
      assert.equal(JSON.stringify(ctx.state.initialMessages).includes(marker), false);
    });
    await ctx.check('the existing search_memories tool recalls the old episode through FTS with kind and original anchors', () => {
      const ends = turn.events.filter(event => event.type === 'tool_end');
      assert.deepEqual(ends.map(event => ({ name: event.data.name, ok: event.data.ok })), [{ name: 'search_memories', ok: true }]);
      const savedResults = turn.messages.flatMap(row => row.tool_results ? JSON.parse(row.tool_results) : []) as Row[];
      assert.equal(savedResults.length, 1);
      const matches = JSON.parse(savedResults[0].content) as Row[];
      const recalled = matches.find(row => row.id === oldest.id);
      assert.ok(recalled);
      assert.equal(recalled.kind, 'episode');
      assert.equal(recalled.content, oldest.summary_text);
      assert.equal(recalled.conversation_id, ctx.conversationId);
      assert.deepEqual(recalled.anchor_manifest, oldest.anchor_manifest);
      assert.ok(JSON.stringify(ctx.state.recalledMessages).includes(marker));
    });
    await ctx.check('the automatic memory lane does not silently promote the recalled old episode to resident memory', async () => {
      assert.deepEqual(await new MemoryManager(ctx.userId).retrieveMemories(marker), []);
      assert.deepEqual(turn.tables.agent_memories, []);
      assert.equal(turn.providerRounds, 2);
      assert.equal(ctx.state.residentPrompt.includes(marker), false);
    });
    await ctx.check('recall leaves all episode projections and every original source-message field untouched', () => {
      assert.deepEqual(episodes, ctx.state.originalEpisodes);
      const byId = new Map(turn.tables.agent_messages.map(row => [row.id, row]));
      for (const original of ctx.state.originals as Row[]) assert.deepEqual(byId.get(original.id), original);
      assert.equal(turn.tables.agent_messages.length, ctx.state.originals.length + turn.messages.length);
      assert.deepEqual(turn.api.history.map(row => row.id), turn.tables.agent_messages.map(row => row.id));
    });
    await ctx.check('recall has a persisted read-only turn receipt, no domain writes and no empty claim', () => {
      const receipt = turn.events.find(event => event.type === 'turn_receipt')!.data;
      assert.deepEqual(receipt.read_calls, [{ name: 'search_memories', ok: true }]);
      assert.deepEqual(receipt.write_calls, []);
      assert.equal(receipt.write_ok_count, 0);
      assert.deepEqual(turn.tables.operation_batches, []);
      assert.equal(turn.tables.events.filter(row => row.verb === 'claim_without_receipt').length, 0);
    });
  },
} satisfies Scenario;
