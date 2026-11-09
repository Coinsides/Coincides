// A-20b batch 5 (Tester 11-09): WINDOWENTER-land from a20b_arms_add5.mjs + its analyzer rule.
const fs = require('fs');
const f = 'a20n_arms.mjs'; let s = fs.readFileSync(f, 'utf8');
if (s.includes('WINDOWENTER-land')) console.log('arms: already'); else {
  fs.writeFileSync('a20n_arms.v25-pre-batch5.mjs', s);
  const anchor = 'fs.writeFileSync(`${OUT}/summary.json`';
  if (s.split(anchor).length !== 2) throw new Error('arms anchor');
  s = s.replace(anchor, fs.readFileSync('a20b_arms_add5.mjs', 'utf8') + anchor);
  fs.writeFileSync(f, s); console.log('arms: batch 5 added');
}
const g = 'analyze-a20.mjs'; let t = fs.readFileSync(g, 'utf8');
if (t.includes('"WINDOWENTER-"')) console.log('analyzer: already'); else {
  fs.writeFileSync('analyze-a20.v-pre-batch5.mjs', t);
  const anchor = '  ["SHIFTENTER-typed", ';
  if (t.split(anchor).length !== 2) throw new Error('analyzer anchor');
  const rule = '  ["WINDOWENTER-", (r) => [r.ok === true, `landed shape ${r.shape} (SPLIT expected: a window record); kept x${r.nK}, body x${r.nB}; box at return ${JSON.stringify(r.boxAtReturn)}, kept records ${JSON.stringify(r.keptAtReturn)}; box gone after ${r.landedAt} ms; server blocks ${JSON.stringify(r.rawBlocks)}; editor ${JSON.stringify(r.eds)}; box at end ${JSON.stringify(r.boxEnd)}; screen while typing ${JSON.stringify(r.edsTyped)}`]],\n';
  t = t.replace(anchor, rule + anchor);
  fs.writeFileSync(g, t); console.log('analyzer: batch 5 rule added');
}
