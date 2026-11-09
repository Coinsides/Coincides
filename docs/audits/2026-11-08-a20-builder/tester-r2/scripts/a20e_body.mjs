// A-20 r2 positive controls (Main_Designer 11-08, order "A-20 返修 r2" + "r2 范围补齐"): Reviewer K1/K2/K3/K5/K6 and the
// IME shape of K1. Red expected on r1, green on r2. Same file on both. Every arm: fresh note, 'warmup' Enter, then the
// unit 'note' saved by a click outside (the confirmed base), then click back at its end.
//   K1-<401hash|401blur|close|paste>-i : ' alpha', 2.6 s pause (idle save -> server 'note alpha'), ' beta', then the last
//        text-save is refused: 401hash = text-save 401 + script hash leave; 401blur = text-save 401 + click outside (token
//        expiry path); close = held at request stage + about:blank; paste = held + same-document address-bar leave, the
//        held one answered 500 after 2 s. Come back by a full reopen (token put back first). Expected r2: the line ends
//        'note alpha beta', 'alpha' exactly once. r1 (Reviewer): 'note alpha beta alpha'.
//   K1IME-i : as K1-401hash, with Chinese compositions instead: '现值', 2.6 s, '公式'.
//   K2-<hash|paste>-i : text-save 500; ' gamma'; click outside (the save fails); click back; Ctrl+Z (line back to 'note');
//        network back; leave; come back. Expected r2: 'gamma' does not come back, no kept record. r1: it lands again.
//   K5-i : text-save fails at the network layer; ' delta'; 3 s pause (idle save fails). Same mount: banner with Apply?
//        Then ' more' + 3 s; network back; if Apply is offered, click it: does the live line lose ' more'?
//        Expected r2: no Apply banner in the same mount, live text never overwritten.
//   K3-i : the account request (GET /auth/me) is delayed 15 s on a full reopen; type ' kthree' and click outside with
//        text-save answered 401 while the account is not loaded. Then sign in again and reopen: is the edit offered
//        (banner + Apply)? Dismiss it, reopen: gone? Storage key names read at each step.
//   K6-<push|replace>-i : X -> A (hash), type ' ksix', then leave A to B by script (push: location.hash; replace:
//        location.replace). Back once: where? History entries. Expected: push -> A; replace -> X (not A).
const E_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantE = (n) => !E_ONLY || E_ONLY.some((p) => n.startsWith(p));
const REPSE = Number(process.env.REPS || 2);
const alertsE = () => b.ev('(window.__alerts||[]).slice()').catch(() => null);
const plainE = (units) => units.map((x) => x.replace(/^\[[a-z_0-9]+\]/, ''));
const countE = (units, s) => plainE(units).join('|').split(s).length - 1;
const EDSE = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,w:r.width,h:r.height}})`;
const edValsE = async () => (await b.ev(EDSE).catch(() => [])).map((e) => e.v);
const clickEndE = async (pred) => { const eds = await b.ev(EDSE); const e = eds.find(pred) || null; if (!e) return false; await b.click(e.x + Math.max(10, Math.min(e.w - 10, 300)), e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('End', 'End', 35); await sleep(150); return true; };
const whereE = async (ids) => { const h = await b.ev('location.hash').catch(() => null); if (!h) return h; for (const [k, v] of Object.entries(ids)) if (h.includes(v)) return k; return h.replace(/[0-9a-f-]{36}/g, ':id'); };
const RECOVE = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;
const banners=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast],[class*=ecover],[class*=banner],[class*=Banner]')].filter(vis).map((x)=>x.innerText.replace(/\s+/g,' ').trim().slice(0,200)).filter(Boolean);
const btn=(re)=>[...document.querySelectorAll('button')].filter(vis).some((x)=>re.test(x.textContent.trim()));
return {banners:[...new Set(banners)].slice(0,4),apply:btn(/^apply$/i),dismiss:btn(/^dismiss$/i)}})()`;
const STOREE = String.raw`(()=>{const f=(s)=>Object.keys(s).filter((k)=>/recover|draft|unplaced|kept/i.test(k)).map((k)=>k.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,':id')+' len'+String(s.getItem(k)).length);return {ls:f(localStorage),ss:f(sessionStorage)}})()`;
const clickBtnE = async (re) => { const p = await b.ev(`(()=>{const x=[...document.querySelectorAll('button')].find((e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&${re}.test(e.textContent.trim()));if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`).catch(() => null); if (!p) return false; await b.click(p.x, p.y); return true; };
const putsE = () => net.filter((l) => /text-save/.test(l) && !/RESP/.test(l));
const tokenBack = async () => { const t = (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) })).json()).token; await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(t)}); 1`).catch(() => {}); };
const LE = (i) => 'abcdefgh'[i % 8];
// fresh note, 'warmup' Enter, 'note' + click outside (saved), click back at the end of 'note'.
const base = async (title) => {
  const id = await prep(title);
  await typeText('note', 90); await sleep(300); await blurOutside(); await sleep(2500);
  if (!(await clickEndE((e) => e.v === 'note'))) throw new Error(`setup: no 'note' line: ${JSON.stringify(await edValsE())}`);
  return id;
};
const readBack = async (id, words) => {
  await open(id); await sleep(4000);
  const seen = await b.ev(RECOVE).catch(() => null); const bx = (await boxes().catch(() => [])).map((x) => x.v); const eds0 = await edValsE();
  await sleep(6000);
  const u = await serverUnits(id); const eds1 = await edValsE(); const bx1 = (await boxes().catch(() => [])).map((x) => x.v);
  return { seen, boxes0: bx, eds0, eds1, boxes1: bx1, units: u, counts: Object.fromEntries(words.map((w) => [w, countE(u, w)])) };
};

// r2 ruling (0dc0ac0b): sealed words go by the receipt. If the reopened note offers Apply, click it and read again:
// it must give the newest snapshot. Pass = no duplicate AND (words on the server OR Apply brings them back exactly).
const applyAndRead = async (id, seen) => {
  if (!(seen && seen.apply)) return { applied: false, afterApply: null };
  const ok = await clickBtnE('/^apply$/i'); await sleep(3000); await blurOutside(); await sleep(3000);
  return { applied: ok, afterApply: await serverUnits(id) };
};
for (const how of ['401hash', '401blur', 'close', 'paste', 'paste500']) for (let i = 0; i < REPSE; i += 1) {
  const name = `K1-${how}-${i}`; if (!wantE(name)) continue;
  await scenario(name, async () => {
    const id = await base(`A20 K1 ${how} ${i}`); await watch(); mark();
    await typeText(' alpha', 90); await sleep(2600);
    const midServer = await serverUnits(id);
    await typeText(' beta', 90); await sleep(300);
    if (how.startsWith('401')) {
      rule = ({ u }) => (/text-save/.test(u) ? '401' : 'continue');
      if (how === '401hash') await goHash(other); else await blurOutside();
      await sleep(3500);
    } else {
      let first = true; rule = ({ u }) => { if (first && /text-save/.test(u)) { first = false; return 'hold'; } return 'continue'; };
      if (how === 'paste500') { rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue'); const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${other}`) }); await sleep(4000); }
      else if (how === 'close') { await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1500); }
      else { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${other}`) }); await sleep(2000); const rid = held.shift(); if (rid) await fail500(rid); await sleep(2000); }
    }
    const whereAway = await whereE({ A: id, other }); const alertsAway = await alertsE();
    rule = () => 'continue'; held.length = 0;
    if (how.startsWith('401')) await tokenBack();
    const back = await readBack(id, ['alpha', 'beta']);
    const line = plainE(back.units).find((x) => x.startsWith('note')) || null;
    const ap = await applyAndRead(id, back.seen);
    const lineApplied = ap.afterApply ? (plainE(ap.afterApply).find((x) => x.startsWith('note')) || null) : null;
    const noDup = back.counts.alpha <= 1 && (!ap.afterApply || countE(ap.afterApply, 'alpha') === 1);
    row(name, id, { how, midServer, whereAway, alertsAway, ...back, line, ...ap, lineApplied, noDup, puts: putsE() }, noDup && (line === 'note alpha beta' || lineApplied === 'note alpha beta'));
  });
}

for (const when of ['after', 'before', 'held']) for (let i = 0; i < REPSE; i += 1) {
  const name = `K1IME-${when}-${i}`; if (!wantE(name)) continue;
  await scenario(name, async () => {
    const id = await base(`A20 K1 ime ${i}`); await watch(); mark();
    // held: the first composition's save reaches the server but its reply is held 8 s (unconfirmed while the second fails)
    let firstHeld = false; if (when === 'held') respRule = ({ u }) => { if (!firstHeld && /text-save/.test(u)) { firstHeld = true; return { delay: 8000 }; } return null; };
    await ime('现值'); await sleep(when === 'held' ? 600 : 2600);
    const midServer = await serverUnits(id);
    if (when === 'before' || when === 'held') rule = ({ u }) => (/text-save/.test(u) ? '401' : 'continue');
    await ime('公式'); await sleep(300);
    rule = ({ u }) => (/text-save/.test(u) ? '401' : 'continue');
    await goHash(other).catch(() => {}); await sleep(3500);
    const whereAway = await whereE({ A: id, other }); const alertsAway = await alertsE();
    rule = () => 'continue'; await tokenBack();
    const back = await readBack(id, ['现值', '公式']);
    const line = plainE(back.units).find((x) => x.startsWith('note')) || null;
    const ap = await applyAndRead(id, back.seen);
    const lineApplied = ap.afterApply ? (plainE(ap.afterApply).find((x) => x.startsWith('note')) || null) : null;
    const noDup = back.counts['现值'] <= 1 && (!ap.afterApply || countE(ap.afterApply, '现值') === 1);
    row(name, id, { when, midServer, whereAway, alertsAway, ...back, line, ...ap, lineApplied, noDup, puts: putsE() }, noDup && (line === 'note现值公式' || lineApplied === 'note现值公式'));
  });
}

for (const how of ['hash', 'paste']) for (let i = 0; i < REPSE; i += 1) {
  const name = `K2-${how}-${i}`; if (!wantE(name)) continue;
  await scenario(name, async () => {
    const id = await base(`A20 K2 ${how} ${i}`); await watch(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await typeText(' gamma', 90); await sleep(300); await blurOutside(); await sleep(2500);
    const afterFail = await serverUnits(id);
    if (!(await clickEndE((e) => e.v.startsWith('note')))) throw new Error('no note line after the failure');
    await undo(); await sleep(600);
    const lineAfterUndo = (await edValsE()).find((v) => v.startsWith('note')) ?? null;
    rule = () => 'continue';
    const storedBeforeLeave = await storedFor(id).catch(() => null);
    if (how === 'hash') await goHash(other); else { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${other}`) }); }
    await sleep(3000);
    const whereAway = await whereE({ A: id, other }); const alertsAway = await alertsE();
    const back = await readBack(id, ['gamma']);
    const storedEnd = await storedFor(id).catch(() => null);
    const line = plainE(back.units).find((x) => x.startsWith('note')) || null;
    row(name, id, { how, afterFail, lineAfterUndo, storedBeforeLeave, whereAway, alertsAway, ...back, storedEnd, line, puts: putsE() }, lineAfterUndo === 'note' && back.counts.gamma === 0 && !(back.eds1 || []).some((v) => v.includes('gamma')));
  });
}

for (let i = 0; i < REPSE; i += 1) {
  const name = `K5-${i}`; if (!wantE(name)) continue;
  await scenario(name, async () => {
    const id = await base(`A20 K5 ${i}`); await watch(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'neterr' : 'continue');
    await typeText(' delta', 90); await sleep(3000);
    const seenPause = await b.ev(RECOVE).catch(() => null); const alertsPause = await alertsE();
    const focusOk = await b.ev(`(document.activeElement&&document.activeElement.value)||null`).catch(() => null);
    await typeText(' more', 90); await sleep(3000);
    const lineLive = (await edValsE()).find((v) => v.startsWith('note')) ?? null;
    rule = () => 'continue';
    const seenBack = await b.ev(RECOVE).catch(() => null);
    let applied = false; let lineAfterApply = null;
    if (seenBack && seenBack.apply) { applied = await clickBtnE('/^apply$/i'); await sleep(3000); lineAfterApply = (await edValsE()).find((v) => v.startsWith('note')) ?? null; }
    await blurOutside(); await sleep(3500);
    const u = await serverUnits(id); const line = plainE(u).find((x) => x.startsWith('note')) || null;
    row(name, id, { seenPause, alertsPause, focusOk, lineLive, seenBack, applied, lineAfterApply, units: u, line, puts: putsE() }, !(seenPause && seenPause.apply) && line === 'note delta more');
  });
}

for (let i = 0; i < REPSE; i += 1) {
  const name = `K3-${i}`; if (!wantE(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 K3 ${i}`);
    await watch(); mark();
    rule = ({ m, u }) => { if (m === 'GET' && /\/auth\/me$/.test(u)) return { delay: 15000 }; if (/text-save/.test(u)) return '401'; return 'continue'; };
    rule.gets = true;
    const t0k = Date.now();
    await open(id); await sleep(1500);
    if (!(await clickEndE((e) => e.v === ''))) { const eds = await edValsE(); throw new Error(`setup: no empty line: ${JSON.stringify(eds)}`); }
    await typeText('kthree words', 90); await sleep(300); await blurOutside(); await sleep(2500);
    const typedBeforeMs = Date.now() - t0k;
    const storeAnon = await b.ev(STOREE).catch(() => null); const whereAway = await whereE({ A: id, other });
    await sleep(Math.max(0, 16000 - (Date.now() - t0k)));
    rule = () => 'continue';
    await tokenBack();
    await open(id); await sleep(5000);
    const seen1 = await b.ev(RECOVE).catch(() => null); const store1 = await b.ev(STOREE).catch(() => null);
    let dismissed = false; if (seen1 && seen1.dismiss) { dismissed = await clickBtnE('/^dismiss$/i'); await sleep(1500); }
    await open(id); await sleep(5000);
    const seen2 = await b.ev(RECOVE).catch(() => null); const store2 = await b.ev(STOREE).catch(() => null);
    const u = await serverUnits(id);
    row(name, id, { typedBeforeMs, whereAway, storeAnon, seen1, store1, dismissed, seen2, store2, units: u, puts: putsE() }, !!(seen1 && seen1.apply) && dismissed && !(seen2 && seen2.apply));
  });
}

for (const kind of ['push', 'replace']) for (let i = 0; i < REPSE; i += 1) {
  const name = `K6-${kind}-${i}`; if (!wantE(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 K6 ${kind} ${i}`); const bNote = await newNote(`A20 K6 b ${kind} ${i}`);
    await open(other); await sleep(2500); await goHash(id); await sleep(3000);
    if (!(await clickEndE((e) => e.v === ''))) throw new Error('no empty line');
    await typeText(' ksix', 90); await sleep(300); mark();
    if (kind === 'push') await goHash(bNote); else await b.ev(`location.replace('#/notes/${bNote}'); 1`);
    await sleep(3000);
    const ids = { X: other, A: id, B: bNote };
    const whereLeft = await whereE(ids);
    const h = await b.cdp('Page.getNavigationHistory');
    const entries = h.result.entries.slice(Math.max(0, h.result.currentIndex - 3), h.result.currentIndex + 1).map((e) => { const m = e.url.match(/#\/notes\/([0-9a-f-]{36})/); const k = m ? (Object.entries(ids).find(([, v]) => v === m[1]) || ['?'])[0] : e.url.replace(/^.*#/, '#').slice(0, 30); return k; });
    await b.cdp('Page.navigateToHistoryEntry', { entryId: h.result.entries[h.result.currentIndex - 1].id }); await sleep(3000);
    const whereBack = await whereE(ids);
    const u = await serverUnits(id);
    const expectBack = kind === 'push' ? 'A' : 'X';
    row(name, id, { kind, whereLeft, entries, whereBack, expectBack, saved: countE(u, 'ksix'), units: u }, whereBack === expectBack);
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
