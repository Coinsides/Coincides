// LANDFAIL3-reopen (r2.3c): the two LANDFAIL3 notes ended with the kept words saved in the note ('warmup|H:head|body',
// one block) while this note's stored record ('head\nbody') was still in the browser. No faults now. Reopen each note
// twice (via another note) and read: blocks on the server, the stored record, boxes, alerts. Do the words appear twice?
// Then type 'jkl' at the end of 'warmup': does typing work again?
const EDS21 = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,h:r.height}})`;
const SEEN21 = `(()=>{const vis=(e)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};return [...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast]')].filter(vis).map(x=>x.innerText.replace(/\\s+/g,' ').slice(0,120)).filter(Boolean)})()`;
const lf3 = fs.readFileSync('runs/r23c-landfail3/rows.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
for (let i = 0; i < lf3.length; i += 1) {
  const id = lf3[i].id;
  const name = `LANDFAIL3-reopen-${i}`;
  await scenario(name, async () => {
    const before = await blocksOf(id); const stored0 = await storedFor(id);
    const passes = [];
    for (let k = 0; k < 2; k += 1) {
      await open(other); await sleep(1500); await open(id); await sleep(5000);
      passes.push({ blocks: await blocksOf(id), stored: await storedFor(id), boxes: await boxes(), eds: (await b.ev(EDS21)).map((e) => e.v), seen: await b.ev(SEEN21) });
    }
    const w = (await b.ev(EDS21)).find((e) => e.v.startsWith('warmup'));
    if (w) { await b.click(w.x + 120, w.y + Math.min(w.h, 24) / 2); await sleep(250); await press('End', 'End', 35); await typeText('jkl', 120); await sleep(1500); }
    const typedLine = ((await b.ev(EDS21)).find((e) => e.v.startsWith('warmup')) || {}).v ?? null;
    const seenTyping = await b.ev(SEEN21);
    await blurOutside(); await sleep(4000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    const units = blocks.flat();
    const headN = units.filter((u) => /head/.test(u)).length; const bodyN = units.filter((u) => /body/.test(u)).length;
    row(name, id, { before, stored0, passes, typedLine, seenTyping, blocks, headN, bodyN }, headN === 1 && bodyN === 1);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
