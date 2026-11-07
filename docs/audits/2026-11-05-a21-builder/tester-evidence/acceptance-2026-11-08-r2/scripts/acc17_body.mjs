// r2.3b list (Main_Designer 2026-11-08), items 4 and 2 from the Tester's code read, on the r2.3 package.
//  FOLD (item 4): sidebar collapsed, viewport 1100x1000, a long note (40 lines in one block) scrolled to its middle, two
//        stored records with no anchor (seeded: real block id, unit ids that do not exist). Reopen. Do the two folded
//        notices overlap (all go to the top-right corner when nowhere is clear)? Then click the Discard of the FIRST
//        record's notice: which record is deleted? Deleting the other one = Henry's blocking class (3).
//  REUSE (item 2): a stored record {unit tu-3, role heading_1, initialText '', text 'Old'} on a block whose units are
//        tu-1, tu-2 (seeded, as a record left from before). Reopen: box with no anchor. The person then clicks the end of
//        'second', presses Enter (the new unit gets id tu-3), types '# New' while the structure's block create is held
//        12 s. Does 'Old' land in the person's new heading?
const ONLY17 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want17 = (name) => !ONLY17 || ONLY17.some((p) => name.startsWith(p));
const REP17 = Number(process.env.REP17 || 2);
const me17 = await (await fetch(`${API}/auth/me`, { headers: auth })).json();
const ACC17 = me17?.user?.id ?? me17?.id;
const EDS17 = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,block:e.dataset.blockId||null,unit:e.dataset.textUnitId||null,x:r.left,y:r.top,h:r.height}})`;
const seed = (id, recs) => b.ev(`localStorage.setItem(${JSON.stringify(`coincides:unplaced-words:${ACC17}:${id}`)}, ${JSON.stringify(JSON.stringify(recs))});1`);
const NOTICES = `[...document.querySelectorAll('[data-structure-typing-notice]')].map(n=>{const r=n.getBoundingClientRect();const box=n.closest('[data-structure-typing-entry]');return {entry:n.dataset.structureTypingEntry||(box&&box.dataset.structureTypingEntry)||null,top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),vis:r.width>0,text:(n.innerText||'').replace(/\\s+/g,' ').trim().slice(0,60)}})`;
const collapseSidebar = () => b.ev(`(()=>{const c=[...document.querySelectorAll('button,[role=button]')].find(x=>/collapse/i.test((x.getAttribute('aria-label')||'')+' '+(x.getAttribute('title')||''))&&x.getBoundingClientRect().width>0);if(!c)return null;const l=(c.getAttribute('aria-label')||c.getAttribute('title'));c.click();return l})()`);

for (let i = 0; i < REP17; i += 1) {
  const name = `FOLD-cornerDiscard-${i}`;
  if (!want17(name)) continue;
  await scenario(name, async () => {
    try {
      const id = await newNote(`R fold ${i}`); lastId = id;
      await arriveAndWarm(id);
      for (let k = 1; k <= 40; k += 1) { await typeText(`line ${k}`, 20); if (k < 40) { await enter(); await sleep(120); } }
      await sleep(2500); await blurOutside(); await sleep(3000);
      const eds = await b.ev(EDS17); const blk = eds[0] && eds[0].block;
      const recs = [{ id: 'seed-a', blockId: blk, unitId: 'tu-901', writingRole: 'heading_1', initialText: '', text: 'alpha one' },
        { id: 'seed-b', blockId: blk, unitId: 'tu-902', writingRole: 'heading_1', initialText: '', text: 'beta two' }];
      await seed(id, recs);
      const collapsed = await collapseSidebar(); await sleep(800);
      await b.cdp('Emulation.setDeviceMetricsOverride', { width: 1100, height: 1000, deviceScaleFactor: 1, mobile: false }); await sleep(800);
      await open(id); await sleep(5000);
      await b.wheel(700, 600, 600); await sleep(1500);
      const g = await b.ev(GEO); const ns = await b.ev(NOTICES); const bx = await boxes(); const stored0 = await storedFor(id);
      await shot(`${name}-folded`);
      const visN = ns.filter((n) => n.vis);
      let overlap = null;
      for (let a = 0; a < visN.length; a += 1) for (let c = a + 1; c < visN.length; c += 1) {
        const x = Math.min(visN[a].right, visN[c].right) - Math.max(visN[a].left, visN[c].left);
        const y = Math.min(visN[a].bottom, visN[c].bottom) - Math.max(visN[a].top, visN[c].top);
        if (x > 2 && y > 2) overlap = { a: visN[a].entry, c: visN[c].entry, x, y };
      }
      // Discard on the notice of seed-a, located by its entry tag (what a person sees as the 'alpha one' notice).
      const at = await b.ev(`(()=>{const ns=[...document.querySelectorAll('[data-structure-typing-notice]')];const n=ns.find(x=>(x.dataset.structureTypingEntry||x.closest('[data-structure-typing-entry]')?.dataset.structureTypingEntry)==='seed-a');if(!n)return {found:false,entries:ns.map(x=>x.dataset.structureTypingEntry||null)};const btn=[...n.querySelectorAll('button')].find(x=>/discard/i.test(x.textContent||''));if(!btn)return {found:false};const r=btn.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);const hitN=hit&&hit.closest('[data-structure-typing-notice]');return {found:true,x:r.x+r.width/2,y:r.y+r.height/2,hitEntry:hitN?(hitN.dataset.structureTypingEntry||hitN.closest('[data-structure-typing-entry]')?.dataset.structureTypingEntry||null):null}})()`);
      if (at && at.found) { await b.click(at.x, at.y); await sleep(1500); }
      const stored1 = await storedFor(id); const ns1 = await b.ev(NOTICES); await shot(`${name}-afterDiscard`);
      const has = (st, w) => JSON.stringify(st).includes(w);
      const deleted = has(stored0, 'alpha') && !has(stored1, 'alpha') && has(stored1, 'beta') ? 'alpha (right one)'
        : has(stored0, 'beta') && !has(stored1, 'beta') && has(stored1, 'alpha') ? 'BETA (WRONG ONE)'
          : !has(stored1, 'alpha') && !has(stored1, 'beta') ? 'BOTH' : 'none';
      lastStoredHere = stored1;
      const precondition = visN.length >= 2;
      row(name, id, { collapsed, eds: eds.length, notices: ns, boxes: bx, g, overlap, at, stored0, stored1, notices1: ns1, deleted, precondition,
        void: precondition ? null : 'fewer than two notices on screen' },
      !precondition || deleted === 'alpha (right one)');
    } finally {
      await b.cdp('Emulation.clearDeviceMetricsOverride').catch(() => {});
      await collapseSidebar().catch(() => {});
    }
  });
}

for (let i = 0; i < REP17; i += 1) {
  const name = `REUSE-oldRecordNewHeading-${i}`;
  if (!want17(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R reuse ${i}`); lastId = id;
    await arriveAndWarm(id);
    await typeText('second', 60); await sleep(2500); await blurOutside(); await sleep(3000);
    const eds = await b.ev(EDS17); const w = eds.find((e) => e.v === 'warmup'); const s = eds.find((e) => e.v === 'second');
    if (!w || !s || w.block !== s.block) throw new Error(`setup: ${JSON.stringify(eds.map((e) => [e.v, e.block, e.unit]))}`);
    const next = `tu-${Math.max(...eds.filter((e) => e.block === w.block).map((e) => Number(String(e.unit).replace('tu-', '')))) + 1}`;
    await seed(id, [{ id: 'seed-old', blockId: w.block, unitId: next, writingRole: 'heading_1', initialText: '', text: 'Old' }]);
    await open(id); await sleep(5000);
    const bx0 = await boxes();
    await watch(); mark();
    let heldCreate = false;
    rule = ({ m, u }) => { if (!heldCreate && m === 'POST' && /\/notes\/:id\/blocks$/.test(u)) { heldCreate = true; return 'hold'; } return 'continue'; };
    const s2 = (await b.ev(EDS17)).find((e) => e.v === 'second');
    await b.click(s2.x + 120, s2.y + Math.min(s2.h, 24) / 2); await sleep(300); await press('End', 'End', 35); await sleep(200);
    await enter(); await sleep(1500);
    const edsNew = await b.ev(EDS17);
    await typeHash(); await typeText('New', 90);
    await sleep(12000); rule = () => 'continue'; await release(); await sleep(6000);
    const after = await win(); const bx1 = await boxes();
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    await open(id); await sleep(4500);
    const bx2 = await boxes(); const blocks2 = await blocksOf(id); const stored2 = await storedFor(id); await shot(`${name}-reopened`);
    const units = blocks2.flat().map(strip);
    const oldInNote = units.some((u) => u.includes('Old'));
    const newSomewhere = units.some((u) => u.includes('New')) || bx2.some((x) => x.v.includes('New')) || JSON.stringify(stored2).includes('New');
    const oldKept = bx2.some((x) => x.v.includes('Old')) || JSON.stringify(stored2).includes('Old');
    row(name, id, { reusedId: next, newUnitIds: edsNew.map((e) => [e.v, e.unit]), bx0, heldCreate, after, bx1, blocks, blocks2, bx2, stored2, oldInNote, oldKept, newSomewhere },
      !oldInNote && oldKept && newSomewhere);
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
