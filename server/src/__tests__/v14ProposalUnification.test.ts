import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import type Database from 'better-sqlite3';
import express from 'express';
import { ZodError } from 'zod';
import type { ProposalType } from '../../../shared/types/index.js';
import { CHAT_PROPOSAL_TYPES, PROPOSAL_TYPES } from '../services/proposalTypes.js';
import { closeDb, initDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import { toolDefinitions } from '../agent/tools/definitions.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError, errorHandler } from '../middleware/errorHandler.js';
import proposalRoutes from '../routes/proposals.js';
import { ensureSegmentsForMaterial, listCourseMaterials } from '../services/courseMaterials.js';
import { createProposal, HUMAN_PROPOSAL_CONTEXT } from '../services/proposals.js';
import { proposalTypeSchema } from '../validators/index.js';

const userId = 'a3a-user';
const conversationId = 'a3a-conversation';
const courseId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const secondDocumentId = '33333333-3333-4333-8333-333333333333';
const deckId = '44444444-4444-4444-8444-444444444444';
const taskId = '55555555-5555-4555-8555-555555555555';
const context = { actor: 'agent', channel: 'chat', conversationId, callId: 'a3a-call' } as const;
type Row = Record<string, any>;

const legacyCases = [
  { type: 'study_plan', data: {
    title: 'Study plan', description: 'Review limits',
    items: [{ title: 'Read limits', course_id: courseId, scheduled_date: '2026-10-01',
      priority: 'must', checklist: [{ text: 'Read the definition', done: false }] }],
  } },
  { type: 'batch_cards', data: {
    title: 'Limit cards', description: 'Source flashcards', deck_id: deckId,
    items: [{ title: 'Limit', template_type: 'general', content: { body: 'A limiting value.' } }],
  } },
  { type: 'schedule_adjustment', data: {
    title: 'Move review', description: 'Change the planned day',
    items: [{ task_id: taskId, date: '2026-10-02', priority: 'recommended', status: 'pending' }],
  } },
  { type: 'goal_breakdown', data: {
    title: 'Learn calculus', description: 'Goals and study tasks',
    items: [{ type: 'goal', _temp_id: 'goal-1', title: 'Understand limits', course_id: courseId },
      { type: 'task', title: 'Review a limit', goal_id: 'goal-1', course_id: courseId, date: '2026-10-01' }],
  } },
  { type: 'time_block_setup', data: {
    title: 'Study time', description: 'A calendar block',
    items: [{ label: 'Calculus', date: '2026-10-01', start_time: '08:00', end_time: '09:00', type: 'study' }],
  } },
] as const;
const materialCases = [
  { type: 'material_map', path: '/material-map', version: 'v2.1', collection: 'segments' },
  { type: 'organized_note', path: '/organized-note', version: 'v2.1', collection: 'blocks' },
  { type: 'material_reconciliation', path: '/material-reconciliation', version: 'v2.2.3', collection: 'candidate_groups' },
] as const;

const downstreamTables = ['tasks', 'goals', 'cards', 'card_decks', 'card_sections', 'time_blocks',
  'notes', 'note_blocks', 'note_block_placements', 'note_block_sources', 'evidence_sets', 'evidence_items'];
function snapshot(db: Database.Database, tables = downstreamTables) {
  return Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table}`).all()
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
}
function count(db: Database.Database, table: string) {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}
function proposalRow(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM proposals WHERE id = ?').get(id) as Row;
}
function assertIssued(db: Database.Database, id: string, type: ProposalType, actor: 'human' | 'agent') {
  const events = db.prepare("SELECT * FROM events WHERE verb = 'proposal_issued'").all() as Row[];
  const event = events.find(row => JSON.parse(row.objects).some((object: Row) => object.id === id));
  assert.ok(event, `proposal_issued for ${id}`);
  assert.equal(event.actor_kind, actor);
  assert.equal(event.channel, actor === 'agent' ? 'chat' : 'ui');
  assert.deepEqual(JSON.parse(event.objects), [{ kind: 'proposal', id }]);
  assert.equal(JSON.parse(event.meta).proposal_type, type);
  assert.equal(JSON.parse(event.meta).conversation_id, actor === 'agent' ? conversationId : null);
}

async function fixture(t: TestContext) {
  // Explicit in-memory database and an empty private provider directory. The test
  // runner clears provider key variables; no user database or .env is loaded here.
  const providerDirectory = mkdtempSync(join(tmpdir(), 'a3a-provider-'));
  const previousDirectory = process.env.COINCIDES_APP_DATA_DIR;
  process.env.COINCIDES_APP_DATA_DIR = providerDirectory;
  t.after(() => {
    if (previousDirectory === undefined) delete process.env.COINCIDES_APP_DATA_DIR;
    else process.env.COINCIDES_APP_DATA_DIR = previousDirectory;
    rmdirSync(providerDirectory);
  });
  const db = await initDb(':memory:');
  t.after(() => closeDb());
  db.prepare("INSERT INTO users (id,email,password_hash,name,settings) VALUES (?,?,'synthetic','A3a user',?)")
    .run(userId, 'a3a@example.invalid', JSON.stringify({ synthetic: true }));
  db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run(courseId, userId, 'Calculus');
  db.prepare('INSERT INTO agent_conversations (id,user_id,title) VALUES (?,?,?)')
    .run(conversationId, userId, 'Proposal review');
  db.prepare('INSERT INTO card_decks (id,user_id,course_id,name) VALUES (?,?,?,?)')
    .run(deckId, userId, courseId, 'Calculus cards');
  db.prepare('INSERT INTO tasks (id,user_id,course_id,title,date) VALUES (?,?,?,?,?)')
    .run(taskId, userId, courseId, 'Review limits', '2026-10-01');
  // Parsed synthetic source rows only; no parser, uploaded file, or remote API.
  for (const [index, id] of [documentId, secondDocumentId].entries()) {
    db.prepare(`INSERT INTO documents (
      id,user_id,course_id,filename,file_path,file_type,parse_status,extracted_text,
      page_count,document_type,chunk_count
    ) VALUES (?,?,?,?,?,'pdf','completed',?,4,'slides',2)`)
      .run(id, userId, courseId, `calculus-${index}.pdf`, `synthetic/calculus-${index}.pdf`, 'Limits and continuity');
    const insert = db.prepare(`INSERT INTO document_chunks
      (id,document_id,chunk_index,content,page_start,page_end,heading) VALUES (?,?,?,?,?,?,?)`);
    insert.run(`chunk-${index}-1`, id, 0, 'Limits describe what a function approaches near an input.', 1, 2, 'Limits');
    insert.run(`chunk-${index}-2`, id, 1, 'Continuity means nearby inputs keep outputs nearby.', 3, 4, 'Continuity');
  }
  const materials = listCourseMaterials(db, userId, courseId) as Row[];
  for (const material of materials) ensureSegmentsForMaterial(db, userId, material.id);

  const app = express();
  app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
  app.use('/api/proposals', proposalRoutes);
  app.use(errorHandler);
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/proposals${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() as any };
  };
  return { db, request };
}

test('A3a server proposal vocabulary contains exactly the five chat and three material types', () => {
  const allTypes = [...legacyCases.map(entry => entry.type), ...materialCases.map(entry => entry.type)];
  assert.equal(allTypes.length, 8);
  assert.deepEqual([...PROPOSAL_TYPES].sort(), [...allTypes].sort());
  for (const type of allTypes) assert.equal(proposalTypeSchema.parse(type), type);
  const chatTypes = [...legacyCases.map(entry => entry.type), 'organized_note'];
  assert.deepEqual([...CHAT_PROPOSAL_TYPES].sort(), [...chatTypes].sort());
  const definition = toolDefinitions.find(entry => entry.name === 'create_proposal');
  assert.ok(definition);
  const parameters = definition.parameters as Row;
  assert.deepEqual([...parameters.properties.type.enum].sort(), [...chatTypes].sort());
  const branches = parameters.properties.data.anyOf as Row[];
  assert.ok(branches.some(branch => branch.required?.includes('course_id')));
  assert.ok(branches.some(branch => branch.required?.includes('items')));
});

for (const spec of legacyCases) {
  test(`A3a ${spec.type}: chat preserves data and only issues a pending proposal with agent event`, async t => {
    const { db } = await fixture(t);
    const before = snapshot(db);
    const result = JSON.parse(await executeTool('create_proposal', spec, userId, context));
    const proposal = proposalRow(db, result.id);
    assert.equal(result.type, spec.type);
    assert.equal(result.items_count, spec.data.items.length);
    assert.equal(proposal.status, 'pending');
    assert.equal(proposal.resolved_at, null);
    assert.equal(proposal.conversation_id, conversationId);
    assert.deepEqual(JSON.parse(proposal.data), spec.data);
    assertIssued(db, proposal.id, spec.type, 'agent');
    assert.equal(count(db, 'events'), 1);
    assert.equal(count(db, 'operation_batches'), 0);
    assert.equal(result.receipt_id, undefined);
    assert.deepEqual(snapshot(db), before);
  });
}

test('A3a the unified service and chat reject the same ordinary unknown proposal enum', async t => {
  const { db } = await fixture(t);
  const before = snapshot(db, [...downstreamTables, 'proposals', 'events', 'operation_batches']);
  const type = 'unknown_proposal' as ProposalType;
  assert.throws(() => createProposal(db, userId, {
    type, data: legacyCases[0].data, context: HUMAN_PROPOSAL_CONTEXT,
  }), ZodError);
  await assert.rejects(executeTool('create_proposal', { type, data: legacyCases[0].data }, userId, context), ZodError);
  assert.deepEqual(snapshot(db, [...downstreamTables, 'proposals', 'events', 'operation_batches']), before);
});

for (const spec of materialCases) {
  test(`A3a ${spec.type}: existing human API preserves its preview shape and records human issuance`, async t => {
    const { db, request } = await fixture(t);
    const before = snapshot(db);
    const response = await request(spec.path, { course_id: courseId });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    const proposal = response.body as Row;
    assert.deepEqual(Object.keys(proposal).sort(),
      ['id', 'user_id', 'type', 'status', 'data', 'created_at', 'resolved_at'].sort());
    assert.equal(proposal.user_id, userId);
    assert.equal(proposal.type, spec.type);
    assert.equal(proposal.status, 'pending');
    assert.equal(proposal.resolved_at, null);
    assert.equal(proposal.data.version, spec.version);
    assert.equal(proposal.data.proposal_kind, spec.type);
    assert.equal(proposal.data.course_id, courseId);
    assert.ok(proposal.data[spec.collection].length > 0);
    assert.equal(proposalRow(db, proposal.id).conversation_id, null);
    assert.deepEqual(JSON.parse(proposalRow(db, proposal.id).data), proposal.data);
    assertIssued(db, proposal.id, spec.type, 'human');
    assert.equal(count(db, 'events'), 1);
    assert.equal(count(db, 'operation_batches'), 0);
    assert.deepEqual(snapshot(db), before);
    const preview = await request(`/${proposal.id}`);
    assert.equal(preview.status, 200);
    assert.deepEqual(preview.body.data, proposal.data);
    if (spec.type === 'organized_note') {
      assert.equal(proposal.data.generation_mode, 'deterministic_fallback');
      assert.ok(proposal.data.blocks.every((block: Row) => block.source_references.length > 0));
    }
    if (spec.type === 'material_reconciliation') {
      assert.equal(proposal.data.apply_behavior, 'review_shell_only');
      assert.ok(proposal.data.candidate_groups.some((group: Row) => group.group_kind === 'DUPLICATE'));
    }
  });
}

for (const creationContext of [HUMAN_PROPOSAL_CONTEXT, context]) {
  test(`A3a ${creationContext.actor} proposal and issuance event share an enclosing business transaction`, async t => {
    const { db } = await fixture(t);
    const before = snapshot(db, [...downstreamTables, 'proposals', 'events', 'operation_batches']);
    // A routine business cancellation demonstrates participation in the caller's
    // transaction without replacing the event recorder or changing database schema.
    const cancelDraft = db.transaction(() => {
      const proposal = createProposal(db, userId, {
        type: 'study_plan', data: legacyCases[0].data, context: creationContext,
      });
      assert.equal(proposalRow(db, proposal.id).status, 'pending');
      assertIssued(db, proposal.id, 'study_plan', creationContext.actor);
      throw new AppError(409, 'Draft preparation cancelled');
    });
    assert.throws(cancelDraft, { message: 'Draft preparation cancelled' });
    assert.deepEqual(snapshot(db, [...downstreamTables, 'proposals', 'events', 'operation_batches']), before);
  });
}

test('A3a chat organized_note is listed and previewed by existing APIs, then human apply creates the note', async t => {
  const { db, request } = await fixture(t);
  const before = snapshot(db);
  const result = JSON.parse(await executeTool('create_proposal', {
    type: 'organized_note',
    data: { course_id: courseId, document_ids: [documentId], note_title: 'Limits organized notes' },
  }, userId, context));
  assert.equal(result.type, 'organized_note');
  assert.equal(result.status, 'pending');
  assert.equal(result.course_id, courseId);
  assert.ok(result.blocks_count > 0);
  assert.equal(result.receipt_id, undefined);
  const stored = proposalRow(db, result.id);
  assert.equal(stored.status, 'pending');
  assert.equal(stored.conversation_id, conversationId);
  assertIssued(db, result.id, 'organized_note', 'agent');
  assert.equal(count(db, 'events'), 1);
  assert.equal(count(db, 'operation_batches'), 0);
  assert.deepEqual(snapshot(db), before);

  const list = await request('?status=pending');
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((row: Row) => row.id), [result.id]);
  const preview = await request(`/${result.id}`);
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.body.data, JSON.parse(stored.data));
  assert.equal(preview.body.data.title, 'Limits organized notes');
  assert.equal(preview.body.data.generation_mode, 'deterministic_fallback');
  assert.equal(preview.body.data.blocks.length, result.blocks_count);
  assert.ok(preview.body.data.blocks.every((block: Row) => block.source_references.length > 0
    && block.source_references.every((reference: Row) => reference.document_id === documentId)));

  const applied = await request(`/${result.id}/apply`, {});
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.equal(applied.body.blocks_count, result.blocks_count);
  assert.ok(applied.body.note_id);
  assert.ok(applied.body.operation_batch_id);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(applied.body.note_id) as Row;
  assert.equal(note.title, preview.body.data.title);
  assert.equal(note.course_id, courseId);
  assert.equal(note.operation_batch_id, applied.body.operation_batch_id);
  assert.equal(count(db, 'notes'), 1);
  assert.equal(count(db, 'note_blocks'), result.blocks_count);
  assert.equal(count(db, 'note_block_placements'), result.blocks_count);
  assert.ok(count(db, 'note_block_sources') > 0);
  assert.equal(count(db, 'operation_batches'), 1);
  assert.equal(proposalRow(db, result.id).status, 'applied');
  assert.ok(proposalRow(db, result.id).resolved_at);
  assert.deepEqual((await request('?status=pending')).body, []);
  t.diagnostic('A3a API smoke PASS: chat organized_note -> pending + agent event -> list/detail -> human apply -> note/blocks/sources');
});

const inboxCardProposal = {
  type: 'batch_cards',
  data: { ...legacyCases[1].data, items: [
    ...legacyCases[1].data.items,
    { title: 'Continuity', template_type: 'definition', content: { definition: 'Nearby inputs keep outputs nearby.' } },
  ] },
};

test('proposal inbox API: chat organized_note and batch_cards apply one by one and leave an empty pending list', async t => {
  const { db, request } = await fixture(t);
  const noteProposal = JSON.parse(await executeTool('create_proposal', {
    type: 'organized_note',
    data: { course_id: courseId, document_ids: [documentId], note_title: 'Limits notes' },
  }, userId, context)) as Row;
  const cardProposal = JSON.parse(await executeTool('create_proposal', inboxCardProposal, userId, context)) as Row;
  const pending = await request('?status=pending');
  assert.equal(pending.status, 200);
  assert.deepEqual(pending.body.map((row: Row) => row.id).sort(), [noteProposal.id, cardProposal.id].sort());
  assert.ok(pending.body.every((row: Row) => row.conversation_id === conversationId && row.created_at));
  assert.equal(count(db, 'notes'), 0);
  assert.equal(count(db, 'cards'), 0);

  const noteResult = await request(`/${noteProposal.id}/apply`, {});
  assert.equal(noteResult.status, 200, JSON.stringify(noteResult.body));
  assert.ok(noteResult.body.blocks_count > 0);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteResult.body.note_id) as Row;
  assert.equal(note.title, 'Limits notes');
  assert.equal(note.course_id, courseId);
  assert.equal(count(db, 'note_blocks'), noteResult.body.blocks_count);
  assert.equal(count(db, 'note_block_placements'), noteResult.body.blocks_count);
  assert.ok(count(db, 'note_block_sources') > 0);
  assert.ok((db.prepare('SELECT plain_text FROM note_blocks').all() as Row[])
    .some(row => row.plain_text.includes('Limits describe')));
  assert.equal(proposalRow(db, noteProposal.id).status, 'applied');
  assert.ok(proposalRow(db, noteProposal.id).resolved_at);
  assert.deepEqual((await request('?status=pending')).body.map((row: Row) => row.id), [cardProposal.id]);

  const cardResult = await request(`/${cardProposal.id}/apply`, {});
  assert.equal(cardResult.status, 200, JSON.stringify(cardResult.body));
  assert.equal(cardResult.body.items_count, 2);
  const cards = db.prepare('SELECT * FROM cards ORDER BY title').all() as Row[];
  assert.equal(cards.length, 2);
  assert.ok(cards.every(card => card.deck_id === deckId));
  assert.deepEqual(JSON.parse(cards[0].content), { definition: 'Nearby inputs keep outputs nearby.' });
  assert.deepEqual(JSON.parse(cards[1].content), { body: 'A limiting value.' });
  assert.equal((db.prepare('SELECT card_count FROM card_decks WHERE id = ?').get(deckId) as Row).card_count, 2);
  assert.equal(proposalRow(db, cardProposal.id).status, 'applied');
  assert.ok(proposalRow(db, cardProposal.id).resolved_at);
  assert.deepEqual((await request('?status=pending')).body, []);
});

test('proposal inbox API: discard resolves the selected chat proposal without creating its cards', async t => {
  const { db, request } = await fixture(t);
  const proposal = JSON.parse(await executeTool('create_proposal', inboxCardProposal, userId, context)) as Row;
  assert.equal((await request('?status=pending')).body.length, 1);
  const discarded = await request(`/${proposal.id}/discard`, {});
  assert.equal(discarded.status, 200);
  assert.equal(proposalRow(db, proposal.id).status, 'discarded');
  assert.ok(proposalRow(db, proposal.id).resolved_at);
  assert.equal(count(db, 'cards'), 0);
  assert.deepEqual((await request('?status=pending')).body, []);
});

test('proposal inbox API: material reconciliation empty-body apply records only the existing review shell', async t => {
  const { db, request } = await fixture(t);
  const issued = await request('/material-reconciliation', { course_id: courseId });
  assert.equal(issued.status, 201, JSON.stringify(issued.body));
  assert.ok(issued.body.data.candidate_groups.length > 0);
  const pending = (await request('?status=pending')).body;
  assert.equal(pending.length, 1);
  assert.equal(pending[0].conversation_id, null);
  assert.equal(pending[0].data.apply_behavior, 'review_shell_only');
  const applied = await request(`/${issued.body.id}/apply`, {});
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.equal(applied.body.review_shell_only, true);
  assert.equal(applied.body.decisions_count, 0);
  assert.equal(count(db, 'evidence_sets'), 0);
  assert.equal(count(db, 'evidence_items'), 0);
  assert.equal(count(db, 'operation_batches'), 1);
  assert.equal(proposalRow(db, issued.body.id).status, 'applied');
  assert.deepEqual((await request('?status=pending')).body, []);
});
