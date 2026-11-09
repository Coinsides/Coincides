// A-20 arms from the read-only code workflow (wf_94bf6a46-930, critic top 5), Tester 11-08. Same file on pre and r1/r2.
//   SPLIT-<mid|home|mid401|midback>-i : 'alpha beta' saved; then an Enter inside it (after 'alpha', or at the start)
//        whose save fails; the page goes away (close) / the 401 road / Back. Reopen. Saved words must not disappear.
//   RETRY-<del|more>-i : 'alpha' Enter 'beta' while text-save fails; network back; one click-away retry saves all; then
//        delete 'beta' (del) or add ' more' (more) and save; leave by hash; reopen: 'beta' must not come back / no box.
//   STALE-<back|edit>-i : ' tail words' at the end of 'warmup', its save reaches the server but the reply is late, page
//        closes; then ANOTHER browser context (own login, own storage = another device) sets the line back to 'warmup'
//        (back) or to 'warmup tail words edited elsewhere' (edit); reopen here: no resurrection, no false box.
//   TWICE-<hash|back|paste|hash500>-i : a held hash leave waits for its save; 800 ms later a second move (hash to C,
//        Back, or same-document paste to C); then the held save goes (2xx, or 500). Alerts, late jumps, copies.
//        hash500 (Main_Designer 11-08, third ruling "TWICE-hash500 再裁"): the leave's recheck round re-sends the group
//        after a one-time 500. Green = 'twice words' on the server exactly once and exact, the person lands on the newest
//        destination C (never X), and the reopen shows no Apply. Messages are recorded (toastsAll with where each one
//        showed and where it ended), not gated: they belong to A-25 (e). Runs on every package.
//   BACKOK-<plain|slow>-i : GONEFAIL-back setup, 'back ok words', Back with a healthy network (slow = reply 800 ms
//        late). Does 'did not reach the server' or 'could not be saved' show though the server has the words once?
const J_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantJ = (n) => !J_ONLY || J_ONLY.some((p) => n.startsWith(p));
const REPSJ = Number(process.env.REPS || 1);
const CDPJ = Number(process.env.CDPPORT || 9640);
const alertsJ = () => b.ev('(window.__alerts||[]).slice()').catch(() => null);
const plainJ = (units) => units.map((x) => x.replace(/^\[[a-z_0-9]+\]/, ''));
const countJ = (units, s) => plainJ(units).join('|').split(s).length - 1;
const EDSJ = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,w:r.width,h:r.height}})`;
const edsJ = async () => (await b.ev(EDSJ).catch(() => [])).map((e) => e.v);
const clickEndJ = async (pred) => { const eds = await b.ev(EDSJ); const e = eds.find(pred) || null; if (!e) return false; await b.click(e.x + Math.max(10, Math.min(e.w - 10, 300)), e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('End', 'End', 35); await sleep(150); return true; };
const RECOVJ = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;
const banners=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast],[class*=ecover],[class*=banner],[class*=Banner]')].filter(vis).map((x)=>x.innerText.replace(/\s+/g,' ').trim().slice(0,160)).filter(Boolean);
return {banners:[...new Set(banners)].slice(0,4),apply:[...document.querySelectorAll('button')].filter(vis).some((x)=>/^apply$/i.test(x.textContent.trim()))}})()`;
const whereJ = async (ids) => { const h = await b.ev('location.hash').catch(() => null); if (!h) return h; for (const [k, v] of Object.entries(ids)) if (h.includes(v)) return k; return h.replace(/[0-9a-f-]{36}/g, ':id'); };
const putsJ = () => net.filter((l) => /text-save/.test(l));
const freshToken = async () => (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) })).json()).token;
const tokenBackJ = async () => { const t = await freshToken(); await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(t)}); 1`).catch(() => {}); };
const watchNJ_SRC = String.raw`(()=>{const T0=performance.now();window.__toastsN=[];const seen=new WeakSet();const sel='[role=alert],[class*=toast],[class*=Toast]';const live=[];
const vis=(el)=>el.isConnected&&el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&el.getBoundingClientRect().width>0;
const take=(el)=>{if(seen.has(el))return;seen.add(el);const rec={t:Math.round(performance.now()-T0),s:'',hashAt:location.hash,end:null,hashEnd:null};setTimeout(()=>{rec.s=(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,90);if(rec.s){window.__toastsN.push(rec);live.push([el,rec])}},60)};
setInterval(()=>{for(const [el,rec] of live){if(rec.end===null&&!vis(el)){rec.end=Math.round(performance.now()-T0);rec.hashEnd=location.hash}}},100);
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches&&n.matches(sel))take(n);if(n.querySelectorAll)for(const x of n.querySelectorAll(sel))take(x)}}).observe(document.body,{childList:true,subtree:true});1})()`;
const watchNJ = () => b.ev(watchNJ_SRC);
const toastsNJ = () => b.ev('(window.__toastsN||[]).slice()').catch(() => null);
const clickApplyJ = async () => { const p = await b.ev(`(()=>{const x=[...document.querySelectorAll('button')].find((e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&/^apply$/i.test(e.textContent.trim()));if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`).catch(() => null); if (!p) return false; await b.click(p.x, p.y); return true; };
const leftJ = (n) => press('ArrowLeft', 'ArrowLeft', 37).then(async () => { for (let k = 1; k < n; k += 1) await press('ArrowLeft', 'ArrowLeft', 37); });
const backJ = async () => { const h = await b.cdp('Page.getNavigationHistory'); await b.cdp('Page.navigateToHistoryEntry', { entryId: h.result.entries[h.result.currentIndex - 1].id }); };
const readJ = async (id, words) => {
  await open(id); await sleep(1000);
  const at1 = { eds: await edsJ(), boxes: (await boxes().catch(() => [])).map((x) => x.v), seen: await b.ev(RECOVJ).catch(() => null), alerts: await alertsJ() };
  await sleep(7000);
  const u = await serverUnits(id);
  return { at1, eds8: await edsJ(), boxes8: (await boxes().catch(() => [])).map((x) => x.v), stored8: await storedFor(id).catch(() => null), units: u, counts: Object.fromEntries(words.map((w) => [w, countJ(u, w)])) };
};
// Another device: an isolated browser context with its own storage and login.
async function otherDevice(url) {
  // Browser-level session (the page session cannot create browser contexts).
  const bv = await (await fetch(`http://127.0.0.1:${CDPJ}/json/version`)).json();
  const bws = new WebSocket(bv.webSocketDebuggerUrl); await new Promise((r) => bws.addEventListener('open', r));
  let bn = 0; const bp = new Map(); bws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && bp.has(m.id)) { bp.get(m.id)(m); bp.delete(m.id); } });
  const bc = (method, params = {}) => new Promise((res) => { const i = ++bn; bp.set(i, res); bws.send(JSON.stringify({ id: i, method, params })); });
  const ctx = (await bc('Target.createBrowserContext', {})).result.browserContextId;
  const t = await bc('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
  const tid = t.result?.targetId; let wsUrl = null;
  for (let i = 0; i < 40 && !wsUrl; i += 1) { const l = await (await fetch(`http://127.0.0.1:${CDPJ}/json/list`)).json(); wsUrl = l.find((x) => x.id === tid)?.webSocketDebuggerUrl; if (!wsUrl) await sleep(150); }
  const ws = new WebSocket(wsUrl); await new Promise((r) => ws.addEventListener('open', r));
  let n = 0; const pend = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const c2 = (method, params = {}) => new Promise((res) => { const i = ++n; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev2 = async (expression) => { const r = await c2('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  await c2('Page.enable'); await c2('Runtime.enable');
  await c2('Page.navigate', { url: `${ORIGIN}/#/login` }); await sleep(2500);
  await ev2(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(await freshToken())}); 1`);
  await c2('Page.navigate', { url });
  const s0 = Date.now(); while (Date.now() - s0 < 30000) { if (await ev2(`document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]').length>0`).catch(() => false)) break; await sleep(250); }
  await sleep(2000);
  const click2 = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await c2('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  const key2 = async (k, code, vk, text) => { await c2('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text }); await c2('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
  const type2 = async (s) => { for (const c of s) { if (c === ' ') await key2(' ', 'Space', 32, ' '); else await key2(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(80); } };
  return { ev2, click2, key2, type2, close: async () => { try { await bc('Target.closeTarget', { targetId: tid }); } catch {} try { ws.close(); } catch {} try { await bc('Target.disposeBrowserContext', { browserContextId: ctx }); } catch {} try { bws.close(); } catch {} } };
}

// Box controls (r2, Main_Designer 11-08: put-back is manual, never automatic). List the buttons on each box's notice;
// press a put-back control if one exists (r2 may add it; the manual today has only copy/paste + Discard).
const boxButtonsJ = () => b.ev(`[...document.querySelectorAll('[data-structure-typing-notice] button')].filter(x=>x.getBoundingClientRect().width>0).map(x=>(x.textContent||x.getAttribute('aria-label')||'').trim())`).catch(() => null);
const putBackJ = async () => { const p = await b.ev(`(()=>{const x=[...document.querySelectorAll('[data-structure-typing-notice] button,button')].find(e=>e.getBoundingClientRect().width>0&&/put back|restore|insert|place|放回/i.test((e.textContent||e.getAttribute('aria-label')||'').trim()));if(!x)return null;const r=x.getBoundingClientRect();return {t:(x.textContent||'').trim(),x:r.left+r.width/2,y:r.top+r.height/2}})()`).catch(() => null); if (!p) return null; await b.click(p.x, p.y); await sleep(3000); await blurOutside(); await sleep(3000); return p.t; };
for (const how of ['mid', 'home', 'mid401', 'midback']) for (let i = 0; i < REPSJ; i += 1) {
  const name = `SPLIT-${how}-${i}`; if (!wantJ(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 split ${how} ${i}`);
    await typeText('alpha beta', 90); await sleep(300); await blurOutside(); await sleep(2500);
    const saved = await serverUnits(id);
    if (how === 'midback') { await goHash(other); await sleep(1500); await goHash(id); await sleep(3000); }
    if (!(await clickEndJ((e) => e.v === 'alpha beta'))) throw new Error(`setup: no 'alpha beta' line: ${JSON.stringify(await edsJ())}`);
    await watch(); mark();
    let first = true;
    if (how === 'mid401') rule = ({ u }) => (/text-save/.test(u) ? '401' : 'continue');
    else if (how === 'midback') rule = ({ u }) => { if (first && /text-save/.test(u)) { first = false; return 'hold'; } return 'continue'; };
    else rule = ({ u }) => (/text-save/.test(u) ? 'neterr' : 'continue');
    if (how === 'home') await press('Home', 'Home', 36); else await leftJ(5);
    await sleep(150); await enter(); await sleep(how === 'mid401' ? 3500 : 600);
    const edsSplit = await edsJ(); const alertsSplit = await alertsJ();
    if (how === 'mid' || how === 'home') { await sleep(300); await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1500); }
    else if (how === 'midback') { await backJ(); await sleep(2500); const rid = held.shift(); if (rid) await fail500(rid); await sleep(1500); }
    rule = () => 'continue'; held.length = 0;
    if (how === 'mid401') await tokenBackJ();
    const back = await readJ(id, ['alpha', 'beta']);
    const boxButtons = (back.boxes8 || []).length ? await boxButtonsJ() : null;
    const putBack = (back.boxes8 || []).length ? await putBackJ() : null;
    const afterPut = putBack ? await serverUnits(id) : null;
    const dupAfterPut = afterPut ? countJ(afterPut, 'alpha') > 1 || countJ(afterPut, 'beta') > 1 : false;
    const ok = back.counts.alpha === 1 && back.counts.beta === 1 && !dupAfterPut;
    row(name, id, { how, saved, edsSplit, alertsSplit, ...back, boxButtons, putBack, afterPut, dupAfterPut, puts: putsJ() }, ok);
  });
}

for (const how of ['del', 'more']) for (let i = 0; i < REPSJ; i += 1) {
  const name = `RETRY-${how}-${i}`; if (!wantJ(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 retry ${how} ${i}`); await watch(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await typeText('alpha', 90); await enter(); await sleep(60); await typeText('beta', 90); await sleep(300); await blurOutside(); await sleep(2000);
    const alertsFail = await alertsJ();
    rule = () => 'continue';
    if (!(await clickEndJ((e) => e.v === 'warmup'))) throw new Error('setup: no warmup line');
    await blurOutside(); await sleep(2500);
    const afterRetry = await serverUnits(id);
    if (!(await clickEndJ((e) => e.v === 'beta'))) throw new Error(`setup: no beta line: ${JSON.stringify(await edsJ())}`);
    if (how === 'del') { for (let k = 0; k < 4; k += 1) await press('Backspace', 'Backspace', 8); } else await typeText(' more', 90);
    await sleep(2600); await blurOutside(); await sleep(2000);
    const afterEdit = await serverUnits(id);
    await goHash(other); await sleep(2000);
    const storedLeft = await storedFor(id).catch(() => null);
    await sleep(800);
    const back = await readJ(id, ['beta', 'more']);
    const ok = how === 'del' ? back.counts.beta === 0 && !(back.boxes8 || []).some((v) => v.includes('beta')) : back.counts.beta === 1 && !(back.boxes8 || []).length && !(back.at1.boxes || []).length;
    row(name, id, { how, alertsFail, afterRetry, afterEdit, storedLeft, ...back, puts: putsJ() }, ok);
  });
}

for (const how of ['back', 'edit']) for (let i = 0; i < REPSJ; i += 1) {
  const name = `STALE-${how}-${i}`; if (!wantJ(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 stale ${how} ${i}`);
    if (!(await clickEndJ((e) => e.v === 'warmup'))) throw new Error('setup: no warmup line');
    await watch(); mark();
    let first = true; respRule = ({ u }) => { if (first && /text-save/.test(u)) { first = false; return { delay: 2500 }; } return null; };
    await typeText(' tail words', 90); await sleep(300);
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(3000); respRule = () => null;
    const atClose = await serverUnits(id);
    // another device
    const d = await otherDevice(`${ORIGIN}/?r=${Date.now()}#/notes/${id}`);
    const p = await d.ev2(`(()=>{const e=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].find(x=>x.getBoundingClientRect().width>0&&x.value.startsWith('warmup'));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+Math.min(r.width-10,300),y:r.top+Math.min(r.height,24)/2,v:e.value}})()`);
    if (!p) { await d.close(); throw new Error('other device: no warmup line'); }
    await d.click2(p.x, p.y); await sleep(300); await d.key2('End', 'End', 35); await sleep(150);
    if (how === 'back') { for (let k = 0; k < ' tail words'.length; k += 1) { await d.key2('Backspace', 'Backspace', 8); await sleep(60); } } else await d.type2(' edited elsewhere');
    await sleep(300); await d.click2(1380, 300); await sleep(3500);
    const otherDeviceLine = await d.ev2(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].map(x=>x.value)`);
    await d.close();
    const afterOther = await serverUnits(id);
    const back = await readJ(id, ['tail words', 'edited elsewhere']);
    const want = how === 'back' ? 'warmup' : 'warmup tail words edited elsewhere';
    const line0 = plainJ(back.units)[0];
    const ok = line0 === want && !(back.boxes8 || []).length && !(back.at1.boxes || []).length;
    row(name, id, { how, atClose, otherDeviceLine, afterOther, ...back, line0, want, puts: putsJ() }, ok);
  });
}

for (const how of ['hash', 'back', 'paste', 'hash500']) for (let i = 0; i < REPSJ; i += 1) {
  const name = `TWICE-${how}-${i}`; if (!wantJ(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 twice ${how} ${i}`); const C = await newNote(`A20 twice c ${how} ${i}`);
    await watch(); await watchNJ(); mark();
    let first = true; rule = ({ u }) => { if (first && /text-save/.test(u)) { first = false; return 'hold'; } return 'continue'; };
    await typeText('twice words', 90); await sleep(300);
    await goHash(other); await sleep(800);
    const ids = { A: id, other, C };
    const where1 = await whereJ(ids);
    if (how === 'hash' || how === 'hash500') await b.ev(`location.hash='#/notes/${C}'; 1`);
    else if (how === 'back') await backJ();
    else { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${C}`) }); }
    await sleep(1000);
    const where2 = await whereJ(ids); const alerts2 = await alertsJ();
    const rid = held.shift(); if (rid) { if (how === 'hash500') await fail500(rid); else await b.cdp('Fetch.continueRequest', { requestId: rid }).catch(() => {}); }
    rule = () => 'continue';
    const tl = []; for (let k = 0; k < 12; k += 1) { await sleep(250); tl.push(await whereJ(ids)); }
    const where3 = tl[tl.length - 1]; const jumps = [...new Set(tl)];
    const alerts3 = await alertsJ();
    if (how === 'hash500') {
      const placeJ = (h) => (h == null ? null : h.includes(id) ? 'A' : h.includes(other) ? 'other' : h.includes(C) ? 'C' : h.replace(/[0-9a-f-]{36}/g, ':id'));
      const toastsAll = ((await toastsNJ()) || []).map((x) => ({ t: x.t, s: x.s, at: placeJ(x.hashAt), end: x.end, endAt: placeJ(x.hashEnd), stillVisibleAtRead: x.end === null, whereAtRead: where3 }));
      const failToasts = (toastsAll || []).filter((x) => /could not|did not reach|not be saved|fail/i.test(x.s));
      const inEditor = (await edsJ()).some((v) => v.includes('twice words'));
      await open(id); await sleep(1500);
      const seen = await b.ev(RECOVJ).catch(() => null); const boxes1 = (await boxes().catch(() => [])).map((x) => x.v);
      const before = await serverUnits(id); const countBefore = countJ(before, 'twice words');
      const applied = seen && seen.apply ? await clickApplyJ() : false;
      await sleep(applied ? 1500 : 0);
      const edsApplied = await edsJ();
      await blurOutside(); await sleep(6000);
      const u = await serverUnits(id); const count = countJ(u, 'twice words');
      const exact = plainJ(u).includes('twice words');
      const a25Forward = countBefore === 1 && !(seen && seen.apply);
      row(name, id, { how, heldOne: !!rid, where1, where2, alerts2, where3, jumps, alerts3, toastsAll, failToasts: failToasts.length, inEditor, seen, boxes1, countBefore, applied, edsApplied, units: u, count, exact, a25Forward, puts: putsJ() },
        count === 1 && exact && where3 === 'C' && !jumps.includes('other') && !(seen && seen.apply));
    } else {
      const back = await readJ(id, ['twice words']);
      const falseMsg = (alerts3 || []).some((a) => /could not be saved|did not reach/i.test(a));
      row(name, id, { how, heldOne: !!rid, where1, where2, alerts2, where3, jumps, alerts3, falseMsg, ...back, puts: putsJ() }, back.counts['twice words'] === 1 && !falseMsg && !jumps.includes('other'));
    }
  });
}

for (const how of ['plain', 'slow']) for (let i = 0; i < REPSJ; i += 1) {
  const name = `BACKOK-${how}-${i}`; if (!wantJ(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 backok ${how} ${i}`);
    await goHash(other); await sleep(1500); await goHash(id); await sleep(3000);
    if (!(await clickEndJ((e) => e.v === ''))) throw new Error('setup: no empty line');
    await watch(); mark();
    if (how === 'slow') { let first = true; respRule = ({ u }) => { if (first && /text-save/.test(u)) { first = false; return { delay: 800 }; } return null; }; }
    await typeText('back ok words', 90); await sleep(300);
    await backJ(); await sleep(3500); respRule = () => null;
    const where = await whereJ({ A: id, other }); const alerts = await alertsJ();
    const back = await readJ(id, ['back ok words']);
    const falseMsg = (alerts || []).some((a) => /could not be saved|did not reach/i.test(a));
    row(name, id, { how, where, alerts, falseMsg, ...back, puts: putsJ() }, back.counts['back ok words'] === 1 && !falseMsg);
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
