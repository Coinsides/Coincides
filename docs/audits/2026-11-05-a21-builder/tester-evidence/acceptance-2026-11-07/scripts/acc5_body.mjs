// Y: hand reproductions of the independent read's findings (no agent conclusion is reported until it reproduces here).
// Y1 (finding 1): kept words whose unit was moved away by the server stay anchored at {old block, old unit id}. New unit
//     ids are max+1 per block, so the next Enter at the end of that block hands the same id out again; the 800 ms retry
//     may then write the kept words into that new, unrelated paragraph.
// Y2 (finding 2): on reopen, "already in the note" is decided by unitText.includes(inserted fragment). A short fragment
//     typed in a second window ('od' after 'body') is found inside 'body', so the record is dropped and 'od' is nowhere.
// Y3 (finding 3): a box restored on reopen carries a fresh id on the page; leaving to a non-canvas page and back opens a
//     second box for the same record.
const ONLY5 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want5 = (name) => !ONLY5 || ONLY5.some((p) => name.startsWith(p));
const boxes = () => b.ev(`[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].map(t=>({v:t.value,entry:t.dataset.structureTypingEntry||null,vis:t.getBoundingClientRect().width>0}))`);
const REP5 = Number(process.env.REP5 || 3);
const editorOf = async (text) => { const s = await state(); return s.tas.find((t) => t.v === text) || null; };

// Shared start of Y1/Y3: the address-bar leave with the transfer reply held 4 s (the builder's 0/6 auto-land arm), so
// the words end up kept (category 2) with the window's unit moved to the heading's new block by the server.
const keptByAddressLeave = async (title) => {
  const id = await newNote(title);
  await arriveAndWarm(id);
  await watch(); mark();
  respRule = ({ u }) => (/unit-transfer/.test(u) ? { delay: 4000 } : null);
  await typeHash(); await typeText('kept'); await enter(); await sleep(40); await typeText('body', 50);
  await goHash(other);
  await sleep(6000);
  respRule = () => null;
  await goHash(id); await sleep(5000);
  return id;
};

// Y0. H with the unload while the words are certainly still in the window: every non-GET delayed 700 ms, '# head',
// then a full navigation 1.5 / 2.5 / 3.5 s after the last key (my H-U leaves at ~5 s, which on the fixed build now
// falls after the words' save is already sent, so it no longer exercises the pagehide store). Then reopen.
for (const after of [1500, 2500, 3500]) for (let i = 0; i < 2; i += 1) {
  const name = `Y0-unloadEarly-${after}-${i}`;
  if (!want5(name)) continue;
  await scenario(name, async () => {
    const floor0 = await newNote(`R y0 floor ${after} ${i}`);
    const id = await newNote(`R y0 ${after} ${i}`);
    await open(floor0); await sleep(1500); await goHash(id); await sleep(2500);
    await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500);
    await watch(); mark();
    rule = () => ({ delay: 700 });
    await typeHash(); await typeText('head');
    await sleep(after);
    const atLeave = await win(); const netAtLeave = [...net];
    await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${floor0}` });
    rule = () => 'continue';
    await sleep(15000);
    const blocksAway = await blocksOf(id);
    await open(id); await sleep(4500);
    const reopened = await win(); const sb = await blocksOf(id);
    lastStoredHere = await storedFor(id);
    await shot(`${name}-reopened`);
    const strip = (u) => u.replace(/^\[[a-z_0-9]+\]/, '');
    const inNote = sb.flat().map(strip).some((u) => u.includes('head'));
    const kept = (reopened.buf || '').includes('head') || JSON.stringify(lastStoredHere).includes('head');
    row(name, id, { after, atLeave, netAtLeave, blocksAway, reopened, blocks: sb, inNote, kept }, inNote || kept);
  });
}

for (let i = 0; i < REP5; i += 1) {
  const name = `Y1-reusedId-${i}`;
  if (!want5(name)) continue;
  await scenario(name, async () => {
    const id = await keptByAddressLeave(`R y1 ${i}`);
    const before = await win(); const bxBefore = await boxes(); const blocksBefore = await serverBlocks(id);
    lastStoredHere = await storedFor(id);
    const storedBefore = lastStoredHere;
    await shot(`${name}-kept`);
    // The person carries on writing: end of 'warmup', Enter, a new line.
    const w = await editorOf('warmup');
    let typedNew = false;
    if (w) { await b.click(w.x + 150, w.y); await sleep(300); await press('End', 'End', 35); await sleep(200); await enter(); await sleep(2500); await typeText('next', 90); typedNew = true; }
    await sleep(3000);
    const after = await win(); const bxAfter = await boxes(); await shot(`${name}-after-enter`);
    await blurOutside(); await sleep(2500);
    const sb = await serverBlocks(id);
    lastStoredHere = await storedFor(id);
    const flatU = sb.flatMap((x) => x.units);
    const nextUnit = flatU.find((u) => u.includes('next')) || null;
    const keptInto = flatU.filter((u) => /kept|body/.test(u.replace(/^\[[a-z_0-9]+\]/, '')));
    row(name, id, { before, bxBefore, storedBefore, blocksBefore: blocksBefore.map((x) => ({ units: x.units, ids: x.ids })), typedNew, after, bxAfter,
      blocks: sb.map((x) => ({ units: x.units, ids: x.ids })), nextUnit, keptInto },
      // Bad = 'kept' or 'body' anywhere other than the heading 'kept' or the paragraph 'body' (merged into a line, or a
      // plain paragraph 'kept'): the kept words were written somewhere the person did not put them.
      !flatU.some((u) => /kept|body/.test(u) && u !== 'body' && u !== '[heading_1]kept'));
  });
}

for (let i = 0; i < REP5; i += 1) {
  const name = `Y2-fragmentReopen-${i}`;
  if (!want5(name)) continue;
  await scenario(name, async () => {
    const floor2 = await newNote(`R y2 floor ${i}`);
    const id = await newNote(`R y2 ${i}`);
    await open(floor2); await sleep(1500); await goHash(id); await sleep(2500);
    await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500);
    await watch(); await traceOn(); mark();
    rule = () => ({ delay: 700 });
    await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 60);
    // Wait for a second window whose starting text is 'body', then type a fragment that 'body' already contains.
    let w2 = null; const t0w = Date.now();
    while (Date.now() - t0w < 12000) { const w = await win(); if (w.buf === 'body') { w2 = w; break; } await sleep(40); }
    let typedFragment = false;
    if (w2) { await typeText('od', 60); typedFragment = true; }
    await sleep(150);
    const atLeave = await win(); const netAtLeave = [...net];
    await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${floor2}` });
    rule = () => 'continue';
    await sleep(15000);
    const blocksAway = await blocksOf(id);
    await open(id); await sleep(4500);
    const reopened = await win(); const sb = await blocksOf(id);
    lastStoredHere = await storedFor(id);
    await shot(`${name}-reopened`);
    const all = JSON.stringify(sb) + (reopened.buf || '') + JSON.stringify(lastStoredHere);
    row(name, id, { sawSecondWindow: Boolean(w2), typedFragment, atLeave, netAtLeave, blocksAway, reopened, blocks: sb },
      // Only meaningful when the fragment was typed in the second window: then 'bodyod' must be somewhere.
      !typedFragment || all.includes('bodyod'));
  });
}

for (let i = 0; i < Math.min(REP5, 2); i += 1) {
  const name = `Y3-restoredBoxTwice-${i}`;
  if (!want5(name)) continue;
  await scenario(name, async () => {
    const id = await keptByAddressLeave(`R y3 ${i}`);
    await open(id); await sleep(4500);
    const afterReopen = await boxes();
    await b.ev(`location.hash='#/sources';1`); await sleep(3000);
    const away = await boxes();
    await goHash(id); await sleep(5000);
    const back = await boxes(); await shot(`${name}-back`);
    lastStoredHere = await storedFor(id);
    const blocks = await blocksOf(id);
    const visible = back.filter((x) => x.vis && /kept|body/.test(x.v));
    row(name, id, { afterReopen, away, back, blocks }, visible.length <= 1);
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
