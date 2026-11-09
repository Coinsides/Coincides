// A-20b batch 3 (Tester 11-09): SHIFTENTER-idle control spliced in from a20b_arms_add3.mjs; its analyzer rule goes BEFORE the
// SHIFTENTER- rule (first prefix match wins).
const fs = require('fs');
const f = 'a20n_arms.mjs'; let s = fs.readFileSync(f, 'utf8');
if (!s.includes('SHIFTENTER-idle')) {
  fs.writeFileSync('a20n_arms.v23-pre-batch3.mjs', s);
  const anchor = 'fs.writeFileSync(`${OUT}/summary.json`';
  if (s.split(anchor).length !== 2) throw new Error('arms anchor');
  s = s.replace(anchor, fs.readFileSync('a20b_arms_add3.mjs', 'utf8') + anchor);
  fs.writeFileSync(f, s); console.log('arms: batch 3 added');
} else console.log('arms: already');
const g = 'analyze-a20.mjs'; let t = fs.readFileSync(g, 'utf8');
if (!t.includes('"SHIFTENTER-idle"')) {
  fs.writeFileSync('analyze-a20.v-pre-batch3.mjs', t);
  const anchor = '  ["SHIFTENTER-", ';
  if (t.split(anchor).length !== 2) throw new Error('analyzer anchor');
  const rule = '  ["SHIFTENTER-idle", (r) => [true, `READING (control, nothing in flight): screen after Shift+Enter ${JSON.stringify(r.edsAfter)}; sealed by a click ${r.sealed}; server before the close ${(r.serverBefore || []).join(" , ")}; editor ${(r.edsBefore || []).join(" , ")}; after a reopen server ${(r.serverReopen || []).join(" , ")}; editor ${(r.edsReopen || []).join(" , ")}; saves ${(r.puts || []).join(" ; ")}`]],\n';
  t = t.replace(anchor, rule + anchor);
  fs.writeFileSync(g, t); console.log('analyzer: batch 3 rule added');
} else console.log('analyzer: already');
const m = t.match(/RULES\.find\([^)]*\)|for \(const \[p[^\n]{0,80}/); console.log('rule lookup:', m ? m[0] : 'not found');
