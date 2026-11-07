// Real note shape (order: E/F/J on a note with several blocks, several paragraphs each, headings between body text).
// Built by typing at a human pace: A[alpha one|alpha two|alpha three] H[Mid heading] B[beta one|beta two|beta three]
// H[Second heading] C[gamma one|gamma two]. Unit ids restart per block, so tu-2 and tu-3 exist in several blocks:
// the shape where "find the unit by id across the page" would write into the wrong block.
// Every row checks the target AND that no other line of the note changed (category 3 = lost, duplicated, misplaced,
// or another block touched).
const BASE = ['alpha one', 'alpha two', 'alpha three', '[heading_1]Mid heading', 'beta one', 'beta two', 'beta three', '[heading_1]Second heading', 'gamma one', 'gamma two'];
const ONLY4 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want4 = (name) => !ONLY4 || ONLY4.some((p) => name.startsWith(p));
const lines = async (ws) => { for (let i = 0; i < ws.length; i += 1) { if (i) { await enter(); await sleep(60); } await typeText(ws[i], 70); } };
const editorOf = async (text) => { const s = await state(); return s.tas.find((t) => t.v === text) || null; };
const lineAt = async (text, where) => {
  // Click the editor that shows exactly this line, then put the caret at its start or end.
  for (let k = 0; k < 4; k += 1) { const t = await editorOf(text); if (t) { await b.click(t.x + 120, t.y); await sleep(300); await press(where === 'start' ? 'Home' : 'End', where === 'start' ? 'Home' : 'End', where === 'start' ? 36 : 35); await sleep(200); return t; } await sleep(1000); }
  throw new Error(`no editor showing ${text}`);
};
const shape = async (title) => {
  const id = await newNote(title);
  await arriveAndWarmNoWarm(id);
  await lines(['alpha one', 'alpha two', 'alpha three']); await sleep(2500);
  await enter(); await sleep(800); await typeHash(); await typeText('Mid heading', 70); await sleep(3500); await enter(); await sleep(2500);
  await lines(['beta one', 'beta two', 'beta three']); await sleep(2500);
  await enter(); await sleep(800); await typeHash(); await typeText('Second heading', 70); await sleep(3500); await enter(); await sleep(2500);
  await lines(['gamma one', 'gamma two']); await sleep(3000);
  await blurOutside(); await sleep(3000);
  const sb = await serverBlocks(id);
  const flatUnits = sb.flatMap((x) => x.units);
  return { id, shapeOk: JSON.stringify(flatUnits) === JSON.stringify(BASE), shapeBlocks: sb.map((x) => ({ units: x.units, ids: x.ids })) };
};
async function arriveAndWarmNoWarm(id) { await open(other); await sleep(1500); await goHash(id); await sleep(2500); await clickTaRetry(); await sleep(800); }
// Compare the note after the scenario with BASE plus the expected change. Returns the category and what differs.
const splitNl = (units) => units.flatMap((u) => { const m = u.match(/^(\[[a-z_0-9]+\])?([\s\S]*)$/); return m[2].split(String.fromCharCode(10)).map((t, k) => `${k === 0 && m[1] ? m[1] : ''}${t}`); });
const judge = (rawUnits, expectedUnits, keptText, words) => {
  const units = splitNl(rawUnits);
  const exact = JSON.stringify(units) === JSON.stringify(expectedUnits);
  const untouched = BASE.filter((u) => !expectedUnits.includes(u) ? false : true);
  const missingBase = BASE.filter((u) => expectedUnits.includes(u) && !units.includes(u));
  const all = JSON.stringify(units);
  const wordsInNote = words.every((w) => all.includes(w));
  const wordsKept = words.every((w) => all.includes(w) || keptText.includes(w));
  const dup = words.some((w) => all.split(w).length - 1 > 1 || (all.includes(w) && keptText.includes(w)));
  if (exact) return { cls: '1', exact };
  if (missingBase.length || dup) return { cls: '3', exact, missingBase, dup };
  if (wordsInNote) return { cls: '3?', exact, note: 'words in the note but not in the expected place' };
  if (wordsKept) return { cls: '2', exact };
  return { cls: '3', exact, note: 'words neither in the note nor kept', untouched: untouched.length };
};
const finishReal = async (name, id, expectedUnits, words, extra, okFn) => {
  await blurOutside(); await sleep(2500);
  const blocksNow = await serverBlocks(id);
  await open(id); await sleep(4000);
  const reopened = await win(); lastStoredHere = await storedFor(id);
  const sb = await serverBlocks(id); const units = sb.flatMap((x) => x.units);
  const keptText = (reopened.buf || '') + JSON.stringify(lastStoredHere);
  const j = judge(units, expectedUnits, keptText, words);
  await shot(`${name}-reopened`);
  const merged = units.filter((u) => u.includes(String.fromCharCode(10))).length;
  const ok = okFn ? okFn(splitNl(units), j) : (j.cls === '1' || j.cls === '2');
  row(name, id, { ...extra, blocksNow: blocksNow.map((x) => x.units), blocks: sb.map((x) => ({ units: x.units, ids: x.ids })), reopened, expectedUnits, merged, ...j }, ok);
};
const REP = Number(process.env.REP4 || 2);

// RE. E on the real shape: '# big ' typed at the start of a middle paragraph, every text-save held 12 s.
for (const [line, tag] of [['beta two', 'beta'], ['alpha two', 'alpha']]) for (let i = 0; i < (tag === 'beta' ? REP : 1); i += 1) {
  const name = `RE-${tag}-${i}`;
  if (!want4(name)) continue;
  await scenario(name, async () => {
    const { id, shapeOk, shapeBlocks } = await shape(`R real E ${tag} ${i}`);
    await lineAt(line, 'start');
    await watch(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    await typeHash(); await typeText('big ');
    await sleep(400); const during = await win();
    await sleep(12000); const s12 = await win(); await shot(`${name}-held`);
    rule = () => 'continue'; await release();
    await sleep(5000); const after = await win();
    const exp = BASE.map((u) => (u === line ? `[heading_1]big ${line}` : u));
    await finishReal(name, id, exp, ['big'], { shapeOk, shapeBlocks, during, s12, after });
  });
}

// RF. F on the real shape: caret at the start of 'gamma two' (tu-2 also exists in A and B), every request held while
// '# xy' is typed; where is the words box, and where do the words land.
for (let i = 0; i < REP; i += 1) {
  const name = `RF-gamma-${i}`;
  if (!want4(name)) continue;
  await scenario(name, async () => {
    const { id, shapeOk, shapeBlocks } = await shape(`R real F ${i}`);
    const target = await lineAt('gamma two', 'start');
    await watch(); mark();
    rule = () => 'hold';
    await typeHash(); await typeText('xy'); await sleep(500);
    const rects = await b.ev(`(()=>{const R=(e)=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top),left:Math.round(r.left),h:Math.round(r.height)}};const box=document.querySelector('textarea[data-structure-typing-buffer]');const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({unit:e.dataset.textUnitId,v:e.value,...R(e)}));return {box:box?{v:box.value,...R(box)}:null,eds}})()`);
    await shot(`${name}-window`);
    rule = () => 'continue'; await release();
    await sleep(5000);
    const boxTop = rects.box ? rects.box.top : null;
    const sameRow = rects.box ? rects.eds.filter((e) => Math.abs(e.top - rects.box.top) <= 4).map((e) => e.v) : [];
    const exp = BASE.map((u) => (u === 'gamma two' ? '[heading_1]xygamma two' : u));
    await finishReal(name, id, exp, ['xy'], { shapeOk, shapeBlocks, rects, boxTop, targetTop: target.y, sameRow, boxOverTarget: sameRow.some((v) => /gamma two/.test(v)) });
  });
}

// RJ. J on the real shape: a new empty line after a middle or the last paragraph, '/', Enter on "Text", then 'zz'.
for (const [line, tag] of [['gamma two', 'gamma'], ['beta three', 'beta']]) for (let i = 0; i < (tag === 'gamma' ? REP : 1); i += 1) {
  const name = `RJ-${tag}-${i}`;
  if (!want4(name)) continue;
  await scenario(name, async () => {
    const { id, shapeOk, shapeBlocks } = await shape(`R real J ${tag} ${i}`);
    await lineAt(line, 'end');
    await enter(); await sleep(800);
    await key('/', 'Slash', 191, '/'); await sleep(700);
    const menu = await b.ev(`[...document.querySelectorAll('[role=listbox],[role=menu],[class*=lash]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.innerText.replace(/\\s+/g,' ').slice(0,80)).slice(0,2)`);
    await enter(); await sleep(2500);
    const afterText = await b.ev(`(()=>{const a=document.activeElement;return {tag:a?.tagName,editor:Boolean(a?.dataset?.runtimeTextflowEditor),value:a?.value!==undefined?a.value.slice(0,60):null}})()`);
    await typeText('zz', 120); await sleep(2500);
    const idx = BASE.indexOf(line);
    const exp = [...BASE.slice(0, idx + 1), 'zz', ...BASE.slice(idx + 1)];
    const keepAB = BASE.filter((u) => !u.startsWith('gamma') || tag === 'beta');
    await finishReal(name, id, exp, ['zz'], { shapeOk, shapeBlocks, menu, afterText, caretBack: afterText.editor === true },
      (units) => afterText.editor === true && units.filter((u) => u.includes('zz')).length === 1 && keepAB.every((u) => units.filter((x) => x === u || x === `zz${u}` || x === `${u}zz`).length === 1));
  });
}

// RI. I on the real shape: a new line after 'beta three' (its id exists in no other block yet... the new line's id
// is tu-4 in B; A has tu-1..3, C tu-1..2), '# kept' typed while the unit transfer is held past the watchdog.
for (let i = 0; i < REP; i += 1) {
  const name = `RI-beta-${i}`;
  if (!want4(name)) continue;
  await scenario(name, async () => {
    const { id, shapeOk, shapeBlocks } = await shape(`R real I ${i}`);
    await lineAt('alpha three', 'end'); await enter(); await sleep(60); await typeText('alpha four', 70); await sleep(3000);
    await lineAt('beta three', 'end'); await enter(); await sleep(2500);
    await watch(); mark();
    rule = ({ u }) => (/unit-transfer/.test(u) ? 'hold' : 'continue');
    await typeHash(); await typeText('kept');
    await sleep(12500); const s12 = await win(); await shot(`${name}-held`);
    rule = () => 'continue'; await release();
    await sleep(5000); const after = await win();
    const base2 = [...BASE.slice(0, 3), 'alpha four', ...BASE.slice(3)];
    const bi = base2.indexOf('beta three');
    const exp = [...base2.slice(0, bi + 1), '[heading_1]kept', ...base2.slice(bi + 1)];
    await finishReal(name, id, exp, ['kept'], { shapeOk, shapeBlocks, s12, after, wrongBlock: false });
  });
}

// RX. The leaves on the real shape: after 'beta three', Enter, '# kept', Enter, 'body', then leave.
// addr = address change to the other note at once; held = unit transfer held until after an in-app tab click.
for (const [variant, reps] of [['addr', 3], ['held', 2]]) for (let i = 0; i < reps; i += 1) {
  const name = `RX-${variant}-${i}`;
  if (!want4(name)) continue;
  await scenario(name, async () => {
    const { id, shapeOk, shapeBlocks } = await shape(`R real X ${variant} ${i}`);
    await lineAt('beta three', 'end'); await enter(); await sleep(2500);
    await watch(); await traceOn(); mark();
    if (variant === 'held') rule = ({ u }) => (/unit-transfer/.test(u) ? 'hold' : 'continue');
    await typeHash(); await typeText('kept'); await enter(); await sleep(40); await typeText('body', 50);
    if (variant === 'addr') await goHash(other);
    else { await sleep(150); const c = await tabAt('R other'); if (c) await b.click(c.x, c.y); await sleep(800); rule = () => 'continue'; await release(); }
    await sleep(6000);
    const away = await win(); const tr = await traceGet().catch(() => null);
    await goHash(id); await sleep(5000);
    const back = await win(); await shot(`${name}-back`);
    const bi = BASE.indexOf('beta three');
    const exp = [...BASE.slice(0, bi + 1), '[heading_1]kept', 'body', ...BASE.slice(bi + 1)];
    await finishReal(name, id, exp, ['kept', 'body'], { shapeOk, shapeBlocks, away, tr, back });
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
