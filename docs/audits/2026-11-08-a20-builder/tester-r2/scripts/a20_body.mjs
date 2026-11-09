// A-20 arms (Tester(1)). Same file before (04f6f822) and after (package). Local backend, scratch account (CREDROOT).
// Each arm: a fresh note with 'warmup' saved by Enter, then the arm on the next line.
//   IDLE     : type a sentence, no Enter; is it on the server 3.5 s / 6.5 s after the last key?
//   WAMP     : 60 s of continuous typing (100 ms per key), no Enter: text-save requests during / after.
//   PAUSES   : 4 bursts with 2.6 s pauses: text-save requests (expected after: one per pause).
//   B81-hash : type, 300 ms later the script sets location.hash to another note. Words on the server? False toast?
//   B81-paste: same, but the browser navigates to the other note's link (as pasted in the address bar).
//   B81-401  : every text-save answered 401; the save is triggered by a blur (and in B81-401idle by waiting 3 s).
//              Where does the app go, what toast shows; then token back, reopen: words on server / kept / gone?
//   UNDO     : 'aaa', 2.6 s pause, 'bbb', Ctrl+Z: what is left on the line, and on the server.
//   PAGEHIDE : type, 400 ms later the page unloads (about:blank); reopen: words kept (box / store) or saved or gone?
//   HARDKILL : (run alone, ends the process) type 'kill words one', 2.6 s, 'tail', 300 ms, then Browser.close
//              (KILL=close) or the Chrome processes killed (KILL=proc); server read by API afterwards.
const A20ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantA = (n) => !A20ONLY || A20ONLY.some((p) => n.startsWith(p));
const REPS = Number(process.env.REPS || 2);
const alertsNow = () => b.ev('(window.__alerts||[]).slice()').catch(() => null);
const saveLines = () => net.filter((l) => /text-save/.test(l) && !/RESP/.test(l));
const has = (units, s) => units.some((u) => u.includes(s));
const lineVal = () => b.ev(`(()=>{const a=document.activeElement;return a&&a.tagName==='TEXTAREA'?a.value:null})()`).catch(() => null);
const kept = async (id) => ({ boxes: await boxes().catch(() => []), stored: await storedFor(id).catch(() => null) });

for (let i = 0; i < REPS; i += 1) {
  const name = `IDLE-${i}`; if (!wantA(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 idle ${i}`); await watch(); mark();
    const words = 'idle words without enter';
    await typeText(words, 90); const lastKey = Date.now() - t0;
    await sleep(3500); const u1 = await serverUnits(id); const s1 = saveLines();
    await sleep(3000); const u2 = await serverUnits(id);
    row(name, id, { words, lastKey, at35: has(u1, words), at65: has(u2, words), saves: s1, units: u2, alerts: await alertsNow() }, true);
  });
}
if (wantA('WAMP')) await scenario('WAMP', async () => {
  const id = await prep('A20 wamp'); await watch(); mark();
  const tA = Date.now(); let n = 0; const pat = 'abc def ghi ';
  while (Date.now() - tA < 60000) { const c = pat[n % pat.length]; if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); n += 1; await sleep(100); }
  const lastKey = Date.now() - t0; const during = saveLines().length;
  await sleep(4000); const after = saveLines().length - during;
  const u = await serverUnits(id);
  row('WAMP', id, { keys: n, lastKey, savesDuringTyping: during, savesWithin4sAfter: after, savedLen: Math.max(0, ...u.map((x) => x.length)), alerts: await alertsNow() }, true);
});
if (wantA('PAUSES')) await scenario('PAUSES', async () => {
  const id = await prep('A20 pauses'); await watch(); mark();
  const stamps = [];
  for (const w of ['first burst', ' second burst', ' third burst', ' fourth burst']) { await typeText(w, 90); stamps.push(Date.now() - t0); await sleep(2600); }
  await sleep(1500);
  const u = await serverUnits(id);
  row('PAUSES', id, { burstEnds: stamps, saves: saveLines(), saveCount: saveLines().length, units: u, alerts: await alertsNow() }, true);
});
for (const via of ['hash', 'paste', '401', '401idle']) for (let i = 0; i < REPS; i += 1) {
  const name = `B81-${via}-${i}`; if (!wantA(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 b81 ${via} ${i}`); await watch(); mark();
    const words = `leave words ${via.replace(/[0-9]/g, '')} ${'abcdefghijklmnop'[i % 16]}`.replace(/[^a-z ]/g, '');
    if (via.startsWith('401')) rule = ({ u }) => (/text-save/.test(u) ? '401' : 'continue');
    await typeText(words, 90); const lastKey = Date.now() - t0;
    if (via === 'hash') { await sleep(300); await goHash(other); }
    else if (via === 'paste') { await sleep(300); await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${other}` }); }
    else if (via === '401') { await sleep(300); await blurOutside(); }
    else await sleep(300);
    await sleep(3500);
    const where = await b.ev('location.hash').catch(() => null); const alerts = await alertsNow();
    const tokenAfter = await b.ev(`localStorage.getItem('coincides_auth_token') ? 'present' : 'cleared'`).catch(() => null);
    rule = () => 'continue';
    const serverBefore = await serverUnits(id);
    await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`);
    await open(id); await sleep(3500);
    const back = await kept(id); const serverAfter = await serverUnits(id);
    row(name, id, { via, words, lastKey, where, tokenAfter, alerts, falseToast: (alerts || []).some((a) => /could not be saved/i.test(a)), onServerBeforeReopen: has(serverBefore, words), onServerAfterReopen: has(serverAfter, words), keptBoxes: back.boxes.map((x) => x.v), storedHere: back.stored, units: serverAfter }, true);
  });
}
// Main_Designer 11-08 (A-20 up to A): coming back IN THE APP after the two losing paths.
//   BACK-hash   : type, 300 ms, hash to the other note, 3.5 s, hash back to this note (same page, no reload):
//                 words in the line, on the server, or in a kept box?
//   BACK-401    : every text-save 401, blur; app goes to login and clears the token; log in again through the API
//                 (what the login form does), put the new token in place, go to the note by hash: words where?
//                 Which toast text showed?
for (const via of ['hash', '401']) for (let i = 0; i < REPS; i += 1) {
  const name = `BACK-${via}-${i}`; if (!wantA(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 back ${via} ${i}`); await watch(); mark();
    const words = `come back words ${'abcdefghijklmnop'[i % 16]}`;
    if (via === '401') rule = ({ u }) => (/text-save/.test(u) ? '401' : 'continue');
    await typeText(words, 90); await sleep(300);
    if (via === 'hash') await goHash(other); else await blurOutside();
    await sleep(3500);
    const where = await b.ev('location.hash').catch(() => null); const alerts = await alertsNow();
    rule = () => 'continue';
    if (via === '401') {
      const fresh2 = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) })).json();
      await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(fresh2.token)}); 1`);
    }
    await goHash(id); await sleep(4500);
    const line = await b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].map(t=>t.value)`).catch(() => null);
    const back = await kept(id); const alerts2 = await alertsNow();
    // The F9 recovery banner, if any: its full text and buttons; then Apply, and look again.
    const RECOV = `(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const xs=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast],[class*=recover],[class*=Recover]')].filter(vis);return xs.map((x)=>({text:x.innerText.replace(/\s+/g,' ').slice(0,200),buttons:[...x.querySelectorAll('button')].filter(vis).map((b2)=>b2.textContent.trim())}))})()`;
    const recov = await b.ev(RECOV).catch(() => null);
    const recovStore = await b.ev(`Object.keys(localStorage).filter((k)=>/recover|pending|queue|f9|retry|outbox/i.test(k)).map((k)=>[k,String(localStorage.getItem(k)).slice(0,300)])`).catch(() => null);
    let applied = null;
    const ap = await b.ev(`(()=>{const x=[...document.querySelectorAll('button')].find((e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&/^apply$/i.test(e.textContent.trim()));if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`).catch(() => null);
    if (ap) { await b.click(ap.x, ap.y); applied = true; await sleep(3500); }
    const lineAfterApply = await b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].map(t=>t.value)`).catch(() => null);
    await blurOutside(); await sleep(3000);
    const serverAfter = await serverUnits(id);
    row(name, id, { via, words, where, alertsAway: alerts, alertsBack: alerts2, recov, recovStore, applied, inEditor: (line || []).some((v) => v.includes(words)), inEditorAfterApply: (lineAfterApply || []).some((v) => v.includes(words)), onServer: has(serverAfter, words), keptBoxes: back.boxes.map((x) => x.v), storedHere: back.stored, units: serverAfter }, true);
  });
}
for (let i = 0; i < REPS; i += 1) {
  const name = `UNDO-${i}`; if (!wantA(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 undo ${i}`); await watch(); mark();
    await typeText('aaa', 90); await sleep(2600); await typeText('bbb', 90); await sleep(300);
    const before = await lineVal(); await undo(); await sleep(800); const after1 = await lineVal(); await undo(); await sleep(800); const after2 = await lineVal();
    await blurOutside(); await sleep(2500);
    row(name, id, { before, afterOneUndo: after1, afterTwoUndos: after2, saves: saveLines(), units: await serverUnits(id) }, true);
  });
}
for (let i = 0; i < REPS; i += 1) {
  const name = `PAGEHIDE-${i}`; if (!wantA(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 pagehide ${i}`); await watch(); mark();
    const words = `pagehide words ${'abcdefgh'[i]}`;
    await typeText(words, 90); await sleep(400);
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1500);
    const serverAtLeave = await serverUnits(id);
    await open(id); await sleep(3500);
    const back = await kept(id); const serverAfter = await serverUnits(id);
    row(name, id, { words, onServerAtLeave: has(serverAtLeave, words), onServerAfterReopen: has(serverAfter, words), keptBoxes: back.boxes.map((x) => x.v), storedHere: back.stored, saves: saveLines(), units: serverAfter }, true);
  });
}
if (wantA('HARDKILL')) {
  const mode = process.env.KILL || 'close';
  const id = await prep(`A20 hardkill ${mode}`); mark();
  await typeText('kill words one', 90); const firstEnd = Date.now() - t0; await sleep(2600); await typeText(' tail', 90); const lastKey = Date.now() - t0; await sleep(300);
  const killedAt = Date.now() - t0;
  if (mode === 'close') { await Promise.race([b.cdp('Browser.close'), sleep(1500)]).catch(() => {}); }
  else {
    const { execFileSync } = await import('node:child_process');
    const killed = execFileSync('powershell', ['-NoProfile', '-File', `${HERE}/kill-chrome.ps1`, `profiles/${LABEL}`], { encoding: 'utf8' });
    console.log('kill:', killed.trim());
  }
  await sleep(3500);
  const u = await serverUnits(id);
  add({ arm: 'RV', name: `HARDKILL-${mode}`, id, mode, firstEnd, lastKey, killedAt, hasFirst: has(u, 'kill words one'), hasTail: has(u, 'tail'), units: u, net: [...net], ok: true });
  console.log(`HARDKILL-${mode}`, JSON.stringify({ hasFirst: has(u, 'kill words one'), hasTail: has(u, 'tail'), units: u }));
  log.end(); process.exit(0);
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows`);
log.end(); await b.close(); process.exit(0);
