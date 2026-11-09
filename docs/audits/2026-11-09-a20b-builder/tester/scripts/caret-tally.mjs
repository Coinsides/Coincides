// Caret probe tally (Tester 11-09). Reads runs/caret-<build>-r1 and -r2 rows.jsonl.
// Per build x W: scrambled / rows (errors apart). Fisher exact two-sided, r2 (belt) vs r3e and r2 vs pre, per W and pooled.
// Per scrambled row: after which key the typed value first stopped being the expected prefix (from the page-side input
// events), when the first-clicked textarea left the document (page clock aligned to the probe clock through the first
// input event <-> keyAt[0]), and the last POST /notes/:id/blocks send time before typing ended (send only: the probe
// hooks responses for text-save / unit-transfer, not for blocks, so no return time exists in this data).
import fs from 'node:fs';
const R = process.env.R || '<scratch>/a20/runs';
const BUILDS = ['pre', 'r3e', 'belt'];
const WORD = 'warmup';
const rowsOf = (b) => ['r1', 'r2'].flatMap((r) => { const f = `${R}/caret-${b}-${r}/rows.jsonl`; return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => ({ ...JSON.parse(l), round: r })) : []; });
const lf = (n) => { let s = 0; for (let i = 2; i <= n; i += 1) s += Math.log(i); return s; };
// Fisher exact two-sided on [[a, b], [c, d]] (a = scrambled in group 1, b = clean in group 1, ...).
const fisher = (a, b, c, d) => {
  const n = a + b + c + d; const r1 = a + b; const c1 = a + c;
  const p = (x) => Math.exp(lf(r1) + lf(n - r1) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(n - r1 - c1 + x));
  const p0 = p(a); let s = 0;
  for (let x = Math.max(0, c1 - (n - r1)); x <= Math.min(r1, c1); x += 1) { const px = p(x); if (px <= p0 * (1 + 1e-9)) s += px; }
  return Math.min(1, s);
};
const jumpAfter = (ins) => {
  const same = (ins || []);
  for (let k = 0; k < same.length && k < WORD.length; k += 1) {
    const e = same[k]; if (e.v !== WORD.slice(0, k + 1) || e.s !== k + 1 || !e.same) return { afterKeys: k, event: e };
  }
  return null;
};
const postBlocks = (net) => (net || []).map((l) => l.match(/^(\d+) POST \/notes\/:id\/blocks/)).filter(Boolean).map((m) => Number(m[1]));
const all = {};
for (const b of BUILDS) all[b] = rowsOf(b);
const W_LIST = [...new Set(BUILDS.flatMap((b) => all[b].map((r) => r.W)).filter((w) => w !== undefined))].sort((x, y) => y - x);
const count = (b, W) => { const rs = all[b].filter((r) => !r.error && (W === 'all' || r.W === W)); return { n: rs.length, s: rs.filter((r) => r.scrambled).length, err: all[b].filter((r) => r.error && (W === 'all' || String(r.name).startsWith(`CARET-w${W}-`))).length }; };
console.log('build x W: scrambled / rows (setup errors)');
for (const W of [...W_LIST, 'all']) {
  const c = Object.fromEntries(BUILDS.map((b) => [b, count(b, W)]));
  const line = BUILDS.map((b) => `${b} ${c[b].s}/${c[b].n}${c[b].err ? ` (+${c[b].err} err)` : ''}`).join('   ');
  const f3 = fisher(c.belt.s, c.belt.n - c.belt.s, c.r3e.s, c.r3e.n - c.r3e.s);
  const fp = fisher(c.belt.s, c.belt.n - c.belt.s, c.pre.s, c.pre.n - c.pre.s);
  console.log(`W=${W}: ${line}   | Fisher two-sided r2 vs r3e p=${f3.toFixed(3)}, r2 vs pre p=${fp.toFixed(3)}`);
}
console.log('\nscrambled rows:');
for (const b of BUILDS) for (const r of all[b].filter((x) => x.scrambled)) {
  const ins = r.log?.ins || []; const j = jumpAfter(ins);
  const off = ins.length && r.keyAt ? r.keyAt[0] - ins[0].t : null; // page clock -> probe clock (input event fires a few ms after the key is sent)
  const gone = (r.log?.gone || []).map((t) => (off == null ? `page ${t}` : t + off));
  const goneAfterKey = gone.map((g) => (typeof g === 'number' ? r.keyAt.filter((k) => k <= g).length : null));
  const posts = postBlocks(r.net);
  console.log(JSON.stringify({ build: b, name: r.name, round: r.round, units: r.units, dom: r.dom, jumpAfterKeys: j ? j.afterKeys : null, firstBadInput: j ? j.event : null, keyAt: r.keyAt, tOpen: r.tOpen, tClick: r.tClick, goneAt: gone, goneAfterKey, postBlocksSent: posts, focus: r.log?.foc }));
}
console.log('\ntextarea replaced (gone) in clean rows, per build x W: count, and gone relative to first key (ms)');
for (const b of BUILDS) for (const W of W_LIST) {
  const rs = all[b].filter((r) => !r.error && !r.scrambled && r.W === W);
  const rel = rs.map((r) => { const ins = r.log?.ins || []; const off = ins.length && r.keyAt ? r.keyAt[0] - ins[0].t : null; const g = (r.log?.gone || [])[0]; return g == null || off == null ? null : Math.round(g + off - r.keyAt[0]); }).filter((x) => x != null);
  console.log(`${b} W=${W}: replaced ${rel.length}/${rs.length}${rel.length ? ` rel ${JSON.stringify(rel)}` : ''}`);
}
