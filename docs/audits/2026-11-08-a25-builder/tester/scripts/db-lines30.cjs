// Tester(1) 11-09 (report review, hygiene F4): READ-ONLY query of the A-25 test library (data-a25, backend 3614) for the
// three 'D 30' notes of pair 1 mx round 0 (lines30-0 green, lines30-1 red, lines30-2 green): blocks, text units,
// text_save_revision, created / updated times, recovery events, events naming the block. Opens the DB read-only.
// Usage (from <repo>/server so better-sqlite3 resolves): node <scratch>/a20reg/db-lines30.cjs <db path>
const D = require(require.resolve('better-sqlite3', { paths: [process.cwd()] }));
const db = new D(process.argv[2], { readonly: true, fileMustExist: true });
const notes = db.prepare("select id, title, created_at from notes where title = 'D 30' and created_at < '2026-11-09T11:00' order by created_at").all();
const names = ['lines30-0', 'lines30-1', 'lines30-2'];
console.log(`D 30 notes created before 11:00Z (pair 1 mx, round 0): ${notes.length}`);
notes.forEach((n, i) => {
  console.log(`\n== ${names[i] || '?'}  note ${n.id}  created ${n.created_at}`);
  for (const p of db.prepare('select block_id, order_index from note_block_placements where note_id = ? order by order_index').all(n.id)) {
    const b = db.prepare('select id, block_type, content_json, text_save_revision, created_at, updated_at, status, trashed_at from note_blocks where id = ?').get(p.block_id);
    const units = JSON.parse(b.content_json).text_flow.units.map((u) => `${u.id}:${JSON.stringify(u.text)}`);
    const sec = (a, z) => ((Date.parse(z) - Date.parse(a)) / 1000).toFixed(2);
    console.log(`   block ${b.id} (${b.block_type}, ${b.status}${b.trashed_at ? ', trashed' : ''}) order ${p.order_index}`);
    console.log(`   units ${units.join(' ')}`);
    console.log(`   text_save_revision ${b.text_save_revision}; created ${b.created_at} (+${sec(n.created_at, b.created_at)} s after the note); updated ${b.updated_at} (+${sec(b.created_at, b.updated_at)} s after the block)`);
    console.log(`   recovery events ${db.prepare('select count(*) c from reconciliation_recovery_events where target_id = ?').get(b.id).c}; events naming the block ${db.prepare('select count(*) c from events where objects like ?').get(`%${b.id}%`).c}`);
  }
});
