// SPLIT (check of the builder's manual line, r2.3c): "after the words land back the heading and the next text may stay
// in one block; the next time you edit in that block they split into two." Notes: the r2.3c X-addr notes that ended as
// [warmup] [H kept, body] (the accepted ②′ shape). Per note: open, click into one line of that block, type ' z' (or 'q'),
// leave the caret, wait, blur, wait; the server's blocks before / after, and after a full reopen. Where did the typed
// letters go (exactly once, at the line typed)? Did the block split?
//   SPLIT-body : type ' z' at the end of 'body'.
//   SPLIT-head : type 'q' at the end of the heading 'kept'.
const EDS19 = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,block:e.dataset.blockId||null,unit:e.dataset.textUnitId||null,x:r.left,y:r.top,h:r.height}})`;
const accRows = fs.readFileSync('runs/r23c-acc8x/rows.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const shapeOf = (r) => JSON.stringify((r.blocksAfter ?? r.blocks ?? []).map((x) => (Array.isArray(x) ? x : x.units)));
const cands = accRows.filter((r) => /^X-addr/.test(r.name) && shapeOf(r) === JSON.stringify([['warmup'], ['[heading_1]kept', 'body']])).map((r) => r.id);
console.log(`candidates ${cands.length}`);
const plan = [['SPLIT-body', cands[0], 'body', ' z'], ['SPLIT-body', cands[1], 'body', ' z'], ['SPLIT-head', cands[2], 'kept', 'q']];
for (let i = 0; i < plan.length; i += 1) {
  const [base, id, line, typed] = plan[i];
  const name = `${base}-${i}`;
  if (!id) continue;
  await scenario(name, async () => {
    const before = await blocksOf(id);
    await open(id); await sleep(3000);
    const eds0 = await b.ev(EDS19);
    const t = eds0.find((e) => e.v === line);
    if (!t) throw new Error(`setup: no line ${line}: ${JSON.stringify(eds0.map((e) => e.v))}`);
    await watch(); mark();
    await b.click(t.x + 120, t.y + Math.min(t.h, 24) / 2); await sleep(300);
    await press('End', 'End', 35); await sleep(150);
    await typeText(typed, 90);
    await sleep(4000); const live = await blocksOf(id); const edsLive = (await b.ev(EDS19)).map((e) => [e.v, e.block && e.block.slice(0, 8)]);
    await blurOutside(); await sleep(4000);
    const after = await blocksOf(id);
    await open(other); await sleep(1500); await open(id); await sleep(3000);
    const reopened = await blocksOf(id); const edsReopen = (await b.ev(EDS19)).map((e) => [e.v, e.block && e.block.slice(0, 8)]);
    const units = reopened.flat();
    const typedTrim = typed.trim();
    const hits = units.filter((u) => u.includes(typedTrim)).length;
    const want = line === 'body' ? `body${typed}` : `[heading_1]kept${typed}`;
    const placed = units.includes(want);
    const split = reopened.length === 3 && JSON.stringify(reopened[1]).includes('[heading_1]') && reopened[1].length === 1;
    row(name, id, { line, typed, before, live, edsLive, after, reopened, edsReopen, hits, placed, split, alerts: (await b.ev('window.__alerts||[]')) },
      hits === 1 && placed);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
