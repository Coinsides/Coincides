// Round-2 new arms (Tester, 2026-11-07, on the round-2 package):
//  KU    : the role-change save held, then the whole page unloads while it is still held (builder's third K arm).
//          Two leave times: 1.5 s after the words (inside the watchdog) and 11 s (after it gave up).
//  EDGE  : the edge the builder lists and Main_Designer ruled 2: words land from the window, the save carrying them
//          fails (500), the structure moves the unit to a new block, the page closes, reopen. Expected: box + words in
//          the note, no second copy inside the note. EDGE-a: the carrying save is held until the unit-transfer is
//          seen (max 4 s), then answered 500. EDGE-b: answered 500 at once.
//  HL2   : H-L with the first structure finished before Enter (3.5 s pause after 'head'), then Enter + 'body'.
//  HL3   : H-L with everything typed fast (30 ms per key), so the first structure is still running.
//  TWO2  : two kept records in one note made by the slow-reply address leave (the kept path that works in the browser),
//          then discard one: the other must stay on screen, in storage and after reopen.
//  GEO   : notice and box geometry over real neighbour lines (a line above and a line below the kept unit), plus a
//          click-and-type on each neighbour. Variants: noEnter (one-line box), enter (two-line box), long (one long line).
const ONLY11 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want11 = (name) => !ONLY11 || ONLY11.some((p) => name.startsWith(p));
const ROLE_SAVE = Number(process.env.ROLE_SAVE || 2);
const strip = (u) => u.replace(/^\[[a-z_0-9]+\]/, '');
const boxes = () => b.ev(`[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].map(t=>({v:t.value,entry:t.dataset.structureTypingEntry||null,vis:t.getBoundingClientRect().width>0}))`);
const fail500 = (rid) => b.cdp('Fetch.fulfillRequest', { requestId: rid, responseCode: 500, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"injected"}').toString('base64') }).catch(() => {});
const leavePage = () => b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${other}` });
const edAt = (prefix) => b.ev(`(()=>{const e=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].find(x=>x.getBoundingClientRect().width>0&&x.value.startsWith(${JSON.stringify(prefix)}));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,v:e.value}})()`);
const keptByLeave = async (words, withEnter, body, delay = 4000, gap = 90) => {
  respRule = ({ u }) => (/unit-transfer/.test(u) ? { delay } : null);
  await typeHash(); await typeText(words, gap);
  if (withEnter) { await enter(); await sleep(40); await typeText(body, 50); }
  await goHash(other); await sleep(Math.max(6000, delay + 2000));
  respRule = () => null;
  await goHash(lastId); await sleep(5000);
};
let lastId = null;
// Geometry of every box, its notice and every visible note line; overlap in px and what a click at each line would hit.
const GEO = `(()=>{const R=(e)=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,bottom:r.bottom,right:r.right,w:r.width,h:r.height}};const ov=(a,b)=>{const x=Math.min(a.right,b.right)-Math.max(a.left,b.left);const y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return x>0&&y>0?{x:Math.round(x),y:Math.round(y)}:null};const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0);const bx=[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].filter(e=>e.getBoundingClientRect().width>0);const ns=[...document.querySelectorAll('[data-structure-typing-notice]')].filter(e=>e.getBoundingClientRect().width>0);const what=(el)=>!el?null:el.closest('[data-structure-typing-notice]')?'NOTICE':el.matches('textarea[data-structure-typing-buffer]')?'BOX':el.dataset?.runtimeTextflowEditor?'EDITOR:'+el.value.slice(0,20):el.tagName+'.'+String(el.className).slice(0,24);const lines=eds.map(e=>{const r=R(e);const mid=r.top+Math.min(r.h,24)/2;return {v:e.value.slice(0,30),top:Math.round(r.top),h:Math.round(r.h),left:Math.round(r.left),w:Math.round(r.w),hitLeft:what(document.elementFromPoint(r.left+20,mid)),hitMid:what(document.elementFromPoint(r.left+r.w/2,mid))}});const boxes=bx.map(t=>{const r=R(t);const cs=getComputedStyle(t);const own=eds.find(e=>Math.abs(e.getBoundingClientRect().top-r.top)<4);return {v:t.value,entry:t.dataset.structureTypingEntry||null,styleLeft:t.style.left,styleTop:t.style.top,styleWidth:t.style.width,top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),padRight:cs.paddingRight,own:own?own.value.slice(0,30):null,covers:eds.filter(e=>e!==own).map(e=>({v:e.value.slice(0,30),ov:ov(r,R(e))})).filter(x=>x.ov&&x.ov.y>=3)}});const notices=ns.map(n=>{const r=R(n);const btn=n.querySelector('button');const box=bx.find(t=>{const q=R(t);return r.top>=q.top-1&&r.bottom<=q.bottom+1&&r.left>=q.left-1&&r.right<=q.right+1})||null;return {styleLeft:n.style.left,styleTop:n.style.top,text:(n.innerText||'').replace(/\\s+/g,' ').trim(),title:n.getAttribute('title')||n.getAttribute('aria-label')||'',btn:btn?(btn.textContent||'').trim():null,btnTitle:btn?(btn.getAttribute('title')||btn.getAttribute('aria-label')||''):'',pe:getComputedStyle(n).pointerEvents,btnPe:btn?getComputedStyle(btn).pointerEvents:null,top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),insideBox:Boolean(box),covers:eds.map(e=>({v:e.value.slice(0,30),ov:ov(r,R(e))})).filter(x=>x.ov)}});return {lines,boxes,notices}})()`;

const anchoredLine = (g, bx) => g.lines.find((l) => Math.abs(l.top - bx.top) < 4 && Math.min(bx.right, l.left + l.w) - Math.max(bx.left, l.left) > Math.min(50, l.w / 3)) || null;
const inv = (g) => {
  const bad = []; const info = [];
  const vis = g.boxes;
  for (const bx of vis) {
    if (bx.covers.length) bad.push(`box over ${bx.covers.map((c) => JSON.stringify(c.v)).join(',')}`);
    // Anchored = on its unit: same top AND overlapping that line sideways. A docked box beside the column can share a
    // top with some line without being on it.
    const own = anchoredLine(g, bx);
    if (own && bx.bottom - bx.top > own.h + 4) bad.push(`anchored box ${bx.bottom - bx.top}px taller than its line ${own.h}px`);
  }
  for (let a = 0; a < vis.length; a += 1) for (let c = a + 1; c < vis.length; c += 1) {
    const x = Math.min(vis[a].right, vis[c].right) - Math.max(vis[a].left, vis[c].left);
    const y = Math.min(vis[a].bottom, vis[c].bottom) - Math.max(vis[a].top, vis[c].top);
    if (x > 2 && y > 2) bad.push(`boxes ${a} and ${c} overlap ${Math.round(x)}x${Math.round(y)}`);
  }
  for (const n of g.notices) {
    // A notice inside an anchored box lies on that box's own line by design; only other lines count.
    const ownVals = new Set(vis.map((bx) => anchoredLine(g, bx)).filter(Boolean).map((l) => l.v));
    const others = n.covers.filter((c) => !ownVals.has(c.v));
    if (others.length) bad.push(`notice over ${others.map((c) => JSON.stringify(c.v)).join(',')}`);
    // Recorded only: r2.3 may stack a notice below its box; what matters is that it covers no line (checked above).
    if (vis.length && !n.insideBox) info.push('notice outside its box');
  }
  // Every line that is not a box's own unit must be hit as itself, at its left end and its middle.
  const owns = new Set(vis.map((bx) => anchoredLine(g, bx)).filter(Boolean).map((l) => `${l.v}@${l.top}`));
  for (const l of g.lines) {
    if (owns.has(`${l.v}@${l.top}`)) continue;
    // Only the box or its notice count as covering; the app's own block toolbar over an active line is not this order.
    for (const h of [l.hitLeft, l.hitMid]) if (h === 'BOX' || h === 'NOTICE') bad.push(`line ${JSON.stringify(l.v)} hit ${h}`);
  }
  return { folded: vis.length === 0 && g.notices.length > 0, boxes: vis.length, notices: g.notices.length, bad, info };
};
const showWordsAt = `(()=>{const btn=[...document.querySelectorAll('[data-structure-typing-notice] button')].find(x=>x.getBoundingClientRect().width>0&&/show words/i.test(x.textContent||''));if(!btn)return null;const r=btn.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`;
// KU: role-change save held, whole page unloads while it is held.
for (const [base, leaveAt] of [['KU-heldUnload-1.5s', 1500], ['KU-heldUnload-11s', 11000]]) for (let i = 0; i < 2; i += 1) {
  const name = `${base}-${i}`;
  if (!want11(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R ${base} ${i}`);
    await watch(); mark();
    let saves = 0;
    rule = ({ u }) => { if (/text-save/.test(u)) { saves += 1; if (saves === ROLE_SAVE) return 'hold'; } return 'continue'; };
    await typeHash(); await typeText('two'); await enter(); await sleep(60); await typeText('body');
    await sleep(leaveAt); const atLeave = await win(); const heldCount = held.length;
    await leavePage(); rule = () => 'continue'; held.length = 0;
    await sleep(12000);
    const blocksAway = await blocksOf(id);
    await open(id); await sleep(4500);
    const reopened = await win(); const blocksAfter = await blocksOf(id);
    lastStoredHere = await storedFor(id); await shot(`${name}-reopened`);
    const text = JSON.stringify(blocksAfter.flat().map(strip)) + JSON.stringify(lastStoredHere) + (reopened.buf || '');
    row(name, id, { heldCount, atLeave, blocksAway, reopened, blocksAfter }, ['two', 'body'].every((w) => text.includes(w)));
  });
}

// KRO: Main_Designer asks how the "whole note read-only while waiting for lastBatch" feels. The role-change save is
// held 12 s; at 2 s and 8 s a person clicks the end of the 'warmup' line and types; we read what the line shows at once,
// whether the editor is readOnly, and where the keys end up after release.
for (let i = 0; i < 2; i += 1) {
  const name = `KRO-readOnlyWhileHeld-${i}`;
  if (!want11(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R kro ${i}`);
    await watch(); mark();
    let saves = 0;
    rule = ({ u }) => { if (/text-save/.test(u)) { saves += 1; if (saves === ROLE_SAVE) return 'hold'; } return 'continue'; };
    await typeHash(); await typeText('two'); await enter(); await sleep(60); await typeText('body');
    const probes = [];
    for (const [at, add] of [[2000, ' zz'], [8000, ' xx']]) {
      await sleep(at === 2000 ? 2000 : 6000);
      const e = await edAt('warmup');
      if (!e) { probes.push({ at, found: false }); continue; }
      await b.click(e.x + 20, e.y + Math.min(e.h, 24) / 2); await sleep(300);
      const ro = await b.ev(`(()=>{const a=document.activeElement;return {tag:a?a.tagName:null,ro:a?Boolean(a.readOnly):null,isWarm:Boolean(a&&a.value&&a.value.startsWith('warmup')),anyRo:[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(x=>x.getBoundingClientRect().width>0).map(x=>x.readOnly)}})()`);
      await press('End', 'End', 35); await typeText(add, 90); await sleep(400);
      const shown = await edAt('warmup');
      probes.push({ at, ro, shown: shown ? shown.v : null, appeared: Boolean(shown && shown.v.includes(add.trim())) });
    }
    await sleep(2500); const heldCount = held.length;
    rule = () => 'continue'; await release(); await sleep(6000);
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    const units = blocks.flat().map(strip);
    row(name, id, { probes, heldCount, blocks, landedZ: units.find((u) => u.includes(' zz')) || null, landedX: units.find((u) => u.includes(' xx')) || null },
      ['two', 'body'].every((w) => JSON.stringify(units).includes(w)));
  });
}

// EDGE: carrying save fails, structure moves the unit, page closes, reopen.
for (const [base, how] of [['EDGE-a-failAfterTransfer', 'after'], ['EDGE-b-failAtOnce', 'atOnce']]) for (let i = 0; i < 2; i += 1) {
  const name = `${base}-${i}`;
  if (!want11(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R ${base} ${i}`);
    await watch(); mark();
    let heldBody = null; let failedAt = null;
    rule = ({ u, pd }) => {
      if (/text-save/.test(u) && /body/.test(pd || '') && !heldBody) { heldBody = 'pending'; return how === 'atOnce' ? '500' : 'hold'; }
      return 'continue';
    };
    await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 50);
    const tA = Date.now(); while (!heldBody && Date.now() - tA < 8000) await sleep(40);
    if (how === 'after') {
      const tB = Date.now(); const nBefore = net.length;
      while (Date.now() - tB < 4000 && !net.slice(nBefore).some((l) => /unit-transfer/.test(l))) await sleep(40);
      await sleep(150);
      while (held.length) await fail500(held.shift());
    }
    failedAt = Date.now() - t0;
    await sleep(3000);
    const beforeLeave = await win(); const geo = await b.ev(GEO); await shot(`${name}-failed`);
    const retryUi = await b.ev(`[...document.querySelectorAll('button')].filter(x=>x.getBoundingClientRect().width>0).map(x=>(x.textContent||'').trim()).filter(t=>/retry|undo/i.test(t))`);
    const blocksAtLeave = await blocksOf(id);
    await leavePage(); rule = () => 'continue';
    await sleep(12000);
    await open(id); await sleep(4500);
    const reopened = await win(); const blocksAfter = await blocksOf(id); const boxesAfter = await boxes();
    lastStoredHere = await storedFor(id); await shot(`${name}-reopened`);
    const units = blocksAfter.flat().map(strip);
    const inNote = JSON.stringify(units);
    const bodyInNote = inNote.split('body').length - 1;
    const kept = (reopened.buf || '') + JSON.stringify(lastStoredHere);
    const where = { head: inNote.includes('head') || kept.includes('head'), body: bodyInNote > 0 || kept.includes('body') };
    row(name, id, { heldBody, failedAt, beforeLeave, retryUi, geo, blocksAtLeave, reopened, boxesAfter, blocksAfter, bodyInNote, where },
      where.head && where.body && bodyInNote <= 1);
  });
}

// HL2 / HL3: two more timings of "words landed, their save not sent, page closed".
for (const [base, pauseAfterHead, gap] of [['HL2-afterFirstStructure', 3500, 90], ['HL3-allFast', 0, 30]]) for (let i = 0; i < 3; i += 1) {
  const name = `${base}-${i}`;
  if (!want11(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R ${base} ${i}`); lastId = id;
    await open(other); await sleep(1500); await goHash(id); await sleep(2500);
    await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500);
    await watch(); mark();
    let heldBody = false;
    rule = ({ u, pd }) => { if (/text-save/.test(u) && /body/.test(pd || '')) { heldBody = true; return 'hold'; } return 'continue'; };
    await typeHash(); await typeText('head', gap); if (pauseAfterHead) await sleep(pauseAfterHead);
    await enter(); await sleep(gap === 30 ? 20 : 40); await typeText('body', gap === 30 ? 30 : 50);
    const tA = Date.now(); while (!heldBody && Date.now() - tA < 8000) await sleep(40);
    await sleep(150);
    const atLeave = await win(); const netAtLeave = [...net];
    await leavePage(); rule = () => 'continue'; held.length = 0;
    await sleep(12000);
    const blocksAway = await blocksOf(id); const storedBefore = await storedFor(id);
    await open(id); await sleep(4500);
    const reopened = await win(); const sb = await blocksOf(id);
    lastStoredHere = await storedFor(id); await shot(`${name}-reopened`);
    const all = JSON.stringify(sb.flat().map(strip)) + (reopened.buf || '') + JSON.stringify(lastStoredHere);
    row(name, id, { heldBody, atLeave, netAtLeave, blocksAway, storedBefore, reopened, blocks: sb }, all.includes('head') && all.includes('body'));
  });
}

// TWO2: two kept records made by the slow-reply address leave, then discard one.
for (let i = 0; i < Number(process.env.TWO2REPS || 3); i += 1) {
  const name = `TWO2-discardOne-${i}`;
  if (!want11(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R two2 ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    await keptByLeave('one', true, 'aaa');
    const s1 = await boxes();
    const w = await edAt('warmup');
    if (w) { await b.click(w.x + 40, w.y + 10); await sleep(300); await press('End', 'End', 35); await sleep(200); await enter(); await sleep(2500); }
    await keptByLeave('two', true, 'bbb');
    const s1b = await boxes();
    await open(id); await sleep(4500);
    const s2 = await boxes(); const stored2 = await storedFor(id); const geo2 = await b.ev(GEO); await shot(`${name}-two-kept`);
    const has = (list, w2) => list.some((x) => x.v.includes(w2));
    // Two distinct boxes: one holding 'one' and another holding 'two' (one box holding both does not count).
    const precondition = s2.length >= 2 && s2.some((x) => x.v.includes('one') && !x.v.includes('two')) && s2.some((x) => x.v.includes('two') && !x.v.includes('one'));
    const target = s2.find((x) => x.v.includes('one'));
    const at = target ? await b.ev(`(()=>{const ns=[...document.querySelectorAll('[data-structure-typing-notice]')];const box=[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].find(t=>t.dataset.structureTypingEntry===${JSON.stringify(target.entry)});let n=ns.find(x=>(x.dataset.structureTypingEntry||x.closest('[data-structure-typing-entry]')?.dataset.structureTypingEntry)===${JSON.stringify(target.entry)})||null;let how=n?'tag':null;if(!n&&box){const br=box.getBoundingClientRect();let best=null;for(const x of ns){const r=x.getBoundingClientRect();const inside=r.top>=br.top-1&&r.bottom<=br.bottom+1;const d=inside?0:Math.abs(r.top-br.top)+Math.abs(r.right-br.right);if(best===null||d<best.d)best={x,d}}n=best?best.x:null;how=n?'inside-or-nearest':null}const btn=n&&n.querySelector('button');if(!btn)return {found:false};const r=btn.getBoundingClientRect();return {found:true,how,x:r.x+r.width/2,y:r.y+r.height/2,label:(btn.textContent||'').trim()}})()`) : null;
    if (precondition && at && at.found) { await b.click(at.x, at.y); await sleep(1500); }
    const s3 = await boxes(); const stored3 = await storedFor(id);
    await open(id); await sleep(4500);
    const s4 = await boxes(); const stored4 = await storedFor(id); const blocks = await blocksOf(id);
    lastStoredHere = stored4; await shot(`${name}-reloaded`);
    const twoSurvives = has(s3, 'two') && !has(s3, 'one') && JSON.stringify(stored3).includes('two') && !JSON.stringify(stored3).includes('one')
      && (has(s4, 'two') || flat(blocks).includes('two')) && !has(s4, 'one');
    const inv2 = inv(geo2);
    row(name, id, { s1, s1b, s2, stored2, geo2, inv2, at, s3, stored3, s4, stored4, blocks, precondition, void: precondition ? null : 'two kept records were not both on screen' },
      !precondition || (Boolean(at && at.found) && twoSurvives && inv2.bad.length === 0));
  });
}

// GEO: a line above and a line below the kept unit; measure, then click and type on each neighbour.
// r2.3 invariants (Main_Designer 2026-11-07): no box or notice over any line other than the box's own unit; an anchored
// box no taller than its unit's line; no two boxes overlap; a docked box passes the same check, or folds to the notice
// strip with 'Show words'. Checked on every snapshot (kept, scrolled, back, resized), not only the first.
// narrow* variants set a narrower viewport before the setup so the side room runs out and the fold path is reached.
for (const [variant, words, withEnter, body, delay, gap, width] of [
  ['noEnter', 'kept', false, '', 4000, 90, 0],
  ['enter', 'kept', true, 'body', 4000, 90, 0],
  ['long', `kept ${'wrap '.repeat(22)}end`, false, '', 9000, 30, 0],
  ['narrow1100', 'kept', true, 'body', 4000, 90, 1100],
  ['narrow950', 'kept', true, 'body', 4000, 90, 950],
  ['narrow760', 'kept', true, 'body', 4000, 90, 760],
]) for (let i = 0; i < 2; i += 1) {
  const name = `GEO-${variant}-${i}`;
  if (!want11(name)) continue;
  await scenario(name, async () => {
    try {
      const id = await newNote(`R geo ${variant} ${i}`); lastId = id;
      await arriveAndWarm(id);
      await typeText('below', 50); await sleep(2500);
      const w = await edAt('warmup');
      if (w) { await b.click(w.x + 120, w.y + 10); await sleep(300); await press('End', 'End', 35); await sleep(200); await enter(); await sleep(2500); }
      // Narrow variants: the viewport is narrowed after the lines are typed (at 950 px the first click finds no editor),
      // before the leave, so the box is placed on return under the narrow layout.
      if (width) { await b.cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(1200); }
      await watch(); mark();
      await keptByLeave(words, withEnter, body, delay, gap);
      const g0 = await b.ev(GEO); const s0 = await boxes(); await shot(`${name}-kept`);
      // Folded: open it with 'Show words', measure, close again.
      let gShow = null; const sw = await b.ev(showWordsAt);
      if (sw) { await b.click(sw.x, sw.y); await sleep(800); gShow = await b.ev(GEO); await shot(`${name}-shown`); const hw = await b.ev(showWordsAt.replace('show words', 'hide words')); if (hw) { await b.click(hw.x, hw.y); await sleep(600); } }
      await b.wheel(820, 600, 240); await sleep(1200); const gs = await b.ev(GEO); await shot(`${name}-scrolled`);
      await b.wheel(820, 600, -240); await sleep(1200); const gsBack = await b.ev(GEO);
      await b.cdp('Emulation.setDeviceMetricsOverride', { width: width ? width - 150 : 1100, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(1500);
      const gr = await b.ev(GEO); await shot(`${name}-resized`);
      if (width) await b.cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      else await b.cdp('Emulation.clearDeviceMetricsOverride');
      await sleep(1500);
      const ownV = g0.boxes.map((bx) => bx.own);
      const track = (g) => g.boxes.map((bx, k) => { const own = g.lines.find((l) => l.v === ownV[k]) || null; return { boxTop: bx.top, own: ownV[k], ownTop: own ? own.top : null, dy: own ? bx.top - own.top : null }; });
      const scrollTrack = { before: track(g0), scrolled: track(gs), back: track(gsBack), resized: track(gr), linesScrolled: gs.lines.map((l) => [l.v, l.top]) };
      const invs = { kept: inv(g0), shown: gShow ? inv(gShow) : null, scrolled: inv(gs), back: inv(gsBack), resized: inv(gr) };
      const typed = {};
      for (const [line, add] of [['warmup', ' up'], ['below', ' down']]) {
        const e = await edAt(line);
        if (!e) { typed[line] = 'line not found'; continue; }
        await b.click(e.x + 120, e.y + Math.min(e.h, 24) / 2); await sleep(400);
        const act = (await win()).active;
        await press('End', 'End', 35); await sleep(150); await typeText(add, 90); await sleep(1500);
        const after = await edAt(line);
        typed[line] = { active: act, after: after ? after.v : null, ok: Boolean(after && after.v.endsWith(add)) };
      }
      await blurOutside(); await sleep(3500);
      const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
      const units = blocks.flat().map(strip);
      const kept = s0.length > 0;
      const keptWords = JSON.stringify(lastStoredHere).includes(words.split(' ')[0]) || s0.some((x) => x.v.includes(words.split(' ')[0]));
      const geomOk = ['kept', 'scrolled', 'back', 'resized'].every((k) => invs[k].bad.length === 0);
      const neighboursOk = typed.warmup?.ok && typed.below?.ok && units.some((u) => u.endsWith(' up')) && units.some((u) => u.endsWith(' down'));
      row(name, id, { width, kept, keptWords, s0, g0, gShow, invs, scrollTrack, typed, blocks, geomOk, neighboursOk, void: kept ? null : 'no kept box was produced' },
        !kept || (geomOk && neighboursOk));
    } finally {
      await b.cdp('Emulation.clearDeviceMetricsOverride').catch(() => {});
    }
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
