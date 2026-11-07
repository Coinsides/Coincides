// 3b placement check (typedTextIsPlaced / mergeTypedText) in the real app, round 2. From the read-only code read:
//  S-*  seeded: the note is typed for real, then ONE stored record is written into this browser's localStorage under the
//       app's own key (coincides:unplaced-words:<account>:<note>) with the note's real block and unit ids, and the page
//       is reopened. This tests what the reopen does with such a record; it does not show how often a person makes one.
//       S-b1 / S-b2: predicted loss (record deleted, words nowhere). S-a1: predicted duplicate. S-ctrl: should land.
//  N-*  natural attempts at the same shapes by typing:
//       N-a1: '# ' + 'big ' at the start of 'intro'; the save carrying 'big' answered 500 (failure stays, Retry/Undo);
//             the person types 'great ' at the caret; page closes; reopen. Predicted: 'big' written twice.
//       N-a1c: same without the further typing (control).
//       N-b2: lines 'see the note' / 'intro'; '# ' + 'note' + Enter at the start of 'intro'; the save carrying the
//             landed words held at the request stage; page closes 150 ms later; reopen.
const ONLY13 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want13 = (name) => !ONLY13 || ONLY13.some((p) => name.startsWith(p));
const me = await (await fetch(`${API}/auth/me`, { headers: auth })).json();
const ACCOUNT_ID = me?.user?.id ?? me?.id;
const EDS = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,block:e.dataset.blockId||null,unit:e.dataset.textUnitId||null,x:r.left,y:r.top,h:r.height}})`;
const buildLines = async (id, lines) => {
  await arriveAndWarm(id);
  for (let k = 0; k < lines.length; k += 1) { await typeText(lines[k], 60); if (k < lines.length - 1) { await enter(); await sleep(300); } }
  await sleep(2500); await blurOutside(); await sleep(3000);
};
const textOf = (blocks) => blocks.flat().map(strip);

const seeded = [
  // Last field: how many more times the word should appear after reopen. S-a1's 'My ' is already in the note
  // ('My great Intro': the person typed on after it), so the right result adds nothing.
  ['S-b1-nextLineSharesPrefix', ['Title', 'Body text'], 'Title', 'Title', 'Title\nBody', 'Body', 1],
  ['S-b2-prevLineSharesSuffix', ['See the Note', 'Intro'], 'Intro', 'Intro', 'Note\nIntro', 'Note', 1],
  ['S-a1-moreTypedAtCaret', ['My great Intro'], 'My great Intro', 'Intro', 'My Intro', 'My', 0],
  ['S-ctrl-shouldLand', ['Title', 'Other'], 'Title', 'Title', 'Title\nBody', 'Body', 1],
];
for (const [name, lines, target, initialText, text, word, delta] of seeded) {
  if (!want13(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R ${name}`); lastId = id;
    await buildLines(id, lines);
    const eds = await b.ev(EDS); const t = eds.find((e) => e.v === target);
    if (!t || !ACCOUNT_ID) throw new Error(`setup: target ${target} ${Boolean(t)} account ${Boolean(ACCOUNT_ID)}`);
    const before = await blocksOf(id);
    const rec = [{ id: `seed-${Date.now()}`, blockId: t.block, unitId: t.unit, initialText, text }];
    await b.ev(`localStorage.setItem(${JSON.stringify(`coincides:unplaced-words:${ACCOUNT_ID}:${id}`)}, ${JSON.stringify(JSON.stringify(rec))});1`);
    await open(id); await sleep(5000);
    const bx = await boxes(); const storedAfter = await storedFor(id); await shot(`${name}-reopened`);
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = storedAfter;
    const units = textOf(blocks);
    const count = units.join('\n').split(word).length - 1;
    const kept = bx.some((x) => x.v.includes(word)) || JSON.stringify(storedAfter).includes(word);
    const beforeCount = textOf(before).join('\n').split(word).length - 1;
    // The typed word must end up once more than it was before: in the note (once) or kept.
    const outcome = count === beforeCount + delta ? 'right' : count > beforeCount + delta ? 'duplicated' : kept ? 'kept' : 'LOST';
    row(name, id, { lines, record: rec[0], before, boxes: bx, storedAfter, blocks, word, count, beforeCount, outcome },
      outcome === 'right' || outcome === 'kept');
  });
}

for (const [base, more, reps] of [['N-a1-failedSaveThenMore', true, 3], ['N-a1c-failedSaveNoMore', false, 1]]) for (let i = 0; i < reps; i += 1) {
  const name = `${base}-${i}`;
  if (!want13(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R ${base} ${i}`); lastId = id;
    await buildLines(id, ['intro']);
    const e = (await b.ev(EDS)).find((x) => x.v === 'intro');
    await b.click(e.x + 30, e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('Home', 'Home', 36); await sleep(200);
    await watch(); mark();
    let failed = false;
    rule = ({ u, pd }) => { if (/text-save/.test(u) && /big/.test(pd || '') && !failed) { failed = true; return '500'; } return 'continue'; };
    await typeHash(); await typeText('big ', 90);
    const tA = Date.now(); while (!failed && Date.now() - tA < 12000) await sleep(50);
    await sleep(2500); const s1 = await win();
    if (more) { await typeText('great ', 90); await sleep(3000); }
    const s2 = await win(); const before = await blocksOf(id); const storedBefore = await storedFor(id); await shot(`${name}-beforeLeave`);
    await leavePage(); rule = () => 'continue';
    await sleep(12000);
    await open(id); await sleep(5000);
    const reopened = await win(); const bx = await boxes(); const storedAfter = await storedFor(id); await shot(`${name}-reopened`);
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = storedAfter;
    const all = textOf(blocks).join('\n');
    const bigCount = all.split('big').length - 1;
    const kept = bx.some((x) => x.v.includes('big')) || JSON.stringify(storedAfter).includes('big');
    const outcome = bigCount === 1 ? 'once' : bigCount > 1 ? 'duplicated' : kept ? 'kept' : 'LOST';
    row(name, id, { failed, s1, s2, before, storedBefore, reopened, boxes: bx, storedAfter, blocks, bigCount, outcome,
      greatOk: more ? all.includes('great') : null }, (outcome === 'once' || outcome === 'kept') && (!more || all.includes('great')));
  });
}

for (let i = 0; i < 2; i += 1) {
  const name = `N-b2-headingAboveLineSameWord-${i}`;
  if (!want13(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R nb2 ${i}`); lastId = id;
    await buildLines(id, ['see the note', 'intro']);
    const e = (await b.ev(EDS)).find((x) => x.v === 'intro');
    await b.click(e.x + 30, e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('Home', 'Home', 36); await sleep(200);
    await watch(); mark();
    let held = false;
    rule = ({ u, pd }) => { if (/text-save/.test(u) && /note\|intro|note.*intro/.test(pd || '') && /\[heading_1\]note/.test(pd || '') && !held) { held = true; return 'hold'; } return 'continue'; };
    await typeHash(); await typeText('note', 90); await enter(); await sleep(40);
    const tA = Date.now(); while (!held && Date.now() - tA < 10000) await sleep(40);
    await sleep(150);
    const atLeave = await win(); const netAtLeave = [...net];
    await leavePage(); rule = () => 'continue';
    await sleep(12000);
    await open(id); await sleep(5000);
    const reopened = await win(); const bx = await boxes(); const storedAfter = await storedFor(id); await shot(`${name}-reopened`);
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = storedAfter;
    const units = textOf(blocks);
    const noteAlone = units.filter((u) => u === 'note').length;
    const kept = bx.some((x) => /note/.test(x.v)) || JSON.stringify(storedAfter).includes('note\\n');
    const outcome = noteAlone === 1 ? 'once' : noteAlone > 1 ? 'duplicated' : kept ? 'kept' : (held ? 'LOST' : 'not-held');
    row(name, id, { held, atLeave, netAtLeave, reopened, boxes: bx, storedAfter, blocks, outcome }, outcome !== 'LOST' && outcome !== 'duplicated');
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
