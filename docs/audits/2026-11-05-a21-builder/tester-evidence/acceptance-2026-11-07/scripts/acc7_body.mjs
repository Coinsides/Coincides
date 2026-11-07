// Y2b/Y2c: does the reopen check drop a stored record because the unit's text merely CONTAINS the typed fragment?
// Same steps as Y2 (every non-GET delayed 700 ms; '# head', Enter, 'body'; wait for the second window to show 'body';
// type a fragment; unload). Before reopening, read this note's stored record from the other note's page (the note
// itself is not open, so nothing restores or deletes it). Y2b types 'od' (inside 'body'); Y2c types 'xq' (not inside).
const ONLY7 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want7 = (name) => !ONLY7 || ONLY7.some((p) => name.startsWith(p));
const REP7 = Number(process.env.REP7 || 3);
for (const [tag, frag] of [['Y2b-od', 'od'], ['Y2c-xq', 'xq']]) for (let i = 0; i < REP7; i += 1) {
  const name = `${tag}-${i}`;
  if (!want7(name)) continue;
  await scenario(name, async () => {
    const floor2 = await newNote(`R y2 floor ${tag} ${i}`);
    const id = await newNote(`R ${tag} ${i}`);
    await open(floor2); await sleep(1500); await goHash(id); await sleep(2500);
    await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500);
    await watch(); mark();
    rule = () => ({ delay: 700 });
    await typeHash(); await typeText('head'); await enter(); await sleep(40); await typeText('body', 60);
    let saw = false; const t0w = Date.now();
    while (Date.now() - t0w < 12000) { const w = await win(); if (w.buf === 'body') { saw = true; break; } await sleep(40); }
    if (saw) await typeText(frag, 60);
    await sleep(150);
    const atLeave = await win();
    await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${floor2}` });
    rule = () => 'continue';
    await sleep(15000);
    const storedBeforeReopen = await storedFor(id);
    const blocksAway = await blocksOf(id);
    await open(id); await sleep(4500);
    const reopened = await win(); const sb = await blocksOf(id);
    lastStoredHere = await storedFor(id);
    await shot(`${name}-reopened`);
    const want = `body${frag}`;
    const all = JSON.stringify(sb) + (reopened.buf || '') + JSON.stringify(lastStoredHere);
    row(name, id, { frag, saw, atLeave: atLeave.buf, storedBeforeReopen, blocksAway, reopenedBuf: reopened.buf, notice: reopened.notice, blocks: sb },
      !saw || all.includes(want));
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
