// A-20 arms, second set (Main_Designer 11-08 after A-20 went to A). Same file before and after.
//   LEAVE-<path>-<back>-i : type a sentence in note A (no Enter), 300 ms later leave by <path>:
//        hash  = script sets location.hash to note B
//        paste = the browser navigates to the CURRENT url with only the '#' part changed (same-document, as pasting
//                another note's /#/notes/<id> link into the address bar)
//        401   = every text-save answered 401, then a blur (the app goes to login, clears the token)
//      then 3.5 s, then come back by <back>:
//        tab    = same tab, full navigation to A (sessionStorage kept)        [token put back first for 401]
//        newtab = a NEW tab (CDP Target.createTarget), A opened there (empty sessionStorage)
//        inapp  = same tab, hash back to A (no reload)                        [401: fresh login token first]
//      Read: the recovery banner (text + buttons), sessionStorage recovery keys, kept boxes, server; then click Apply if
//      offered and read the server again.
//   EMPTYHASH-i : two empty notes, open A, script hash to B: toast?
//   LATE-i      : type 'first words' in A; hash to B with A's text-save held 3 s at request stage; hash back to A after
//                 1 s; type ' second'; blur; after the held request goes: server text, banner, Apply offered? (A
//                 post-fix arm; on the old code the hash leave sends nothing, so nothing is held.)
const B_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantB = (n) => !B_ONLY || B_ONLY.some((p) => n.startsWith(p));
const REPSB = Number(process.env.REPS || 3);
const CDP = Number(process.env.CDPPORT || 9640);
const alertsNow2 = () => b.ev('(window.__alerts||[]).slice()').catch(() => null);
const has2 = (units, s) => units.some((u) => u.includes(s));
const RECOV = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;
const banners=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast],[class*=ecover]')].filter(vis).map((x)=>x.innerText.replace(/\s+/g,' ').trim().slice(0,200)).filter(Boolean);
const apply=[...document.querySelectorAll('button')].filter(vis).some((x)=>/^apply$/i.test(x.textContent.trim()));
const ss=Object.keys(sessionStorage).filter((k)=>/recover|draft/i.test(k)).map((k)=>[k,String(sessionStorage.getItem(k)).slice(0,240)]);
return {banners:[...new Set(banners)].slice(0,6),apply,ss}})()`;
const clickApply = async (ev2, click2) => { const p = await ev2(`(()=>{const x=[...document.querySelectorAll('button')].find((e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&/^apply$/i.test(e.textContent.trim()));if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`).catch(() => null); if (!p) return false; await click2(p.x, p.y); return true; };
// A second tab over its own CDP websocket.
async function newTab(url) {
  const t = await b.cdp('Target.createTarget', { url: 'about:blank' });
  const id = t.result?.targetId;
  let wsUrl = null;
  for (let i = 0; i < 40 && !wsUrl; i += 1) { const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); wsUrl = l.find((x) => x.id === id)?.webSocketDebuggerUrl; if (!wsUrl) await sleep(150); }
  const ws = new WebSocket(wsUrl); await new Promise((r) => ws.addEventListener('open', r));
  let n = 0; const pend = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const cdp2 = (method, params = {}) => new Promise((res) => { const i = ++n; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev2 = async (expression) => { const r = await cdp2('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  const click2 = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await cdp2('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  await cdp2('Page.enable'); await cdp2('Runtime.enable');
  await cdp2('Page.navigate', { url });
  return { ev2, click2, close: async () => { try { await b.cdp('Target.closeTarget', { targetId: id }); } catch {} try { ws.close(); } catch {} } };
}
const waitIn = async (ev2, expr, ms) => { const s = Date.now(); for (;;) { if (await ev2(expr).catch(() => false)) return Date.now() - s; if (Date.now() - s > ms) return -1; await sleep(200); } };

for (const path of ['hash', 'paste', '401']) for (const back of ['tab', 'newtab', 'inapp']) for (let i = 0; i < REPSB; i += 1) {
  const name = `LEAVE-${path}-${back}-${i}`; if (!wantB(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 leave ${path} ${back} ${i}`); await watch(); mark();
    const words = `leave ${path} ${back} words ${'abcdefghijklmnop'[i % 16]}`.replace(/[^a-z ]/g, '');
    if (path === '401') rule = ({ u }) => (/text-save/.test(u) ? '401' : 'continue');
    await typeText(words, 90); await sleep(300);
    if (path === 'hash') await goHash(other);
    else if (path === 'paste') { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${other}`) }); }
    else await blurOutside();
    await sleep(3500);
    const where = await b.ev('location.hash').catch(() => null); const alertsAway = await alertsNow2();
    const awaySS = await b.ev(RECOV).catch(() => null);
    rule = () => 'continue';
    const serverAway = await serverUnits(id);
    let seen = null; let applied = false;
    if (path === '401') {
      const fresh2 = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) })).json();
      await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(fresh2.token)}); 1`);
    }
    if (back === 'tab') {
      await open(id); await sleep(3500); seen = await b.ev(RECOV); applied = await clickApply(b.ev, b.click);
    } else if (back === 'inapp') {
      await goHash(id); await sleep(4500); seen = await b.ev(RECOV); applied = await clickApply(b.ev, b.click);
    } else {
      const t2 = await newTab(`${ORIGIN}/#/notes/${id}`);
      await waitIn(t2.ev2, `!!document.querySelector('[data-note-host-mode]')`, 30000); await sleep(3500);
      seen = await t2.ev2(RECOV); applied = await clickApply(t2.ev2, t2.click2);
      if (applied) await sleep(3500);
      await t2.close();
    }
    if (applied && back !== 'newtab') { await sleep(3500); await blurOutside(); await sleep(2500); }
    const serverEnd = await serverUnits(id);
    row(name, id, { path, back, words, where, alertsAway, awaySS: awaySS && awaySS.ss, onServerAway: has2(serverAway, words), seen, applied, onServerEnd: has2(serverEnd, words), keptBoxes: (await boxes().catch(() => [])).map((x) => x.v), units: serverEnd }, true);
  });
}
for (let i = 0; i < REPSB; i += 1) {
  const name = `EMPTYHASH-${i}`; if (!wantB(name)) continue;
  await scenario(name, async () => {
    const a = await newNote(`A20 empty a ${i}`); const bNote = await newNote(`A20 empty b ${i}`);
    await open(a); await sleep(2500); await watch(); mark();
    await goHash(bNote); await sleep(3500);
    const alerts = await alertsNow2();
    row(name, a, { alerts, toast: (alerts || []).some((x) => /could not be saved/i.test(x)), requests: [...net] }, true);
  });
}
// LATE (response late, Main_Designer 11-08): the old note's save reaches the server at once but its RESPONSE is held
// 3 s; meanwhile come back and type ' second'. Expected after the fix: words on the server, no banner.
// LATEREQ (request late): the old note's save itself is held 3 s at request stage, so it reaches the server after the
// newer save. Observe: does older content overwrite newer, 409, banner?
for (const kind of ['LATE', 'LATEREQ']) for (let i = 0; i < REPSB; i += 1) {
  const name = `${kind}-${i}`; if (!wantB(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 ${kind.toLowerCase()} ${i}`); await watch(); mark();
    await typeText('first words', 90); await sleep(300);
    let heldOnce = false;
    if (kind === 'LATE') respRule = ({ u }) => { if (!heldOnce && /text-save/.test(u)) { heldOnce = true; return { delay: 3000 }; } return null; };
    else rule = ({ u }) => { if (!heldOnce && /text-save/.test(u)) { heldOnce = true; return { delay: 3000 }; } return 'continue'; };
    await goHash(other); await sleep(1000);
    await goHash(id); await sleep(1500);
    const lineBack = await b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].map(x=>x.value)`).catch(() => null);
    await clickTa(1).catch(async () => { await clickTa(0).catch(() => {}); }); await press('End', 'End', 35);
    await typeText(' second', 90); await blurOutside(); await sleep(5000);
    const seen = await b.ev(RECOV).catch(() => null);
    const serverMid = await serverUnits(id);
    const applied = await clickApply(b.ev, b.click); if (applied) { await sleep(3000); await blurOutside(); await sleep(2500); }
    const serverEnd = await serverUnits(id);
    respRule = () => null;
    row(name, id, { kind, heldOnce, lineBack, seen, serverMid, applied, serverEnd, requests: [...net].filter((l) => /text-save/.test(l)) }, true);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows`);
log.end(); await b.close(); process.exit(0);
