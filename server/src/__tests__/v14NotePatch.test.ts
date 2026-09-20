import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'node:http';
import express from 'express';
import { initDb, closeDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import { saveAtomicText } from '../services/atomicTextSave.js';
import { createNotePatchProposal, discardNotePatch, projectNotePatchProposal } from '../services/notePatchProposals.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import proposalRoutes from '../routes/proposals.js';
import type { NotePatchProposalData } from '../../../shared/types/notePatch.js';

const USER = 'c2-patch-user';
const NOTE = 'c2-note';
const BLOCK = 'c2-block';
const context = { actor: 'agent', channel: 'chat', conversationId: 'c2-chat', callId: 'c2-call' } as const;
const unit = (id: string, text: string, order_index: number) => ({ id, text, writing_role: 'paragraph', indent_level: 0, order_index, metadata: {}, status: 'active' });
const flow = (first = 'First original', second = 'Second original') => ({ textflow_version: 'TextBlockContentV1',
  units: [unit('u1', first, 0), unit('u2', second, 1)], inline_structures: [], metadata: {} });
const body = (first = 'First original', second = 'Second original') => ({
  content_json: { body: `${first}\n${second}`, text_flow: flow(first, second) }, plain_text: `${first}\n${second}`,
});
async function fixture(run: (db: Awaited<ReturnType<typeof initDb>>) => Promise<void> | void) {
  const db = await initDb(':memory:');
  try {
    db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES(?,'c2@example.test','synthetic','C2')").run(USER);
    db.prepare("INSERT INTO courses(id,user_id,name) VALUES('c2-project',?,'C2 project')").run(USER);
    db.prepare("INSERT INTO notes(id,user_id,course_id,title) VALUES(?,?,'c2-project','C2 note')").run(NOTE, USER);
    db.prepare("INSERT INTO agent_conversations(id,user_id,title) VALUES('c2-chat',?,'C2 chat')").run(USER);
    db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES(?,?,'c2-project','paragraph',?,?)")
      .run(BLOCK, USER, JSON.stringify(body().content_json), body().plain_text);
    db.prepare("INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES('c2-placement',?,?,0)").run(NOTE, BLOCK);
    await run(db);
  } finally { closeDb(); }
}
function stored(db: Awaited<ReturnType<typeof initDb>>, id: string) {
  const row = db.prepare('SELECT status,data FROM proposals WHERE id = ?').get(id) as { status: string; data: string };
  return { status: row.status, data: JSON.parse(row.data) as NotePatchProposalData };
}
function proposal(db: Awaited<ReturnType<typeof initDb>>) {
  return createNotePatchProposal(db, USER, { note_id: NOTE, patches: [
    { block_id: BLOCK, unit_id: 'u1', new_text: 'First revised' },
    { block_id: BLOCK, unit_id: 'u2', new_text: 'Second revised' },
  ] }, context);
}
function save(db: Awaited<ReturnType<typeof initDb>>, revision: number, first: string, second: string,
  acceptance?: { proposal_id: string; patch_index: number }) {
  return saveAtomicText(db, USER, BLOCK, { note_id: NOTE, base_revision: revision, block: body(first, second),
    annotations: { range_updates: [] }, text_ranges: [], ...(acceptance ? { proposal_patch: acceptance } : {}) });
}

test('C2 create_proposal freezes review text while leaving the note untouched', async () => fixture(async db => {
  const before = db.prepare('SELECT * FROM note_blocks').all();
  const result = JSON.parse(await executeTool('create_proposal', { type: 'note_patch', data: { note_id: NOTE,
    patches: [{ block_id: BLOCK, unit_id: 'u1', new_text: 'First revised' }] } }, USER, context));
  assert.equal(result.status, 'pending');
  assert.equal(result.patches_count, 1);
  assert.deepEqual(db.prepare('SELECT * FROM note_blocks').all(), before);
  assert.equal(stored(db, result.id).data.patches[0].old_text, 'First original');
  const event = db.prepare("SELECT actor_kind,verb FROM events WHERE verb='proposal_issued'").get() as any;
  assert.deepEqual(event, { actor_kind: 'agent', verb: 'proposal_issued' });
}));

test('C2 human text-save accepts one patch; remaining patch is reviewable and discard changes no text', async () => fixture(db => {
  const issued = proposal(db);
  const saved = save(db, 0, 'First revised', 'Second original', { proposal_id: issued.id, patch_index: 0 });
  assert.equal(saved.revision, 1);
  const partial = stored(db, issued.id);
  assert.equal(partial.status, 'pending');
  assert.deepEqual(partial.data.patches.map(patch => patch.status), ['applied', 'pending']);
  assert.equal(partial.data.patches[1].base_revision, 1);
  assert.equal(projectNotePatchProposal(db, USER, partial.data).patches[1].status, 'pending');
  const beforeDiscard = db.prepare('SELECT * FROM note_blocks').all();
  discardNotePatch(db, USER, issued.id, 1);
  assert.equal(stored(db, issued.id).status, 'applied');
  assert.deepEqual(db.prepare('SELECT * FROM note_blocks').all(), beforeDiscard);
  // Runtime undo/redo use this same human door without re-acknowledging a proposal.
  save(db, 1, 'First original', 'Second original');
  save(db, 2, 'First revised', 'Second original');
  assert.equal(stored(db, issued.id).data.patches[0].status, 'applied');
}));

test('C2 two units in one block can be accepted sequentially without self-conflict', async () => fixture(db => {
  const issued = proposal(db);
  save(db, 0, 'First revised', 'Second original', { proposal_id: issued.id, patch_index: 0 });
  save(db, 1, 'First revised', 'Second revised', { proposal_id: issued.id, patch_index: 1 });
  assert.equal(stored(db, issued.id).status, 'applied');
  assert.deepEqual(stored(db, issued.id).data.patches.map(patch => patch.status), ['applied', 'applied']);
}));

for (const siblingStatus of ['draft', 'deprecated']) {
  test(`C2 acceptance preserves a ${siblingStatus} sibling in the human editor plain-text projection`, async () => fixture(db => {
    const original = body();
    original.content_json.text_flow.units[1].status = siblingStatus;
    db.prepare('UPDATE note_blocks SET content_json=?,plain_text=? WHERE id=?')
      .run(JSON.stringify(original.content_json), original.plain_text, BLOCK);
    const issued = createNotePatchProposal(db, USER, { note_id: NOTE,
      patches: [{ block_id: BLOCK, unit_id: 'u1', new_text: 'First revised' }] }, context);
    // The real contentForEditedTextFlowBlock/ plainTextForBlockContent projection
    // joins every non-deleted unit, preserving the untouched sibling's status.
    const next = body('First revised');
    next.content_json.text_flow.units[1].status = siblingStatus;
    const saved = saveAtomicText(db, USER, BLOCK, { note_id: NOTE, base_revision: 0, block: next,
      annotations: { range_updates: [] }, text_ranges: [], proposal_patch: { proposal_id: issued.id, patch_index: 0 } });
    assert.equal(saved.block.plain_text, 'First revised\nSecond original');
    assert.deepEqual(saved.block.content_json.text_flow.units[1], original.content_json.text_flow.units[1]);
    assert.equal(stored(db, issued.id).status, 'applied');
  }));
}

test('C2 an intervening human edit makes the frozen patch stale and preserves the edit', async () => fixture(db => {
  const issued = proposal(db);
  save(db, 0, 'Human changed this', 'Second original');
  const before = db.prepare('SELECT * FROM note_blocks').all();
  const projected = projectNotePatchProposal(db, USER, stored(db, issued.id).data);
  assert.deepEqual(projected.patches.map(patch => patch.status), ['stale', 'stale']);
  assert.throws(() => save(db, 1, 'First revised', 'Second original', { proposal_id: issued.id, patch_index: 0 }), /stale_revision/);
  assert.deepEqual(db.prepare('SELECT * FROM note_blocks').all(), before);
  assert.equal(stored(db, issued.id).data.patches[0].status, 'pending');
}));

test('C2 a failed atomic range save rolls back both the text and patch status', async () => fixture(db => {
  const issued = proposal(db);
  assert.throws(() => saveAtomicText(db, USER, BLOCK, { note_id: NOTE, base_revision: 0, block: body('First revised'),
    annotations: { range_updates: [{ annotation_id: 'missing-range', range: {} }] }, text_ranges: [],
    proposal_patch: { proposal_id: issued.id, patch_index: 0 } }));
  assert.equal((db.prepare('SELECT plain_text FROM note_blocks WHERE id=?').get(BLOCK) as any).plain_text, body().plain_text);
  assert.equal(stored(db, issued.id).data.patches[0].status, 'pending');
}));

test('C2 whole-unit replacement retains inline identities and applies the normal offset degradation', async () => fixture(db => {
  const beforeFlow: any = flow('Before target after');
  const inline = (id: string, start: number, end: number, anchor_text: string) => ({ id, parent_text_unit_id: 'u1',
    semantic_kind: 'inline_code', anchor_range: { start, end }, anchor_text, field_values: {}, metadata: {}, status: 'active' });
  beforeFlow.inline_structures = [inline('prefix', 0, 6, 'Before'), inline('changed', 7, 13, 'target'), inline('suffix', 14, 19, 'after')];
  db.prepare('UPDATE note_blocks SET content_json=?,plain_text=? WHERE id=?')
    .run(JSON.stringify({ body: 'Before target after\nSecond original', text_flow: beforeFlow }), 'Before target after\nSecond original', BLOCK);
  const issued = createNotePatchProposal(db, USER, { note_id: NOTE,
    patches: [{ block_id: BLOCK, unit_id: 'u1', new_text: 'Before replacement after' }] }, context);
  const afterFlow = structuredClone(beforeFlow);
  afterFlow.units[0].text = 'Before replacement after';
  afterFlow.inline_structures[1].anchor_range = null;
  afterFlow.inline_structures[1].metadata = { pre_edit_offsets: { text_unit_id: 'u1', start_offset: 7, end_offset: 13, range_text_cache: 'target' } };
  afterFlow.inline_structures[2].anchor_range = { start: 19, end: 24 };
  const saved = saveAtomicText(db, USER, BLOCK, { note_id: NOTE, base_revision: 0,
    block: { content_json: { body: 'Before replacement after\nSecond original', text_flow: afterFlow }, plain_text: 'Before replacement after\nSecond original' },
    annotations: { range_updates: [] }, text_ranges: [], proposal_patch: { proposal_id: issued.id, patch_index: 0 } });
  assert.deepEqual(saved.block.content_json.text_flow.inline_structures.map((item: any) => item.id), ['prefix', 'changed', 'suffix']);
  assert.deepEqual(saved.block.content_json.text_flow.inline_structures[2].anchor_range, { start: 19, end: 24 });
  assert.equal(stored(db, issued.id).status, 'applied');
}));

test('C2 inbox HTTP exposes diffs, handles individual and full discard, and requires human text-save for acceptance', async () => fixture(async db => {
  const app = express(); app.use(express.json());
  app.use((req: AuthRequest, _res, next) => { req.userId = USER; next(); });
  app.use('/proposals', proposalRoutes); app.use(errorHandler);
  let server: Server | undefined;
  try {
    server = await new Promise<Server>(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const address = server.address(); assert.ok(address && typeof address === 'object');
    const request = (path: string, method = 'GET') => fetch(`http://127.0.0.1:${address.port}/proposals${path}`, {
      method, headers: { 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}),
    });
    const issued = proposal(db);
    const list = await (await request('?status=pending')).json() as any[];
    assert.equal(list[0].data.patches[0].old_text, 'First original');
    assert.equal((await request(`/${issued.id}/apply`, 'POST')).status, 409);
    assert.equal((await request(`/${issued.id}/patches/0/discard`, 'POST')).status, 200);
    assert.equal(stored(db, issued.id).status, 'pending');
    assert.equal((await request(`/${issued.id}/discard`, 'POST')).status, 200);
    assert.equal(stored(db, issued.id).status, 'discarded');
    assert.deepEqual(stored(db, issued.id).data.patches.map(patch => patch.status), ['discarded', 'discarded']);
    assert.equal((db.prepare('SELECT plain_text FROM note_blocks WHERE id=?').get(BLOCK) as any).plain_text, body().plain_text);
  } finally { if (server) await new Promise<void>(resolve => server!.close(() => resolve())); }
}));
