// A-20b arms (Tester 11-09): ADDR-noncanon-bare / bareslash / bareaddr ('#notes/<id>' without the leading slash, Q4) and the
// MULTIPASTE-close / LISTPASTE-close arms (Q2 / Q3) spliced in from a20b_arms_add.mjs; analyzer rules for the new arms.
const fs = require('fs');
const f = 'a20n_arms.mjs'; let s = fs.readFileSync(f, 'utf8');
if (s.includes("'bareslash'")) throw new Error('already');
fs.writeFileSync('a20n_arms.v21-r3e-formal.mjs', s);
const rep = (a, b) => { const c = s.split(a).length - 1; if (c !== 1) throw new Error(`anchor x${c}: ${a.slice(0, 70)}`); s = s.replace(a, b); };
rep("['ADDR-noncanon', 'caseslash'], ['BACKIN', 'heldback']", "['ADDR-noncanon', 'caseslash'], ['ADDR-noncanon', 'bare'], ['ADDR-noncanon', 'bareslash'], ['ADDR-noncanon', 'bareaddr'], ['BACKIN', 'heldback']");
rep("const HASHISH = (m) => m === 'hash' || m === 'addr' || m === 'case' || m === 'caseaddr' || m === 'caseslash';", "const HASHISH = (m) => m === 'hash' || m === 'addr' || m === 'case' || m === 'caseaddr' || m === 'caseslash' || m === 'bare' || m === 'bareslash' || m === 'bareaddr';");
rep("    else if (mode === 'caseslash') await b.ev(`location.hash='#/NOTES/${id}/';1`);", "    else if (mode === 'caseslash') await b.ev(`location.hash='#/NOTES/${id}/';1`);\n    else if (mode === 'bare') await b.ev(`location.hash='#notes/${id}';1`);\n    else if (mode === 'bareslash') await b.ev(`location.hash='#notes/${id}/';1`);");
rep("    else if (mode === 'caseaddr') { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/Notes/${id}`) }); }", "    else if (mode === 'caseaddr') { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/Notes/${id}`) }); }\n    else if (mode === 'bareaddr') { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#notes/${id}`) }); }");
const add = fs.readFileSync('a20b_arms_add.mjs', 'utf8');
rep("fs.writeFileSync(`${OUT}/summary.json`", add + "fs.writeFileSync(`${OUT}/summary.json`");
fs.writeFileSync(f, s);

const g = 'analyze-a20.mjs'; let t = fs.readFileSync(g, 'utf8');
fs.writeFileSync('analyze-a20.v-pre-a20b.mjs', t);
const a = '["hash","addr","case","caseaddr","caseslash"].includes(r.mode)';
if (t.split(a).length !== 4) throw new Error(`analyzer mode list x${t.split(a).length - 1}`);
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
