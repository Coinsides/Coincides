
// CARET probe (Tester 11-09, A-20b r2 chain row LIST-addr-0): the first keystrokes in a fresh note land with the caret
// moved to 0 ('wa' then 'rmup' -> 'rmupwa'; Enter -> 'rmup' | 'wa'). Seen on pre 3/229, old A-20 r2 2/200, A-20b r2 3/192,
// r3/r3d/r3e 0/635 setup rows. Same path as prep(): newNote -> open -> clickTa(0) -> wait W -> 'warmup' at 50 ms per key
// -> Enter. Page-side recorders (no extra round trips between keys): every input event (time, same textarea as the one
// first clicked, value, caret), every focusin, and the time the first-clicked textarea leaves the document.
// Net timeline from just before open. Row ok = first server unit is 'warmup'.
// Build: cat a20_head.mjs caret_body.mjs > caret_probe.mjs. Env: WAITS (default 800,300,0), N (per wait, default 10).
const WAITS = (process.env.WAITS || '800,300,0').split(',').map(Number);
const NREP = Number(process.env.N || 10);
const MARKTA = `(()=>{const T0=performance.now();window.__T0=T0;const now=()=>Math.round(performance.now()-T0);
window.__ta0=document.activeElement;window.__ins=[];window.__foc=[];window.__gone=[];
document.addEventListener('input',(e)=>{const t=e.target;window.__ins.push({t:now(),same:t===window.__ta0,v:t.value,s:t.selectionStart});},true);
document.addEventListener('focusin',(e)=>{const t=e.target;window.__foc.push({t:now(),same:t===window.__ta0,tag:t.tagName,v:(t.value||'').slice(0,20)});},true);
const mo=new MutationObserver((ms)=>{for(const m of ms){for(const n of m.removedNodes){if(n===window.__ta0||(n.contains&&n.contains(window.__ta0))){window.__gone.push(now());}}}});
mo.observe(document.body,{childList:true,subtree:true});
const a=document.activeElement;return {tag:a&&a.tagName,v:a&&a.value,s:a&&a.selectionStart};})()`;
const READLOG = `({ins:window.__ins,foc:window.__foc,gone:window.__gone})`;

for (const W of WAITS) for (let i = 0; i < NREP; i += 1) {
  const name = `CARET-w${W}-${i}`;
  await scenario(name, async () => {
    const id = await newNote(`caret w${W} ${i}`);
    mark();
    await open(id);
    const tOpen = Date.now() - t0;
    await clickTa(0);
    const tClick = Date.now() - t0;
    const at0 = await b.ev(MARKTA);
    if (W) await sleep(W);
    const keyAt = [];
    for (const c of 'warmup') { keyAt.push(Date.now() - t0); await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(50); }
    await sleep(200); await enter(); await sleep(2500);
    const dom = (await state()).tas.map((x) => x.v);
    const plog = await b.ev(READLOG).catch(() => null);
    await sleep(1500);
    const units = await serverUnits(id);
    const scrambled = units[0] !== 'warmup';
    if (scrambled) await shot(`caret-${name}`);
    row(name, id, { W, tOpen, tClick, at0, keyAt, dom, units, log: plog, scrambled }, !scrambled);
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, scrambled: rows.filter((r) => r.scrambled).length, errors: rows.filter((r) => r.error).length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
