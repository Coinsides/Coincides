import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import type { AgentEpisodeRecord } from '@shared/types/agentEpisodes';
import { deleteEpisode, extractAnchorManifest, insertEpisode, listConversationMessages, listEpisodes,
  searchEpisodes, type EpisodeMessage } from '../agent/memory/episodes.js';
import { closeDb, initDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import settingsRoutes from '../routes/settings.js';

const userId = 'episode-user';
const conversationId = 'episode-conversation';

function fixtureMessage(index: number, overrides: Partial<EpisodeMessage> = {}): EpisodeMessage {
  return { rowid: index + 1, id: `message-${index}`, role: index % 2 ? 'assistant' : 'user',
    content: `Message ${index}.`, tool_calls: null, tool_results: null, meta: '{}',
    turn_id: `turn-${Math.floor(index / 2)}`, created_at: `2026-09-20T10:00:0${index}.000Z`, ...overrides };
}

async function setup() {
  const db = await initDb(':memory:');
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Episode fixture')")
    .run(userId, 'episode@example.invalid');
  db.prepare('INSERT INTO agent_conversations (id,user_id,title) VALUES (?,?,?)')
    .run(conversationId, userId, 'Long project conversation');
  const insert = db.prepare(`INSERT INTO agent_messages
    (id,conversation_id,role,content,tool_calls,tool_results,meta,turn_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)`);
  for (let index = 0; index < 6; index += 1) {
    const message = fixtureMessage(index, index === 0 ? { meta: JSON.stringify({
      answer_card: { selection: { note_id: 'note-original', block_ids: ['block-one'] }, question: 'Question' },
    }) } : {});
    insert.run(message.id, conversationId, message.role, message.content, message.tool_calls,
      message.tool_results, message.meta, message.turn_id, message.created_at);
  }
  return db;
}

test('episode anchors mechanically reconcile real tool-result shapes and message metadata without truncating IDs', () => {
  const longNoteId = `note-${'n'.repeat(600)}`;
  const messages = [
    fixtureMessage(0, { content: 'A prose reference to note-prose must not become an anchor.', meta: JSON.stringify({
      answer_card: { selection: { note_id: longNoteId, block_ids: ['block-selection'] }, question: 'Question' },
      intent_plan: { proposal_id: 'proposal-meta', steps: [{ anchor: { board_id: 'board-meta', object_id: 'board-object' } }] },
    }) }),
    fixtureMessage(1, { turn_id: 'tool-turn', tool_calls: JSON.stringify([
      { id: 'call-read', name: 'read_note', arguments: { note_id: longNoteId } },
      { id: 'call-board', name: 'board_mount_member', arguments: { board_id: 'board-target', input: { member_kind: 'item', member_id: 'item-mounted' } } },
      { id: 'call-proposal', name: 'create_proposal', arguments: { data: { note_id: 'note-patch' } } },
      { id: 'call-memory', name: 'save_memory', arguments: { content: 'A memory.' } },
      { id: 'call-search', name: 'search_memories', arguments: { query: 'A memory' } },
      { id: 'call-groups', name: 'read_content_groups', arguments: {} },
      { id: 'call-get', name: 'get_note', arguments: {} },
      { id: 'call-read-board', name: 'read_board', arguments: { board_id: 'board-read' } },
    ]) }),
    fixtureMessage(2, { turn_id: 'tool-turn', tool_results: JSON.stringify([
      { tool_call_id: 'call-read', content: JSON.stringify({ note: { id: longNoteId }, blocks: [{ id: 'block-only', item_ref: { item_id: 'item-ref' } }] }) },
      { tool_call_id: 'call-board', content: JSON.stringify({ id: 'membership-row', board_id: 'board-target', receipt_id: 'receipt-one',
        entity: { id: 'membership-row', member_kind: 'item', member_id: 'item-mounted' },
        layout_report: { report: { issues: [{ itemIds: ['member:layout-only'] }] } } }) },
      { tool_call_id: 'call-proposal', content: JSON.stringify({ id: 'proposal-tool', note_id: 'note-patch', type: 'note_patch' }) },
      { tool_call_id: 'call-memory', content: JSON.stringify({ id: 'memory-created', message: 'Saved' }) },
      { tool_call_id: 'call-search', content: JSON.stringify([{ id: 'memory-existing', content: 'A memory.' },
        { id: 'episode-result', kind: 'episode', anchor_manifest: { memory_ids: ['memory-in-episode'] } }]) },
      { tool_call_id: 'call-groups', content: JSON.stringify({ groups: [{ id: 'group-only', note_id: 'note-group',
        members: [{ id: 'group-member-only', kind: 'item', item_id: 'item-group', target_id: null }] }] }) },
      { tool_call_id: 'call-get', content: JSON.stringify({ id: 'note-get', title: 'A note', metadata: {} }) },
      { tool_call_id: 'call-read-board', content: JSON.stringify({ board: { id: 'board-read', title: 'Board' },
        members: [{ id: 'member-only', member_kind: 'note', member_id: 'note-mounted' }],
        edges: [{ id: 'edge-only', from_member: 'member-only' }] }) },
    ]) }),
  ];
  assert.deepEqual(extractAnchorManifest(messages), {
    note_ids: [longNoteId, 'note-patch', 'note-group', 'note-get', 'note-mounted'], board_ids: ['board-meta', 'board-target', 'board-read'],
    item_ids: ['item-mounted', 'item-ref', 'item-group'],
    proposal_ids: ['proposal-meta', 'proposal-tool'],
    memory_ids: ['memory-created', 'memory-existing', 'memory-in-episode'],
  });
});

test('receipt resource references, C2 plan targets and reused tool-call IDs retain their actual anchor kinds', () => {
  const messages = [
    fixtureMessage(0, { meta: JSON.stringify({ intent_plan: { kind: 'board', rule: 'board-mount', status: 'pending', steps: [{
      verb: 'board_mount_member', target_name: 'Chosen note', anchor: { board_id: 'board-c2', object_id: 'note-c2' },
      arguments: { board_id: 'board-c2', input: { member_kind: 'note', member_id: 'note-c2', x: 0, y: 0 } },
    }] }, intent_basis: { hint: { type: 'board_view', data: { board_id: 'board-c2' } } } }) }),
    fixtureMessage(1, { turn_id: 'proposal-turn', tool_calls: JSON.stringify([{ id: 'reused-call', name: 'create_proposal', arguments: {} }]) }),
    fixtureMessage(2, { turn_id: 'proposal-turn', tool_results: JSON.stringify([{ tool_call_id: 'reused-call', content: JSON.stringify({
      id: 'proposal-first', receipt: { id: 'receipt-only', metadata: { resources: [
        { kind: 'note', id: 'note-resource' }, { kind: 'item', id: 'item-resource' },
        { kind: 'board_member', id: 'member-resource-only', board_id: 'board-resource',
          after: { member_kind: 'item', member_id: 'item-member-resource' } },
      ] } },
    }) }]) }),
    fixtureMessage(3, { turn_id: 'memory-turn', tool_calls: JSON.stringify([{ id: 'reused-call', name: 'save_memory', arguments: {} }]) }),
    fixtureMessage(4, { turn_id: 'memory-turn', tool_results: JSON.stringify([{ tool_call_id: 'reused-call', content: JSON.stringify({ id: 'memory-second' }) }]) }),
  ];
  assert.deepEqual(extractAnchorManifest(messages), {
    note_ids: ['note-c2', 'note-resource'], board_ids: ['board-c2', 'board-resource'],
    item_ids: ['item-resource', 'item-member-resource'], proposal_ids: ['proposal-first'], memory_ids: ['memory-second'],
  });
});

test('interleaved named turns and adjacent legacy rounds classify reused-call receipt IDs without changing encounter order', () => {
  const call = (name: string) => JSON.stringify([{ id: 'same-call', name, arguments: {} }]);
  const result = (id: string) => JSON.stringify([{ tool_call_id: 'same-call', content: JSON.stringify({ id }) }]);
  const messages = [
    fixtureMessage(0, { turn_id: 'memory-turn', role: 'assistant', tool_calls: call('save_memory') }),
    fixtureMessage(1, { turn_id: 'proposal-turn', role: 'assistant', tool_calls: call('create_proposal') }),
    fixtureMessage(2, { turn_id: 'memory-turn', role: 'user', tool_results: result('memory-interleaved') }),
    fixtureMessage(3, { turn_id: 'proposal-turn', role: 'user', tool_results: result('proposal-interleaved') }),
    fixtureMessage(4, { turn_id: null, role: 'assistant', tool_calls: call('save_memory') }),
    fixtureMessage(5, { turn_id: null, role: 'user', tool_results: result('memory-legacy') }),
  ];
  assert.deepEqual(extractAnchorManifest(messages), {
    note_ids: [], board_ids: [], item_ids: [], proposal_ids: ['proposal-interleaved'],
    memory_ids: ['memory-interleaved', 'memory-legacy'],
  });
});

test('episode migration and insertion preserve every original row, enforce contiguous nonoverlapping ranges, and reuse stable sequence', async () => {
  const db = await setup();
  try {
    const before = db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all();
    const messages = listConversationMessages(userId, conversationId);
    const first = insertEpisode(userId, conversationId, messages.slice(0, 2), 'Original summary.', 8);
    assert.equal(first.seq, messages[0].rowid);
    assert.deepEqual(first.message_range, { first_message_id: messages[0].id, last_message_id: messages[1].id,
      started_at: messages[0].created_at, ended_at: messages[1].created_at });
    assert.deepEqual(first.anchor_manifest.note_ids, ['note-original']);
    assert.equal(first.conversation_title, 'Long project conversation');
    assert.deepEqual(insertEpisode(userId, conversationId, messages.slice(0, 2), 'Another attempt.', 10), first);
    assert.throws(() => insertEpisode(userId, conversationId, [messages[2], messages[4]], 'Gap.', 2), /contiguous/);
    assert.throws(() => insertEpisode(userId, conversationId, messages.slice(1, 3), 'Overlap.', 2), /overlaps/);
    const second = insertEpisode(userId, conversationId, messages.slice(2, 4), 'Second summary.', 5);
    assert.deepEqual(listEpisodes(userId, conversationId).map((episode) => episode.id), [first.id, second.id]);
    assert.equal(deleteEpisode(userId, first.id), true);
    const recompressed = insertEpisode(userId, conversationId, messages.slice(0, 2), 'Recompressed.', 4);
    assert.equal(recompressed.seq, first.seq);
    assert.notEqual(recompressed.id, first.id);
    assert.equal(listEpisodes(userId).length, 2);
    assert.deepEqual(db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all(), before);
    assert.ok(db.prepare("SELECT id FROM db_migrations WHERE id = '083_v14_agent_episodes'").get());
  } finally { closeDb(); }
});

test('episode summary FTS finds older projections and deletion removes index entries while keeping original messages', async () => {
  const db = await setup();
  try {
    const messages = listConversationMessages(userId, conversationId);
    const original = db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all();
    const old = insertEpisode(userId, conversationId, messages.slice(0, 2), 'Zephyr archive studied orbital mechanics.', 10);
    insertEpisode(userId, conversationId, messages.slice(2, 4), 'Recent garden planning.', 6);
    assert.deepEqual(searchEpisodes(userId, 'Zephyr').map((episode) => episode.id), [old.id]);
    assert.deepEqual(searchEpisodes(userId, 'Message'), [], 'FTS indexes the projection summary, not raw messages');
    assert.deepEqual(searchEpisodes(userId, ''), []);
    assert.equal(deleteEpisode(userId, old.id), true);
    assert.deepEqual(searchEpisodes(userId, 'Zephyr'), []);
    assert.deepEqual(db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all(), original);
  } finally { closeDb(); }
});

test('Settings episode list and lightweight delete expose the machine projection and retain all conversation messages', async () => {
  const db = await setup();
  let server: Server | undefined;
  try {
    const before = db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all();
    const episode = insertEpisode(userId, conversationId, listConversationMessages(userId, conversationId).slice(0, 2), 'Human-visible summary.', 6);
    const app = express();
    app.use(express.json());
    app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
    app.use('/api/settings', settingsRoutes);
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const url = `http://127.0.0.1:${address.port}/api/settings/agent-episodes`;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    const records = await response.json() as AgentEpisodeRecord[];
    assert.deepEqual(records, [episode]);
    assert.equal((await fetch(`${url}/${episode.id}`, { method: 'DELETE' })).status, 204);
    assert.deepEqual(await (await fetch(url)).json(), []);
    assert.deepEqual(db.prepare('SELECT rowid,* FROM agent_messages ORDER BY rowid').all(), before);
    assert.deepEqual(searchEpisodes(userId, 'visible'), []);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    closeDb();
  }
});
