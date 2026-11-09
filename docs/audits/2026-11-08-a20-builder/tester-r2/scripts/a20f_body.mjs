// LATEBACK (Tester 11-08, from the r1 LATE/LATEREQ rows where ' second' never reached the server): the leave-time save
// is slow (request delayed 3 s = req, or response delayed 3 s = resp); 1 s after leaving A for X the user comes back
// to A by hash, clicks the line end and types ' second'. Timeline of the hash (every 250 ms for 7 s), editor values,
// boxes, stored kept words; then 6 s; server; then reopen A: banner / box / server. Variant still = after coming back,
// type nothing (does the app still take the user away to X?).
const F_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantF = (n) => !F_ONLY || F_ONLY.some((p) => n.startsWith(p));
const REPSF = Number(process.env.REPS || 2);
const EDSF = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,w:r.width,h:r.height}})`;
const RECOVF = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;
const banners=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast],[class*=ecover],[class*=banner],[class*=Banner]')].filter(vis).map((x)=>x.innerText.replace(/\s+/g,' ').trim().slice(0,160)).filter(Boolean);
return {banners:[...new Set(banners)].slice(0,4),apply:[...document.querySelectorAll('button')].filter(vis).some((x)=>/^apply$/i.test(x.textContent.trim()))}})()`;
for (const how of ['req', 'resp']) for (const typed of ['type', 'still']) for (let i = 0; i < REPSF; i += 1) {
  const name = `LATEBACK-${how}-${typed}-${i}`; if (!wantF(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 lateback ${how} ${typed} ${i}`); await watch(); mark();
    await typeText('first words', 90); await sleep(300);
    let heldOnce = false;
    if (how === 'resp') respRule = ({ u }) => { if (!heldOnce && /text-save/.test(u)) { heldOnce = true; return { delay: 3000 }; } return null; };
    else rule = ({ u }) => { if (!heldOnce && /text-save/.test(u)) { heldOnce = true; return { delay: 3000 }; } return 'continue'; };
    const tl = []; const T = Date.now(); const tick = async (tag) => { const h = await b.ev('location.hash').catch(() => '?'); tl.push(`${Date.now() - T} ${tag} ${h.includes(id) ? 'A' : h.includes(other) ? 'X' : h}`); };
    const baseState = await b.ev(`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const st=[...document.querySelectorAll('[role=status],[aria-live]')].filter(vis).map(x=>x.innerText.replace(/\s+/g,' ').trim().slice(0,100)).filter(Boolean);const ro=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].some(t=>t.readOnly||t.disabled||t.getAttribute('aria-readonly')==='true');return {st:[...new Set(st)].slice(0,4),ro}})()`).catch(() => null);
    await goHash(other); await tick('leave');
    await sleep(1000); await tick('1s');
    await goHash(id); await tick('back');
    await sleep(1200); await tick('2.2s');
    const waitState = await b.ev(`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const st=[...document.querySelectorAll('[role=status],[aria-live]')].filter(vis).map(x=>x.innerText.replace(/\s+/g,' ').trim().slice(0,100)).filter(Boolean);const ro=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].some(t=>t.readOnly||t.disabled||t.getAttribute('aria-readonly')==='true');return {st:[...new Set(st)].slice(0,4),ro}})()`).catch(() => null);
    await shot(`${name}-wait`).catch(() => {}); // side evidence: the leave-wait status bar (crop the sidebar before handing in)
    let typedInto = null; let typedVisible = null; let waitStateTyped = null;
    if (typed === 'type') {
      const eds = await b.ev(EDSF).catch(() => []); const e = eds.find((x) => x.v.startsWith('first')) || eds[eds.length - 1];
      if (e) { await b.click(e.x + Math.max(10, Math.min(e.w - 10, 300)), e.y + Math.min(e.h, 24) / 2); await sleep(150); await press('End', 'End', 35); typedInto = e.v; }
      await tick('clicked');
      const typeK = async (s) => { for (const c of s) { if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(90); } };
      await typeK(' s');
      const hNow = await b.ev('location.hash').catch(() => '');
      typedVisible = hNow.includes(id) ? await b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].some(t=>t.value.includes('first words s'))`).catch(() => null) : null;
      await typeK('econd');
      await tick('typed');
      waitStateTyped = await b.ev(`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const st=[...document.querySelectorAll('[role=status],[aria-live]')].filter(vis).map(x=>x.innerText.replace(/\s+/g,' ').trim().slice(0,100)).filter(Boolean);const ro=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].some(t=>t.readOnly||t.disabled||t.getAttribute('aria-readonly')==='true');return {st:[...new Set(st)].slice(0,4),ro}})()`).catch(() => null);
    }
    for (let k = 0; k < 16; k += 1) { await sleep(250); await tick('t'); }
    const edsAfter = (await b.ev(EDSF).catch(() => [])).map((x) => x.v);
    const boxesAfter = (await boxes().catch(() => [])).map((x) => x.v); const storedAfter = await storedFor(id).catch(() => null);
    const alerts = await b.ev('(window.__alerts||[]).slice()').catch(() => null);
    await blurOutside(); await sleep(6000);
    const serverMid = await serverUnits(id);
    rule = () => 'continue'; respRule = () => null;
    await open(id); await sleep(4000);
    const seen = await b.ev(RECOVF).catch(() => null); const bx = (await boxes().catch(() => [])).map((x) => x.v);
    await sleep(5000);
    const serverEnd = await serverUnits(id);
    // collapse the timeline to the changes of place
    const places = []; for (const l of tl) { const p = l.split(' ').slice(2).join(' '); if (!places.length || places[places.length - 1].p !== p) places.push({ t: Number(l.split(' ')[0]), tag: l.split(' ')[1], p }); }
    row(name, id, { how, typed, places, baseState, waitState, typedInto, typedVisible, waitStateTyped, edsAfter, boxesAfter, storedAfter, alerts, serverMid, seen, boxesReopen: bx, serverEnd, requests: [...net].filter((l) => /text-save/.test(l)) }, typed === 'still' ? true : (serverEnd.some((u) => u.includes('second')) || (bx || []).some((v) => v.includes('second')) || (typedVisible === false && !!waitState && (waitState.ro || (waitState.st || []).some((s) => !((baseState && baseState.st) || []).includes(s))))));
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
