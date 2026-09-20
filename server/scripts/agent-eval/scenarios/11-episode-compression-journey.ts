import assert from 'node:assert/strict';
import { fallbackEpisodeSummary, estimateEpisodeTokens, selectResidentEpisodes } from '../../../src/agent/memory/episode-context.js';
import { listConversationMessages, listEpisodes } from '../../../src/agent/memory/episodes.js';
import { AGENT_EPISODE_BUDGET } from '../../../src/agent/runtime-budget.js';
import { answer, results, tool } from '../helpers.js';
import type { Row, Scenario } from '../types.js';

const turnCount = 14;
const preference = '按阶段整理学习记录，再检查未决问题。';
const userText = (index: number) => `Archive phase ${index + 1} recorded. ${'chronology '.repeat(520)}`;

export default {
  name: '11-episode-compression-journey',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  setup(ctx) {
    assert.equal(ctx.mode, 'scripted', 'C3 episode evaluations only run deterministic summary fallback');
    assert.equal(process.env.NODE_ENV, 'test');
    ctx.state.providerInputs = [];
    ctx.state.ledgerSnapshots = [];
    ctx.state.episodeSnapshots = [];
  },
  turns: Array.from({ length: turnCount }, (_, index) => ({
    user: index === 0 ? `请保存偏好：${preference} ${userText(index)}` : userText(index),
    *script(ctx) {
      // Capture the actual runAgent inputs. Summary provider calls would have no tools.
      assert.ok(ctx.definitions.length > 0, 'summary generation must not call the scripted chat provider');
      ctx.state.initialContext ??= { prompt: ctx.prompt, tools: JSON.stringify(ctx.definitions) };
      ctx.state.providerInputs.push({ turn: index, round: ctx.round,
        prompt: ctx.prompt, messages: structuredClone(ctx.messages) });
      if (index === 0 && ctx.round === 0) {
        yield* tool('episode-preference', 'save_memory', { category: 'preference', content: preference });
      } else yield* answer(index === 0 ? '偏好已保存。' : `Phase ${index + 1} reviewed.`);
    },
  })),
  afterTurn(ctx, index) {
    const rows = ctx.db.prepare('SELECT * FROM agent_messages WHERE conversation_id = ? ORDER BY rowid')
      .all(ctx.conversationId) as Row[];
    const episodes = listEpisodes(ctx.userId, ctx.conversationId);
    ctx.state.ledgerSnapshots.push(structuredClone(rows));
    ctx.state.episodeSnapshots.push(structuredClone(episodes));
    // Preserve actual prompt evidence alongside the ordinary API / ledger snapshots.
    (ctx.turns[index] as unknown as Row).episodeAssembly = ctx.state.providerInputs.filter((entry: Row) => entry.turn === index);
  },
  async assertions(ctx) {
    const final = ctx.turns.at(-1)!;
    const episodes = listEpisodes(ctx.userId, ctx.conversationId);
    const rows = listConversationMessages(ctx.userId, ctx.conversationId);
    await ctx.check('scripted multi-turn injection exceeds the runtime threshold and creates projected episodes', () => {
      assert.equal(ctx.turns.length, turnCount);
      assert.ok(estimateEpisodeTokens(ctx.state.initialContext.prompt + ctx.state.initialContext.tools
        + JSON.stringify(rows)) > AGENT_EPISODE_BUDGET.triggerTokens);
      assert.ok(episodes.length > 0);
      assert.equal(final.tables.agent_episodes.length, episodes.length);
      assert.ok(ctx.state.episodeSnapshots.slice(1).some((snapshot: Row[]) => snapshot.length > 0));
    });
    await ctx.check('compression preserves every original message field and all per-turn history API rows', () => {
      const originals = final.tables.agent_messages;
      const byId = new Map(originals.map(row => [row.id, row]));
      assert.equal(originals.length, ctx.turns.reduce((sum, turn) => sum + turn.messages.length, 0));
      for (const snapshot of ctx.state.ledgerSnapshots as Row[][]) {
        for (const original of snapshot) assert.deepEqual(byId.get(original.id), original);
      }
      assert.deepEqual(final.api.history.map(row => row.id), originals.map(row => row.id));
      assert.equal(new Set(originals.map(row => row.id)).size, originals.length);
    });
    await ctx.check('all summaries use deterministic fallback and call the chat provider only for scripted user turns', () => {
      assert.equal(ctx.state.providerInputs.length, turnCount + 1);
      for (const episode of episodes) {
        const first = rows.findIndex(row => row.id === episode.message_range.first_message_id);
        const last = rows.findIndex(row => row.id === episode.message_range.last_message_id);
        assert.ok(first >= 0 && last >= first);
        const segment = rows.slice(first, last + 1);
        assert.equal(episode.summary_text, fallbackEpisodeSummary(segment));
        assert.equal(episode.token_estimate, estimateEpisodeTokens(episode.summary_text));
        assert.ok(new Set(segment.map(row => row.turn_id)).size <= AGENT_EPISODE_BUDGET.maxTurnsPerEpisode);
      }
    });
    await ctx.check('mechanical anchor manifest retains the exact successful save_memory receipt ID', () => {
      const saved = results(ctx.turns[0])[0];
      assert.equal(saved.message, 'Memory saved successfully');
      const firstMessageId = ctx.turns[0].messages[0].id;
      const episode = episodes.find(entry => entry.message_range.first_message_id === firstMessageId);
      assert.ok(episode);
      assert.deepEqual(episode.anchor_manifest, { note_ids: [], board_ids: [], item_ids: [], proposal_ids: [], memory_ids: [saved.id] });
      assert.equal(final.tables.agent_memories.find(row => row.id === saved.id)?.content, preference);
    });
    await ctx.check('actual assembly appends recent bounded episodes after the resident package and omits covered raw turns', () => {
      const input = (ctx.state.providerInputs as Row[]).find(entry => entry.turn === turnCount - 1 && entry.round === 0)!;
      const resident = selectResidentEpisodes(episodes);
      assert.ok(resident.episodes.length > 0 && resident.episodes.length <= AGENT_EPISODE_BUDGET.recentEpisodes);
      assert.ok(estimateEpisodeTokens(resident.prompt) <= AGENT_EPISODE_BUDGET.episodeTokens);
      assert.ok(input.prompt.endsWith(resident.prompt));
      assert.ok(input.prompt.indexOf('## Recent conversation episodes') > 0);
      const replay = JSON.stringify(input.messages);
      for (const episode of episodes) {
        const first = rows.findIndex(row => row.id === episode.message_range.first_message_id);
        const last = rows.findIndex(row => row.id === episode.message_range.last_message_id);
        for (const row of rows.slice(first, last + 1)) {
          if (row.role === 'user' && row.content.includes('chronology ')) assert.equal(replay.includes(row.content), false);
        }
      }
      assert.ok(input.messages.some((message: Row) => message.content === ctx.turns.at(-1)!.user));
    });
    await ctx.check('the complete journey has one receipted memory write and no domain write or empty claim', () => {
      assert.deepEqual(ctx.turns.flatMap(turn => turn.events.filter(event => event.type === 'tool_end')
        .map(event => ({ name: event.data.name, ok: event.data.ok }))), [{ name: 'save_memory', ok: true }]);
      assert.equal(final.tables.events.filter(row => row.verb === 'claim_without_receipt').length, 0);
      assert.deepEqual(final.tables.operation_batches, []);
    });
  },
} satisfies Scenario;
