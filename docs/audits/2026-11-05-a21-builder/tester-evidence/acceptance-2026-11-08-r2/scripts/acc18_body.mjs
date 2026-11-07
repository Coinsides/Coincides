// r2.3b additions (Tester, 2026-11-08):
//  LEGACY-Y1 : Reviewer F1. A stored record with NO writingRole (as r2.2 and earlier wrote them) on {block B, tu-3, ''};
//              reopen; the person presses Enter at the end of B (the new paragraph gets tu-3) and types 'next'. The kept
//              words must not land in the person's line.
//  STEAL     : my r2.3 TWO2 finding. A box kept by the slow-reply leave; the person starts a new line under 'warmup';
//              the moment the kept words land, the person types '# two' Enter 'bbb'. The keys must stay in the person's
//              line ('aaa' untouched, 'two' a heading or kept, 'bbb' present).
//  LANDFAIL  : r2.3b list item 5 (acc14 extra arm). A box kept by the slow-reply leave, then every text-save answered
//              500 while the person types 10 s on 'warmup'. Count text-save requests and undo steps; control = same with
//              no box.
//  COPYPASTE : list item 3, observation. Create fails (box kept); the person copies the box's words into a new line, as
//              the box tells them to; then reopen. Are the words written twice?
const ONLY18 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want18 = (name) => !ONLY18 || ONLY18.some((p) => name.startsWith(p));
const me18 = await (await fetch(`${API}/auth/me`, { headers: auth })).json();
const ACC18 = me18?.user?.id ?? me18?.id;
const EDS18 = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,block:e.dataset.blockId||null,unit:e.dataset.textUnitId||null,x:r.left,y:r.top,h:r.height}})`;
const seed18 = (id, recs) => b.ev(`localStorage.setItem(${JSON.stringify(`coincides:unplaced-words:${ACC18}:${id}`)}, ${JSON.stringify(JSON.stringify(recs))});1`);
const clickEnd = async (v) => { const e = (await b.ev(EDS18)).find((x) => x.v === v); if (!e) return false; await b.click(e.x + 120, e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('End', 'End', 35); await sleep(200); return true; };

for (let i = 0; i < 2; i += 1) {
  const name = `LEGACY-Y1-${i}`;
  if (!want18(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R legacy ${i}`); lastId = id;
    await arriveAndWarm(id);
    // F1 needs the reused id to exist when the record is restored: 'second', Enter (an empty paragraph), saved; then the
    // legacy record naming that empty paragraph's id; then reopen. After that the person types 'next' in that line.
    await typeText('second', 60); await enter(); await sleep(2500); await blurOutside(); await sleep(3000);
    const eds = await b.ev(EDS18); const w = eds.find((e) => e.v === 'warmup'); const empty = eds.find((e) => e.v === '' && e.block === w.block);
    if (!empty) throw new Error(`setup: no empty paragraph ${JSON.stringify(eds.map((e) => [e.v, e.unit]))}`);
    const next = empty.unit;
    await seed18(id, [{ id: 'legacy-1', blockId: w.block, unitId: next, initialText: '', text: 'kept' }]);
    await watch(); mark();
    await open(id); await sleep(5000);
    const bx0 = await boxes();
    const e2 = (await b.ev(EDS18)).find((e) => e.unit === next);
    if (e2) { await b.click(e2.x + 120, e2.y + Math.min(e2.h, 24) / 2); await sleep(300); await press('End', 'End', 35); await typeText('next', 90); }
    await sleep(6000);
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id); const bx1 = await boxes();
    const units = blocks.flat().map(strip);
    const landedInLine = units.some((u) => u.includes('kept'));
    const keptStill = bx1.some((x) => x.v.includes('kept')) || JSON.stringify(lastStoredHere).includes('kept');
    row(name, id, { reusedId: next, bx0, blocks, bx1, landedInLine, keptStill }, !landedInLine && keptStill);
  });
}

for (let i = 0; i < 3; i += 1) {
  const name = `STEAL-landWhileTypingElsewhere-${i}`;
  if (!want18(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R steal ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    await keptByLeave('one', true, 'aaa');
    const bx0 = await boxes();
    await clickEnd('warmup'); await enter(); await sleep(300);
    const nBefore = net.length; const tA = Date.now();
    while (Date.now() - tA < 15000 && !net.slice(nBefore).some((l) => /text-save/.test(l) && /one/.test(l))) await sleep(50);
    const landedAt = net.slice(nBefore).find((l) => /text-save/.test(l) && /one/.test(l)) || null;
    await sleep(300);
    const activeBefore = (await win()).active;
    await typeHash(); await typeText('two', 90); await enter(); await sleep(60); await typeText('bbb', 60);
    await sleep(5000); await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id); const bx1 = await boxes();
    const units = blocks.flat();
    const aaaIntact = !units.some((u) => /aaa./.test(strip(u)));
    const twoOk = units.includes('[heading_1]two') || bx1.some((x) => x.v.includes('two')) || JSON.stringify(lastStoredHere).includes('two');
    const bbbOk = units.some((u) => strip(u) === 'bbb') || bx1.some((x) => x.v.includes('bbb')) || JSON.stringify(lastStoredHere).includes('bbb');
    row(name, id, { bx0, landedAt, activeBefore, blocks, bx1, aaaIntact, twoOk, bbbOk, void: landedAt ? null : 'kept words did not land within 15 s' },
      !landedAt || (aaaIntact && twoOk && bbbOk));
  });
}

for (const [base, withBox, reps] of [['LANDFAIL-box', true, 2], ['LANDFAIL-control', false, 1]]) for (let i = 0; i < reps; i += 1) {
  const name = `${base}-${i}`;
  if (!want18(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R landfail ${base} ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    if (withBox) await keptByLeave('one', true, 'aaa'); else { await typeText('plain', 60); await sleep(2500); await open(id); await sleep(4500); }
    const bx0 = await boxes();
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await clickEnd('warmup'); mark();
    const words = 'the quick brown fox jumps over the lazy dog and keeps on typing for ten seconds now';
    const t0w = Date.now(); let typed = 0;
    for (const c of words) { if (Date.now() - t0w > 10000) break; if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); typed += 1; await sleep(95); }
    await sleep(6000);
    const saves = net.filter((l) => /text-save/.test(l) && !/RESP/.test(l));
    const after = (await b.ev(EDS18)).find((e) => e.v.startsWith('warmup'));
    let undos = 0; let value = after ? after.v : null;
    while (value !== null && value !== 'warmup' && undos < 80) { await undo(); undos += 1; await sleep(220); const e = (await b.ev(EDS18)).find((x) => x.v.startsWith('warmup')); value = e ? e.v : null; }
    rule = () => 'continue';
    const bx1 = await boxes(); lastStoredHere = await storedFor(id);
    row(name, id, { withBox, bx0, typed, saves: saves.length, saveLines: saves.map((l) => l.slice(0, 90)), undos, undone: value === 'warmup', bx1 }, true);
  });
}

const keptByCreateFail = async () => {
  let failed = false;
  rule = ({ m, u }) => { if (!failed && m === 'POST' && /\/notes\/:id\/blocks$/.test(u)) { failed = true; return '500'; } return 'continue'; };
  await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 50);
  await sleep(14000); rule = () => 'continue';
  return failed;
};
for (let i = 0; i < 3; i += 1) {
  const name = `STEAL2-reopenThenTypeElsewhere-${i}`;
  if (!want18(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R steal2 ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    const failed = await keptByCreateFail();
    const bx0 = await boxes(); const before = await blocksOf(id);
    // Reopen; as soon as 'warmup' is on screen, click its end and type.
    await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${id}` });
    let w = null; const tA = Date.now();
    while (!w && Date.now() - tA < 15000) { await sleep(100); w = (await b.ev(EDS18).catch(() => [])).find((e) => e.v === 'warmup') || null; }
    const shownAfter = Date.now() - tA;
    if (w) { await b.click(w.x + 120, w.y + Math.min(w.h, 24) / 2); await sleep(150); await press('End', 'End', 35); await typeText(' xyz', 90); }
    const active = (await win()).active;
    await sleep(6000); await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id); const bx1 = await boxes();
    const units = blocks.flat().map(strip);
    const xyzInWarmup = units.includes('warmup xyz');
    const xyzElsewhere = units.some((u) => u.includes('xyz') && u !== 'warmup xyz');
    row(name, id, { failed, bx0, before, shownAfter, active, blocks, bx1, xyzInWarmup, xyzElsewhere }, xyzInWarmup && !xyzElsewhere);
  });
}
for (const [base, withBox, reps] of [['LANDFAIL2-box', true, 2], ['LANDFAIL2-control', false, 1]]) for (let i = 0; i < reps; i += 1) {
  const name = `${base}-${i}`;
  if (!want18(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R landfail2 ${base} ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    if (withBox) await keptByCreateFail(); else { await typeText('plain', 60); await sleep(2500); }
    // From the reopen on, every text-save is answered 500, so the landing's save never confirms.
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await open(id); await sleep(5000);
    const bx0 = await boxes();
    const w = (await b.ev(EDS18)).find((e) => e.v.startsWith('warmup'));
    if (w) { await b.click(w.x + 120, w.y + Math.min(w.h, 24) / 2); await sleep(300); await press('End', 'End', 35); }
    mark();
    const words = 'the quick brown fox jumps over the lazy dog and keeps on typing for ten seconds now';
    const t0w = Date.now(); let typed = 0;
    for (const c of words) { if (Date.now() - t0w > 10000) break; if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); typed += 1; await sleep(95); }
    await sleep(6000);
    const saves = net.filter((l) => /text-save/.test(l) && !/RESP/.test(l));
    const after = (await b.ev(EDS18)).find((e) => e.v.startsWith('warmup'));
    let undos = 0; let value = after ? after.v : null;
    while (value !== null && value !== 'warmup' && undos < 80) { await undo(); undos += 1; await sleep(220); const e = (await b.ev(EDS18)).find((x) => x.v.startsWith('warmup')); value = e ? e.v : null; }
    rule = () => 'continue';
    const bx1 = await boxes(); lastStoredHere = await storedFor(id);
    row(name, id, { withBox, bx0, typed, saves: saves.length, saveLines: saves.map((l) => l.slice(0, 90)), lineAfter: after ? after.v : null, undos, undone: value === 'warmup', bx1 }, true);
  });
}
// BOXTYPE (Reviewer, a40af841): a record that CAN land, while the person is typing inside its box. The anchor is made
// to match only after reopen, so the retry ticks are already backed off: unit X holds 'Intr'; the record says
// initialText 'Intro', text 'Intro more' (kept: 'Intr' does not start with 'Intro'). The person adds 'o' to X (now the
// anchor matches), clicks into the box and types one letter every 150 ms for 15 s. Per key: box present, box value,
// activeElement. Then: where did every typed letter end up (note, box, store, nowhere)? BOXTYPE-ctrl: same, no typing
// in the box (the landing alone).
for (const [base, typeInBox, reps] of [['BOXTYPE-typeInBox', true, 3], ['BOXTYPE-ctrl', false, 1]]) for (let i = 0; i < reps; i += 1) {
  const name = `${base}-${i}`;
  if (!want18(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R boxtype ${i}`); lastId = id;
    await arriveAndWarm(id);
    await typeText('Intr', 60); await sleep(2500); await blurOutside(); await sleep(3000);
    const eds = await b.ev(EDS18); const x = eds.find((e) => e.v === 'Intr');
    if (!x) throw new Error(`setup: ${JSON.stringify(eds.map((e) => [e.v, e.unit]))}`);
    await seed18(id, [{ id: 'bt-1', blockId: x.block, unitId: x.unit, writingRole: 'paragraph', initialText: 'Intro', text: 'Intro more' }]);
    await watch(); mark();
    await open(id); await sleep(3000);
    const bx0 = await boxes();
    // The person completes the word in X: the anchor now matches.
    // The box sits on X itself, so X is reached from the line above with the keyboard, not by a click on X.
    const wl = (await b.ev(EDS18)).find((e) => e.v === 'warmup');
    let reachedX = null;
    if (wl) {
      await b.click(wl.x + 120, wl.y + Math.min(wl.h, 24) / 2); await sleep(250); await press('End', 'End', 35); await sleep(100);
      for (const [k, code, vk] of [['ArrowDown', 'ArrowDown', 40], ['ArrowRight', 'ArrowRight', 39]]) {
        await press(k, code, vk); await sleep(250);
        reachedX = await b.ev(`(()=>{const a=document.activeElement;return a&&a.dataset&&a.dataset.runtimeTextflowEditor?a.value:null})()`);
        if (reachedX === 'Intr') break;
      }
      if (reachedX === 'Intr') { await press('End', 'End', 35); await typeText('o', 60); await sleep(300); }
    }
    const xNow = (await b.ev(EDS18)).find((e) => e.unit === x.unit);
    const keys = []; const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let typedInBox = '';
    if (typeInBox) {
      const at = await b.ev(`(()=>{const t=[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].find(e=>e.getBoundingClientRect().width>0);if(!t)return null;const r=t.getBoundingClientRect();return {x:r.left+20,y:r.top+Math.min(r.height,24)/2}})()`);
      if (at) { await b.click(at.x, at.y); await sleep(200); await press('End', 'End', 35); }
      const tA = Date.now();
      for (let k = 0; Date.now() - tA < 15000 && k < alphabet.length; k += 1) {
        const c = alphabet[k];
        await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); typedInBox += c;
        const s = await b.ev(`(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const a=document.activeElement;return {box:t?t.value:null,active:a?(a.tagName+(a.dataset&&a.dataset.structureTypingBuffer!==undefined?':box':a.dataset&&a.dataset.runtimeTextflowEditor?':editor='+a.value.slice(0,24):'')):null}})()`);
        keys.push([Date.now() - tA, c, s.box, s.active]);
        await sleep(150);
      }
    } else await sleep(15000);
    await sleep(3000);
    const activeEnd = (await win()).active; const bx1 = await boxes();
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    const units = blocks.flat().map(strip);
    const inNote = units.join('|');
    const keptText = bx1.map((x3) => x3.v).join('|') + JSON.stringify(lastStoredHere);
    // What landed after 'Intro more' is a run of the typed letters; the rest of the run must be somewhere else.
    const m = (inNote + '|' + keptText).match(/Intro more([A-Za-z]*)/);
    const landedTail = m ? m[1] : '';
    const rest = typedInBox.startsWith(landedTail) ? typedInBox.slice(landedTail.length) : typedInBox;
    const lostStr = rest && !inNote.includes(rest) && !keptText.includes(rest) ? rest : '';
    const lost = [...lostStr];
    // The landing moment: the first key after which the box was gone.
    const goneAt = keys.findIndex((k) => k[2] === null);
    row(name, id, { bx0, reachedX, xAfterO: xNow ? xNow.v : null, typedInBox, landedTail, keys, goneAt, typedAfterGone: goneAt >= 0 ? typedInBox.slice(goneAt) : '', activeEnd, bx1, blocks, keptText: keptText.slice(0, 200), lost: lost.join('') },
      lost.length === 0 && (inNote.includes('Intro more') || keptText.includes('Intro more')));
  });
}
// BOXTYPE2 (natural shape of the Reviewer's case): the role-change save is held, the watchdog lets go (~10 s) and
// the words are kept in a box; the person clicks into the box and types one letter every 150 ms; 2 s into the typing
// the held save is let through, so the retry lands the box's words while the person is still typing in it.
for (let i = 0; i < 3; i += 1) {
  const name = `BOXTYPE2-landWhileTypingInBox-${i}`;
  if (!want18(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R boxtype2 ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    let saves = 0;
    rule = ({ u }) => { if (/text-save/.test(u)) { saves += 1; if (saves === 2) return 'hold'; } return 'continue'; };
    await typeHash(); await typeText('kept', 90);
    let at = null; const tA = Date.now();
    while (!at && Date.now() - tA < 16000) {
      await sleep(200);
      at = await b.ev(`(()=>{const n=document.querySelector('[data-structure-typing-notice]');const t=document.querySelector('textarea[data-structure-typing-buffer]');if(!n||!t||t.getBoundingClientRect().width===0)return null;const r=t.getBoundingClientRect();return {x:r.left+20,y:r.top+Math.min(r.height,24)/2,v:t.value}})()`);
    }
    const keptAt = Date.now() - tA;
    const keys = []; let typedInBox = ''; let releasedAtKey = null;
    if (at) {
      await b.click(at.x, at.y); await sleep(200); await press('End', 'End', 35);
      const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const tB = Date.now();
      for (let k = 0; k < alphabet.length && Date.now() - tB < 9000; k += 1) {
        if (releasedAtKey === null && Date.now() - tB > 2000) { rule = () => 'continue'; await release(); releasedAtKey = k; }
        const c = alphabet[k];
        await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); typedInBox += c;
        const s = await b.ev(`(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const a=document.activeElement;return {box:t?t.value:null,active:a?(a.tagName+(a.dataset&&a.dataset.structureTypingBuffer!==undefined?':box':a.dataset&&a.dataset.runtimeTextflowEditor?':editor='+a.value.slice(0,24):'')):null}})()`);
        keys.push([Date.now() - tB, c, s.box, s.active]);
        await sleep(150);
      }
    }
    rule = () => 'continue'; await release();
    await sleep(4000); const activeEnd = (await win()).active; const bx1 = await boxes();
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    const inNote = blocks.flat().map(strip).join('|');
    const keptText = bx1.map((x3) => x3.v).join('|') + JSON.stringify(lastStoredHere);
    const m = (inNote + '|' + keptText).match(/kept([A-Za-z]*)/);
    const landedTail = m ? m[1] : '';
    const rest = typedInBox.startsWith(landedTail) ? typedInBox.slice(landedTail.length) : typedInBox;
    const lostStr = rest && !inNote.includes(rest) && !keptText.includes(rest) ? rest : '';
    const goneAt = keys.findIndex((k) => k[2] === null);
    row(name, id, { keptAt, boxBefore: at && at.v, releasedAtKey, typedInBox, landedTail, keys, goneAt, typedAfterGone: goneAt >= 0 ? typedInBox.slice(goneAt) : '', activeEnd, bx1, blocks, keptText: keptText.slice(0, 200), lost: lostStr, void: at ? null : 'no kept box within 16 s' },
      !at || lostStr === '');
  });
}
// BOXTYPE3: a box kept by the slow-reply leave (the shape that stays kept); the person clicks into the box and types one
// letter every 150 ms for 12 s. If a retry lands the box's words meanwhile, where do the following keys go?
for (let i = 0; i < 3; i += 1) {
  const name = `BOXTYPE3-typeInKeptBox-${i}`;
  if (!want18(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R boxtype3 ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    await keptByLeave('one', true, 'aaa');
    const at = await b.ev(`(()=>{const t=[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].find(e=>e.getBoundingClientRect().width>0);if(!t)return null;const r=t.getBoundingClientRect();return {x:r.left+20,y:r.top+Math.min(r.height,24)/2,v:t.value}})()`);
    const keys = []; let typedInBox = '';
    if (at) {
      await b.click(at.x, at.y); await sleep(200);
      await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35, modifiers: 2 }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End', windowsVirtualKeyCode: 35, modifiers: 2 });
      const alphabet = 'bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ';
      const tB = Date.now();
      for (let k = 0; k < alphabet.length && Date.now() - tB < 12000; k += 1) {
        const c = alphabet[k];
        await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); typedInBox += c;
        const s = await b.ev(`(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const a=document.activeElement;return {box:t?t.value:null,active:a?(a.tagName+(a.dataset&&a.dataset.structureTypingBuffer!==undefined?':box':a.dataset&&a.dataset.runtimeTextflowEditor?':editor='+a.value.slice(0,24):'')):null}})()`);
        keys.push([Date.now() - tB, c, s.box, s.active]);
        await sleep(150);
      }
    }
    await sleep(4000); const activeEnd = (await win()).active; const bx1 = await boxes();
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    const inNote = blocks.flat().map(strip).join('|');
    const keptText = bx1.map((x3) => x3.v).join('|') + JSON.stringify(lastStoredHere);
    // Letters typed are consonants only, so they cannot be mistaken for 'one', 'aaa' or 'warmup'.
    const m = (inNote + '|' + keptText).match(/aaa([b-df-hj-np-tv-xzB-DF-HJ-NP-TV-XZ]*)/);
    const landedTail = m ? m[1] : '';
    const rest = typedInBox.startsWith(landedTail) ? typedInBox.slice(landedTail.length) : typedInBox;
    const lostStr = rest && !inNote.includes(rest) && !keptText.includes(rest) ? rest : '';
    const goneAt = keys.findIndex((k) => k[2] === null);
    row(name, id, { boxBefore: at && at.v, typedInBox, landedTail, keys, goneAt, typedAfterGone: goneAt >= 0 ? typedInBox.slice(goneAt) : '', activeEnd, bx1, blocks, keptText: keptText.slice(0, 200), lost: lostStr, void: at ? null : 'no kept box' },
      !at || lostStr === '');
  });
}
if (want18('COPYPASTE')) await scenario('COPYPASTE-0', async () => {
  const id = await newNote('R copypaste'); lastId = id;
  await arriveAndWarm(id);
  await watch(); mark();
  rule = ({ m, u }) => (m === 'POST' && /\/notes\/:id\/blocks$/.test(u) ? '500' : 'continue');
  await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 50);
  await sleep(14000); rule = () => 'continue';
  const bx0 = await boxes();
  const words = bx0.length ? bx0[0].v : null;
  if (words) { await clickEnd('warmup'); await enter(); await sleep(400); await b.cdp('Input.insertText', { text: words.replace(/\n/g, ' ') }); await sleep(3000); }
  await blurOutside(); await sleep(3000);
  const blocks1 = await blocksOf(id);
  await open(id); await sleep(15000);
  const blocks2 = await blocksOf(id); const bx2 = await boxes(); lastStoredHere = await storedFor(id);
  const all = blocks2.flat().map(strip).join('|');
  row('COPYPASTE-0', id, { bx0, words, blocks1, blocks2, bx2, headCount: all.split('head').length - 1, bodyCount: all.split('body').length - 1 }, true);
});

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
