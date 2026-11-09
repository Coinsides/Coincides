// Tally of regression pair 10 (UNDOPAUSE x20 pre vs x20 r3, interleaved). Reads runs/up-pre-NN and runs/up-r3-NN.
// Base shape = the pre side's own most common shape (same environment). Signature (builder, Main_Designer 11-08): the
// second undo deletes the whole block, skipping the step back to ['warmup'] = step 2 is not exactly ['warmup'].
// Decision printed per the order: pre shows the signature -> counts for a TD; pre 0/20 and r3 >= 3/20 -> STOP, report.
import fs from 'node:fs';
const W = 'warmup';
const rowsOf = (side) => fs.readdirSync('runs').filter((d) => d.startsWith(`up-${side}-`)).sort().flatMap((d) => {
  const f = `runs/${d}/rows.jsonl`; if (!fs.existsSync(f)) return [{ run: d, error: 'no rows.jsonl' }];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => ({ run: d, ...JSON.parse(l) }));
});
// SIDE=r3d (11-09: pair 10 moved to r3d; the post side's label is up-<SIDE>-NN)
const POST = process.env.SIDE || 'r3';
const sides = { pre: rowsOf(process.env.PRESIDE || 'pre'), [POST]: rowsOf(POST) }; // PRESIDE=preb (A-20b round): the pre side's own labels so the r3e round's up-pre-NN stay
const modal = (rs) => { const c = {}; for (const r of rs) if (r.steps) c[JSON.stringify(r.steps)] = (c[JSON.stringify(r.steps)] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; };
const base = modal(sides.pre);
const sig = (r) => !!r.steps && JSON.stringify(r.steps[2]) !== JSON.stringify([W]);
console.log(`base shape (pre modal) ${base}`);
const out = {};
for (const [side, rs] of Object.entries(sides)) {
  const ok = rs.filter((r) => r.steps); const errs = rs.filter((r) => !r.steps);
  const shapes = {}; for (const r of ok) { const k = JSON.stringify(r.steps); (shapes[k] ||= []).push(r); }
  const nSig = ok.filter(sig).length; const nOff = ok.filter((r) => JSON.stringify(r.steps) !== base).length;
  out[side] = { n: ok.length, sig: nSig, off: nOff, errs: errs.length };
  console.log(`\n${side}: ${ok.length} rows (+${errs.length} setup errors); signature ${nSig}/${ok.length}; any shape != base ${nOff}/${ok.length}`);
  for (const [k, xs] of Object.entries(shapes)) console.log(`  ${String(xs.length).padStart(2)} x ${k}${k === base ? '  (base)' : ''}${xs.some(sig) ? '  <- SIGNATURE' : ''}`);
  for (const r of ok.filter(sig)) console.log(`     ${r.run} ${r.name}: server after ${JSON.stringify(r.server)}, puts ${r.puts}`);
  // side evidence (builder 11-08): red = no PUT 'warmup' at the second undo, the block DELETE comes there instead
  // (builder env: red puts 3, green 4; Tester env adds a step-3 'w' write, so read the split, not the absolute number)
  const putsBy = (pred) => { const c = {}; for (const r of ok.filter(pred)) c[r.puts] = (c[r.puts] || 0) + 1; return JSON.stringify(c); };
  console.log(`  puts: signature rows ${putsBy(sig)}; other rows ${putsBy((r) => !sig(r))}`);
  for (const r of errs) console.log(`     ${r.run} ${r.name || ''}: ${String(r.error).slice(0, 120)}`);
}
const pre = out.pre; const r3 = out[POST];
let verdict;
if (!pre || !r3 || pre.n < 20 || r3.n < 20) verdict = `INCOMPLETE: pre ${pre?.n ?? 0}, r3 ${r3?.n ?? 0} rows (need 20 each)`;
else if (pre.sig > 0) verdict = `pre shows the signature too (${pre.sig}/${pre.n}; r3 ${r3.sig}/${r3.n}) -> record the counts; a TD (data side: whole-block delete), stage two`;
else if (r3.sig >= 3) verdict = `STOP: pre 0/${pre.n}, r3 ${r3.sig}/${r3.n} -> report to Main_Designer, no automatic release`;
else verdict = `pre 0/${pre.n}, r3 ${r3.sig}/${r3.n} (below the stop line of 3) -> record`;
console.log(`\ndecision: ${verdict}`);
