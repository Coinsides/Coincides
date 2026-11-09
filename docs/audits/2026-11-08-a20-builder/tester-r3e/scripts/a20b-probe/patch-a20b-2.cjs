// A-20b arms, second batch (Tester 11-09): SHIFTENTER-close and SURROGATE-paste-close spliced in from a20b_arms_add2.mjs,
// analyzer rules for them. Arms first, analyzer second; each file backed up before it is written.
const fs = require('fs');
const f = 'a20n_arms.mjs'; let s = fs.readFileSync(f, 'utf8');
if (!s.includes('SHIFTENTER-close')) {
  fs.writeFileSync('a20n_arms.v22-pre-batch2.mjs', s);
  const anchor = 'fs.writeFileSync(`${OUT}/summary.json`';
  if (s.split(anchor).length !== 2) throw new Error('arms anchor');
  s = s.replace(anchor, fs.readFileSync('a20b_arms_add2.mjs', 'utf8') + anchor);
  fs.writeFileSync(f, s); console.log('arms: batch 2 added');
} else console.log('arms: already');
const g = 'analyze-a20.mjs'; let t = fs.readFileSync(g, 'utf8');
if (!t.includes('"SHIFTENTER-"')) {
  fs.writeFileSync('analyze-a20.v-pre-batch2.mjs', t);
  const anchor = '  // MENTER (Main_Designer 11-09, Reviewer P2)';
  if (t.split(anchor).length !== 2) throw new Error('analyzer anchor');
  const reopenR = 'reopen server ${JSON.stringify(r.r1 && r.r1.units)}, boxes ${JSON.stringify(r.r1 && r.r1.boxes)} / ${JSON.stringify(r.r1 && r.r1.boxes9)}, kept ${JSON.stringify(r.r1 && r.r1.kept)}, items ${JSON.stringify(r.r1 && r.r1.banners)} (Apply ${r.r1 && r.r1.apply}); +12 s server ${JSON.stringify(r.r2 && r.r2.units)}, editor ${JSON.stringify(r.r2 && r.r2.eds)}, boxes ${JSON.stringify(r.r2 && r.r2.boxes)}, kept ${JSON.stringify(r.r2 && r.r2.kept)}, items ${JSON.stringify(r.r2 && r.r2.banners)}; notices at reopen ${hcN(r.r1 && r.r1.toasts)}; saves ${JSON.stringify(r.puts)}';
  const rules = [
    '  // A-20b batch 2 (Tester 11-09): SHIFTENTER (newline at the end of abc) and SURROGATE (😁 pasted at abc|😀def).',
    '  ["SHIFTENTER-", (r) => [r.ok === true, `newline ${r.at && r.at.r1}/${r.at && r.at.r2}; qr kept ${r.qrKept}; abc twice ${r.dupAbc}; screen at close ${JSON.stringify(r.edsAfter)}; kept before close ${JSON.stringify(r.keptBefore)}; ' + reopenR + '`]],',
    '  ["SURROGATE-", (r) => [r.ok === true, `broken units ${r.badWhere ? r.badWhere.length : "n/a"} ${JSON.stringify(r.badWhere)}; 😁 ${r.grinAt && r.grinAt.r1}/${r.grinAt && r.grinAt.r2}, YQ ${r.yAt && r.yAt.r1}/${r.yAt && r.yAt.r2}, 😀 kept ${r.smileKept}, qr kept ${r.qrKept}; line 1 r1 ${JSON.stringify(r.line1 && r.line1.r1)} [${r.line1 && r.line1.r1cp}], +12 s ${JSON.stringify(r.line1 && r.line1.r2)} [${r.line1 && r.line1.r2cp}]; screen at close ${JSON.stringify(r.edsPasted)}; kept before close ${JSON.stringify(r.keptBefore)}; ' + reopenR + '`]],',
  ].join('\n') + '\n';
  t = t.replace(anchor, rules + anchor);
  fs.writeFileSync(g, t); console.log('analyzer: batch 2 rules added');
} else console.log('analyzer: already');
