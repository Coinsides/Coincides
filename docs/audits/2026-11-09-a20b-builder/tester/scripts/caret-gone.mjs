// Caret probe, clean rows (Tester 11-09): when the first-clicked textarea left the document, counted in keys sent before
// it (keyAt = probe clock just before each key; page clock aligned via first input event <-> keyAt[0]); and the first
// POST /notes/:id/blocks send time relative to the first key. Distribution per build. R = runs dir.
import fs from 'node:fs';
const R = process.env.R; const B = ['pre', 'r3e', 'belt'];
for (const b of B) {
  const rows = ['r1', 'r2'].flatMap((r) => { const f = `${R}/caret-${b}-${r}/rows.jsonl`; return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; }).filter((r) => !r.error);
  const after = {}; const gaps = []; const post = [];
  for (const r of rows) {
    const ins = r.log?.ins || []; if (!ins.length || !r.keyAt) continue;
    const off = r.keyAt[0] - ins[0].t; const g = (r.log?.gone || [])[0];
    if (g != null) { const k = r.keyAt.filter((t) => t <= g + off).length; after[k] = (after[k] || 0) + 1; }
    gaps.push(r.keyAt[1] - r.keyAt[0]);
    const p = (r.net || []).map((l) => l.match(/^(\d+) POST \/notes\/:id\/blocks/)).filter(Boolean).map((m) => Number(m[1]));
    if (p.length) post.push(p[p.length - 1] - r.keyAt[0]);
  }
  post.sort((x, y) => x - y); gaps.sort((x, y) => x - y);
  console.log(`${b}: rows ${rows.length}, scrambled ${rows.filter((r) => r.scrambled).length}; gone after k keys ${JSON.stringify(after)}; key1->key2 gap median ${gaps[gaps.length >> 1]} ms; POST blocks sent rel key1: min ${post[0]} median ${post[post.length >> 1]} max ${post[post.length - 1]} (n ${post.length})`);
}
