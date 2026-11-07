// S: the real-note shape built at a human pace, repeated, with the network and alerts recorded from the first key.
//    acc4 saw one note (RX-held-0, fixed build) whose last two lines were on screen but never saved, then gone on reload.
// Z: the kept box after the slow-reply address leave covers the anchor block's own line; what happens to keys the
//    person types where their line is, and to edits after closing the box.
const ONLY6 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want6 = (name) => !ONLY6 || ONLY6.some((p) => name.startsWith(p));
const BASE = ['alpha one', 'alpha two', 'alpha three', '[heading_1]Mid heading', 'beta one', 'beta two', 'beta three', '[heading_1]Second heading', 'gamma one', 'gamma two'];
const lines = async (ws) => { for (let i = 0; i < ws.length; i += 1) { if (i) { await enter(); await sleep(60); } await typeText(ws[i], 70); } };
const domUnits = () => b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.value)`);
const NS = Number(process.env.NS || 8);
for (let i = 0; i < NS; i += 1) {
  const name = `S-shape-${i}`;
  if (!want6(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R s shape ${i}`);
    await open(other); await sleep(1500); await goHash(id); await sleep(2500); await clickTaRetry(); await sleep(800);
    await watch(); mark();
    await lines(['alpha one', 'alpha two', 'alpha three']); await sleep(2500);
    await enter(); await sleep(800); await typeHash(); await typeText('Mid heading', 70); await sleep(3500); await enter(); await sleep(2500);
    await lines(['beta one', 'beta two', 'beta three']); await sleep(2500);
    await enter(); await sleep(800); await typeHash(); await typeText('Second heading', 70); await sleep(3500); await enter(); await sleep(2500);
    await lines(['gamma one', 'gamma two']); await sleep(3000);
    await blurOutside(); await sleep(3000);
    const dom = await domUnits(); const w = await win();
    let server = (await serverBlocks(id)).flatMap((x) => x.units);
    const firstMatch = JSON.stringify(server) === JSON.stringify(BASE);
    let later = null;
    if (!firstMatch) { await sleep(10000); later = (await serverBlocks(id)).flatMap((x) => x.units); await shot(`${name}-mismatch`); }
    await open(id); await sleep(4500);
    const reloaded = (await serverBlocks(id)).flatMap((x) => x.units); const domReloaded = await domUnits();
    row(name, id, { dom, server, later, reloaded, domReloaded, alerts: w.alerts, firstMatch }, JSON.stringify(reloaded) === JSON.stringify(BASE));
  });
}

const keptByAddressLeave = async (title) => {
  const id = await newNote(title);
  await arriveAndWarm(id);
  await watch(); mark();
  respRule = ({ u }) => (/unit-transfer/.test(u) ? { delay: 4000 } : null);
  await typeHash(); await typeText('kept'); await enter(); await sleep(40); await typeText('body', 50);
  await goHash(other);
  await sleep(6000);
  respRule = () => null;
  await goHash(id); await sleep(5000);
  return id;
};
const RECTS = `(()=>{const R=(e)=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top),left:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height)}};const box=document.querySelector('textarea[data-structure-typing-buffer]');const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({v:e.value,...R(e)}));const w=eds.find(e=>e.v.startsWith('warmup'));let hit=null;if(w){const el=document.elementFromPoint(w.left+20,w.top+Math.round(w.h/2));hit=el?(el.matches('textarea[data-structure-typing-buffer]')?'BOX':el.dataset?.runtimeTextflowEditor?'EDITOR:'+el.value:el.tagName+'.'+String(el.className).slice(0,30)):null}return {box:box?{v:box.value,ro:box.readOnly,...R(box)}:null,eds,warmupHit:hit}})()`;
for (let i = 0; i < 3; i += 1) {
  const name = `Z-coveredLine-${i}`;
  if (!want6(name)) continue;
  await scenario(name, async () => {
    const id = await keptByAddressLeave(`R z ${i}`);
    const r0 = await b.ev(RECTS); const w0 = await win(); await shot(`${name}-kept`);
    // As a person would: click where their 'warmup' line is, go to its end, type.
    const wEd = r0.eds.find((e) => e.v.startsWith('warmup'));
    let a1 = null; let afterTyping = null;
    if (wEd) {
      await b.click(wEd.left + 20, wEd.top + Math.round(wEd.h / 2)); await sleep(400);
      a1 = (await win()).active;
      await press('End', 'End', 35); await sleep(150); await typeText(' more', 90); await sleep(2500);
      afterTyping = await b.ev(RECTS);
    }
    const s1 = (await serverBlocks(id)).map((x) => x.units);
    // Close the box with its own button (round 1 "Close"; round 2 "Discard", inside the notice either way), then try again.
    const closeAt = await b.ev(`(()=>{const n=document.querySelector('[data-structure-typing-notice]');const btns=n?[...n.querySelectorAll('button')]:[];const btn=btns.find(x=>/close|discard/i.test(x.textContent||x.getAttribute('aria-label')||''))||btns[0];if(!btn)return null;const r=btn.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,label:(btn.textContent||'').trim()}})()`);
    if (closeAt) { await b.click(closeAt.x, closeAt.y); await sleep(1500); }
    const r2 = await b.ev(RECTS);
    const w2 = r2.eds.find((e) => e.v.startsWith('warmup'));
    let a2 = null;
    // +120, not +20: an active line has its block toolbar (with the trash button) over its first ~20 px (pre-existing).
    if (w2) { await b.click(w2.left + 120, w2.top + Math.round(w2.h / 2)); await sleep(400); a2 = (await win()).active; await press('End', 'End', 35); await sleep(150); await typeText(' after', 90); await sleep(3500); }
    const r3 = await b.ev(RECTS); const w3 = await win();
    await blurOutside(); await sleep(3000);
    const s3 = (await serverBlocks(id)).map((x) => x.units);
    await open(id); await sleep(4500);
    const reloaded = (await serverBlocks(id)).map((x) => x.units); lastStoredHere = await storedFor(id);
    const all = JSON.stringify(reloaded);
    row(name, id, { r0, alerts0: w0.alerts, clickedActive: a1, afterTyping, s1, closed: Boolean(closeAt), r2, a2, r3, alerts3: w3.alerts, s3, reloaded },
      all.includes('more') && all.includes('after'));
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
