// BLUR control (r2.3c on the island, after the 21st deploy). RETRY-schedule showed: after the landing save fails, no
// retry for 110 s; the only retry left at the moment my script clicked outside the note. Is the retry triggered by the
// click outside (focus leaving the editor), and not by a timer? Every event is stamped on the same clock as the
// network log (ms since mark()).
//   A  BLUR-late    : 500 from reopen; type into 'warmup' every 10 s; saves work at 20 s; click outside at 60 s.
//   B  BLUR-under   : 500; click outside at 15 s (still failing); back into 'warmup'; saves work at 30 s; click
//                     outside again at 60 s.
//   C  BLUR-noFocus : 500; never touch the editor; saves work at 20 s; click outside at 60 s.
// Then 12 s more, one typing probe, blur, read the note and this note's stored record.
const EDS23 = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,h:r.height}})`;
const SEEN23 = `(()=>{const vis=(e)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};const boxes=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast]')].filter(vis);return {texts:[...new Set(boxes.map(x=>x.innerText.replace(/\\s+/g,' ').slice(0,160)).filter(Boolean))],buttons:[...new Set(boxes.flatMap(x=>[...x.querySelectorAll('button')].filter(vis).map(e=>e.innerText.trim())))],active:document.activeElement?document.activeElement.tagName:null}})()`;
const kept23 = async () => {
  let failed = false;
  rule = ({ m, u }) => { if (!failed && m === 'POST' && /\/notes\/:id\/blocks$/.test(u)) { failed = true; return '500'; } return 'continue'; };
  await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 50);
  await sleep(14000); rule = () => 'continue';
  return failed;
};
const warm23 = async () => (await b.ev(EDS23)).find((e) => e.v.startsWith('warmup')) || null;
const now23 = () => Date.now() - t0;
const typeX = async () => { const w = await warm23(); if (!w) return null; await b.click(w.x + 120, w.y + Math.min(w.h, 24) / 2); await sleep(200); await press('End', 'End', 35); await typeText('x', 100); await sleep(500); const w2 = await warm23(); return w2 ? w2.v : null; };
const until23 = async (ms) => { while (now23() < ms) await sleep(Math.min(500, ms - now23())); };
for (const variant of (process.env.ONLY23 || 'A,B,C').split(',')) {
  const name = `BLUR-${variant}`;
  await scenario(name, async () => {
    const id = await newNote(`R blur ${variant}`); lastId = id;
    await arriveAndWarm(id);
    const failed = await kept23();
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await watch(); mark();
    const events = [];
    const ev = (what, extra) => events.push({ t: now23(), what, ...(extra || {}) });
    await open(id); ev('opened');
    await sleep(1200); ev('seen', { seen: await b.ev(SEEN23) });
    const lift = variant === 'B' ? 30000 : 20000;
    const plan = variant === 'B' ? [15000] : [];
    let lifted = false; let probes = 0;
    while (now23() < 60000) {
      if (!lifted && now23() >= lift) { rule = () => 'continue'; lifted = true; ev('saves work again'); }
      if (plan.length && now23() >= plan[0]) { plan.shift(); await blurOutside(); ev('clicked outside (still failing)'); await sleep(2500); ev('seen', { seen: await b.ev(SEEN23) }); }
      if (variant !== 'C' && now23() >= probes * 10000 + 5000) { const v = await typeX(); probes += 1; ev('typed x', { line: v }); }
      await sleep(400);
    }
    await until23(60000);
    await blurOutside(); ev('clicked outside');
    await sleep(12000); ev('seen', { seen: await b.ev(SEEN23) });
    const v2 = await typeX(); ev('typed x after', { line: v2 });
    await sleep(1500); await blurOutside(); await sleep(4000);
    const saves = net.filter((l) => /text-save/.test(l)).map((l) => String(l).slice(0, 100));
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    row(name, id, { failed, events, saves, blocks }, true);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
