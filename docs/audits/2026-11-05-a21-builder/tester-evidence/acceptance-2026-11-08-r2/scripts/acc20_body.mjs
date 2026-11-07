// LANDFAIL3 (r2.3c, Tester follow-up of LANDFAIL2-box): a box kept by a failed block-create; reopen with every text-save
// answered 500, so the landing's save fails. LANDFAIL2 showed: 83 keys typed on 'warmup' never reach the screen. Here:
// what does the person SEE while that happens (alerts / toasts, Retry / Undo buttons, box, read-only state), how long
// does it last, does it clear by itself once saves work again, and where do the kept words and later keys end up?
const EDS20 = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,ro:e.readOnly,aro:e.getAttribute('aria-readonly'),block:e.dataset.blockId||null,unit:e.dataset.textUnitId||null,x:r.left,y:r.top,h:r.height}})`;
const SEEN = `(()=>{const vis=(e)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};const alerts=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast]')].filter(vis).map(x=>x.innerText.replace(/\\s+/g,' ').slice(0,120)).filter(Boolean);const buttons=[...document.querySelectorAll('button')].filter(vis).map(e=>e.innerText.trim()).filter(t=>/retry|undo|discard|try again|show words|hide words/i.test(t));const a=document.activeElement;return {alerts,buttons,active:a?a.tagName+(a.dataset&&a.dataset.runtimeTextflowEditor?':editor='+String(a.value).slice(0,30):''):null}})()`;
const keptByCreateFail20 = async () => {
  let failed = false;
  rule = ({ m, u }) => { if (!failed && m === 'POST' && /\/notes\/:id\/blocks$/.test(u)) { failed = true; return '500'; } return 'continue'; };
  await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 50);
  await sleep(14000); rule = () => 'continue';
  return failed;
};
const warm = async () => (await b.ev(EDS20)).find((e) => e.v.startsWith('warmup')) || null;
const typeOnWarm = async (t) => { const w = await warm(); if (!w) return 'no warmup line'; await b.click(w.x + 120, w.y + Math.min(w.h, 24) / 2); await sleep(250); await press('End', 'End', 35); await typeText(t, 120); await sleep(1200); const w2 = await warm(); return w2 ? w2.v : null; };
for (let i = 0; i < 2; i += 1) {
  const name = `LANDFAIL3-seen-${i}`;
  await scenario(name, async () => {
    const id = await newNote(`R landfail3 ${i}`); lastId = id;
    await arriveAndWarm(id);
    const failed = await keptByCreateFail20();
    const stored0 = await storedFor(id);
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await watch(); mark();
    await open(id); await sleep(5000);
    const s1 = { seen: await b.ev(SEEN), boxes: await boxes(), eds: (await b.ev(EDS20)).map((e) => [e.v, e.ro, e.aro]) };
    const v1 = await typeOnWarm('abc');
    const s2 = { seen: await b.ev(SEEN), v: v1 };
    await sleep(10000);
    const s2b = { seen: await b.ev(SEEN), v: (await warm())?.v ?? null };
    // Saves work again.
    rule = () => 'continue';
    await sleep(4000);
    const s3 = { seen: await b.ev(SEEN), boxes: await boxes(), v: (await warm())?.v ?? null };
    const v3 = await typeOnWarm('def');
    const s4 = { seen: await b.ev(SEEN), v: v3 };
    // If a Retry is on screen, the person clicks it.
    let clicked = null;
    const rb = await b.ev(`(()=>{const e=[...document.querySelectorAll('button')].find(x=>x.getBoundingClientRect().width>0&&/retry|try again/i.test(x.innerText));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:e.innerText.trim()}})()`);
    if (rb) { await b.click(rb.x, rb.y); clicked = rb.t; await sleep(4000); }
    const v5 = await typeOnWarm('ghi');
    const s5 = { seen: await b.ev(SEEN), v: v5 };
    await blurOutside(); await sleep(4000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id); const bxEnd = await boxes();
    const alertsAll = await b.ev('window.__alerts||[]');
    const saves = net.filter((l) => /text-save/.test(l)).map((l) => l.slice(0, 80));
    row(name, id, { failed, stored0, s1, s2, s2b, s3, s4, clicked, s5, blocks, bxEnd, alertsAll, saves }, true);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
