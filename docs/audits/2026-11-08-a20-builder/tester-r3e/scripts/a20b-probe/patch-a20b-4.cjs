// A-20b batch 4 (Tester 11-09, Main_Designer's probe before ruling SHIFTENTER): SHIFTENTER-typed-close + SHIFTENTER-idletyped from
// a20b_arms_add4.mjs; seShape is defined once, BEFORE the SHIFTENTER-close arm (which now also records its landed shape).
const fs = require('fs');
const f = 'a20n_arms.mjs'; let s = fs.readFileSync(f, 'utf8');
const add = fs.readFileSync('a20b_arms_add4.mjs', 'utf8');
const defStart = add.indexOf('const seShape = ');
const defEnd = add.indexOf('};', defStart) + 2;
if (defStart < 0 || defEnd < 2) throw new Error('seShape def not found');
const def = add.slice(defStart, defEnd);
const addNoDef = add.slice(0, defStart) + add.slice(defEnd);
if (s.includes('SHIFTENTER-typed')) { console.log('arms: already'); } else {
  fs.writeFileSync('a20n_arms.v24-pre-batch4.mjs', s);
  const rep = (a, b) => { const c = s.split(a).length - 1; if (c !== 1) throw new Error(`anchor x${c}: ${a.slice(0, 70)}`); s = s.replace(a, b); };
  rep("// SHIFTENTER-close-i (A-20b, Reviewer's third class", "// landed shape of a SHIFTENTER row (batch 4)\n" + def + "\n// SHIFTENTER-close-i (A-20b, Reviewer's third class");
  rep("row(name, id, { how: 'close', base, headLine, edsAfter, caret, keptBefore, r1, r2, at, qrKept, dupAbc,", "row(name, id, { how: 'close', base, headLine, edsAfter, caret, keptBefore, r1, r2, at, shape: { r1: seShape(r1, 'abc\\n'), r2: seShape(r2, 'abc\\n') }, qrKept, dupAbc,");
  rep('fs.writeFileSync(`${OUT}/summary.json`', addNoDef + 'fs.writeFileSync(`${OUT}/summary.json`');
  fs.writeFileSync(f, s); console.log('arms: batch 4 added');
}
const g = 'analyze-a20.mjs'; let t = fs.readFileSync(g, 'utf8');
if (t.includes('"SHIFTENTER-typed"')) { console.log('analyzer: already'); } else {
  fs.writeFileSync('analyze-a20.v-pre-batch4.mjs', t);
  const a1 = '  ["SHIFTENTER-", (r) => [r.ok === true, `newline ${r.at && r.at.r1}';
  if (t.split(a1).length !== 2) throw new Error('analyzer SHIFTENTER- anchor');
  t = t.replace(a1, '  ["SHIFTENTER-", (r) => [r.ok === true, `landed shape ${r.shape ? r.shape.r1 + "/" + r.shape.r2 : "n/a"}; newline ${r.at && r.at.r1}');
  const typedRule = '  ["SHIFTENTER-typed", (r) => [r.ok === true, `landed shape ${r.shape && r.shape.r1}/${r.shape && r.shape.r2} (ONE = one unit, SPLIT = two units); qr kept ${r.qrKept}; abc twice ${r.dupAbc}; screen at close ${JSON.stringify(r.edsAfter)}; kept before close ${JSON.stringify(r.keptBefore)}; reopen server ${JSON.stringify(r.r1 && r.r1.units)}, boxes ${JSON.stringify(r.r1 && r.r1.boxes)}, kept ${JSON.stringify(r.r1 && r.r1.kept)}, items ${JSON.stringify(r.r1 && r.r1.banners)}; +12 s server ${JSON.stringify(r.r2 && r.r2.units)}, editor ${JSON.stringify(r.r2 && r.r2.eds)}, boxes ${JSON.stringify(r.r2 && r.r2.boxes)}, kept ${JSON.stringify(r.r2 && r.r2.kept)}; saves ${JSON.stringify(r.puts)}`]],\n';
  const a2 = '  ["SHIFTENTER-idle", ';
  if (t.split(a2).length !== 2) throw new Error('analyzer SHIFTENTER-idle anchor');
  t = t.replace(a2, typedRule + a2);
  // the idle rule also prints the landed shape when the row has one (idletyped)
  t = t.replace('`READING (control, nothing in flight): screen after Shift+Enter', '`READING (control, nothing in flight)${r.shape ? " shape " + r.shape : ""}: screen after Shift+Enter');
  fs.writeFileSync(g, t); console.log('analyzer: batch 4 rules added');
}
