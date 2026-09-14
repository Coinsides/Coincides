import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { join } from 'node:path';
import { mock } from 'node:test';
import type { ProviderMessage, StreamChunk, ToolDefinition } from '../../src/agent/providers/types.js';
import { createIsolation } from './isolation.js';
import { createApiReader, invoke } from './routes.js';
import { loadScenario } from './discovery.js';
import type { Fixtures, Mode, Row, Scenario, ScenarioResult, TurnRecord } from './types.js';

export const EVIDENCE_TABLES = ['goals', 'tasks', 'time_blocks', 'agent_authorizations', 'agent_memories',
  'operation_batches', 'events', 'proposals', 'notes', 'note_blocks', 'note_block_placements', 'agent_messages'] as const;

/** One invocation per worker process: global DB/provider state cannot cross scenarios. */
export async function runScenario(input: Scenario | string, mode: Mode = 'scripted'): Promise<ScenarioResult> {
  const originalEnv = process.env;
  const isolation = createIsolation(mode);
  process.env = isolation.env;
  const result: ScenarioResult = { name: typeof input === 'string' ? input : input.name, dimensions: [], mode,
    assertions: [], turns: [], durationMs: 0, finalTables: {}, scenarioAssertionsEvaluated: mode === 'scripted' };
  const started = performance.now();
  let closeDb: (() => void) | undefined;
  let fixture: Fixtures | undefined;
  let snapshot: (() => Record<string, Row[]>) | undefined;
  try {
    if (mode === 'live') {
      // Future live runs read only dashscope via the existing machine resolver,
      // then keep it in process memory. Other machine providers (e.g. Voyage)
      // cannot accidentally add remote calls to this route.
      const { resolveProviderCredential } = await import('../../src/services/providerCredentials.js');
      const key = resolveProviderCredential('dashscope');
      if (!key) throw new Error('Live eval requires an existing dashscope machine credential');
      process.env.COINCIDES_APP_DATA_DIR = join(isolation.directory, 'credentials');
      process.env.DASHSCOPE_API_KEY = key;
    }
    // Scenario imports also happen after the environment has been isolated.
    const scenario = typeof input === 'string' ? await loadScenario(input) : input;
    result.name = scenario.name;
    result.dimensions = scenario.dimensions;
    const dbModule = await import('../../src/db/init.js');
    closeDb = dbModule.closeDb;
    const db = await dbModule.initDb(':memory:');
    const userId = 'eval-user';
    const courseId = '11111111-1111-4111-8111-111111111111';
    const conversationId = 'eval-conversation';
    db.prepare('INSERT INTO users(id,email,password_hash,name,settings) VALUES(?,?,?,?,?)').run(
      userId, 'eval@example.invalid', 'synthetic', 'Eval fixture',
      JSON.stringify({ active_provider: mode === 'scripted' ? 'openai' : 'dashscope', language: 'zh' }));
    db.prepare('INSERT INTO courses(id,user_id,name) VALUES(?,?,?)').run(courseId, userId, '合成评测课程');
    db.prepare('INSERT INTO agent_conversations(id,user_id,title) VALUES(?,?,?)')
      .run(conversationId, userId, scenario.name);
    snapshot = () => Object.fromEntries(EVIDENCE_TABLES.map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all() as Row[]]));
    const api = await createApiReader(userId);
    fixture = { db, userId, courseId, conversationId, directory: isolation.directory, mode,
      state: {}, mock, turns: result.turns, request: api.request,
      async check(name, assertion) {
        assert.ok(!result.assertions.some(item => item.name === name), `Duplicate assertion: ${name}`);
        try { await assertion(); result.assertions.push({ name, passed: true }); }
        catch (error) { result.assertions.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) }); }
      },
    };
    if (mode === 'scripted') {
      mock.method(globalThis, 'fetch', async () => { throw new Error('Network disabled in scripted agent eval'); });
    }
    await scenario.setup(fixture);
    const { OpenAIProvider } = await import('../../src/agent/providers/openai.js');
    for (const [index, turn] of scenario.turns.entries()) {
      const ctx = fixture;
      let providerRounds = 0;
      if (mode === 'scripted') {
        // Only the provider is scripted. Tool dispatch, guards, transactions, receipts and prompt stay real.
        mock.method(OpenAIProvider.prototype, 'chat', async function* (
          messages: ProviderMessage[], definitions: ToolDefinition[], prompt: string,
        ): AsyncGenerator<StreamChunk> {
          const round = definitions.length ? providerRounds++ : Math.max(0, providerRounds - 1);
          yield* turn.script({ ...ctx, round, messages, definitions, prompt });
        });
      }
      const previousRow = (db.prepare('SELECT COALESCE(MAX(rowid),0) AS n FROM agent_messages').get() as { n: number }).n;
      const user = typeof turn.user === 'function' ? turn.user(ctx) : turn.user;
      const contextHint = typeof turn.contextHint === 'function' ? turn.contextHint(ctx) : turn.contextHint;
      const turnStart = performance.now();
      const response = await invoke(api.agent, 'POST', `/conversations/${conversationId}/messages`, userId,
        { message: user, ...(contextHint === undefined ? {} : { context_hint: contextHint }) });
      const messages = db.prepare('SELECT * FROM agent_messages WHERE rowid > ? ORDER BY rowid').all(previousRow) as Row[];
      const record: TurnRecord = { user, contextHint, events: response.events, rawSse: response.writes.join(''),
        durationMs: performance.now() - turnStart, providerRounds, messages, tables: {}, ledger: [],
        api: { history: [], proposals: [], memories: [], receipts: [] } };
      result.turns.push(record);
      await scenario.afterTurn?.(ctx, index);
      record.tables = snapshot();
      record.ledger = db.prepare('SELECT * FROM events WHERE user_id = ? ORDER BY seq').all(userId) as Row[];
      const read = async (path: string) => {
        const response = await api.request(path);
        assert.equal(response.status, 200, path);
        return response.body;
      };
      record.api = {
        history: await read(`/api/agent/conversations/${conversationId}/messages`),
        proposals: await read('/api/proposals?status=pending'),
        memories: await read('/api/settings/agent-memories'),
        receipts: (await read('/api/tool-receipts?status=applied')).receipts,
      };
      await ctx.check(`turn-${index + 1}: complete SSE and persisted receipt`, () => {
        assert.equal(response.statusCode, 200);
        assert.equal(record.events.filter(event => event.type === 'done').length, 1);
        const receipts = record.events.filter(event => event.type === 'turn_receipt');
        assert.equal(receipts.length, 1);
        const turnIds = new Set(messages.map(row => row.turn_id));
        assert.equal(turnIds.size, 1);
        assert.ok(!turnIds.has(null) && !turnIds.has(undefined));
        const projected = record.api.history.filter(row => turnIds.has(row.turn_id) && row.turn_receipt);
        assert.equal(projected.length, 1);
        assert.deepEqual(receipts[0].data, projected[0].turn_receipt);
        assert.equal(record.events.filter(event => event.type === 'error' && event.data.code !== 'round_limit').length, 0);
      });
    }
    if (mode === 'scripted') {
      await scenario.assertions(fixture);
      assert.ok(result.assertions.length > scenario.turns.length, 'Scenario must declare its own assertions');
    }
  } catch (error) {
    result.executionError = error instanceof Error ? error.message : String(error);
    result.assertions.push({ name: 'scenario-execution', passed: false, error: result.executionError });
  } finally {
    try { if (snapshot) result.finalTables = snapshot(); }
    catch (error) {
      result.executionError = error instanceof Error ? error.message : String(error);
      result.assertions.push({ name: 'final-evidence', passed: false, error: result.executionError });
    }
    try { mock.timers.reset(); mock.restoreAll(); }
    finally {
      try { closeDb?.(); }
      finally { process.env = originalEnv; isolation.cleanup(); }
    }
    result.durationMs = performance.now() - started;
  }
  return result;
}
