// Toast COUNT arms (Tester 11-08). watch() in the head keeps each alert text once (dedup), so it cannot tell "appears
// once" from "appears at every pause". watchN() records every toast ELEMENT that appears, with its time and text.
//   OFFLINE-N-i : text-save fails at the network layer (as OFFLINE); three bursts with 2.6 s pauses.
//   OFFALL-i    : every /api request fails at the network layer, GETs included (really offline).
// Then the network back, ' back online' + 2.6 s + click away: on the server? Manual: "'Failed to save block' appears
// once. It does not repeat at every pause."
const REPSK = Number(process.env.REPS || 2);
const K_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantK = (n) => !K_ONLY || K_ONLY.some((p) => n.startsWith(p));
const watchN = () => b.ev(String.raw`(()=>{const T0=performance.now();window.__toastsN=[];const seen=new WeakSet();const sel='[role=alert],[class*=toast],[class*=Toast]';
const take=(el)=>{if(seen.has(el))return;seen.add(el);setTimeout(()=>{const s=(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,90);if(s)window.__toastsN.push({t:Math.round(performance.now()-T0),s})},60)};
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches&&n.matches(sel))take(n);if(n.querySelectorAll)for(const x of n.querySelectorAll(sel))take(x)}}).observe(document.body,{childList:true,subtree:true});1})()`);
const toastsN = () => b.ev('(window.__toastsN||[]).slice()').catch(() => null);
for (const mode of ['N', 'ALL']) for (let i = 0; i < REPSK; i += 1) {
  const name = mode === 'N' ? `OFFLINE-N-${i}` : `OFFALL-${i}`; if (!wantK(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 off${mode} ${i}`); await watch(); await watchN(); mark();
    if (mode === 'N') rule = ({ u }) => (/text-save/.test(u) ? 'neterr' : 'continue');
    else { rule = () => 'neterr'; rule.gets = true; }
    for (const w of ['one burst', ' two burst', ' three burst']) { await typeText(w, 90); await sleep(2600); }
    const during = await toastsN();
    rule = () => 'continue';
    await typeText(' back online', 90); await sleep(2600); await blurOutside(); await sleep(3000);
    const all = await toastsN(); const u = await serverUnits(id);
    const failed = (during || []).filter((x) => /failed to save block/i.test(x.s)).length;
    const text = 'one burst two burst three burst back online';
    row(name, id, { mode, during, after: (all || []).slice((during || []).length), failedDuring: failed, saved: u.some((x) => x.includes(text)), units: u, puts: net.filter((l) => /text-save/.test(l)) }, failed <= 1 && u.some((x) => x.includes(text)));
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
