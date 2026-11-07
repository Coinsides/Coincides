// RETRY-SCHEDULE (r2.3c on the island, after the 21st deploy): LANDFAIL3 showed one retry of the failed landing save
// ~25 s after the failure. What if that retry fails too? Box kept by a failed block-create; reopen with every text-save
// answered 500 for HOLD ms (default 70 s), then saves work. Record every text-save attempt (time, status), whether
// typing on 'warmup' is accepted at a few points, the notices on screen, and where the kept words end up.
const HOLD22 = Number(process.env.HOLD || 70000);
const EDS22 = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,h:r.height}})`;
const SEEN22 = `(()=>{const vis=(e)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};return [...new Set([...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast]')].filter(vis).map(x=>x.innerText.replace(/\\s+/g,' ').slice(0,90)).filter(Boolean))]})()`;
const keptByCreateFail22 = async () => {
  let failed = false;
  rule = ({ m, u }) => { if (!failed && m === 'POST' && /\/notes\/:id\/blocks$/.test(u)) { failed = true; return '500'; } return 'continue'; };
  await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 50);
  await sleep(14000); rule = () => 'continue';
  return failed;
};
const warm22 = async () => (await b.ev(EDS22)).find((e) => e.v.startsWith('warmup')) || null;
const probeType = async (c) => { const w = await warm22(); if (!w) return null; await b.click(w.x + 120, w.y + Math.min(w.h, 24) / 2); await sleep(200); await press('End', 'End', 35); await typeText(c, 100); await sleep(600); const w2 = await warm22(); return w2 ? w2.v : null; };
for (let i = 0; i < Number(process.env.REP22 || 1); i += 1) {
  const name = `RETRY-schedule-${HOLD22 / 1000}s-${i}`;
  await scenario(name, async () => {
    const id = await newNote(`R retry schedule ${i}`); lastId = id;
    await arriveAndWarm(id);
    const failed = await keptByCreateFail22();
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await watch(); mark();
    const tOpen = Date.now();
    await open(id);
    const samples = [];
    // Sample every ~10 s while saves fail, then every ~5 s for 40 s after they work again.
    let lifted = null;
    while (Date.now() - tOpen < HOLD22 + 40000) {
      const t = Date.now() - tOpen;
      if (lifted === null && t >= HOLD22) { rule = () => 'continue'; lifted = t; }
      const before = (await warm22())?.v ?? null;
      const after = await probeType('x');
      samples.push({ t, lifted: lifted !== null, accepted: before !== null && after !== null && after.length > before.length, line: after, seen: await b.ev(SEEN22) });
      await sleep(lifted === null ? 9000 : 4000);
    }
    const saves = net.filter((l) => /text-save/.test(l)).map((l) => String(l).slice(0, 100));
    await blurOutside(); await sleep(4000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    row(name, id, { failed, hold: HOLD22, lifted, samples, saves, blocks }, true);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
