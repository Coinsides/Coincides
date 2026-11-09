const fs = require('fs');
const g = 'analyze-a20.mjs'; let t = fs.readFileSync(g, 'utf8');
fs.writeFileSync('analyze-a20.v-pre-a20b.mjs', t);
const a = '["hash","addr","case","caseaddr","caseslash"].includes(r.mode)';
if (t.split(a).length !== 3) throw new Error(`analyzer mode list x${t.split(a).length - 1}`);
t = t.split(a).join('["hash","addr","case","caseaddr","caseslash","bare","bareslash","bareaddr"].includes(r.mode)');
const lab = '(r.mode === "caseslash" ? "#/NOTES/A/" : String(r.mode).startsWith("case") ? "#/Notes/A" : "#/notes/A/")';
if (t.split(lab).length !== 2) throw new Error(`analyzer label x${t.split(lab).length - 1}`);
t = t.replace(lab, '(r.mode === "bareslash" ? "#notes/A/" : String(r.mode).startsWith("bare") ? "#notes/A" : r.mode === "caseslash" ? "#/NOTES/A/" : String(r.mode).startsWith("case") ? "#/Notes/A" : "#/notes/A/")');
const anchor = '  // MENTER (Main_Designer 11-09, Reviewer P2)';
if (t.split(anchor).length !== 2) throw new Error('analyzer MENTER anchor');
const reopenR = 'reopen server ${JSON.stringify(r.r1 && r.r1.units)}, editor ${JSON.stringify(r.r1 && r.r1.eds9)}, boxes ${JSON.stringify(r.r1 && r.r1.boxes)} / ${JSON.stringify(r.r1 && r.r1.boxes9)}, kept ${JSON.stringify(r.r1 && r.r1.kept)}, items ${JSON.stringify(r.r1 && r.r1.banners)} (Apply ${r.r1 && r.r1.apply}); +12 s server ${JSON.stringify(r.r2 && r.r2.units)}, editor ${JSON.stringify(r.r2 && r.r2.eds)}, boxes ${JSON.stringify(r.r2 && r.r2.boxes)}, kept ${JSON.stringify(r.r2 && r.r2.kept)}, items ${JSON.stringify(r.r2 && r.r2.banners)}; notices at reopen ${hcN(r.r1 && r.r1.toasts)}; saves ${JSON.stringify(r.puts)}';
const rules = [
  '  // A-20b (Tester 11-09): Q2 MULTIPASTE (X = XQ, Y = YQ) and Q3 LISTPASTE (item); where = first read / +12 s read.',
  '  ["MULTIPASTE-", (r) => [r.ok === true, `XQ ${r.xAt && r.xAt.r1}/${r.xAt && r.xAt.r2}, YQ ${r.yAt && r.yAt.r1}/${r.yAt && r.yAt.r2}, def ${r.defAt && r.defAt.r1}/${r.defAt && r.defAt.r2} (in a box ${r.defBoxed}); on the server twice ${JSON.stringify(r.dupTok)}; qr kept ${r.qrKept}; paste ${JSON.stringify(r.pasted)}; screen at close ${JSON.stringify(r.edsPasted)}; kept before close ${JSON.stringify(r.keptBefore)}; ' + reopenR + '`]],',
  '  ["LISTPASTE-", (r) => [r.ok === true, `item ${r.itemAt && r.itemAt.r1}/${r.itemAt && r.itemAt.r2}; on the server twice ${r.dupItem}; warmup kept ${r.warmKept}; same line count ${r.linesSame} (${JSON.stringify(r.edsBefore)} -> ${JSON.stringify(r.edsPasted)}); paste ${JSON.stringify(r.pasted)}; kept before close ${JSON.stringify(r.keptBefore)}; ' + reopenR + '`]],',
].join('\n') + '\n';
t = t.replace(anchor, rules + anchor);
fs.writeFileSync(g, t);
console.log('a20b arms + analyzer rules added');
