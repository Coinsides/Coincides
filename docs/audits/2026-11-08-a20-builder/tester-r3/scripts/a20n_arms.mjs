
import { LEFT_RE } from './a20m_judge.mjs';
// ---- a20n arms (Tester 11-08, Main_Designer's r3d dispatch on Reviewer N1-N4 + the S2 isolation variant) ----
// Pause-free rule: everything held is never released into the server unless the arm says so; held requests die with the
// page at the full reopen (open(id) is a cross-document navigation), so the server keeps what it had before the edit.
const shiftPress = (k, code, vk) => press(k, code, vk, 8);
const N_SAVE_FAILURE = /Changes could not be saved\. Please retry before leaving/i;
// Kept records of one note sampled page-side every 5 ms (storage events do not fire in the same tab): [t, count] on change.
const keptPollOn = (id) => b.ev(`(()=>{const T0=performance.now();window.__kp=[];let last=-1;clearInterval(window.__kpT);const rd=()=>{let n=0;for(const k of Object.keys(localStorage)){if(!k.startsWith('coincides:unplaced')||!k.endsWith(${JSON.stringify(id)}))continue;try{const p=JSON.parse(localStorage.getItem(k)||'[]');n+=Array.isArray(p)?p.length:1}catch(_){n+=1}}return n};window.__kpT=setInterval(()=>{const n=rd();if(n!==last){window.__kp.push([Math.round(performance.now()-T0),n]);last=n}},5);window.__kpT0=T0;return Math.round(T0)})()`);
const keptPollGet = () => b.ev(`(()=>{clearInterval(window.__kpT);return {series:(window.__kp||[]).slice(),now:Math.round(performance.now()-(window.__kpT0||0))}})()`).catch(() => null);
// From a [t, count] series and a reference time: first / last moment with records, the longest stretch, the peak.
const keptSpan = (poll, from) => {
  if (!poll || !poll.series) return null;
  const s = poll.series; let max = 0; let first = null; let lastOn = null; let longest = 0; let on = null;
  for (let k = 0; k < s.length; k += 1) {
    const [t, n] = s[k]; if (n > max) max = n;
    if (n > 0 && on === null) { on = t; if (first === null) first = t; }
    if (n === 0 && on !== null) { longest = Math.max(longest, t - on); lastOn = t; on = null; }
  }
  if (on !== null) { longest = Math.max(longest, poll.now - on); lastOn = poll.now; }
  const rel = (x) => (x === null || from == null ? x : x - from);
  return { max, firstAfter: rel(first), lastAfter: rel(lastOn), longestMs: longest, stillAtEnd: on !== null, series: s.slice(0, 40) };
};
const lineIn = (txt, w) => String(txt || '').split(/\n/).some((l) => l.trim() === w);
const keptTexts = (stored) => (stored || []).flatMap((s) => { try { return JSON.parse(s).map((e) => `${JSON.stringify(e.initialText)}->${JSON.stringify(e.text)}${e.source ? `(${e.source})` : ''}`); } catch { return ['?']; } });
const receiptHas = (id, w) => b.ev(`(()=>{const out=[];for(const [n,st] of [['local',localStorage],['session',sessionStorage]]){for(const k of Object.keys(st)){if(!k.startsWith('coincides:draft-recovery'))continue;const v=st.getItem(k)||'';if(!v.includes(${JSON.stringify(id)}))continue;let c=0;try{c=JSON.parse(v).filter((e)=>e&&e.noteId===${JSON.stringify(id)}).length}catch(_){};out.push({store:n,count:c,has:v.includes(${JSON.stringify(w)})})}}return out})()`).catch(() => null);
// where a word is after a reopen, with the recovery banner told apart by whether it offers Apply
const whereFull = (re, rp, rc) => (plainM(rp.units).some((u) => re.test(u)) ? 'server' : (rp.eds9 || []).some((x) => re.test(x)) ? 'screen'
  : [...(rp.boxes1 || []), ...(rp.boxes9 || [])].some((x) => re.test(x)) ? 'box' : keptTexts(rp.stored1).some((x) => re.test(x)) ? 'kept'
  : rp.seen && (rp.seen.banners || []).some((x) => re.test(x)) ? (rp.seen.apply ? 'banner+Apply' : 'banner') : (rc || []).some((x) => x.has) ? 'receipt only' : 'nowhere');
const OFFERED = ['server', 'screen', 'box', 'kept', 'banner+Apply'];
const fullReopen = async (id) => {
  // drop the held requests without answering them: they die with this document
  rule = () => 'continue'; held.length = 0;
  await open(id); await sleep(1500);
  const seen = await b.ev(RECOVM).catch(() => null); const eds1 = await edsM(); const boxes1 = (await boxes().catch(() => [])).map((x) => x.v);
  const stored1 = await storedFor(id).catch(() => null);
  await sleep(8000);
  return { seen, eds1, boxes1, stored1, units: await serverUnits(id), eds9: await edsM(), boxes9: (await boxes().catch(() => [])).map((x) => x.v) };
};
// Where a typed word ended up after the reopen.
const whereN = (re, rp) => (plainM(rp.units).some((u) => re.test(u)) ? 'server' : (rp.boxes1 || []).some((x) => re.test(x)) || (rp.boxes9 || []).some((x) => re.test(x)) ? 'box' : keptTexts(rp.stored1).some((x) => re.test(x)) ? 'kept' : rp.seen && (rp.seen.banners || []).some((x) => re.test(x)) ? 'banner' : 'lost');

// MERGE-<close|addr|back>-i (Reviewer N1): server ['ab','cd','ef']; every text-save held from here on; 'g' at the end of
// 'ef' sealed by a click outside and its save held as the lane's head (in flight; it does not touch 'ab', so a record's start stays the server's
// 'ab'); then Backspace at the start of 'cd' merges it into 'abcd' (that group waits unsent behind the head: no PUT of its
// own), End, Z; leave; reopen with the held saves never answered (they die with the page). Builder 11-08: without a head
// the merge goes out at once as its own save and the arm cannot show N1 (first version, voided).
// SELDEL-<close|addr|back>-i: the same, but 'b...c' selected across the two lines (caret after 'a', Shift+Down) and
// deleted ('ad'), then Z. Shapes: DUP = the merged-away text on the server twice (r2 / r3 expected), BOX = server
// ['ab','cd'] and the typed line in a box (r3d expected), LOST = server ['ab','cd'] and Z nowhere (pre expected),
// ONCE = the edited line saved exactly once. Row ok = BOX or ONCE (the r3d rule); pre's LOST is its known baseline.
for (const arm of ['MERGE', 'SELDEL']) for (const how of ['close', 'addr', 'back']) for (let i = 0; i < REPSM; i += 1) {
  const name = `${arm}-${how}-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`A20n ${arm.toLowerCase()} ${how} ${i}`);
    await typeText('ab', 90); await enter(); await sleep(200); await typeText('cd', 90); await enter(); await sleep(200); await typeText('ef', 90); await sleep(300);
    await blurOutside(); await sleep(3500);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['ab', 'cd', 'ef'])) throw new Error(`setup: server is ${JSON.stringify(base)}, not ['ab','cd','ef']`);
    if (how === 'back') { await goHash(other); await sleep(1500); await goHash(id); await sleep(3000); }
    await watch(); await watchM(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    if (!(await clickEndM((e) => e.v === 'ef'))) throw new Error(`setup: no 'ef' line ${JSON.stringify(await edsM())}`);
    // the head: 'g' typed and sealed by a click outside at once (pre has no idle save; the same on every build)
    await typeText('g', 90); await sleep(150); await blurOutside();
    for (let k = 0; k < 30 && !held.length; k += 1) await sleep(100);
    if (held.length !== 1) throw new Error(`setup: the sealed save of 'efg' was not held as the head (held ${held.length})`);
    await sleep(300);
    if (arm === 'MERGE') {
      if (!(await clickEndM((e) => e.v === 'cd'))) throw new Error(`setup: no 'cd' line ${JSON.stringify(await edsM())}`);
      await home(); await sleep(150); await backspace(); await sleep(250);
    } else {
      if (!(await clickEndM((e) => e.v === 'ab'))) throw new Error(`setup: no 'ab' line ${JSON.stringify(await edsM())}`);
      await home(); await sleep(100); await press('ArrowRight', 'ArrowRight', 39); await sleep(100);
      await shiftPress('ArrowDown', 'ArrowDown', 40); await sleep(250);
      await backspace(); await sleep(250);
    }
    const edsCut = await edsM();
    // Z at the end of the merged line (the caret sits at the join after the cut; Reviewer N1 types at the end: abcdZ / adZ)
    await press('End', 'End', 35); await sleep(120);
    await typeText('Z', 90); await sleep(300);
    const edsTyped = await edsM(); const heldN = held.length;
    const want = arm === 'MERGE' ? 'abcdZ' : 'adZ';
    if (!edsTyped.includes(want)) throw new Error(`setup: the edit did not give ${want}: cut ${JSON.stringify(edsCut)}, typed ${JSON.stringify(edsTyped)}`);
    if (heldN !== 1) throw new Error(`setup: a save other than the head went out before the leave (held ${heldN}): ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);
    if (how === 'close') await b.cdp('Page.navigate', { url: 'about:blank' });
    else if (how === 'back') await backM();
    else { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${other}`) }); }
    await sleep(2000);
    const where = how === 'close' ? 'closed' : placeM(await b.ev('location.hash').catch(() => null), { A: id, other });
    const storedLeft = how === 'close' ? null : await storedFor(id).catch(() => null);
    const toastsLeft = how === 'close' ? null : await toastsM();
    const rp = await fullReopen(id);
    const all = plainM(rp.units); const u = all.filter((x) => !/^ef/.test(x)); const efAt = all.find((x) => /^ef/.test(x)) || null; const e9 = rp.eds9;
    // the text the edit removed ('cd' for MERGE, 'd' of 'cd' for SELDEL) present twice in the note text = DUP
    const gone = arm === 'MERGE' ? 'cd' : 'd';
    const dupServer = countM(rp.units, gone) >= 2; const dupScreen = e9.join('|').split(gone).length - 1 >= 2;
    const zAt = whereN(/Z/, rp);
    const efgReceipt = await receiptHas(id, 'efg'); const efgAt = efAt === 'efg' ? 'server' : whereN(/efg/, rp) !== 'lost' ? whereN(/efg/, rp) : (efgReceipt || []).some((x) => x.has) ? 'receipt only' : 'nowhere';
    await sleep(20000);
    const efgLate = { units: plainM(await serverUnits(id)), seen: await b.ev(RECOVM).catch(() => null), receipt: await receiptHas(id, 'efg') };
    const rp2 = await fullReopen(id); const efgReceipt2 = await receiptHas(id, 'efg');
    const efgFinal = whereFull(/efg/, rp2, efgReceipt2); const efgOk = OFFERED.includes(efgFinal);
    const shape = dupServer || dupScreen ? 'DUP' : eq(u, ['ab', 'cd']) && zAt === 'box' ? 'BOX' : eq(u, ['ab', 'cd']) && zAt === 'lost' ? 'LOST' : eq(u, [want]) ? 'ONCE' : 'OTHER';
    row(name, id, { arm, how, efAt, efgAt, efgReceipt, efgLate, efgFinal, efgOk, reopen2: { units: plainM(rp2.units), eds9: rp2.eds9, boxes: rp2.boxes1, banners: rp2.seen && rp2.seen.banners, apply: rp2.seen && rp2.seen.apply, receipt: efgReceipt2 }, edsCut, edsTyped, heldN, where, storedLeft, keptLeft: keptTexts(storedLeft), toastsLeft, ...rp, keptReopen: keptTexts(rp.stored1), zAt, dupServer, dupScreen, shape, puts: net.filter((l) => /text-save/.test(l)) },
      (shape === 'BOX' || shape === 'ONCE') && efgOk);
  });
}

// CLICKBACK-end-i (Reviewer N4, recorded only, TD-66): 'alpha beta' saved; caret after 'alpha'; saves held; Enter cuts
// it into 'alpha' / ' beta'; click back to the end of 'alpha' and type Z; the page goes (close); reopen. Shape recorded:
// does it land as 'alphaZ beta' while the box still offers ' beta'?
for (let i = 0; i < REPSM; i += 1) {
  const name = `CLICKBACK-end-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`A20n clickback ${i}`);
    await typeText('alpha beta', 90); await sleep(300); await blurOutside(); await sleep(3500);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['alpha beta'])) throw new Error(`setup: server is ${JSON.stringify(base)}`);
    if (!(await clickEndM((e) => e.v === 'alpha beta'))) throw new Error('setup: no line');
    await home(); await sleep(100); for (let k = 0; k < 5; k += 1) { await press('ArrowRight', 'ArrowRight', 39); await sleep(40); }
    await watch(); await watchM(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    await enter(); await sleep(200);
    const edsCut = await edsM();
    if (!(await clickEndM((e) => e.v === 'alpha'))) throw new Error(`setup: no 'alpha' line after the Enter ${JSON.stringify(edsCut)}`);
    await typeText('Z', 90); await sleep(300);
    const edsTyped = await edsM(); const heldN = held.length;
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1500);
    const rp = await fullReopen(id);
    const shape = `server ${JSON.stringify(plainM(rp.units))}; screen ${JSON.stringify(rp.eds9)}; boxes ${JSON.stringify(rp.boxes9.length ? rp.boxes9 : rp.boxes1)}`;
    row(name, id, { edsCut, edsTyped, heldN, ...rp, keptReopen: keptTexts(rp.stored1), shape, puts: net.filter((l) => /text-save/.test(l)), recordedOnly: true }, true);
  });
}

// The BACKIN family on new starting states (all judged by backinFailR3 unless said otherwise):
//   ADDR-noncanon-<slash|anchor>-i (Reviewer N2): A entered through the app (a router entry), then its URL turned into
//        '#/notes/A/' (slash) or '#/notes/A#x' (anchor) with history.replaceState (the router entry and its idx stay;
//        what a person gets when the note is opened under that address). Then the original BACKIN-fail: the first save
//        held and answered 500 at 1.5 s, Back. The router's own step back onto '#/notes/A/' must not be read as a
//        departure: r3 expected red (M2 shape), r3d green.
//   ADDR-noncanon-hash-i (Reviewer N2, second form; Main_Designer 11-08): A entered through the app, 'backin words' typed with
//        the first save held, then a scripted hash to THIS note's non-canonical address '#/notes/A/' (the address-bar move
//        to the same note, by the same mechanism as the scripted hash leaves). The first save released (2xx) at 1.5 s. r3
//        expected: read as a departure, the person stays (the router shows A) and 'released' stays stuck (M2 shape), so the
//        next hash leave is not intercepted (STUCK); r3d: an early return, nothing held, nothing kept. Then ' more' typed
//        and a scripted hash leave to the other note with saves held (must be HELD-PROCEED); reopen: 'backin words more'
//        exactly once. Judged by backinFailR3 (0 LEFT_UNSAVED, 0 kept, stays, second leave intercepted) + that count.
//   ADDR-noncanon-addr-i (N2's other form, Main_Designer 11-08): the same, but the move to '#/notes/A/' is an address-bar
//        step (Page.navigate within the document: not cancelable). r3 expected: keepAndLeave, a kept record frozen while
//        the person stays, 'released' stuck; r3d: an early return, 0 records.
//   BACKIN-heldhead-undo-i (Main_Designer 11-09, after heldhead read red on r3 too): every text-save held; 'aaa' on the empty
//        line and its idle save held as the head; then ' bbb' at the end of the warmup line (a line with server text, so a
//        kept record has a start: {warmup -> warmup bbb}); Back at once (held); about 0.5 s later, inside the record's
//        window, Ctrl+Z takes ' bbb' back; at 1.5 s the held saves are released (2xx); 3 s later a normal hash leave; reopen.
//        Red = 'bbb' back on the server or on screen by itself (the shape of (2)); a banner offering it is the person's
//        choice and is recorded, not red. TRACE=1 also records the storage / navigation trace.
//   BACKIN-heldback-i (Reviewer N3): the first save held, a scripted hash leave to the other note (held by the app),
//        then Back while it is held; the save answered 500 1.5 s after the hash leave. Exactly ONE "Please retry before
//        leaving" from the hash leave on (r3 expected 2), the person stays on A, 0 LEFT_UNSAVED, 0 kept records.
//   BACKIN-fail-heldhead-i (S2 isolation, Main_Designer 11-08): every text-save held; ' aaa' at the end of warmup and its
//        idle save held as the lane's head (in flight, not a retry of a failure); then 'bbb' on the empty line and Back
//        at once; at 1.5 s every held save answered 500 and later ones 500. Kept records sampled every 5 ms: r3 = the
//        router's take-back (乙) clears them at the interception; the mutation (乙 removed) keeps them until the head
//        is answered (~1.5 s). Judged by backinFailR3 (kept 0 at ~1 s); the fine series is the evidence.
// TRACE=1 (builder 11-09, heldhead cause): from document start, every setItem / removeItem of an 'unplaced' key (time, key,
// value length, record count, 5 stack frames) and every navigate / popstate / hashchange, in performance.now() ms.
const TRACE_SRC = String.raw`(()=>{window.__trace=[];const P=performance;const S=(x)=>String(x).replace(/[0-9a-f-]{36}/g,':id');const wrap=(name)=>{const f=Storage.prototype[name];Storage.prototype[name]=function(k,...a){if(String(k).includes('unplaced')){let n=null;try{const p=JSON.parse(a[0]);n=Array.isArray(p)?p.length:null}catch(_){}window.__trace.push([name,Math.round(P.now()),S(k),a[0]==null?null:String(a[0]).length,n,new Error().stack.split('\n').slice(2,7).map(x=>x.trim()).join(' | ')])}return f.call(this,k,...a)}};wrap('setItem');wrap('removeItem');if(window.navigation)navigation.addEventListener('navigate',(e)=>{let h=null;try{h=S(new URL(e.destination.url).hash)}catch(_){};window.__trace.push(['navigate',Math.round(P.now()),e.navigationType,h,e.cancelable])});addEventListener('popstate',()=>window.__trace.push(['popstate',Math.round(P.now()),S(location.hash)]),true);addEventListener('hashchange',()=>window.__trace.push(['hashchange',Math.round(P.now()),S(location.hash)]),true)})()`;
const N_BACKIN = [['ADDR-noncanon', 'slash'], ['ADDR-noncanon', 'anchor'], ['ADDR-noncanon', 'hash'], ['ADDR-noncanon', 'addr'], ['BACKIN', 'heldback'], ['BACKIN-fail', 'heldhead'], ['BACKIN-heldhead', 'undo']];
for (const [stem, mode] of N_BACKIN) for (let i = 0; i < REPSM; i += 1) {
  const name = `${stem}-${mode}-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const title = `A20n ${mode} ${i} ${Date.now() % 100000}`;
    let traceId = null;
    if (process.env.TRACE && (mode === 'heldhead' || mode === 'undo' || mode === 'heldback')) traceId = (await b.cdp('Page.addScriptToEvaluateOnNewDocument', { source: TRACE_SRC })).result?.identifier || 'set';
    const { id, link, hCourse, hA } = await enterThroughApp(title);
    if (traceId && traceId !== 'set') await b.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: traceId }).catch(() => {});
    const ids = { A: id, course: `/courses/${COURSE_M}`, other };
    let noncanon = null;
    if (mode === 'slash' || mode === 'anchor') {
      const to = mode === 'slash' ? `#/notes/${id}/` : `#/notes/${id}#x`;
      await b.ev(`history.replaceState(history.state,'',${JSON.stringify(to)});1`);
      await sleep(1500);
      noncanon = { hash: (await b.ev('location.hash')).replace(id, ':A'), state: await historyM(), eds: await edsM() };
      if (!noncanon.eds.length) throw new Error(`setup: the note is gone after the address change ${JSON.stringify(noncanon)}`);
    }
    await watch(); await watchM(); mark();
    const watcherId = await b.ev('window.__toastsNId').catch(() => null);
    const word = mode === 'heldhead' || mode === 'undo' ? 'bbb' : 'backin words';
    let failedAt = null; let hashAt = null; let navHeld = null; let head = null;
    if (mode === 'undo') {
      rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
      if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(await edsM())}`);
      await typeText('aaa', 90);
      for (let k = 0; k < 40 && !held.length; k += 1) await sleep(150);
      head = { held: held.length, net: net.slice() };
      if (held.length !== 1) throw new Error(`setup: the idle save of 'aaa' was not held as the head (held ${held.length})`);
      if (!(await clickEndM((e) => e.v === 'warmup'))) throw new Error(`setup: no warmup line ${JSON.stringify(await edsM())}`);
      await typeText(' bbb', 90); await sleep(200);
      if (held.length !== 1) throw new Error(`setup: a second save went out before the Back (held ${held.length})`);
    } else if (mode === 'heldhead') {
      rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
      if (!(await clickEndM((e) => e.v === 'warmup'))) throw new Error(`setup: no warmup line ${JSON.stringify(await edsM())}`);
      await typeText(' aaa', 90);
      for (let k = 0; k < 40 && !held.length; k += 1) await sleep(150);
      head = { held: held.length, net: net.slice() };
      if (held.length !== 1) throw new Error(`setup: the idle save of ' aaa' was not held as the head (held ${held.length})`);
      if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(await edsM())}`);
      await typeText(word, 90); await sleep(200);
      if (held.length !== 1) throw new Error(`setup: a second save went out before the Back (held ${held.length}): bbb was not queued behind the head`);
    } else {
      if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(await edsM())}`);
      let first = true; rule = ({ u }) => { if (/text-save/.test(u)) { if (first) { first = false; return 'hold'; } return mode === 'hash' || mode === 'addr' ? 'continue' : '500'; } return 'continue'; };
      await typeText(word, 90); await sleep(300);
    }
    if (mode === 'heldback') {
      // the scripted hash leave first; the app holds it while the save is pending
      hashAt = await b.ev('Math.round(performance.now()-(window.__toastsT0||0))').catch(() => null);
      await b.ev(`location.hash='#/notes/${other}';1`); await sleep(500);
      navHeld = { at: placeM(await b.ev('location.hash').catch(() => null), ids), held: held.length };
    }
    const preBack = { held: held.length, active: await b.ev(`(()=>{const a=document.activeElement;return a?a.tagName+(a.dataset&&a.dataset.runtimeTextflowEditor?':editor':''):null})()`).catch(() => null), eds: await edsM() };
    await b.ev(`window.__hostA=document.querySelector('[data-note-host-mode="page"]');1`).catch(() => {});
    if (mode === 'heldhead' || mode === 'undo') await keptPollOn(id);
    const backAt = await b.ev('Math.round(performance.now()-(window.__toastsT0||0))').catch(() => null);
    const backPN = traceId ? await b.ev('Math.round(performance.now())').catch(() => null) : null;
    const pollBackAt = mode === 'heldhead' || mode === 'undo' ? await b.ev('Math.round(performance.now()-(window.__kpT0||0))').catch(() => null) : null;
    if (mode === 'hash') await b.ev(`location.hash='#/notes/${id}/';1`);
    else if (mode === 'addr') { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${id}/`) }); }
    else await backM();
    const T = Date.now(); let releasedN = null; const failFrom = mode === 'heldback' ? 1000 : 1500; // heldback: 1.5 s after the hash leave
    const tl = []; let storedT1; let storedT3; let undo1 = null;
    for (let k = 0; k < 24; k += 1) {
      await sleep(250);
      if (mode === 'undo' && undo1 === null && Date.now() - T >= 450) {
        const before = await storedFor(id).catch(() => null);
        await undo(); await sleep(150);
        undo1 = { at: Date.now() - T, edsBefore: preBack.eds, eds: await edsM(), keptBefore: keptTexts(before), keptAfter: keptTexts(await storedFor(id).catch(() => null)) };
      }
      if (failedAt === null && Date.now() - T >= failFrom) {
        if (mode === 'undo') { releasedN = held.length; rule = () => 'continue'; await release(); failedAt = Date.now() - T; }
        else if (mode === 'hash' || mode === 'addr') { releasedN = held.length; rule = () => 'continue'; await release(); failedAt = Date.now() - T; }
        else if (mode === 'heldhead') { let n = 0; while (held.length) { await fail500(held.shift()); n += 1; } rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue'); if (n) failedAt = Date.now() - T; }
        else if (await failHeld('500')) failedAt = Date.now() - T;
      }
      tl.push(`${Date.now() - T} ${placeM(await b.ev('location.hash').catch(() => null), ids)}`);
      if (k === 3) storedT1 = await storedFor(id).catch(() => null);
      if (k === 11) storedT3 = await storedFor(id).catch(() => null);
    }
    if (failedAt === null) throw new Error('setup: the injected failure did not happen (no save was held after the Back)');
    const poll = mode === 'heldhead' || mode === 'undo' ? await keptPollGet() : null;
    const places = []; for (const l of tl) { const p = l.split(' ').slice(1).join(' '); if (!places.length || places[places.length - 1].p !== p) places.push({ t: Number(l.split(' ')[0]), p }); }
    const where = places.length ? places[places.length - 1].p : null;
    const hostKept = await b.ev('!!(window.__hostA&&window.__hostA.isConnected)').catch(() => null);
    const stayed = where === 'A';
    const toastsBack = await toastRecs(ids);
    const edsBack = await edsM(); const boxesBack = (await boxes().catch(() => [])).map((x) => x.v);
    const storedBack = await storedFor(id).catch(() => null); const receiptsBack = await receiptsM(id); const hBack = await historyM();
    const out = { v: 'fail', mode, stem, title, link, hCourse, hA, noncanon, head, hashAt, navHeld, failedAt, preBack, backAt, places, where, stayed, hostKept, toastsBack, edsBack, boxesBack, storedT1, storedT3, storedBack, receiptsBack, hBack, putsBack: net.filter((l) => /text-save/.test(l)) };
    if (mode === 'heldhead' || mode === 'undo') out.keptPoll = keptSpan(poll, pollBackAt);
    if (mode === 'undo') { out.undo1 = undo1; out.releasedN = releasedN; }
    if (traceId) { out.toastsT0 = await b.ev('Math.round(window.__toastsT0||0)').catch(() => null); out.traceBackPN = backPN; out.trace = await b.ev('(window.__trace||[]).slice()').catch(() => null); }
    if (mode === 'hash' || mode === 'addr') { out.releasedN = releasedN; out.hashAfter = (await b.ev('location.hash').catch(() => '')).replace(id, ':A'); }
    if (stayed && (mode === 'hash' || mode === 'addr')) { rule = () => 'continue'; await sleep(500); out.moreClicked = await clickEndM((e) => e.v.includes('backin')); await typeText(' more', 90); await sleep(300); out.edsMore = await edsM(); }
    if (mode === 'undo') {
      // the network is fine now; a normal hash leave after 3 s (what a person does next), then the reopen below
      await sleep(3000); out.serverBeforeLeave = await serverUnits(id); out.edsBeforeLeave = await edsM();
      out.keptBeforeLeave = keptTexts(await storedFor(id).catch(() => null));
      await goHash(other); await sleep(3000);
      out.leftTo = placeM(await b.ev('location.hash').catch(() => null), ids); out.keptLeft = keptTexts(await storedFor(id).catch(() => null));
    }
    out.reLeaveAt = await b.ev('Math.round(performance.now()-(window.__toastsT0||0))').catch(() => null);
    if (stayed && mode !== 'undo') out.reLeave = await reLeaveM(ids);
    rule = () => 'continue'; await release(); await sleep(4000);
    out.toastsEnd = await toastRecs(ids);
    out.watcherSame = (await b.ev('window.__toastsNId').catch(() => null)) === watcherId && watcherId !== null;
    out.storedEnd = await storedFor(id).catch(() => null);
    await open(id); await sleep(1500);
    out.seenReopen = await b.ev(RECOVM).catch(() => null); out.edsReopen1 = await edsM();
    out.boxesReopen = (await boxes().catch(() => [])).map((x) => x.v);
    await sleep(8000);
    const u = await serverUnits(id); out.units = u; out.edsReopen9 = await edsM(); out.count = countM(u, word);
    out.r3 = backinFailR3(out);
    if (mode === 'hash' || mode === 'addr') out.countMore = plainM(u).filter((x) => x === 'backin words more').length;
    if (mode === 'undo') {
      out.bbbServer = plainM(u).some((x) => x.includes('bbb')); out.bbbScreen = (out.edsReopen9 || []).some((x) => x.includes('bbb'));
      out.bbbBanner = !!(out.seenReopen && (out.seenReopen.banners || []).some((x) => x.includes('bbb')));
      out.aaaCount = countM(u, 'aaa');
      out.undoOk = !!undo1 && !(undo1.eds || []).some((x) => x.includes('bbb')) && !out.bbbServer && !out.bbbScreen;
    }
    if (mode === 'heldback') {
      // retry messages from the hash leave on. 11-09 fix (Opus reader): the old union was a Map keyed t|s, which collapsed two
      // toasts at the same ms and hid N3's same-millisecond pair on r3 (true r3 count 2/2/2, recorded as 1 in two rows).
      // Union as a multiset: per t|s key the larger count of the two snapshots (toastsEnd normally holds toastsBack as a prefix).
      const cntT = (xs) => { const m = new Map(); for (const x of xs || []) { const k = `${x.t}|${x.s}`; const e = m.get(k); if (e) e.n += 1; else m.set(k, { x, n: 1 }); } return m; };
      const cbT = cntT(toastsBack); const ceT = cntT(out.toastsEnd); const allT = [];
      for (const k of new Set([...cbT.keys(), ...ceT.keys()])) { const n = Math.max(cbT.get(k)?.n || 0, ceT.get(k)?.n || 0); const x = (ceT.get(k) || cbT.get(k)).x; for (let i = 0; i < n; i += 1) allT.push(x); }
      const fromHash = allT.filter((x) => (hashAt == null || x.t >= hashAt - 5) && (out.reLeaveAt == null || !out.reLeave || x.t < out.reLeaveAt));
      out.retryTimes = fromHash.filter((x) => N_SAVE_FAILURE.test(x.s || '')).map((x) => x.t - (hashAt || 0));
      out.retryN = fromHash.filter((x) => N_SAVE_FAILURE.test(x.s || '')).length;
      out.leftN = fromHash.filter((x) => LEFT_RE.test(x.s || '')).length;
      const j = out.r3; const unmeasured = j.unmeasured.filter((x) => x !== 'storage hold');
      out.heldbackOk = out.retryN === 1 && out.leftN === 0 && j.stayed && j.kept === 0 && unmeasured.length === 0 && j.held === true && (navHeld && navHeld.at === 'A');
    }
    row(name, id, out, mode === 'undo' ? out.undoOk : mode === 'heldback' ? out.heldbackOk : mode === 'hash' || mode === 'addr' ? out.r3.ok && out.countMore === 1 : out.r3.ok);
  });
}

// BACKIN-heldhead-del-i (Main_Designer 11-09, guard for r3d): every text-save held; 'aaa' on the empty line and its idle save
// held as the head; ' bbb' at the end of the warmup line; Back at once (held); at about +0.45 s, inside the window,
// Backspace x4 takes ' bbb' off; at about +0.9 s, before the head is answered, the page closes (about:blank); reopen with
// the held saves never answered. Red = 'bbb' back on the server or on screen (pagehide must overwrite the record with the
// live text). If the deletion has no effect during the hold, the path cannot be built: recorded, not red.
for (let i = 0; i < REPSM; i += 1) {
  const name = `BACKIN-heldhead-del-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    let traceId = null;
    if (process.env.TRACE) traceId = (await b.cdp('Page.addScriptToEvaluateOnNewDocument', { source: TRACE_SRC })).result?.identifier || null;
    const { id } = await enterThroughApp(`A20n heldhead-del ${i} ${Date.now() % 100000}`);
    if (traceId) await b.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: traceId }).catch(() => {});
    const ids = { A: id, course: `/courses/${COURSE_M}`, other };
    await watch(); await watchM(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(await edsM())}`);
    await typeText('aaa', 90);
    for (let k = 0; k < 40 && !held.length; k += 1) await sleep(150);
    if (held.length !== 1) throw new Error(`setup: the idle save of 'aaa' was not held as the head (held ${held.length})`);
    if (!(await clickEndM((e) => e.v === 'warmup'))) throw new Error(`setup: no warmup line ${JSON.stringify(await edsM())}`);
    await typeText(' bbb', 90); await sleep(200);
    if (held.length !== 1) throw new Error(`setup: a second save went out before the Back (held ${held.length})`);
    const preBack = { held: held.length, eds: await edsM() };
    await keptPollOn(id);
    const pollBackAt = await b.ev('Math.round(performance.now()-(window.__kpT0||0))').catch(() => null);
    const backPN = traceId ? await b.ev('Math.round(performance.now())').catch(() => null) : null;
    await backM();
    const T = Date.now();
    await sleep(450);
    const placeAtDel = placeM(await b.ev('location.hash').catch(() => null), ids);
    const keptBeforeDel = keptTexts(await storedFor(id).catch(() => null));
    for (let k = 0; k < 4; k += 1) { await backspace(); await sleep(60); }
    await sleep(200);
    const edsDel = await edsM(); const keptAfterDel = keptTexts(await storedFor(id).catch(() => null)); const delAt = Date.now() - T;
    await sleep(Math.max(0, 900 - (Date.now() - T)));
    const poll = await keptPollGet(); const trace = traceId ? await b.ev('(window.__trace||[]).slice()').catch(() => null) : null;
    const heldAtClose = held.length; const placeAtClose = placeM(await b.ev('location.hash').catch(() => null), ids);
    await b.cdp('Page.navigate', { url: 'about:blank' }); const closeAt = Date.now() - T; await sleep(1000);
    const rp = await fullReopen(id);
    await sleep(20000); const rp2 = await fullReopen(id); const aaaReceipt2 = await receiptHas(id, 'aaa'); const aaaFinal = whereFull(/aaa/, rp2, aaaReceipt2);
    const u = plainM(rp.units);
    const bbbServer = u.some((x) => x.includes('bbb')); const bbbScreen = (rp.eds9 || []).some((x) => x.includes('bbb'));
    const deleted = !(edsDel || []).some((x) => x.includes('bbb'));
    const notConstructible = !deleted;
    row(name, id, { preBack, placeAtDel, keptBeforeDel, edsDel, keptAfterDel, delAt, heldAtClose, placeAtClose, closeAt, keptPoll: keptSpan(poll, pollBackAt), traceBackPN: backPN, trace, ...rp, keptReopen: keptTexts(rp.stored1), bbbServer, bbbScreen, deleted, notConstructible, aaaAt: whereN(/aaa/, rp), aaaReceipt: await receiptHas(id, 'aaa'), aaaFinal, aaaReceipt2, reopen2: { units: plainM(rp2.units), banners: rp2.seen && rp2.seen.banners, apply: rp2.seen && rp2.seen.apply }, puts: net.filter((l) => /text-save/.test(l)) },
      notConstructible ? true : !bbbServer && !bbbScreen);
  });
}

// CLOSEHEAD-<plain|sealed>-i (Tester 11-09, recorded): every text-save held; 'aaa' typed on the empty line; plain = its idle
// save held (in flight), sealed = a click outside seals it and that save is held; the page closes while it is held; reopen
// with the held save never answered. Where is 'aaa' at the reopen and 20 s later: server / screen / box / kept record /
// recovery receipt (localStorage or sessionStorage) / a banner offering it (Apply)? Recorded, not judged.
for (const how of ['plain', 'sealed']) for (let i = 0; i < REPSM; i += 1) {
  const name = `CLOSEHEAD-${how}-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20n closehead ${how} ${i}`);
    await watch(); await watchM(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(await edsM())}`);
    await typeText('aaa', 90);
    if (how === 'sealed') { await sleep(150); await blurOutside(); }
    for (let k = 0; k < 40 && !held.length; k += 1) await sleep(150);
    if (held.length !== 1) throw new Error(`setup: the save of 'aaa' was not held (held ${held.length})`);
    const before = { eds: await edsM(), kept: keptTexts(await storedFor(id).catch(() => null)), receipts: await receiptHas(id, 'aaa') };
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1000);
    const rp = await fullReopen(id);
    const receipts1 = await receiptHas(id, 'aaa');
    const banners1 = rp.seen;
    const queueText = await b.ev(`[...document.querySelectorAll('[role=status]')].map(x=>x.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,4)`).catch(() => null);
    await sleep(20000);
    const late = { units: await serverUnits(id), eds: await edsM(), boxes: (await boxes().catch(() => [])).map((x) => x.v), kept: keptTexts(await storedFor(id).catch(() => null)), receipts: await receiptHas(id, 'aaa'), seen: await b.ev(RECOVM).catch(() => null) };
    const at = (u, eds, bx, kept, rc, seen) => (plainM(u).includes('aaa') ? 'server' : (eds || []).includes('aaa') ? 'screen' : (bx || []).some((x) => x.includes('aaa')) ? 'box' : (kept || []).some((x) => x.includes('aaa')) ? 'kept' : seen && (seen.banners || []).some((x) => /aaa/.test(x)) ? (seen.apply ? 'banner+Apply' : 'banner') : (rc || []).some((x) => x.has) ? 'receipt only' : 'nowhere');
    row(name, id, { how, before, ...rp, receipts1, banners1, queueText, late, aaaAt: at(rp.units, rp.eds9, rp.boxes9.length ? rp.boxes9 : rp.boxes1, keptTexts(rp.stored1), receipts1, rp.seen), aaaLate: at(late.units, late.eds, late.boxes, late.kept, late.receipts, late.seen), recordedOnly: true }, true);
  });
}

// HEADCLOSE-<plain|apply|dismiss>-i (Main_Designer 11-09, N6 real-browser arm; r3d): the note ['warmup','']; every text-save held;
// 'aaa' on line 2 and its idle save held as the head (in flight; pre has no idle save: sealed by a click outside instead,
// recorded as headKind); ' bbb' at the end of line 1 (server text); the page closes (pagehide keeps bbb's record); reopen.
// r3d expected: 'aaa' offered (banner + Apply); bbb does NOT land: in a box, its record kept; the same after 20 s and a
// second reopen. apply: then Apply on the 'aaa' receipt -> aaa on the server, then bbb lands and its record goes;
// dismiss: Dismiss -> bbb lands. Baselines: pre aaa Apply, bbb lost; r3 bbb lands, aaa nowhere.
const clickRecovery = (label, word) => b.ev(`(()=>{const btns=[...document.querySelectorAll('[role=status] button')].filter(x=>x.textContent.trim()===${JSON.stringify(label)}&&x.getBoundingClientRect().width>0);const bt=btns.find(x=>{let p=x.parentElement;for(let i=0;i<4&&p;i++){if((p.innerText||'').includes(${JSON.stringify(word)}))return true;p=p.parentElement}return false});if(!bt)return null;bt.scrollIntoView({block:'center'});const r=bt.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,n:btns.length}})()`).catch(() => null);
const bbbWhere = (rp) => (plainM(rp.units).some((u) => u.includes('bbb')) ? 'server' : [...(rp.boxes1 || []), ...(rp.boxes9 || [])].some((x) => x.includes('bbb')) ? 'box' : keptTexts(rp.stored1).some((x) => x.includes('bbb')) ? 'kept' : (rp.eds9 || []).some((x) => x.includes('bbb')) ? 'screen' : 'nowhere');
for (const how of ['plain', 'apply', 'dismiss']) for (let i = 0; i < (how === 'plain' ? REPSM : 1); i += 1) {
  const name = `HEADCLOSE-${how}-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20n headclose ${how} ${i}`);
    await watch(); await watchM(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(await edsM())}`);
    await typeText('aaa', 90);
    let headKind = 'idle';
    for (let k = 0; k < 30 && !held.length; k += 1) await sleep(150);
    if (!held.length) { headKind = 'sealed'; await blurOutside(); for (let k = 0; k < 30 && !held.length; k += 1) await sleep(100); }
    if (held.length !== 1) throw new Error(`setup: the save of 'aaa' was not held as the head (held ${held.length})`);
    if (!(await clickEndM((e) => e.v === 'warmup'))) throw new Error(`setup: no warmup line ${JSON.stringify(await edsM())}`);
    await typeText(' bbb', 90); await sleep(200);
    if (held.length !== 1) throw new Error(`setup: a second save went out before the close (held ${held.length})`);
    const before = { eds: await edsM(), kept: keptTexts(await storedFor(id).catch(() => null)) };
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1000);
    const rp1 = await fullReopen(id); const rc1 = await receiptHas(id, 'aaa');
    const r1 = { aaa: whereFull(/aaa/, rp1, rc1), bbb: bbbWhere(rp1), units: plainM(rp1.units), boxes: rp1.boxes1, kept: keptTexts(rp1.stored1), banners: rp1.seen && rp1.seen.banners, apply: rp1.seen && rp1.seen.apply };
    await sleep(20000);
    const rp2 = await fullReopen(id); const rc2 = await receiptHas(id, 'aaa');
    const r2 = { aaa: whereFull(/aaa/, rp2, rc2), bbb: bbbWhere(rp2), units: plainM(rp2.units), boxes: rp2.boxes1, kept: keptTexts(rp2.stored1), banners: rp2.seen && rp2.seen.banners, apply: rp2.seen && rp2.seen.apply };
    let act = null;
    if (how !== 'plain') {
      const at = await clickRecovery(how === 'apply' ? 'Apply' : 'Dismiss', 'aaa');
      // builder 11-09: bbb retries on a backoff (800 ms doubling, capped at 10 s): wait >= 12 s after the click before judging
      if (at) { await b.click(at.x, at.y); await sleep(13000); }
      const u = plainM(await serverUnits(id));
      act = { clicked: !!at, units: u, eds: await edsM(), boxes: (await boxes().catch(() => [])).map((x) => x.v), kept: keptTexts(await storedFor(id).catch(() => null)), seen: await b.ev(RECOVM).catch(() => null), receipt: await receiptHas(id, 'aaa') };
      act.aaaOnServer = u.includes('aaa'); act.bbbOnServer = u.some((x) => x.includes('bbb')); act.keptGone = !act.kept.some((x) => x.includes('bbb'));
    }
    const heldOk = r1.aaa === 'banner+Apply' && r2.aaa === 'banner+Apply' && r1.bbb === 'box' && r2.bbb === 'box';
    const actOk = how === 'plain' ? true : how === 'apply' ? !!(act && act.clicked && act.aaaOnServer && act.bbbOnServer && act.keptGone) : !!(act && act.clicked && !act.aaaOnServer && act.bbbOnServer && act.keptGone);
    row(name, id, { how, headKind, before, r1, r2, act, puts: net.filter((l) => /text-save/.test(l)) }, heldOk && actOk);
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
