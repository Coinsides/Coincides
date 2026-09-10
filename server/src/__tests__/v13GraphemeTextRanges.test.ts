import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { initDb, closeDb } from '../db/init.js';
import { sliceGraphemes } from '../services/graphemes.js';
import { resolveSelection } from '../services/selectionResolve.js';
import { createBoard } from '../services/boards.js';
import { createBoardTextRange, getBoardTextRange, replayBoardTextRange } from '../services/boardTextRanges.js';

test('B9 client/shared and server grapheme implementation stay byte-identical', async () => {
  const sharedUrl = new URL('../../../shared/graphemes.ts', import.meta.url);
  const serverUrl = new URL('../services/graphemes.ts', import.meta.url);
  assert.equal(readFileSync(sharedUrl, 'utf8'), readFileSync(serverUrl, 'utf8'));
  const shared = await import(sharedUrl.href);
  for (const cluster of ['\u{1f600}', '\u{1f469}\u200d\u{1f4bb}', 'e\u0301']) {
    assert.equal(shared.sliceGraphemes(`A${cluster}B`, 2, 3), cluster);
    assert.equal(sliceGraphemes(`A${cluster}B`, 2, 3), cluster);
  }
});

test('B9 receipt resolve and board replay preserve old UTF-16 anchors and render whole clusters', async () => {
  const db = await initDb(':memory:');
  try {
    db.prepare("INSERT INTO users(id,email,password_hash,name) VALUES('b9','b9@example.invalid','synthetic','B9')").run();
    db.prepare("INSERT INTO courses(id,user_id,name) VALUES('b9-project','b9','Synthetic')").run();
    db.prepare("INSERT INTO notes(id,user_id,course_id,title) VALUES('b9-note','b9','b9-project','Synthetic')").run();
    db.prepare("INSERT INTO note_blocks(id,user_id,course_id,block_type,content_json,plain_text) VALUES('b9-block','b9','b9-project','paragraph','{}','')").run();
    db.prepare("INSERT INTO note_block_placements(id,note_id,block_id,order_index) VALUES('b9-placement','b9-note','b9-block',0)").run();
    const { board } = db.transaction(() => createBoard(db, 'b9', { title: 'Synthetic', purpose: { title: 'Synthetic' } }))();
    for (const cluster of ['\u{1f600}', '\u{1f469}\u200d\u{1f4bb}', 'e\u0301']) {
      const text = `A${cluster}B`;
      const content = { text_flow: { textflow_version: 1, units: [{ id: 'unit', text,
        writing_role: 'paragraph', indent_level: 0, order_index: 0, metadata: {}, status: 'active' }],
        inline_structures: [], metadata: {} } };
      db.prepare("UPDATE note_blocks SET content_json = ?, plain_text = ? WHERE id = 'b9-block'")
        .run(JSON.stringify(content), text);
      const start = cluster.length > 2 ? 3 : 2;
      const end = start + 1;
      for (const excerpt of [cluster, text.slice(start, end)]) {
        const selection = { blockId: 'b9-block', textFlowId: 'textflow-b9-block', textUnitId: 'unit',
          startOffset: start, endOffset: end, excerpt };
        const receipt = { note_id: 'b9-note', refs: [selection], text_ranges: [selection], at: '2026-09-10T12:00:00.000Z' };
        assert.equal(resolveSelection('b9', receipt).results[0].outcome, 'found');
        // SQLite stores UTF-8; a lone surrogate cannot roundtrip as a legacy TEXT cache.
        if (cluster === '\u{1f600}' && excerpt !== cluster) continue;
        const range = db.transaction(() => createBoardTextRange(db, 'b9', board.id, {
          note_id: 'b9-note', block_id: 'b9-block', text_flow_id: 'textflow-b9-block', text_unit_id: 'unit',
          start_offset: start, end_offset: end, excerpt, at: receipt.at,
        }))();
        const before = getBoardTextRange(db, 'b9', range.id);
        assert.equal(replayBoardTextRange(db, 'b9', range).text, cluster);
        assert.equal(replayBoardTextRange(db, 'b9', range).status, 'active');
        assert.deepEqual(getBoardTextRange(db, 'b9', range.id), before, 'GET must not migrate stored offsets or cache');
        assert.equal(before?.start_offset, start);
        assert.equal(before?.end_offset, end);
        assert.equal(before?.excerpt, excerpt);
        assert.equal(resolveSelection('b9', { ...receipt, text_ranges: [{ ...selection, excerpt: 'changed' }] })
          .results[0].outcome, 'text_drifted');
      }
    }
  } finally {
    closeDb();
  }
});
