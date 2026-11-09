// ---- TD-82 / TD-83 at human typing speed (Tester(1) 2026-11-10; Main_Designer ruling after the first island batch) ----
// Build: head -n 237 acc13_probe.mjs > hum_probe.mjs && cat hum_body.mjs >> hum_probe.mjs
// The fast probe (90 / 50 ms per key) finished its typing inside the structure typing buffer on the island, so it never
// reached the state that loses words locally. These arms type at a human pace (GAP ms per key, from the key right after
// the structure key) and log every key's time and where the focus was. A row COUNTS only when a unit-transfer 200 lands
// between the first and the last key of the typed word (the handover inside the typing); otherwise it is VOID (not
// green). Two readings per counted row: (1) before leaving, is the text complete on screen (editor lines + typing
// buffer)? (2) save held at the request stage + page left + reopen: where are the words (server / box or buffer / kept).
//   HLH  new note; 'warmup' Enter; '# ' + 'head' + Enter + 'bodyline' at GAP; the first text-save carrying 'body' held;
//        page left 150 ms after it is held (after the last key); reopen 12 s later. Words: 'head', 'bodyline' (whole).
//   NB2H lines 'see the note' / 'intro'; Home of 'intro'; '# ' + 'note' + Enter at GAP; the first text-save carrying
//        '[heading_1]note' with 'intro' held; page left; reopen. Words: 'note' as its own line, 'intro'.
// Attempts per arm cycle through the GAPS list until TARGET rows have counted or MAXTRY attempts were made.
// Never Replay / View / Discard.
const HL_GAPS = (process.env.HL_GAPS || '250,320,400,500').split(',').map(Number);
const NB_GAPS = (process.env.NB_GAPS || '400,450,350,500').split(',').map(Number);
const HL_TARGET = Number(process.env.HL_TARGET || 3); const NB_TARGET = Number(process.env.NB_TARGET || 2);
const MAXTRY = Number(process.env.MAXTRY || 8);
const keyChar = async (c) => { if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); };
const typeLogged = async (text, gap, tag, log) => {
  for (const c of text) {
    const s = Date.now();
    if (c === '\n') await enter(); else await keyChar(c);
    const a = await win().catch(() => null);
    log.push({ t: Date.now() - t0, k: c === '\n' ? 'Enter' : c, tag, active: a ? a.active : null, focusBuf: a ? a.focusBuf : null });
    const el = Date.now() - s; if (el < gap) await sleep(gap - el);
  }
};
const xfers = () => net.filter((l) => /RESP \/note-blocks\/:id\/unit-transfer 200/.test(l)).map((l) => Number(l.split(' ')[0]));
const handoverIn = (log, tag) => {
  const ks = log.filter((x) => x.tag === tag); if (ks.length < 2) return { counted: false, why: 'fewer than 2 keys' };
  const first = ks[0].t; const last = ks[ks.length - 1].t; const xs = xfers();
  const inside = xs.filter((t) => t > first && t < last);
  const switchAt = (() => { for (let k = 1; k < log.length; k += 1) if (log[k - 1].focusBuf === true && log[k].focusBuf === false) return log[k].t; return null; })();
  return { counted: inside.length > 0, first, last, xfers: xs, inside, focusSwitchAt: switchAt };
};
// 11-10 (after the first human-speed run): the reopen also reads the recovery queue items (A-20+ receipt path; the
// arm rules predate it), and with APPLY=1 clicks Apply on the item holding the word, then reads server + items at +8 s.
const ITEMSR = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const out=[];for(const x of document.querySelectorAll('[role=status],[role=alert]')){if(!vis(x))continue;if(x.parentElement&&x.parentElement.closest('[role=status],[role=alert]'))continue;const t=(x.innerText||'').replace(/\s+/g,' ').trim().slice(0,400);if(!t)continue;out.push({t,buttons:[...x.querySelectorAll('button')].filter(vis).map((y)=>y.textContent.trim())})}return out})()`;
const applyIn = (word) => String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;for(const s of document.querySelectorAll('[role=status]')){if(!vis(s)||!(s.innerText||'').includes(${JSON.stringify(word)}))continue;const x=[...s.querySelectorAll('button')].find((y)=>vis(y)&&y.textContent.trim()==='Apply');if(x){const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}}return null})()`;
const offered = (items, word) => (items || []).some((x) => x.t.includes(word) && x.buttons.includes('Apply'));
const applyStep = async (id, word) => {
  if (!process.env.APPLY) return null;
  const at = await b.ev(applyIn(word)).catch(() => null);
  if (!at) return { clicked: false };
  await watch(); await b.click(at.x, at.y); await sleep(8000);
  return { clicked: true, blocks: await blocksOf(id), items: await b.ev(ITEMSR).catch(() => null), alerts: await b.ev('(window.__alerts||[]).slice()').catch(() => null) };
};
const lines = async () => { const a = await win().catch(() => null); const eds = ((await b.ev(EDS).catch(() => [])) || []).map((x) => x.v); return { eds, buf: a ? a.buf : null, active: a ? a.active : null, focusBuf: a ? a.focusBuf : null }; };

// HLH
{
  let counted = 0;
  for (let k = 0; k < MAXTRY && counted < HL_TARGET; k += 1) {
    const gap = HL_GAPS[k % HL_GAPS.length]; const name = `HLH-gap${gap}-${k}`;
    if (!want13('HLH')) break;
    let wasCounted = false;
    await scenario(name, async () => {
      const floorL = await newNote(`R hlh floor ${k}`);
      const id = await newNote(`R hlh ${k}`); lastId = id;
      await open(floorL); await sleep(1500); await goHash(id); await sleep(2500);
      await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500);
      await watch(); mark();
      let heldAt = null;
      rule = ({ u, pd }) => { if (/text-save/.test(u) && /body/.test(pd || '') && heldAt == null) { heldAt = Date.now() - t0; return 'hold'; } return 'continue'; };
      const log = [];
      await typeHash(); log.push({ t: Date.now() - t0, k: '# ', tag: 'hash' });
      await typeLogged('head\n', gap, 'head', log);
      await typeLogged('bodyline', gap, 'body', log);
      const screen = await lines();
      const tW = Date.now(); while (heldAt == null && Date.now() - tW < 8000) await sleep(40);
      await sleep(150);
      const atLeave = await win(); const netAtLeave = [...net];
      const hand = handoverIn(log, 'body');
      await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${floorL}` });
      rule = () => 'continue'; held.length = 0;
      await sleep(12000);
      const blocksAway = await blocksOf(id); const storedBefore = await storedFor(id);
      await open(id); await sleep(4500);
      const reopened = await win(); const bx = await boxes().catch(() => []); const sb = await blocksOf(id);
      lastStoredHere = await storedFor(id);
      const items = await b.ev(ITEMSR).catch(() => null);
      await shot(`${name}-reopened`);
      const afterApply = await applyStep(id, 'bodyline');
      const srv = sb.flat().map(strip); const keptS = JSON.stringify(lastStoredHere) + (reopened.buf || '') + JSON.stringify((bx || []).map((x) => x.v));
      const screenText = screen.eds.join('\n') + '\n' + (screen.buf || '');
      const where = (w) => ({ server: srv.some((u) => u.includes(w)), kept: keptS.includes(w) });
      const screenComplete = /(^|\n)head(\n|$)/.test(screenText) && screenText.includes('bodyline');
      const wh = where('head'); const wb = where('bodyline');
      const wordsKept = (wh.server || wh.kept) && (wb.server || wb.kept);
      wasCounted = hand.counted;
      row(name, id, { gap, counted: hand.counted, void: hand.counted ? null : 'no unit-transfer 200 between the first and last body key', hand, keys: log, heldAt, screen, screenComplete,
        atLeave, netAtLeave, blocksAway, storedBefore, reopened, boxes: bx, blocks: sb, where: { head: wh, bodyline: wb }, wordsKept,
        items, offeredByItem: offered(items, 'bodyline'), afterApply },
        !hand.counted || (screenComplete && wordsKept));
    });
    if (wasCounted) counted += 1;
  }
  console.log(`HLH counted ${counted}/${HL_TARGET}`);
}

// NB2H
{
  let counted = 0;
  for (let k = 0; k < MAXTRY && counted < NB_TARGET; k += 1) {
    const gap = NB_GAPS[k % NB_GAPS.length]; const name = `NB2H-gap${gap}-${k}`;
    if (!want13('NB2H')) break;
    let wasCounted = false;
    await scenario(name, async () => {
      const id = await newNote(`R nb2h ${k}`); lastId = id;
      await buildLines(id, ['see the note', 'intro']);
      const e = (await b.ev(EDS)).find((x) => x.v === 'intro');
      if (!e) throw new Error('setup: no line intro');
      await b.click(e.x + 30, e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('Home', 'Home', 36); await sleep(200);
      await watch(); mark();
      let heldAt = null;
      rule = ({ u, pd }) => { if (/text-save/.test(u) && /\[heading_1\]note/.test(pd || '') && /intro/.test(pd || '') && heldAt == null) { heldAt = Date.now() - t0; return 'hold'; } return 'continue'; };
      const log = [];
      await typeHash(); log.push({ t: Date.now() - t0, k: '# ', tag: 'hash' });
      await typeLogged('note\n', gap, 'word', log);
      const screen = await lines();
      const tA = Date.now(); while (heldAt == null && Date.now() - tA < 10000) await sleep(40);
      await sleep(150);
      const atLeave = await win(); const netAtLeave = [...net];
      const hand = handoverIn(log, 'word');
      await leavePage(); rule = () => 'continue'; held.length = 0;
      await sleep(12000);
      await open(id); await sleep(5000);
      const reopened = await win(); const bx = await boxes(); const storedAfter = await storedFor(id);
      const items = await b.ev(ITEMSR).catch(() => null); await shot(`${name}-reopened`);
      const afterApply = await applyStep(id, 'intro');
      await blurOutside(); await sleep(3000);
      const blocks = await blocksOf(id); lastStoredHere = storedAfter;
      const units = textOf(blocks);
      const noteAlone = units.filter((u) => u === 'note').length;
      const kept = bx.some((x) => /note/.test(x.v)) || JSON.stringify(storedAfter).includes('note\\n');
      const outcome = noteAlone === 1 ? 'once' : noteAlone > 1 ? 'duplicated' : kept ? 'kept' : (heldAt != null ? 'LOST' : 'not-held');
      const screenComplete = screen.eds.includes('note') && screen.eds.includes('intro') || /(^|\n)note\n/.test(screen.buf || '');
      wasCounted = hand.counted;
      row(name, id, { gap, counted: hand.counted, void: hand.counted ? null : "no unit-transfer 200 between the first and last key of 'note' + Enter", hand, keys: log, heldAt, screen, screenComplete,
        atLeave, netAtLeave, reopened, boxes: bx, storedAfter, blocks, outcome, items, offeredByItem: offered(items, 'intro'), afterApply },
        !hand.counted || (screenComplete && outcome !== 'LOST' && outcome !== 'duplicated' && outcome !== 'not-held'));
    });
    if (wasCounted) counted += 1;
  }
  console.log(`NB2H counted ${counted}/${NB_TARGET}`);
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name), void: rows.filter((r) => r.void).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}, void ${rows.filter((r) => r.void).length}`);
log.end(); await b.close(); process.exit(0);
