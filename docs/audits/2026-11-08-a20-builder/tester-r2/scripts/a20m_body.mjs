// A-20 r2 arms from the Reviewer's M1 / M2 (Main_Designer 11-08, "Reviewer 发现收讫;开 r3"). Same file on 04f6f822 and r2;
// also r3's pre-seal self-run arms.
//   BACKIN-fail-i : enter note A through the app (the course page loaded, then A clicked in its list = a router entry
//        with idx; never a scripted hash). Type 'backin words', the save is held and answered 500 (later saves 500 too),
//        press Back at once. Record where the person ends, every message (watchN, with where it showed and ended),
//        boxes / kept words / receipts. Then, if still on A, leave once more by a scripted hash with saves held: is that
//        leave still held ('released' stuck = not held)? Release, reopen A, record.
//   BACKIN-undo-i : the same start; if the person stays on A, the network comes back, undo the group, leave normally
//        (hash), reopen A. The undone words back on the server or on screen without Apply = M2 (shape of K2) reproduced.
//   LIST-<close|back|addr>-i : with every text-save held, type 'k0' Enter 'x' Enter 'y' (a list typed line by line)
//        and leave: close (about:blank), Back (to a scripted hash entry, the keepAndLeave path), address bar (same-
//        document URL change). Held saves are released 2 s after the leave (back / addr). Reopen A: where is 'x'?
//   LANDOTHER-<plain|heading>-i (A-25 base line): a plain block 'plainb' and a heading block '# hb' / 'hbody' are made
//        first; then the A-25 LANDFAIL state (kept heading words landing while every text-save fails); type ' plus p'
//        at the end of 'plainb' (plain), ' plus h' at the end of 'hbody' (heading), or ' plus t' at the end of the heading
//        line 'hb' itself (headline). Do the keys show?
const M_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantM = (n) => !M_ONLY || M_ONLY.some((p) => n.startsWith(p));
const REPSM = Number(process.env.REPS || 2);
const EDSM = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,w:r.width,h:r.height}})`;
const edsM = async () => (await b.ev(EDSM).catch(() => [])).map((e) => e.v);
const plainM = (units) => (units || []).map((x) => x.replace(/^\[[a-z_0-9]+\]/, ''));
const countM = (units, s) => plainM(units).join('|').split(s).length - 1;
const clickEndM = async (pred) => { const eds = await b.ev(EDSM); const e = eds.find(pred) || null; if (!e) return false; await b.click(e.x + Math.max(10, Math.min(e.w - 10, 300)), e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('End', 'End', 35); await sleep(150); return true; };
const WATCHM_SRC = String.raw`(()=>{const T0=performance.now();window.__toastsN=[];const seen=new WeakSet();const sel='[role=alert],[class*=toast],[class*=Toast]';const live=[];
const vis=(el)=>el.isConnected&&el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&el.getBoundingClientRect().width>0;
const take=(el)=>{if(seen.has(el))return;seen.add(el);const rec={t:Math.round(performance.now()-T0),s:'',hashAt:location.hash,end:null,hashEnd:null};setTimeout(()=>{rec.s=(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,110);if(rec.s){window.__toastsN.push(rec);live.push([el,rec])}},60)};
setInterval(()=>{for(const [el,rec] of live){if(rec.end===null&&!vis(el)){rec.end=Math.round(performance.now()-T0);rec.hashEnd=location.hash}}},100);
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches&&n.matches(sel))take(n);if(n.querySelectorAll)for(const x of n.querySelectorAll(sel))take(x)}}).observe(document.body,{childList:true,subtree:true});1})()`;
const watchM = () => b.ev(WATCHM_SRC);
const toastsM = () => b.ev('(window.__toastsN||[]).slice()').catch(() => null);
const STATUSM = `(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;return [...new Set([...document.querySelectorAll('[role=status],[aria-live]')].filter(vis).map(x=>x.innerText.replace(/\\s+/g,' ').trim().slice(0,100)).filter(Boolean))].slice(0,4)})()`;
const RECOVM = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;
const banners=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast],[class*=ecover],[class*=banner],[class*=Banner]')].filter(vis).map((x)=>x.innerText.replace(/\s+/g,' ').trim().slice(0,160)).filter(Boolean);
return {banners:[...new Set(banners)].slice(0,4),apply:[...document.querySelectorAll('button')].filter(vis).some((x)=>/^apply$/i.test(x.textContent.trim()))}})()`;
// Receipts of this note: r1/r2 keep them in localStorage under draft-recovery:v2:<user|anonymous>, pre in sessionStorage.
const receiptsM = (id) => b.ev(`(()=>{const out=[];for(const [n,st] of [['local',localStorage],['session',sessionStorage]]){for(const k of Object.keys(st)){if(!k.startsWith('coincides:draft-recovery'))continue;const v=st.getItem(k)||'';if(v.includes(${JSON.stringify(id)}))out.push({store:n,key:k.replace(/:[0-9a-f-]{36}$/,':<user>'),len:v.length,words:/backin words|k0|x|y/.test(v)?v.slice(0,300):null})}}return out})()`).catch(() => null);
const historyM = () => b.ev('({idx: history.state && history.state.idx, len: history.length, hash: location.hash})').catch(() => null);
const backM = async () => { const h = await b.cdp('Page.getNavigationHistory'); await b.cdp('Page.navigateToHistoryEntry', { entryId: h.result.entries[h.result.currentIndex - 1].id }); };
// A course of its own, so the course page lists only these notes.
const COURSE_M = (await (await fetch(`${API}/courses`, { method: 'POST', headers: auth, body: JSON.stringify({ name: `实测·A20m ${LABEL}`, code: 'A20M', semester: 'r04' }) })).json()).id;
const findInList = (t) => b.ev(`(()=>{const all=[...document.querySelectorAll('a,button,[role=treeitem],[role=link],[role=button],li,div,span')].filter(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&(e.innerText||'').trim()===${JSON.stringify(t)});const e=all.sort((a,b)=>a.getBoundingClientRect().width-b.getBoundingClientRect().width)[0];if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {tag:e.tagName,role:e.getAttribute('role'),x:r.left+Math.min(r.width/2,60),y:r.top+r.height/2,n:all.length}})()`);

// Enter A through the app: A made and warmed (prep, then saved), the course page loaded in full (router entry idx 0),
// A clicked in the list (router push). Returns where we are and the router state.
const enterThroughApp = async (title) => {
  const saved = COURSE; COURSE = COURSE_M; let id;
  try { id = await prep(title); } finally { COURSE = saved; }
  await blurOutside(); await sleep(2500);
  await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/courses/${COURSE_M}` });
  let link = null; for (let k = 0; k < 40 && !link; k += 1) { await sleep(500); link = await findInList(title); }
  if (!link) throw new Error('setup: A is not in the course list');
  const hCourse = await historyM();
  await sleep(300); await b.click(link.x, link.y);
  for (let k = 0; k < 60; k += 1) { await sleep(250); const h = await b.ev('location.hash').catch(() => ''); if (h.includes(id) && (await edsM()).length) break; }
  await sleep(2500);
  const hA = await historyM();
  if (!hA || !String(hA.hash).includes(id)) throw new Error(`setup: the click did not open A (${JSON.stringify(hA)})`);
  return { id, link, hCourse, hA };
};
const placeM = (h, ids) => { if (h == null) return null; for (const [k, v] of Object.entries(ids)) if (v && h.includes(v)) return k; return h.replace(/[0-9a-f-]{36}/g, ':id'); };

for (const v of ['fail', 'undo']) for (let i = 0; i < REPSM; i += 1) {
  const name = `BACKIN-${v}-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const title = `A20m backin ${v} ${i} ${Date.now() % 100000}`;
    const { id, link, hCourse, hA } = await enterThroughApp(title);
    const ids = { A: id, course: `/courses/${COURSE_M}`, other };
    if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(await edsM())}`);
    await watch(); await watchM(); mark();
    // the network is bad: the first text-save is held then answered 500, later ones 500 at once
    let first = true; rule = ({ u }) => { if (/text-save/.test(u)) { if (first) { first = false; return 'hold'; } return '500'; } return 'continue'; };
    await typeText('backin words', 90); await sleep(300);
    await backM();
    const tl = []; const T = Date.now();
    let failedAt = null;
    for (let k = 0; k < 24; k += 1) { await sleep(250); if (failedAt === null && Date.now() - T >= 1500) { const rid = held.shift(); if (rid) { await fail500(rid); failedAt = Date.now() - T; } } tl.push(`${Date.now() - T} ${placeM(await b.ev('location.hash').catch(() => null), ids)}`); }
    const places = []; for (const l of tl) { const p = l.split(' ').slice(1).join(' '); if (!places.length || places[places.length - 1].p !== p) places.push({ t: Number(l.split(' ')[0]), p }); }
    const where = places.length ? places[places.length - 1].p : null; const stayed = where === 'A';
    const statusAfter = await b.ev(STATUSM).catch(() => null);
    const toastsBack = ((await toastsM()) || []).map((x) => ({ t: x.t, s: x.s, at: placeM(x.hashAt, ids), end: x.end, endAt: placeM(x.hashEnd, ids) }));
    const edsBack = await edsM(); const boxesBack = (await boxes().catch(() => [])).map((x) => x.v);
    const storedBack = await storedFor(id).catch(() => null); const receiptsBack = await receiptsM(id); const hBack = await historyM();
    const putsBack = net.filter((l) => /text-save/.test(l));
    const out = { v, title, link, hCourse, hA, failedAt, places, where, stayed, statusAfter, toastsBack, edsBack, boxesBack, storedBack, receiptsBack, hBack, putsBack };
    if (v === 'fail') {
      if (stayed) {
        // leave once more, by a scripted hash, every text-save held: is this leave still held?
        rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
        const n0 = net.length; const T2 = Date.now(); const tl2 = [];
        await b.ev(`location.hash='#/notes/${other}';1`);
        for (let k = 0; k < 12; k += 1) { await sleep(250); tl2.push(`${Date.now() - T2} ${placeM(await b.ev('location.hash').catch(() => null), ids)}`); }
        out.reLeave = { timeline: tl2, status: await b.ev(STATUSM).catch(() => null), sent: net.slice(n0).filter((l) => /text-save/.test(l)) };
        out.reLeave.held = tl2.filter((l) => l.endsWith(' A')).length >= 4; // still on A for >= 1 s after the hash change
      }
      rule = () => 'continue'; await release(); await sleep(4000);
    } else if (stayed) {
      // the network is back; undo the group; leave normally; reopen
      rule = () => 'continue'; await release(); await sleep(500);
      await clickEndM((e) => e.v.includes('backin'));
      const undoSteps = [];
      for (let k = 0; k < 2; k += 1) { await undo(); await sleep(600); const e = await edsM(); undoSteps.push(e); if (!e.some((x) => x.includes('backin'))) break; }
      out.undoSteps = undoSteps; await sleep(4000);
      out.serverAfterUndo = await serverUnits(id);
      await goHash(other); await sleep(3000); out.leftTo = placeM(await b.ev('location.hash').catch(() => null), ids);
      out.storedLeft = await storedFor(id).catch(() => null); out.receiptsLeft = await receiptsM(id);
    } else { rule = () => 'continue'; await release(); await sleep(3000); }
    await open(id); await sleep(1500);
    out.seenReopen = await b.ev(RECOVM).catch(() => null); out.edsReopen1 = await edsM();
    out.boxesReopen = (await boxes().catch(() => [])).map((x) => x.v);
    await sleep(8000);
    const u = await serverUnits(id); out.units = u; out.edsReopen9 = await edsM();
    out.count = countM(u, 'backin words');
    out.toastsAll = toastsBack;
    // judged by the analyzer; row ok = M2 not reproduced (undo) / recorded (fail)
    if (v === 'undo') out.m2 = !!out.stayed && (out.count > 0 || out.edsReopen9.some((x) => x.includes('backin words')));
    row(name, id, out, v === 'undo' ? !out.m2 : true);
  });
}

for (const how of ['close', 'back', 'addr']) for (let i = 0; i < REPSM; i += 1) {
  const name = `LIST-${how}-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20m list ${how} ${i}`);
    if (how === 'back') { await goHash(other); await sleep(1500); await goHash(id); await sleep(3000); if (!(await clickEndM((e) => e.v === ''))) throw new Error('setup: no empty line'); }
    await watch(); await watchM(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    await keysAt('k0', 90); await enter(); await sleep(150); await typeText('x', 90); await enter(); await sleep(150); await typeText('y', 90); await sleep(300);
    const edsTyped = await edsM(); const heldN = held.length;
    if (how === 'close') await b.cdp('Page.navigate', { url: 'about:blank' });
    else if (how === 'back') await backM();
    else { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${other}`) }); }
    await sleep(2000);
    const where = how === 'close' ? 'closed' : placeM(await b.ev('location.hash').catch(() => null), { A: id, other });
    const storedLeft = how === 'close' ? null : await storedFor(id).catch(() => null); const receiptsLeft = how === 'close' ? null : await receiptsM(id);
    const toastsLeft = how === 'close' ? null : await toastsM();
    rule = () => 'continue'; await release(); await sleep(5000);
    await open(id); await sleep(1500);
    const seen = await b.ev(RECOVM).catch(() => null); const eds1 = await edsM(); const boxes1 = (await boxes().catch(() => [])).map((x) => x.v);
    const stored1 = await storedFor(id).catch(() => null);
    await sleep(8000);
    const u = await serverUnits(id); const eds9 = await edsM();
    const xLine = plainM(u).includes('x');
    // where a typed line ended up: server / box (a words box line) / kept (a kept record's text line) / banner (the
    // recovery banner's offered text has it as a word) / lost
    const lineIn = (txt, w) => String(txt || '').split(/\n/).some((l) => l.trim() === w);
    const keptHas = (w) => (stored1 || []).some((s) => { try { return JSON.parse(s).some((e) => lineIn(e.text, w)); } catch { return false; } });
    const whereWord = (w) => (plainM(u).includes(w) ? 'server' : boxes1.some((x) => lineIn(x, w)) ? 'box' : keptHas(w) ? 'kept' : seen && (seen.banners || []).some((x) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(x.replace(/ Apply Dismiss.*$/, ''))) ? 'banner' : 'lost');
    const xAt = whereWord('x'); const yAt = whereWord('y');
    row(name, id, { how, edsTyped, heldN, where, storedLeft, receiptsLeft, toastsLeft, seen, eds1, boxes1, stored1, units: u, eds9, xAt, yAt, k0: countM(u, 'k0'), y: plainM(u).includes('y'), puts: net.filter((l) => /text-save/.test(l)) },
      // r3 rule per variant (Main_Designer 11-08): close / back = x and y in boxes, server 'warmup k0'; addr = all on the server once
      how === 'addr' ? ['k0', 'x', 'y'].every((w) => plainM(u).filter((v) => v === w).length === 1)
        : plainM(u).filter((v) => v === 'k0').length === 1 && !plainM(u).includes('x') && !plainM(u).includes('y') && xAt === 'box' && yAt === 'box');
  });
}

// A-25 base line: typing in another plain block / another heading block while the LANDFAIL failure is on.
for (const kind of ['plain', 'heading', 'headline']) for (let i = 0; i < REPSM; i += 1) {
  const name = `LANDOTHER-${kind}-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20m landother ${kind} ${i}`);
    // two more blocks, each started by a double-click on blank page area
    const before = (await edsM()).length;
    await blurOutside(); await sleep(600);
    await dbl(700, 900); await sleep(1500); await typeText('plainb', 60); await sleep(300); await blurOutside(); await sleep(2500);
    await dbl(700, 790); await sleep(1500); await typeHash(); await typeText('hb', 60); await enter(); await sleep(60); await typeText('hbody', 60); await sleep(300); await blurOutside(); await sleep(4000);
    const made = await edsM();
    if (!made.some((x) => x === 'plainb') || !made.some((x) => x.includes('hbody'))) throw new Error(`setup: blocks not made ${JSON.stringify(made)} (had ${before})`);
    // LANDFAIL: '# head' Enter 'body' in A's empty line while the structure's POST blocks answers 500 once
    if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(made)}`);
    let failed = false;
    rule = ({ m, u }) => { if (!failed && m === 'POST' && /\/notes\/:id\/blocks$/.test(u)) { failed = true; return '500'; } return 'continue'; };
    await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 50);
    await sleep(14000); rule = () => 'continue';
    const storedBefore = await storedFor(id).catch(() => null);
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await open(id); await sleep(5000); await watchM(); mark();
    const target = kind === 'plain' ? (e) => e.v.startsWith('plainb') : kind === 'headline' ? (e) => e.v === 'hb' : (e) => e.v.includes('hbody');
    const edsBefore = await edsM();
    if (!(await clickEndM(target))) throw new Error(`setup: target line missing ${JSON.stringify(edsBefore)}`);
    const focusV = await b.ev(`(()=>{const a=document.activeElement;return a?(a.tagName+':'+(a.value??'')).slice(0,80):null})()`);
    const addTxt = kind === 'plain' ? ' plus p' : kind === 'headline' ? ' plus t' : ' plus h';
    await typeText(addTxt, 90); await sleep(1000);
    const edsAfter = await edsM();
    const typed = edsAfter.some((x) => x.includes(addTxt.trim()));
    await sleep(3000);
    const toasts = await toastsM();
    const headingToasts = (toasts || []).filter((x) => /heading changes could not/i.test(x.s)).length;
    rule = () => 'continue'; await blurOutside(); await sleep(12000);
    const u = await serverUnits(id);
    row(name, id, { kind, keptCreated: failed, storedBefore, edsBefore, focusV, edsAfter, typed, toasts, headingToasts, failToasts: (toasts || []).filter((x) => /fail|could not|not be saved|not be completed/i.test(x.s)).length, units: u, landedTyped: plainM(u).join('|').includes(addTxt.trim()) }, true);
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
