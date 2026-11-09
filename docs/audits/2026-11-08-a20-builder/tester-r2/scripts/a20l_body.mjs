// FLYK (Main_Designer 11-08, the builder's gate seed 31): 'kzero' Enter (its save in flight: request held = req, or
// the reply held 4 s = resp), 'kone' at once (no 2 s pause), then the page goes away: close = about:blank, full = a
// full navigation to another note. Reopen. r2 target: 'kone' in the kept box or landed; 'kzero' by the receipt (on the
// server, or offered by the banner's Apply); nothing twice.
const L_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantL = (n) => !L_ONLY || L_ONLY.some((p) => n.startsWith(p));
const REPSL = Number(process.env.REPS || 2);
const plainL = (units) => units.map((x) => x.replace(/^\[[a-z_0-9]+\]/, ''));
const countL = (units, s) => plainL(units).join('|').split(s).length - 1;
const EDSL = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.value)`;
const RECOVL = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;
const banners=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast],[class*=ecover],[class*=banner],[class*=Banner]')].filter(vis).map((x)=>x.innerText.replace(/\s+/g,' ').trim().slice(0,160)).filter(Boolean);
return {banners:[...new Set(banners)].slice(0,4),apply:[...document.querySelectorAll('button')].filter(vis).some((x)=>/^apply$/i.test(x.textContent.trim()))}})()`;
const clickApplyL = async () => { const p = await b.ev(`(()=>{const x=[...document.querySelectorAll('button')].find((e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&/^apply$/i.test(e.textContent.trim()));if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`).catch(() => null); if (!p) return false; await b.click(p.x, p.y); return true; };
for (const how of ['close', 'full']) for (const hold of ['req', 'resp']) for (let i = 0; i < REPSL; i += 1) {
  const name = `FLYK-${how}-${hold}-${i}`; if (!wantL(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 flyk ${how} ${hold} ${i}`); await watch(); mark();
    let first = true;
    if (hold === 'req') rule = ({ u }) => { if (first && /text-save/.test(u)) { first = false; return 'hold'; } return 'continue'; };
    else respRule = ({ u }) => { if (first && /text-save/.test(u)) { first = false; return { delay: 4000 }; } return null; };
    await typeText('kzero', 90); await enter(); await sleep(100); await typeText('kone', 90); await sleep(300);
    const edsLeave = await b.ev(EDSL).catch(() => null);
    if (how === 'close') await b.cdp('Page.navigate', { url: 'about:blank' });
    else await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${other}` });
    await sleep(1500);
    rule = () => 'continue'; await release(); await sleep(3500); respRule = () => null;
    const atLeave = await serverUnits(id);
    await open(id); await sleep(1000);
    const at1 = { eds: await b.ev(EDSL).catch(() => null), boxes: (await boxes().catch(() => [])).map((x) => x.v), seen: await b.ev(RECOVL).catch(() => null) };
    await sleep(7000);
    const u8 = await serverUnits(id); const boxes8 = (await boxes().catch(() => [])).map((x) => x.v); const seen8 = await b.ev(RECOVL).catch(() => null);
    let afterApply = null;
    if (seen8 && seen8.apply) { if (await clickApplyL()) { await sleep(3000); await blurOutside(); await sleep(3000); afterApply = await serverUnits(id); } }
    const fin = afterApply || u8;
    const k0 = countL(fin, 'kzero'); const k1 = countL(fin, 'kone'); const k1Box = boxes8.some((v) => v.includes('kone'));
    const boxButtons = boxes8.length ? await b.ev(`[...document.querySelectorAll('[data-structure-typing-notice] button')].filter(x=>x.getBoundingClientRect().width>0).map(x=>(x.textContent||x.getAttribute('aria-label')||'').trim())`).catch(() => null) : null;
    let putBack = null; let afterPut = null;
    const pb = boxes8.length ? await b.ev(`(()=>{const x=[...document.querySelectorAll('[data-structure-typing-notice] button,button')].find(e=>e.getBoundingClientRect().width>0&&/put back|restore|insert|place|放回/i.test((e.textContent||e.getAttribute('aria-label')||'').trim()));if(!x)return null;const r=x.getBoundingClientRect();return {t:(x.textContent||'').trim(),x:r.left+r.width/2,y:r.top+r.height/2}})()`).catch(() => null) : null;
    if (pb) { await b.click(pb.x, pb.y); await sleep(3000); await blurOutside(); await sleep(3000); putBack = pb.t; afterPut = await serverUnits(id); }
    // r2 (Main_Designer 11-08): kone waits in the box for the person (never lands by itself), kzero by receipt, no duplicate.
    const okR2 = k0 === 1 && k1 === 0 && k1Box && (!afterPut || (countL(afterPut, 'kone') === 1 && countL(afterPut, 'kzero') === 1));
    row(name, id, { how, hold, edsLeave, atLeave, at1, units8: u8, boxes8, seen8, afterApply, k0, k1, k1Box, boxButtons, putBack, afterPut, puts: net.filter((l) => /text-save/.test(l)) }, okR2);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
