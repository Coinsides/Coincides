import assert from 'node:assert/strict';
import { MemoryManager } from '../../../src/agent/memory/manager.js';
import { VectorStore } from '../../../src/embedding/vectorStore.js';
import { VoyageProvider } from '../../../src/embedding/voyage.js';
import { answer, results, tool } from '../helpers.js';
import type { Row, Scenario } from '../types.js';

const content = '我习惯清晨背诵，晚上做题。';
const query = '明天复习怎么安排';
const foreignUser = 'eval-memory-other';
const foreignMemory = 'eval-foreign-memory';

function vector(first = 1): number[] {
  const embedding = Array<number>(1024).fill(0);
  embedding[0] = first;
  return embedding;
}

export default {
  name: 'memory-journey',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  setup(ctx) {
    ctx.state.embeddingCalls = [];
    ctx.db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)')
      .run(foreignUser, 'eval-memory-other@example.invalid', 'synthetic', 'Other synthetic user', '{}');
    ctx.db.prepare('INSERT INTO agent_memories(id,user_id,category,content,relevance_score,created_at) VALUES(?,?,?,?,?,?)')
      .run(foreignMemory, foreignUser, 'preference', '另一位用户的习惯', 1, '2026-09-14T00:00:00.000Z');
    if (ctx.mode === 'scripted') {
      // Same boundary as v14MemoryQuickwins: real service/SQLite/vector store,
      // synthetic embedding provider only. The harness restores env per scenario.
      process.env.VOYAGE_API_KEY = 'syn-memory';
      ctx.mock.method(VoyageProvider.prototype, 'embed', async (texts: string[], kind: 'query' | 'document') => {
        ctx.state.embeddingCalls.push({ texts: [...texts], kind });
        return texts.map(() => vector(kind === 'document' ? 1.1 : 1));
      });
      new VectorStore().upsertMemoryEmbedding(foreignMemory, vector());
    }
  },
  turns: [
    {
      user: `请调用 save_memory 保存这个中文偏好，类别 preference，内容逐字为：${content}`,
      *script(ctx) {
        if (ctx.round === 0) yield* tool('memory-save', 'save_memory', { category: 'preference', content });
        else yield* answer('偏好已保存。');
      },
    },
    {
      user: `请再次调用 save_memory 保存完全相同的偏好，验证去重：${content}`,
      *script(ctx) {
        if (ctx.round === 0) yield* tool('memory-duplicate', 'save_memory', { category: 'preference', content });
        else yield* answer('重复偏好已核对。');
      },
    },
    {
      user: query,
      *script(ctx) {
        if (ctx.round === 0) {
          ctx.state.environmentPrompt = ctx.prompt;
          yield* tool('memory-search', 'search_memories', { query });
        } else yield* answer('可以按你的清晨背诵、晚上做题习惯安排复习。');
      },
    },
  ],
  async assertions(ctx) {
    await ctx.check('three SSE turns finish and read/write receipt projections agree with saved history', () => {
      assert.equal(ctx.turns.length, 3);
      for (const [index, turn] of ctx.turns.entries()) {
        assert.equal(turn.events.filter(event => event.type === 'done').length, 1);
        assert.deepEqual(turn.events.filter(event => event.type === 'error'), []);
        const name = index < 2 ? 'save_memory' : 'search_memories';
        const starts = turn.events.filter(event => event.type === 'tool_start');
        const ends = turn.events.filter(event => event.type === 'tool_end');
        assert.equal(starts.length, 1);
        assert.equal(ends.length, 1);
        assert.equal(ends[0].data.name, name);
        assert.deepEqual(ends[0].data, { ...starts[0].data, ok: true });
        const receipts = turn.events.filter(event => event.type === 'turn_receipt');
        assert.equal(receipts.length, 1);
        assert.deepEqual(receipts[0].data, {
          write_calls: index < 2 ? [{ name, ok: true }] : [],
          read_calls: index === 2 ? [{ name, ok: true }] : [],
          write_ok_count: index < 2 ? 1 : 0, write_fail_count: 0,
        });
        assert.deepEqual(turn.api.history.filter(row => row.turn_receipt).at(-1)?.turn_receipt, receipts[0].data);
      }
    });
    await ctx.check('Chinese save persists exact content and the duplicate reuses the existing ID without a second row', () => {
      const initial = results(ctx.turns[0])[0];
      const duplicate = results(ctx.turns[1])[0];
      assert.equal(initial.message, 'Memory saved successfully');
      assert.equal(duplicate.id, initial.id);
      for (const turn of ctx.turns) {
        const rows = turn.tables.agent_memories.filter(row => row.user_id === ctx.userId);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].id, initial.id);
        assert.equal(rows[0].category, 'preference');
        assert.equal(rows[0].content, content);
        assert.equal(turn.api.memories.length, 1);
        assert.equal(turn.api.memories[0].id, initial.id);
        assert.equal(turn.api.memories[0].content, content);
      }
    });
    await ctx.check('Chinese semantic-only fixture has neither FTS nor literal LIKE candidates', () => {
      assert.deepEqual(new VectorStore().ftsSearchMemories(query, 10, ctx.userId), []);
      assert.deepEqual(ctx.db.prepare('SELECT id FROM agent_memories WHERE user_id = ? AND content LIKE ?')
        .all(ctx.userId, `%${query}%`), []);
    });
    await ctx.check('search_memories tool retrieves the Chinese semantic match with ownership filtering', () => {
      const last = ctx.turns[2];
      const callIds = new Set(last.events.filter(event => event.type === 'tool_end').map(event => event.data.id));
      const saved = last.api.history.flatMap(row => row.tool_results ? JSON.parse(row.tool_results) : [])
        .filter((row: Row) => callIds.has(row.tool_call_id));
      assert.equal(saved.length, 1);
      const matches = JSON.parse(saved[0].content) as Row[];
      assert.deepEqual(matches.map(row => row.id), [results(ctx.turns[0])[0].id]);
      assert.equal(matches[0].content, content);
      assert.equal(typeof matches[0].similarity_score, 'number');
      assert.equal(matches.some(row => row.id === foreignMemory), false);
    });
    await ctx.check('actual runAgent environment prompt contains Chinese semantic memory and excludes another user', () => {
      assert.equal(typeof ctx.state.environmentPrompt, 'string');
      assert.ok(ctx.state.environmentPrompt.includes(content));
      assert.equal(ctx.state.environmentPrompt.includes('另一位用户的习惯'), false);
    });
    await ctx.check('MemoryManager shared retrieval entry returns the same Chinese semantic ID and updates access time', async () => {
      const matches = await new MemoryManager(ctx.userId).retrieveMemories(query);
      const id = results(ctx.turns[0])[0].id;
      assert.deepEqual(matches.map(row => row.id), [id]);
      assert.equal(matches[0].content, content);
      const row = ctx.db.prepare('SELECT last_accessed FROM agent_memories WHERE id = ? AND user_id = ?').get(id, ctx.userId) as Row;
      assert.ok(Number.isFinite(Date.parse(row.last_accessed)));
      const foreign = ctx.db.prepare('SELECT last_accessed FROM agent_memories WHERE id = ?').get(foreignMemory) as Row;
      assert.equal(foreign.last_accessed, null);
    });
    await ctx.check('duplicate save creates no extra embedding while query retrieval uses the existing vector', () => {
      const id = results(ctx.turns[0])[0].id;
      assert.equal((ctx.db.prepare('SELECT COUNT(*) AS n FROM agent_memory_vec WHERE memory_id = ?').get(id) as Row).n, 1);
      const documentCalls = ctx.state.embeddingCalls.filter((call: Row) => call.kind === 'document');
      assert.deepEqual(documentCalls, [{ texts: [content], kind: 'document' }]);
      const semanticQueryCalls = ctx.state.embeddingCalls.filter((call: Row) => call.kind === 'query' && call.texts[0] === query);
      assert.equal(semanticQueryCalls.length, 3, 'environment, search_memories tool and MemoryManager each use the shared embedding path');
    });
    await ctx.check('successful memory channel writes do not generate claim_without_receipt or domain door receipts', () => {
      const last = ctx.turns[2];
      assert.equal(last.tables.events.filter(row => row.verb === 'claim_without_receipt').length, 0);
      assert.equal(last.ledger.filter(row => row.verb === 'claim_without_receipt').length, 0);
      assert.equal(last.tables.operation_batches.length, 0);
    });
  },
} satisfies Scenario;
