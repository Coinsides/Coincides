import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { MemoryManager } from '../../../src/agent/memory/manager.js';
import { AGENT_TOOL_TIMEOUT_MS } from '../../../src/agent/runtime-budget.js';
import { ensureSegmentsForMaterial, listCourseMaterials } from '../../../src/services/courseMaterials.js';
import { answer, results, tool } from '../helpers.js';
import type { Row, Scenario } from '../types.js';

const DOCUMENT = '66666666-6666-4666-8666-666666666666';
const SLOW_CALL = 'resilience-slow-proposal';
const RECOVERY_CALL = 'resilience-recovery-read';

function parsed(value: unknown): Row[] {
  return typeof value === 'string' ? JSON.parse(value) : Array.isArray(value) ? value : [];
}

function assertPairedHistory(history: Row[], expected: number) {
  let pairs = 0;
  for (let index = 0; index < history.length; index++) {
    const calls = parsed(history[index].tool_calls);
    const results = parsed(history[index].tool_results);
    if (calls.length) {
      assert.deepEqual(parsed(history[index + 1]?.tool_results).map(result => result.tool_call_id),
        calls.map(call => call.id), 'each tool call retains its immediately following result');
      pairs++;
    }
    if (results.length) assert.ok(parsed(history[index - 1]?.tool_calls).length, 'no orphan result');
  }
  assert.equal(pairs, expected, 'all completed tool rounds remain replayable');
}

const scenario: Scenario = {
  name: '06-loop-resilience',
  dimensions: ['task_completion', 'tool_misuse', 'turns_and_duration'],
  setup({ db, userId, courseId, mode, mock, state }) {
    db.prepare(`INSERT INTO documents(id,user_id,course_id,filename,file_path,file_type,parse_status,
      extracted_text,page_count,document_type,chunk_count) VALUES(?,?,?,?,?,'pdf','completed',?,1,'slides',1)`)
      .run(DOCUMENT, userId, courseId, 'resilience-synthetic.pdf', 'synthetic/resilience.pdf', '极限描述函数趋近的值。');
    db.prepare(`INSERT INTO document_chunks(id,document_id,chunk_index,content,page_start,page_end,heading)
      VALUES(?,?,0,?,1,1,?)`).run('resilience-chunk', DOCUMENT, '极限描述函数趋近的值。', '极限');
    for (const material of listCourseMaterials(db, userId, courseId) as Array<{ id: string }>) {
      ensureSegmentsForMaterial(db, userId, material.id);
    }
    if (mode === 'scripted') {
      mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.parse('2026-09-14T12:00:00Z') });
      state.slowRelease = new Promise<void>(resolve => { state.releaseSlow = resolve; });
    }
  },
  turns: [
    {
      user: ({ courseId }) => `请根据项目 ${courseId} 的材料 ${DOCUMENT} 发整理笔记提案。如果等待超时，先查项目列表确认可以继续，不要重复发提案。`,
      async *script({ definitions, round, state, mock, db, messages, courseId }) {
        if (definitions.length === 0) {
          // Delay only the synthetic nested provider. The actual proposal tool,
          // runtime budget, transaction and event writer execute unchanged.
          state.nestedStarted = true;
          state.timeoutDriver = (async () => {
            await nextTurn();
            mock.timers.tick(AGENT_TOOL_TIMEOUT_MS - 1);
            await nextTurn();
            state.resultCountBeforeDeadline = (db.prepare(
              'SELECT COUNT(*) AS n FROM agent_messages WHERE tool_results IS NOT NULL',
            ).get() as Row).n;
            mock.timers.tick(1);
          })().catch((error: unknown) => {
            state.timeoutDriverError = error instanceof Error ? error.message : String(error);
            state.releaseSlow();
          });
          await state.slowRelease;
          yield* answer(JSON.stringify({ blocks: [{ block_type: 'paragraph', plain_text: '极限描述函数趋近的值。' }] }));
          return;
        }
        if (round === 0) {
          yield* tool(SLOW_CALL, 'create_proposal', { type: 'organized_note',
            data: { course_id: courseId, document_ids: [DOCUMENT], note_title: '循环韧性合成材料' } });
        } else if (round === 1) {
          const failure = messages.flatMap(message => message.tool_results ?? [])
            .find(result => result.tool_call_id === SLOW_CALL);
          state.providerObservedTimeout = failure ? JSON.parse(failure.content).error : undefined;
          yield* tool(RECOVERY_CALL, 'list_courses');
        } else {
          yield* answer('等待提案的时间已到，项目查询可以继续；请先检查提案收件箱再决定是否重试。');
        }
      },
    },
    {
      user: '请连续分八轮查询项目列表，每轮等工具结果返回后再继续；达到轮次上限就停止。',
      script({ round }) {
        return tool(`resilience-limit-${round + 1}`, 'list_courses');
      },
    },
  ],
  async afterTurn({ mode, state, db }, turnIndex) {
    if (mode !== 'scripted' || turnIndex !== 0) return;
    await state.timeoutDriver;
    state.proposalsBeforeRelease = (db.prepare('SELECT COUNT(*) AS n FROM proposals').get() as Row).n;
    state.releaseSlow();
    // Accepted work is not cancelled by the timeout. Drain its real transaction
    // before the harness records evidence or closes the isolated database.
    await nextTurn();
    await nextTurn();
    state.proposalsAfterRelease = (db.prepare('SELECT COUNT(*) AS n FROM proposals').get() as Row).n;
  },
  async assertions(ctx) {
    const [timeout, limit] = ctx.turns;
    await ctx.check('the real tool budget fires at 60 seconds, not before', () => {
      assert.equal(AGENT_TOOL_TIMEOUT_MS, 60_000);
      assert.equal(ctx.state.nestedStarted, true);
      assert.equal(ctx.state.timeoutDriverError, undefined);
      assert.equal(ctx.state.resultCountBeforeDeadline, 0);
      assert.match(ctx.state.providerObservedTimeout, /create_proposal.*timed out after 60s/i);
    });
    await ctx.check('timeout becomes a failed SSE tool result followed by a successful recovery tool', () => {
      assert.deepEqual(timeout.events.filter(event => event.type === 'tool_end').map(event => event.data), [
        { id: SLOW_CALL, name: 'create_proposal', ok: false },
        { id: RECOVERY_CALL, name: 'list_courses', ok: true },
      ]);
      assert.equal(timeout.providerRounds, 3);
      assert.equal(timeout.events.filter(event => event.type === 'error').length, 0);
      assert.equal(timeout.events.filter(event => event.type === 'done').length, 1);
    });
    await ctx.check('the timeout ToolResult is persisted with its call identity and error', () => {
      const failure = results(timeout).find(result => result.callId === SLOW_CALL);
      assert.ok(failure);
      assert.match(failure.error, /create_proposal.*timed out after 60s/i);
      assertPairedHistory(timeout.api.history, 2);
    });
    await ctx.check('timeout receipt preserves failure even when the accepted proposal later commits', () => {
      assert.deepEqual(timeout.events.filter(event => event.type === 'turn_receipt').map(event => event.data), [{
        write_calls: [{ name: 'create_proposal', ok: false }],
        read_calls: [{ name: 'list_courses', ok: true }], write_ok_count: 0, write_fail_count: 1,
      }]);
      assert.equal(ctx.state.proposalsBeforeRelease, 0);
      assert.equal(ctx.state.proposalsAfterRelease, 1);
    });
    await ctx.check('the late proposal commits once through its existing event and inbox without a direct note write', () => {
      assert.equal(timeout.api.proposals.length, 1);
      assert.equal(timeout.api.proposals[0].type, 'organized_note');
      assert.equal(timeout.api.proposals[0].status, 'pending');
      assert.equal(timeout.api.proposals[0].conversation_id, ctx.conversationId);
      assert.equal(timeout.tables.events.filter(event => event.verb === 'proposal_issued').length, 1);
      assert.equal((ctx.db.prepare('SELECT COUNT(*) AS n FROM notes').get() as Row).n, 0);
      assert.equal(timeout.events.filter(event => event.type === 'tool_end' && event.data.id === SLOW_CALL).length, 1);
    });
    await ctx.check('the second journey reaches exactly eight successful tool rounds', () => {
      assert.equal(limit.providerRounds, 8);
      assert.equal(limit.events.filter(event => event.type === 'tool_start').length, 8);
      assert.deepEqual(limit.events.filter(event => event.type === 'tool_end').map(event => event.data),
        Array.from({ length: 8 }, (_, index) => ({
          id: `resilience-limit-${index + 1}`, name: 'list_courses', ok: true,
        })));
    });
    await ctx.check('round exhaustion emits the existing round_limit and compatible notice once', () => {
      assert.deepEqual(limit.events.slice(-4).map(event => event.type), ['round_limit', 'error', 'turn_receipt', 'done']);
      assert.equal(limit.events.filter(event => event.type === 'round_limit').length, 1);
      assert.equal(limit.events.find(event => event.type === 'round_limit')?.data.details.max_rounds, 8);
      assert.equal(limit.events.filter(event => event.type === 'error').length, 1);
      assert.equal(limit.events.find(event => event.type === 'error')?.data.code, 'round_limit');
      assert.equal(limit.events.filter(event => event.type === 'done').length, 1);
    });
    await ctx.check('round-limit receipt contains precisely the eight persisted reads', () => {
      assert.deepEqual(limit.events.filter(event => event.type === 'turn_receipt').map(event => event.data), [{
        write_calls: [], read_calls: Array.from({ length: 8 }, () => ({ name: 'list_courses', ok: true })),
        write_ok_count: 0, write_fail_count: 0,
      }]);
    });
    await ctx.check('all ten tool pairs survive the messages API and provider history replay without duplicates', () => {
      assertPairedHistory(limit.api.history, 10);
      assertPairedHistory(new MemoryManager(ctx.userId).getConversationHistory(ctx.conversationId), 10);
      const calls = limit.api.history.flatMap(row => parsed(row.tool_calls));
      assert.equal(new Set(calls.map(call => call.id)).size, 10);
      assert.equal(calls.length, 10);
    });
  },
};

export default scenario;
