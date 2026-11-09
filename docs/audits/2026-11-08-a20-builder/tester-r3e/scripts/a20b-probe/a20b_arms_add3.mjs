
// SHIFTENTER-idle-i (Tester 11-09, control for SHIFTENTER-close; a READING, never red): the same 'abc' + Shift+Enter, but nothing
// in flight: the ordinary save takes it (the idle save; a click outside after 4 s if none went out, as on pre). Reads what the
// server stores for a line ending in a soft newline when nothing went wrong: before the close and after a reopen. Tells whether
// SHIFTENTER-close's landing ['abc','','qr'] is the ordinary shape or a new one.
for (let i = 0; i < REPSM; i += 1) {
  const name = `SHIFTENTER-idle-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`A20b shiftenter idle ${i}`);
    await typeText('abc', 90); await enter(); await sleep(200); await typeText('q', 90); await sleep(300);
    await blurOutside(); await sleep(3500);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['abc', 'q'])) throw new Error(`setup: server is ${JSON.stringify(base)}, not ['abc','q']`);
    await watch(); await watchM(); mark();
    if (!(await clickEndM((e) => e.v === 'abc'))) throw new Error(`setup: no 'abc' line ${JSON.stringify(await edsM())}`);
    await shiftEnterB(); await sleep(400);
    const edsAfter = await edsM();
    const putN = () => net.filter((l) => /PUT \/note-blocks\/:id\/text-save/.test(l)).length;
    for (let k = 0; k < 40 && putN() === 0; k += 1) await sleep(100);
    let sealed = false;
    if (putN() === 0) { sealed = true; await blurOutside(); for (let k = 0; k < 30 && putN() === 0; k += 1) await sleep(100); }
    await sleep(1500);
    const serverBefore = await serverUnits(id); const edsBefore = await edsM();
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1500);
    await open(id); await sleep(3000);
    const serverReopen = await serverUnits(id); const edsReopen = await edsM();
    const raw = (xs) => (xs || []).map((x) => JSON.stringify(x));
    row(name, id, { form: 'idle', reading: true, base, edsAfter, sealed, serverBefore: raw(serverBefore), edsBefore: raw(edsBefore), serverReopen: raw(serverReopen), edsReopen: raw(edsReopen), puts: net.filter((l) => /text-save/.test(l)).map((l) => JSON.stringify(l)) }, true);
  });
}

