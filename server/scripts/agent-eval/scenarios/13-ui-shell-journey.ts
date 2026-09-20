import assert from 'node:assert/strict';
import { createBoard, mountBoardMember } from '../../../src/services/boards.js';
import { answer, results, tool } from '../helpers.js';
import type { Fixtures, Row, Scenario } from '../types.js';

const noteId = 'eval-ui-note';
const blockId = 'eval-ui-block';

function domainSnapshot(ctx: Fixtures) {
  const tables = ctx.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as Array<{ name: string }>;
  return Object.fromEntries(tables.filter(({ name }) => !['agent_messages', 'agent_conversations'].includes(name))
    .map(({ name }) => [name, ctx.db.prepare(`SELECT * FROM "${name.replace(/"/g, '""')}"`).all()]));
}

export default {
  name: '13-ui-shell-journey',
  dimensions: ['task_completion', 'claim_without_receipt', 'tool_misuse', 'turns_and_duration'],
  setup(ctx) {
    assert.equal(ctx.mode, 'scripted', 'C4a UI scenario uses only an isolated deterministic provider');
    ctx.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-20T12:00:00Z') });
    ctx.db.prepare('INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,?,?)')
      .run(noteId, ctx.userId, ctx.courseId, 'UI fixture paper');
    ctx.db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES(?,?,?,'paragraph',?,?)")
      .run(blockId, ctx.userId, ctx.courseId, JSON.stringify({ text: 'Unchanged UI fixture' }), 'Unchanged UI fixture');
    ctx.db.prepare('INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES(?,?,?,0)')
      .run('eval-ui-placement', noteId, blockId);
    ctx.db.transaction(() => {
      const { board } = createBoard(ctx.db, ctx.userId, { title: 'UI fixture board', purpose: { title: 'Locate existing targets' } });
      const { member } = mountBoardMember(ctx.db, ctx.userId, board.id, { member_kind: 'note', member_id: noteId, x: 20, y: 30 });
      ctx.state.boardId = board.id; ctx.state.memberId = member.id;
    })();
    ctx.state.original = domainSnapshot(ctx);
  },
  turns: [{
    user: '请打开现有笔记，定位它的块、第一页和板上的成员，再尝试不存在的页并重复一次打开。',
    *script(ctx) {
      if (!ctx.definitions.length) { yield* answer('[]'); return; }
      if (ctx.round === 0) {
        yield* [
          tool('ui-open', 'ui_open_note', { note_id: noteId }),
          tool('ui-block', 'ui_focus_object', { target: { type: 'note_block', note_id: noteId, block_id: blockId } }),
          tool('ui-page', 'ui_focus_object', { target: { type: 'note_page', note_id: noteId, page_index: 0 } }),
          tool('ui-member', 'ui_focus_object', { target: { type: 'board_member', board_id: ctx.state.boardId, member_id: ctx.state.memberId } }),
          tool('ui-unavailable', 'ui_focus_object', { target: { type: 'note_page', note_id: noteId, page_index: 1 } }),
          tool('ui-repeat', 'ui_open_note', { note_id: noteId }),
        ].flat().filter(chunk => chunk.type !== 'done');
        yield { type: 'done' };
      } else yield* answer('呈现请求已发出；不存在的页无法定位。客户端正在输入时会延后导航，正文没有修改。');
    },
  }],
  async assertions(ctx) {
    const turn = ctx.turns[0];
    const commands = turn.events.filter(event => event.type === 'ui_command').map(event => event.data);
    const returned = results(turn);
    await ctx.check('four target kinds issue four uniquely identified UI commands through the actual SSE route', () => {
      assert.deepEqual(commands.map(command => command.target.type), ['note', 'note_block', 'note_page', 'board_member']);
      assert.equal(new Set(commands.map(command => command.command_id)).size, 4);
      assert.ok(commands.every(command => command.conversation_id === ctx.conversationId
        && command.turn_id === turn.messages[0].turn_id));
    });
    await ctx.check('the six calls match persisted results including one unavailable page and one debounced repeat', () => {
      assert.equal(returned.length, 6);
      assert.equal(returned.filter(result => result.dispatched === true).length, 4);
      assert.match(returned[4].error, /page_index_out_of_range/);
      assert.equal(returned[5].dispatched, false); assert.equal(returned[5].reason, 'debounced');
      assert.equal(returned[5].command, undefined);
      assert.deepEqual(returned.slice(0, 4).map(result => result.command), commands);
      for (const command of commands) {
        const resultRow = turn.messages.find(row => row.tool_results?.includes(command.command_id));
        assert.ok(resultRow);
        assert.equal(resultRow.turn_id, command.turn_id);
      }
    });
    await ctx.check('each UI command follows its matched successful tool_end, and unavailable page emits none', () => {
      const callIds = ['ui-open', 'ui-block', 'ui-page', 'ui-member'];
      for (const [index, command] of commands.entries()) {
        const eventIndex = turn.events.findIndex(event => event.type === 'ui_command' && event.data.command_id === command.command_id);
        const endIndex = turn.events.findIndex(event => event.type === 'tool_end' && event.data.id === callIds[index]);
        assert.ok(endIndex >= 0 && endIndex < eventIndex);
        assert.equal(turn.events[endIndex].data.ok, true);
      }
      assert.deepEqual(turn.events.filter(event => event.type === 'tool_end').map(event => event.data.ok), [true, true, true, true, false, true]);
    });
    await ctx.check('live and historical receipts classify UI as channel writes without claiming a domain receipt', () => {
      const receipt = turn.events.find(event => event.type === 'turn_receipt')!.data;
      assert.equal(receipt.write_ok_count, 5); assert.equal(receipt.write_fail_count, 1);
      assert.deepEqual(receipt.read_calls, []);
      assert.deepEqual(receipt.write_calls.map((call: Row) => call.ok), [true, true, true, true, false, true]);
      assert.deepEqual(turn.api.history.filter(row => row.turn_receipt).at(-1)?.turn_receipt, receipt);
      assert.deepEqual(turn.api.receipts, []);
    });
    await ctx.check('tool activity carries existing note/board identity and no invented persistent activity state', () => {
      assert.deepEqual(turn.events.filter(event => event.type === 'tool_start').map(event => event.data.target_activity),
        [{ note_id: noteId }, { note_id: noteId }, { note_id: noteId }, { board_id: ctx.state.boardId }, { note_id: noteId }, { note_id: noteId }]);
    });
    await ctx.check('every non-chat table is byte-for-byte unchanged, including content, layout, judgments and domain receipts', () => {
      assert.deepEqual(domainSnapshot(ctx), ctx.state.original);
      assert.deepEqual(turn.tables.operation_batches, []);
      assert.equal(turn.tables.events.filter(row => row.verb === 'claim_without_receipt').length, 0);
    });
    await ctx.check('the scripted journey uses one tool round plus one factual answer and does not claim client application', () => {
      assert.equal(turn.providerRounds, 2);
      assert.equal(turn.messages.filter(row => row.tool_calls).length, 1);
      assert.ok(returned.slice(0, 4).every(result => /issued.*may defer/.test(result.message)));
      assert.equal(turn.events.filter(event => event.type === 'error').length, 0);
    });
  },
} satisfies Scenario;
