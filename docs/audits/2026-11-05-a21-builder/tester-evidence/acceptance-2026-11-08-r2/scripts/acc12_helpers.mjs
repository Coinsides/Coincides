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
