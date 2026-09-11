import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../../../docs/audits/2026-09-10-c-fix2-builder/', import.meta.url);
mkdirSync(root, { recursive: true });
const base = 'http://127.0.0.1:5185/api';
const state = async () => {
  const value = await (await fetch(`${base}/__c-fix1-fixture`)).json();
  assert.equal(value.database, ':memory:');
  assert.equal(value.noteId, 'c-fix1-note');
  return value;
};
const mode = process.argv[2];
if (mode === 'seed') {
  let value = await state();
  for (let i = 0; i < 3; i++) {
    const block = value.note_blocks.find(b => b.id === 'c-fix1-b');
    const response = await fetch(`${base}/note-blocks/c-fix1-b/text-save`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      note_id: value.noteId, base_revision: block.text_save_revision,
      block: { content_json: JSON.parse(block.content_json), plain_text: block.plain_text },
      annotations: { range_updates: [] }, text_ranges: [],
    }) });
    assert.equal(response.status, 200, await response.text());
    value = await state();
  }
  assert.equal(value.note_blocks.find(b => b.id === 'c-fix1-b').text_save_revision, 3);
  console.log('Synthetic B revision seeded through three ordinary production saves: 0 -> 3');
} else if (mode === '03-positive-control') {
  const before = await state();
  const block = before.note_blocks.find(b => b.id === 'c-fix1-b');
  const range = before.board_text_ranges.find(r => r.block_id === block.id && r.excerpt === 'Ta');
  assert.equal(range.status, 'drifted');
  // Restore matching text as an ordinary save. A mismatching body would look
  // drifted even with the sticky gate removed, so it is not a positive control.
  const undoState = JSON.parse(readFileSync(new URL('01-after-undo.json', root), 'utf8'));
  const original = undoState.note_blocks.find(b => b.id === block.id);
  const content = JSON.parse(original.content_json);
  assert.equal(content.text_flow.units.find(u => u.id === range.text_unit_id).text.slice(0, 2), range.excerpt);
  const { id, block_id, text_flow_id, text_unit_id, excerpt } = range;
  const request = { note_id: before.noteId, base_revision: block.text_save_revision,
    block: { content_json: content, plain_text: original.plain_text },
    annotations: { range_updates: [] }, text_ranges: [{ id, block_id, text_flow_id, text_unit_id, excerpt,
      start_offset: 0, end_offset: 2, status: 'active', pre_edit_offsets: null }] };
  const response = await fetch(`${base}/note-blocks/c-fix1-b/text-save`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
  assert.equal(response.status, 200);
  const result = await response.json();
  const after = await state();
  const actual = after.board_text_ranges.find(r => r.id === range.id);
  assert.equal(actual.status, 'drifted');
  assert.deepEqual(actual.pre_edit_offsets, range.pre_edit_offsets);
  assert.equal(actual.excerpt, range.excerpt);
  assert.equal(result.revision, block.text_save_revision + 1);
  writeFileSync(new URL(`${mode}.json`, root), JSON.stringify({ before: range, request, result, after: actual }, null, 2) + '\n');
  console.log('PASS ordinary text-save preserves existing drifted status and pre-edit evidence without restore intent.');
} else {
  const value = await state();
  writeFileSync(new URL(`${mode}.json`, root), JSON.stringify(value, null, 2) + '\n');
  const block = value.note_blocks.find(b => b.id === 'c-fix1-b');
  const range = value.board_text_ranges.find(r => r.block_id === block.id && r.excerpt === 'Ta');
  const requests = value.requests.filter(r => r.path === '/note-blocks/c-fix1-b/text-save' && r.body.text_ranges.length);
  const summary = { mode, revision: block.text_save_revision, range, requests: requests.map(r => ({ path: r.path, base_revision: r.body.base_revision, text_ranges: r.body.text_ranges })) };
  console.log(JSON.stringify(summary, null, 2));
  if (mode === '01-after-undo') {
    assert.equal(block.text_save_revision, 5);
    assert.equal(requests.at(-2).body.base_revision, 3);
    assert.equal(requests.at(-2).body.text_ranges[0].history_restore, undefined);
    assert.equal(requests.at(-1).body.base_revision, 4);
    assert.equal(requests.at(-1).body.text_ranges[0].history_restore, true);
    assert.equal(range.status, 'active');
    assert.equal(range.start_offset, 0);
    assert.equal(range.end_offset, 2);
    assert.equal(range.pre_edit_offsets, null);
  }
  if (mode === '02-after-redo') {
    assert.equal(block.text_save_revision, 6);
    assert.equal(requests.at(-1).body.base_revision, 5);
    assert.equal(requests.at(-1).body.text_ranges[0].history_restore, true);
    assert.equal(range.status, 'drifted');
    assert.equal(range.start_offset, null);
    assert.equal(range.end_offset, null);
    assert.deepEqual(range.pre_edit_offsets, { start_offset: 0, end_offset: 2 });
  }
  if (mode === '04-after-failure' || mode === '04-after-retry') {
    const proxy = await (await fetch('http://127.0.0.1:5186/__c-fix2/journal')).json();
    writeFileSync(new URL(`${mode}-transport.json`, root), JSON.stringify(proxy, null, 2) + '\n');
    const failure = proxy.journal.findIndex(r => r.injected);
    assert.ok(failure >= 0);
    assert.equal(proxy.journal[failure].input.base_revision, 6);
    assert.equal(proxy.journal[failure].input.text_ranges[0].history_restore, true);
    if (mode === '04-after-failure') {
      assert.equal(range.status, 'drifted');
      assert.equal(block.text_save_revision, 6);
      assert.equal(proxy.journal.length, failure + 1);
    } else {
      assert.equal(range.status, 'active');
      assert.equal(block.text_save_revision, 7);
      assert.equal(range.pre_edit_offsets, null);
      assert.equal(proxy.journal.length, failure + 2, 'retry must only save the incomplete block');
      assert.deepEqual(proxy.journal.at(-1).input, proxy.journal[failure].input);
      assert.equal(proxy.journal.at(-1).status, 200);
    }
  }
  if (mode === '01-before-red') {
    assert.equal(requests.at(-2).body.base_revision, 3);
    assert.equal(requests.at(-2).body.text_ranges[0].status, 'drifted');
    assert.equal(requests.at(-1).body.base_revision, 4);
    assert.equal(requests.at(-1).body.text_ranges[0].status, 'active');
    assert.equal(range.status, 'drifted');
    assert.deepEqual(range.pre_edit_offsets, { start_offset: 0, end_offset: 2 });
    console.log('EXPECTED RED CONFIRMED: undo submitted active/null, durable range remains drifted with evidence.');
    assert.equal(range.status, 'active', 'F17 repair target: durable undo must restore active');
  }
}
