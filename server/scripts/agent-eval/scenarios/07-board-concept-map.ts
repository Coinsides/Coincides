import assert from 'node:assert/strict';
import boards from '../../../src/routes/boards.js';
import { inspectAgentBoard } from '../../../src/services/boardAgentLayout.js';
import { getBoard } from '../../../src/services/boards.js';
import { answer, results, tool } from '../helpers.js';
import { invoke } from '../routes.js';
import type { Row, Scenario } from '../types.js';
import type { StreamChunk } from '../../../src/agent/providers/types.js';

const people = ['君主', '改革主持', '财政执行', '地方施行', '谏官', '旧制主张', '农户', '商户', '边防'];
const links = [[0, 1], [1, 2], [1, 3], [4, 0], [5, 4], [2, 6], [3, 6], [2, 7], [7, 8], [0, 8], [5, 1], [4, 3], [6, 7]];
const calls = (chunks: StreamChunk[][]): StreamChunk[] => [...chunks.flat().filter(chunk => chunk.type !== 'done'), { type: 'done' }];
export const boardTables = ['boards', 'board_members', 'board_stickies', 'board_edges', 'board_visuals', 'board_layers'];
export const boardSnapshot = (ctx: { db: { prepare(sql: string): { all(): unknown[] } } }) => Object.fromEntries(
  boardTables.map(table => [table, ctx.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));

/** A complete reusable journey; another scenario can add assertions without changing the harness. */
export const conceptMap: Scenario = {
  name: '07-board-concept-map',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  async setup(ctx) {
    const response = await invoke(boards, 'POST', '/', ctx.userId, { title: '熙宁朝局图（合成等价物）', purpose: { title: '概念图评测' } });
    ctx.state.boardId = (response.body as Row).board.id;
    // Existing human work must survive the Agent's later full-batch undo.
    await invoke(boards, 'POST', `/${ctx.state.boardId}/stickies`, ctx.userId, { text: '人的原有注释', x: 2600, y: 100, w: 240 });
    ctx.state.before = boardSnapshot(ctx);
    ctx.state.notesBefore = ctx.db.prepare('SELECT * FROM notes').all();
    ctx.state.boardsAfter = [];
  },
  turns: [
    { user: ctx => `在板 ${ctx.state.boardId} 的装卸区准备九张朝局角色便签，使用给定的三行布局。`,
      script(ctx) {
        if (ctx.round !== 0) return answer('已创建九张便签，留在装卸区等待采纳。');
        return calls(people.map((text, index) => tool(`sticky-${index}`, 'board_create_sticky', {
          board_id: ctx.state.boardId, input: { text, x: (index % 3) * 600, y: Math.floor(index / 3) * 340,
            w: 240, weight: index % 3 + 1, color_index: index === 0 ? 1 : null },
        })));
      } },
    { user: '为这九张便签添加十三条带标签的纯视觉线，并交付布局体检回执。',
      script(ctx) {
        if (ctx.round !== 0) return answer('已连线十三条；布局体检随收据附上。');
        const stickies = results(ctx.turns[0]);
        const idAt = (index: number) => stickies.find(row => row.callId === `sticky-${index}`)!.id;
        return calls(links.map(([from, to], index) => tool(`edge-${index}`, 'board_create_edge', {
          board_id: ctx.state.boardId, input: {
            from: { kind: 'sticky', id: idAt(from), anchor: index % 2 ? 's' : 'e' },
            to: { kind: 'sticky', id: idAt(to), anchor: index % 2 ? 'n' : 'w' },
            bend: index % 2 ? 45 : -35, dash: index % 2 ? 'dashed' : 'solid', weight: index % 3 + 1,
            cap_start: index % 2 ? 'dot' : 'none', cap_end: 'arrow', label: `联系 ${from + 1} → ${to + 1}`, label_position: .5,
          },
        })));
      } },
  ],
  async afterTurn(ctx) {
    const response = await invoke(boards, 'GET', `/${ctx.state.boardId}`, ctx.userId);
    ctx.state.boardsAfter.push({ tables: boardSnapshot(ctx), api: response.body });
  },
  async assertions(ctx) {
    for (const [index, turn] of ctx.turns.entries()) {
      Object.assign(turn.tables, ctx.state.boardsAfter[index].tables);
      (turn.api as Row).board = ctx.state.boardsAfter[index].api;
      await ctx.check(`turn ${index + 1}: board API and persisted Staging geometry agree`, () => {
        const detail = ctx.state.boardsAfter[index].api;
        const agentStickies = detail.stickies.filter((row: Row) => row.mounted_actor === 'agent');
        assert.equal(agentStickies.length, 9);
        assert.equal(detail.stickies.length, 10);
        assert.equal(detail.edges.length, index === 0 ? 0 : 13);
        assert.equal(detail.members.length, 0);
        for (const [i, text] of people.entries()) {
          const sticky = agentStickies.find((row: Row) => row.text === text)!;
          assert.ok(sticky); assert.equal(sticky.placed, false);
          assert.equal(sticky.x, i % 3 * 600); assert.equal(sticky.y, Math.floor(i / 3) * 340);
          assert.equal(turn.tables.board_stickies.find(row => row.id === sticky.id)?.placed, 0);
        }
        if (index === 1) for (const [i, [from, to]] of links.entries()) {
          const edge = detail.edges.find((row: Row) => row.id === results(turn).find(row => row.callId === `edge-${i}`)?.id)!;
          assert.ok(edge);
          const idAt = (n: number) => results(ctx.turns[0]).find(row => row.callId === `sticky-${n}`)!.id;
          assert.deepEqual(edge.from, { kind: 'sticky', id: idAt(from), anchor: i % 2 ? 's' : 'e' });
          assert.deepEqual(edge.to, { kind: 'sticky', id: idAt(to), anchor: i % 2 ? 'n' : 'w' });
          assert.equal(edge.bend, i % 2 ? 45 : -35); assert.equal(edge.dash, i % 2 ? 'dashed' : 'solid');
          assert.equal(edge.weight, i % 3 + 1); assert.equal(edge.cap_start, i % 2 ? 'dot' : 'none');
          assert.equal(edge.cap_end, 'arrow'); assert.equal(edge.label, `联系 ${from + 1} → ${to + 1}`);
          assert.equal(edge.label_position, .5); assert.equal(edge.visual_version, 1);
        }
      });
      await ctx.check(`turn ${index + 1}: SSE, history, ledger and same-conversation receipts reconcile`, () => {
        const outputs = results(turn);
        const expected = index === 0 ? 9 : 13, total = index === 0 ? 9 : 22;
        assert.equal(outputs.length, expected);
        assert.equal(turn.events.filter(event => event.type === 'tool_end' && event.data.ok).length, expected);
        const receipt = turn.events.find(event => event.type === 'turn_receipt')!.data;
        assert.equal(receipt.write_ok_count, expected); assert.equal(receipt.write_fail_count, 0);
        assert.deepEqual(turn.api.history.filter(row => row.turn_receipt).at(-1)?.turn_receipt, receipt);
        assert.equal(turn.tables.operation_batches.length, total);
        assert.equal(turn.tables.events.filter(row => row.actor_kind === 'agent').length, total);
        assert.equal(turn.api.receipts.length, total);
        for (const output of outputs) {
          assert.equal(output.batch_id, ctx.conversationId);
          const batch = turn.tables.operation_batches.find(row => row.id === output.receipt_id)!;
          assert.ok(batch); assert.equal(batch.status, 'applied'); assert.equal(batch.source_type, 'agent_chat');
          assert.equal(batch.source_id, output.callId);
          const metadata = JSON.parse(batch.metadata);
          assert.equal(metadata.agent_context.batch_id, ctx.conversationId);
          assert.equal(metadata.agent_context.board_id, ctx.state.boardId);
          const event = turn.tables.events.find(row => row.seq === metadata.agent_context.event_seq)!;
          assert.equal(event.actor_kind, 'agent'); assert.equal(event.channel, 'chat');
          assert.equal(JSON.parse(event.meta).batch_id, ctx.conversationId);
          assert.deepEqual(JSON.parse(event.objects), [{ kind: index === 0 ? 'board_sticky' : 'board_edge', id: output.id }]);
          assert.equal(turn.api.receipts.find(row => row.id === batch.id)?.status, 'applied');
        }
      });
      await ctx.check(`turn ${index + 1}: latest diagnostic accompanies the receipt without blocking writes`, () => {
        const reports = turn.events.find(event => event.type === 'turn_receipt')!.data.board_layout_reports;
        assert.equal(reports.length, 1); assert.equal(reports[0].batch_id, ctx.conversationId);
        assert.deepEqual(reports[0].report, inspectAgentBoard(ctx.state.boardsAfter[index].api));
        assert.ok(Array.isArray(reports[0].report.issues));
        assert.deepEqual(reports[0], results(turn).at(-1)?.layout_report);
      });
    }
    await ctx.check('board-only projection leaves notes and Relations untouched', () => {
      assert.deepEqual(ctx.db.prepare('SELECT * FROM notes').all(), ctx.state.notesBefore);
      assert.equal((ctx.db.prepare('SELECT count(*) n FROM relations').get() as Row).n, 0);
      assert.equal(getBoard(ctx.db, ctx.userId, ctx.state.boardId).edges.length, 13);
    });
  },
};
export default conceptMap;
