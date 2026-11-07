// Round-2 additions (Main_Designer's code read, accepted by Tester):
//  K25 : the role-change save held 25 s, then let through (the fix's recovery bound is about 20 s; past it the expected
//        outcome is words in the note, not split — category 2' — and we want the number).
//  HL  : words have just landed locally and their save has not reached the server when the page closes (the save
//        carrying 'body' is held at the request stage, then the page navigates away and the held request dies with it).
//  TWO : two kept records in one note; discarding one must leave the other on screen, in storage and after reload.
//  NA  : no anchor: Enter at the end of an already split heading, words typed in the window, page closed at once.
const ONLY10 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want10 = (name) => !ONLY10 || ONLY10.some((p) => name.startsWith(p));
const ROLE_SAVE = Number(process.env.ROLE_SAVE || 2);
const editorOf = async (text) => { const s = await state(); return s.tas.find((t) => t.v === text) || null; };
const boxes = () => b.ev(`[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].map(t=>({v:t.value,entry:t.dataset.structureTypingEntry||null,vis:t.getBoundingClientRect().width>0}))`);
const strip = (u) => u.replace(/^\[[a-z_0-9]+\]/, '');

for (const [base, withEnter] of [['K25-roleSave25s-noEnter', false], ['K25-roleSave25s-enter', true]]) for (let i = 0; i < 2; i += 1) {
  const name = `${base}-${i}`;
  if (!want10(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R ${base} ${i}`);
    await watch(); mark();
    let saves = 0;
    rule = ({ u }) => { if (/text-save/.test(u)) { saves += 1; if (saves === ROLE_SAVE) return 'hold'; } return 'continue'; };
    await typeHash(); await typeText(withEnter ? 'two' : 'kept');
    if (withEnter) { await enter(); await sleep(60); await typeText('body'); }
    await sleep(1500); const s1 = await win();
    await sleep(23500); const s25 = await win(); await shot(`${name}-held`);
    const heldCount = held.length;
    rule = () => 'continue'; await release();
    await sleep(6000); const after = await win();
    await blurOutside(); await sleep(2500);
    const blocks = await blocksOf(id);
    await open(id); await sleep(4000);
    const reopened = await win(); const blocksAfter = await blocksOf(id);
    lastStoredHere = await storedFor(id);
    const text = flat(blocksAfter) + JSON.stringify(lastStoredHere) + (reopened.buf || '');
    const words = withEnter ? ['two', 'body'] : ['kept'];
    row(name, id, { heldCount, s1, s25, after, blocks, reopened, blocksAfter }, words.every((w) => text.includes(w)));
  });
}

for (let i = 0; i < 3; i += 1) {
  const name = `HL-saveNotSentThenClose-${i}`;
  if (!want10(name)) continue;
  await scenario(name, async () => {
    const floorL = await newNote(`R hl floor ${i}`);
    const id = await newNote(`R hl ${i}`);
    await open(floorL); await sleep(1500); await goHash(id); await sleep(2500);
    await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500);
    await watch(); mark();
    let heldBody = false;
    rule = ({ u, pd }) => { if (/text-save/.test(u) && /body/.test(pd || '')) { heldBody = true; return 'hold'; } return 'continue'; };
    await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 50);
    const t0 = Date.now(); while (!heldBody && Date.now() - t0 < 8000) await sleep(40);
    await sleep(150);
    const atLeave = await win(); const netAtLeave = [...net]; const dom = await b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.value)`);
    await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${floorL}` });
    rule = () => 'continue'; held.length = 0;
    await sleep(12000);
    const blocksAway = await blocksOf(id); const storedBefore = await storedFor(id);
    await open(id); await sleep(4500);
    const reopened = await win(); const sb = await blocksOf(id);
    lastStoredHere = await storedFor(id);
    await shot(`${name}-reopened`);
    const all = JSON.stringify(sb.flat().map(strip)) + (reopened.buf || '') + JSON.stringify(lastStoredHere);
    row(name, id, { heldBody, atLeave, dom, netAtLeave, blocksAway, storedBefore, reopened, blocks: sb },
      all.includes('head') && all.includes('body'));
  });
}

for (let i = 0; i < 3; i += 1) {
  const name = `TWO-discardOne-${i}`;
  if (!want10(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R two ${i}`);
    await watch(); mark();
    rule = ({ u }) => (/unit-transfer/.test(u) ? 'hold' : 'continue');
    await typeHash(); await typeText('one');
    await sleep(12500); rule = () => 'continue'; await release(); await sleep(4000);
    const s1 = await boxes();
    const w = await editorOf('warmup');
    if (w) { await b.click(w.x + 120, w.y); await sleep(300); await press('End', 'End', 35); await sleep(200); await enter(); await sleep(2500); }
    rule = ({ u }) => (/unit-transfer/.test(u) ? 'hold' : 'continue');
    await typeHash(); await typeText('two');
    await sleep(12500); rule = () => 'continue'; await release(); await sleep(4000);
    const s2 = await boxes(); const stored2 = await storedFor(id); await shot(`${name}-two-kept`);
    // Discard the box that holds 'one': its notice is inside it; pick the notice button whose entry tag matches.
    const target = s2.find((x) => x.v.includes('one'));
    const at = target ? await b.ev(`(()=>{const ns=[...document.querySelectorAll('[data-structure-typing-notice]')];let n=ns.find(x=>(x.dataset.structureTypingEntry||x.closest('[data-structure-typing-entry]')?.dataset.structureTypingEntry)===${JSON.stringify(target.entry)})||null;let how=n?'tag':null;if(!n){const box=[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].find(t=>t.dataset.structureTypingEntry===${JSON.stringify(target.entry)});if(box){const br=box.getBoundingClientRect();let best=null;for(const x of ns){const r=x.getBoundingClientRect();const d=Math.abs(r.top-br.top)+Math.abs(r.left-br.left);if(best===null||d<best.d)best={x,d}}n=best?best.x:null;how=n?'nearest':null}}const btn=n&&n.querySelector('button');if(!btn)return {found:false,notices:ns.map(x=>x.dataset.structureTypingEntry||null)};const r=btn.getBoundingClientRect();return {found:true,how,x:r.x+r.width/2,y:r.y+r.height/2,label:(btn.textContent||'').trim()}})()`) : null;
    if (at && at.found) { await b.click(at.x, at.y); await sleep(1500); }
    const s3 = await boxes(); const stored3 = await storedFor(id);
    await open(id); await sleep(4500);
    const s4 = await boxes(); const stored4 = await storedFor(id); const blocks = await blocksOf(id);
    await shot(`${name}-reloaded`);
    const has = (list, w) => list.some((x) => x.v.includes(w));
    const twoSurvives = has(s3, 'two') && !has(s3, 'one') && JSON.stringify(stored3).includes('two') && !JSON.stringify(stored3).includes('one')
      && (has(s4, 'two') || flat(blocks).includes('two')) && !has(s4, 'one');
    // Precondition: two kept records on screen before the discard. Without it the row says nothing about the claim.
    // Two distinct boxes: one holding 'one' and another holding 'two' (one box holding both does not count).
    const precondition = s2.length >= 2 && s2.some((x) => x.v.includes('one') && !x.v.includes('two')) && s2.some((x) => x.v.includes('two') && !x.v.includes('one'));
    row(name, id, { s1, s2, stored2, at, s3, stored3, s4, stored4, blocks, precondition, void: precondition ? null : 'two kept records were not both on screen' },
      !precondition || (Boolean(at && at.found) && twoSurvives));
  });
}

for (let i = 0; i < 3; i += 1) {
  const name = `NA-enterAfterHeadingThenClose-${i}`;
  if (!want10(name)) continue;
  await scenario(name, async () => {
    const floorN = await newNote(`R na floor ${i}`);
    const id = await newNote(`R na ${i}`);
    await open(floorN); await sleep(1500); await goHash(id); await sleep(2500);
    await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500);
    await typeHash(); await typeText('Title'); await sleep(3500); await enter(); await sleep(60); await typeText('body'); await sleep(4000);
    await blurOutside(); await sleep(2000);
    const before = await blocksOf(id);
    const t = await editorOf('Title');
    if (t) { await b.click(t.x + 60, t.y); await sleep(300); await press('End', 'End', 35); await sleep(200); }
    await watch(); mark();
    rule = () => ({ delay: 700 });
    await enter(); await sleep(40); await typeText('abc', 60); await sleep(300);
    const atLeave = await win();
    await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${floorN}` });
    rule = () => 'continue';
    await sleep(12000);
    const blocksAway = await blocksOf(id); const storedBefore = await storedFor(id);
    await open(id); await sleep(4500);
    const reopened = await win(); const sb = await blocksOf(id);
    lastStoredHere = await storedFor(id);
    await shot(`${name}-reopened`);
    const units = sb.flat().map(strip);
    const abcAlone = units.includes('abc');
    const merged = units.some((u) => u !== 'abc' && u.includes('abc'));
    const keptAbc = (reopened.buf || '').includes('abc') || JSON.stringify(lastStoredHere).includes('abc');
    const others = ['warmup', 'Title', 'body'].every((x) => units.includes(x));
    row(name, id, { before, foundTitle: Boolean(t), atLeave, blocksAway, storedBefore, reopened, blocks: sb, abcAlone, merged, keptAbc },
      others && !merged && (abcAlone || keptAbc));
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
