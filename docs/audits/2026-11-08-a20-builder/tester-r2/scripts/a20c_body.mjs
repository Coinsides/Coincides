// A-20 arms, third set: option (B) chosen by Henry (land without sealing). Same file before and after.
//   PAUSEEXIT-<exit>-i : type a sentence, pause 2.6 s, then exit by:
//        unload (about:blank) | hash (to another note) | 401 (every request 401 + a blur) | closetab (Page.close,
//        the tab closed normally) | kill (Browser.close). closetab and kill end the run: run each alone.
//   UNDOSEQ-i  : 'aaa' Enter 'bbb' Enter 'ccc', then Ctrl+Z x4: all editor values after each step.
//   UNDOPAUSE-i: 'aaa', 3 s pause, 'bbb', Ctrl+Z x3: values after each step.
//   DRAFT-i    : a brand-new note, first line typed slowly for ~20 s with no Enter: what the server holds every 2.5 s
//                and 3.5 s after the last key.
//   OFFLINE-i  : text-save fails at the network layer; 3 bursts with 2.6 s pauses: how many 'Failed to save block'
//                toasts; network back; one more burst + 2.6 s: server has all text?
//   PUTDUP-i   : 4 bursts with 2.6 s pauses: text-save count and whether any two carry the same content.
//   IME-i      : 3 IME compositions with 400 ms gaps, wait 3 s: text-save count; Ctrl+Z x3: values.
const C_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantC = (n) => !C_ONLY || C_ONLY.some((p) => n.startsWith(p));
const REPSC = Number(process.env.REPS || 2);
const CDPC = Number(process.env.CDPPORT || 9640);
const alertsC = () => b.ev('(window.__alerts||[]).slice()').catch(() => null);
const hasC = (units, s) => units.some((u) => u.includes(s));
const edVals = () => b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].map(t=>t.value)`).catch(() => null);
const putLines = () => net.filter((l) => /text-save/.test(l) && !/RESP/.test(l));

for (const exit of ['unload', 'hash', '401', 'closetab', 'kill']) for (let i = 0; i < REPSC; i += 1) {
  const name = `PAUSEEXIT-${exit}-${i}`; if (!wantC(name)) continue;
  if ((exit === 'kill' || exit === 'closetab') && i > 0) continue; // ends the browser: one per run
  await scenario(name, async () => {
    const id = await prep(`A20 pauseexit ${exit} ${i}`); await watch(); mark();
    const words = `paused ${exit} words ${'abcdefgh'[i]}`.replace(/[0-9]/g, '');
    await typeText(words, 90); await sleep(2600);
    if (exit === 'unload') await b.cdp('Page.navigate', { url: 'about:blank' });
    else if (exit === 'hash') await goHash(other);
    else if (exit === '401') { rule = () => '401'; rule.gets = true; await blurOutside(); }
    else if (exit === 'closetab') await Promise.race([b.cdp('Page.close'), sleep(1500)]).catch(() => {});
    else if (exit === 'kill') await Promise.race([b.cdp('Browser.close'), sleep(1500)]).catch(() => {});
    await sleep(3000); rule = () => 'continue';
    if (exit === '401') { await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`); }
    const u = await serverUnits(id);
    const r = { exit, words, onServer: hasC(u, words), units: u, puts: putLines() };
    if (exit === 'kill' || exit === 'closetab') { add({ arm: 'RV', name, id, ...r, net: [...net], ok: true }); console.log(name, JSON.stringify(r).slice(0, 200)); log.end(); process.exit(0); }
    row(name, id, r, true);
  });
}
for (let i = 0; i < REPSC; i += 1) {
  const name = `UNDOSEQ-${i}`; if (!wantC(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 undoseq ${i}`); await watch(); mark();
    await typeText('aaa', 90); await enter(); await sleep(400); await typeText('bbb', 90); await enter(); await sleep(400); await typeText('ccc', 90); await sleep(400);
    const steps = [await edVals()];
    for (let k = 0; k < 4; k += 1) { await undo(); await sleep(900); steps.push(await edVals()); }
    await blurOutside(); await sleep(2500);
    row(name, id, { steps, server: await serverUnits(id), puts: putLines().length }, true);
  });
}
for (let i = 0; i < REPSC; i += 1) {
  const name = `UNDOPAUSE-${i}`; if (!wantC(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 undopause ${i}`); await watch(); mark();
    await typeText('aaa', 90); await sleep(3000); await typeText('bbb', 90); await sleep(400);
    const steps = [await edVals()];
    for (let k = 0; k < 3; k += 1) { await undo(); await sleep(900); steps.push(await edVals()); }
    await blurOutside(); await sleep(2500);
    row(name, id, { steps, server: await serverUnits(id), puts: putLines().length }, true);
  });
}
for (let i = 0; i < REPSC; i += 1) {
  const name = `DRAFT-${i}`; if (!wantC(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`A20 draft ${i}`); await watch(); mark();
    const sentence = 'draft line typed slowly for about twenty seconds without enter';
    const samples = []; let next = 2500; const tA = Date.now();
    for (const c of sentence) {
      if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c);
      await sleep(300);
      if (Date.now() - tA >= next) { const u = await serverUnits(id); samples.push({ t: Date.now() - tA, server: u.join('|').slice(0, 80) }); next += 2500; }
    }
    const lastKey = Date.now() - tA; await sleep(3500);
    const after = await serverUnits(id);
    row(name, id, { sentence, lastKey, samples, after35: after, full: hasC(after, sentence), puts: putLines().length }, true);
  });
}
for (let i = 0; i < REPSC; i += 1) {
  const name = `OFFLINE-${i}`; if (!wantC(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 offline ${i}`); await watch(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'neterr' : 'continue');
    for (const w of ['one burst', ' two burst', ' three burst']) { await typeText(w, 90); await sleep(2600); }
    const alertsOff = await alertsC();
    rule = () => 'continue';
    await typeText(' back online', 90); await sleep(2600); await sleep(1500);
    const u = await serverUnits(id);
    row(name, id, { alertsOff, failedToasts: (alertsOff || []).filter((a) => /failed to save/i.test(a)).length, onServerAll: hasC(u, 'one burst two burst three burst back online'), units: u, puts: putLines() }, true);
  });
}
for (let i = 0; i < REPSC; i += 1) {
  const name = `PUTDUP-${i}`; if (!wantC(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 putdup ${i}`); await watch(); mark();
    for (const w of ['alpha', ' beta', ' gamma', ' delta']) { await typeText(w, 90); await sleep(2600); }
    await sleep(1500);
    const puts = putLines(); const bodies = puts.map((l) => l.replace(/^\d+ /, ''));
    row(name, id, { puts, count: puts.length, duplicates: bodies.length - new Set(bodies).size, units: await serverUnits(id) }, true);
  });
}
for (let i = 0; i < REPSC; i += 1) {
  const name = `IME-${i}`; if (!wantC(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 ime ${i}`); await watch(); mark();
    for (const w of ['现值', '公式', '推导']) { await ime(w); await sleep(400); }
    await sleep(3000);
    const putsAfterTyping = putLines().length; const valAfter = await edVals();
    const steps = [valAfter];
    for (let k = 0; k < 3; k += 1) { await undo(); await sleep(900); steps.push(await edVals()); }
    await blurOutside(); await sleep(2500);
    row(name, id, { putsAfterTyping, steps, server: await serverUnits(id), puts: putLines() }, true);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows`);
log.end(); await b.close(); process.exit(0);
