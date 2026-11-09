// INAPP (Tester 11-08, control for LATEBACK): the same slow leave, but by clicking another note's entry inside the app
// (the router's own blocker path, which existed before A-20). Type 'first words', click the target note's entry, the
// leave-time text-save delayed 3 s (request stage); while waiting, click A's line end and type ' second'. Where do we end,
// and is ' second' on the server / in a box / offered after reopening A?
const G_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantG = (n) => !G_ONLY || G_ONLY.some((p) => n.startsWith(p));
const REPSG = Number(process.env.REPS || 2);
const EDSG = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,w:r.width,h:r.height}})`;
const findTitle = (t) => b.ev(`(()=>{const all=[...document.querySelectorAll('a,button,[role=treeitem],[role=link],li,div,span')].filter(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0&&(e.innerText||'').trim()===${JSON.stringify(t)});const e=all.sort((a,b)=>a.getBoundingClientRect().width-b.getBoundingClientRect().width)[0];if(!e)return null;const r=e.getBoundingClientRect();return {tag:e.tagName,href:e.getAttribute('href'),role:e.getAttribute('role'),x:r.left+Math.min(r.width/2,60),y:r.top+r.height/2,n:all.length}})()`);
for (const via of ['home', 'tab']) for (const typed of ['type', 'still']) for (let i = 0; i < REPSG; i += 1) {
  const name = `INAPP-${via}-${typed}-${i}`; if (!wantG(name)) continue;
  await scenario(name, async () => {
    const title = `A20 inapp target ${typed} ${i} ${Date.now() % 100000}`;
    const target = await newNote(title);
    const id = await prep(`A20 inapp ${typed} ${i}`);
    let link = null;
    if (via === 'home') link = await b.ev(`(()=>{const e=[...document.querySelectorAll('a[href="#/"]')].find(x=>x.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));if(!e)return null;const r=e.getBoundingClientRect();return {tag:e.tagName,href:'#/',role:null,x:r.left+r.width/2,y:r.top+r.height/2,n:1}})()`);
    else { await open(target); await sleep(2500); await goHash(id); await sleep(3000); const eds = await b.ev(EDSG); const e = eds.find((x) => x.v === ''); if (e) { await b.click(e.x + 20, e.y + Math.min(e.h, 24) / 2); await sleep(300); } link = await findTitle(title); }
    if (!link) throw new Error(`setup: no ${via} entry on the page`);
    await watch(); mark();
    await typeText('first words', 90); await sleep(300);
    let heldOnce = false;
    rule = ({ u }) => { if (!heldOnce && /text-save/.test(u)) { heldOnce = true; return { delay: 3000 }; } return 'continue'; };
    const tl = []; const T = Date.now(); const tick = async (tag) => { const h = await b.ev('location.hash').catch(() => '?'); tl.push({ t: Date.now() - T, tag, p: h.includes(id) ? 'A' : h.includes(target) ? 'T' : h === '#/' ? 'home' : h.replace(/[0-9a-f-]{36}/g, ':id') }); };
    const baseState = await b.ev(`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const st=[...document.querySelectorAll('[role=status],[aria-live]')].filter(vis).map(x=>x.innerText.replace(/\s+/g,' ').trim().slice(0,100)).filter(Boolean);const ro=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].some(t=>t.readOnly||t.disabled||t.getAttribute('aria-readonly')==='true');return {st:[...new Set(st)].slice(0,4),ro}})()`).catch(() => null);
    await b.click(link.x, link.y); await tick('clicked-link');
    await sleep(1200); await tick('1.2s');
    const waitState = await b.ev(`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const st=[...document.querySelectorAll('[role=status],[aria-live]')].filter(vis).map(x=>x.innerText.replace(/\s+/g,' ').trim().slice(0,100)).filter(Boolean);const ro=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].some(t=>t.readOnly||t.disabled||t.getAttribute('aria-readonly')==='true');return {st:[...new Set(st)].slice(0,4),ro}})()`).catch(() => null);
    await shot(`${name}-wait`).catch(() => {}); // side evidence: the leave-wait status bar (crop the sidebar before handing in)
    let typedInto = null; let typedVisible = null; let waitStateTyped = null;
    if (typed === 'type') {
      const eds = await b.ev(EDSG).catch(() => []); const e = eds.find((x) => x.v.startsWith('first')) || null;
      if (e) { await b.click(e.x + Math.max(10, Math.min(e.w - 10, 300)), e.y + Math.min(e.h, 24) / 2); await sleep(150); await press('End', 'End', 35); typedInto = e.v; }
      const typeK = async (s) => { for (const c of s) { if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(90); } };
      await typeK(' s');
      const hNow = await b.ev('location.hash').catch(() => '');
      typedVisible = hNow.includes(id) ? await b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].some(t=>t.value.includes('first words s'))`).catch(() => null) : null;
      await typeK('econd');
      await tick('typed');
      waitStateTyped = await b.ev(`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const st=[...document.querySelectorAll('[role=status],[aria-live]')].filter(vis).map(x=>x.innerText.replace(/\s+/g,' ').trim().slice(0,100)).filter(Boolean);const ro=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].some(t=>t.readOnly||t.disabled||t.getAttribute('aria-readonly')==='true');return {st:[...new Set(st)].slice(0,4),ro}})()`).catch(() => null);
    }
    for (let k = 0; k < 16; k += 1) { await sleep(250); await tick('t'); }
    const places = []; for (const x of tl) if (!places.length || places[places.length - 1].p !== x.p) places.push(x);
    const alerts = await b.ev('(window.__alerts||[]).slice()').catch(() => null);
    await blurOutside(); await sleep(5000);
    const serverMid = await serverUnits(id);
    rule = () => 'continue';
    await open(id); await sleep(4000);
    const seen = await b.ev(String.raw`[...document.querySelectorAll('[role=alert],[role=status],[class*=ecover],[class*=banner],[class*=Banner]')].filter(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(x=>x.innerText.replace(/\s+/g,' ').trim().slice(0,120)).filter(Boolean)`).catch(() => null);
    const bx = (await boxes().catch(() => [])).map((x) => x.v);
    await sleep(5000);
    const serverEnd = await serverUnits(id);
    row(name, id, { via, typed, link: { tag: link.tag, href: link.href, role: link.role, n: link.n }, places, baseState, waitState, typedInto, typedVisible, waitStateTyped, alerts, serverMid, seen, boxesReopen: bx, serverEnd, requests: [...net].filter((l) => /text-save/.test(l)) }, typed === 'still' ? true : (serverEnd.some((u) => u.includes('second')) || (bx || []).some((v) => v.includes('second')) || (typedVisible === false && !!waitState && (waitState.ro || (waitState.st || []).some((s) => !((baseState && baseState.st) || []).includes(s))))));
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
