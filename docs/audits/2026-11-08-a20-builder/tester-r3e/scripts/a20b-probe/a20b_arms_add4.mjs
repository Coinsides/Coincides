
// SHIFTENTER-typed-close-i (Main_Designer 11-09, probe before ruling; x REPS): as SHIFTENTER-close, but after Shift+Enter one more
// character 'd' is typed (the line becomes 'abc\nd'). Head 'qr' in flight, close, reopen. Question: does the record land as ONE
// unit 'abc\nd' (the ordinary shape) or SPLIT into ['abc','d']? On r3e the typing group is recorded too, so this also shows
// whether the landing writer splits on '\n' there (pre-existing) or only for a trailing '\n' (new in A-20b).
// SHIFTENTER-idletyped-i (control, a READING): the same 'abc' + Shift+Enter + 'd' through the ordinary save, nothing in flight.
// Landed shape of a SHIFTENTER row (seShape): ONE = the server holds the whole line as one unit; SPLIT = the server holds 'abc'
// and the rest as separate units; BOX / KEPT = offered in a box / kept record, not on the server; LOST = nowhere.
const seShape = (r, full) => {
  const u = r.units || []; const rest = full.slice(4);
  if (u.includes(full)) return 'ONE';
  const k = u.indexOf('abc'); if (k >= 0 && u[k + 1] === rest) return 'SPLIT';
  if ([...(r.boxes || []), ...(r.boxes9 || [])].includes(full)) return 'BOX';
  if ((r.keptRaw || []).includes(full)) return 'KEPT';
  return 'LOST';
};
for (const form of ['typed-close', 'idletyped']) for (let i = 0; i < REPSM; i += 1) {
  const name = `SHIFTENTER-${form}-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`A20b shiftenter ${form} ${i}`);
    await typeText('abc', 90); await enter(); await sleep(200); await typeText('q', 90); await sleep(300);
    await blurOutside(); await sleep(3500);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['abc', 'q'])) throw new Error(`setup: server is ${JSON.stringify(base)}, not ['abc','q']`);
    await watch(); await watchM(); mark();
    const closeForm = form === 'typed-close';
    const headLine = closeForm ? await headInFlightB(id, 'q', 'r', ['abc', 'qr']) : null;
    const qLine = closeForm ? 'qr' : 'q';
    if (!(await clickEndM((e) => e.v === 'abc'))) throw new Error(`setup: no 'abc' line ${JSON.stringify(await edsM())}`);
    await shiftEnterB(); await sleep(250); await typeText('d', 90); await sleep(300);
    const edsAfter = await edsM();
    if (!edsAfter.includes('abc\nd')) throw new Error(`setup: the line is not 'abc' + newline + 'd' ${JSON.stringify(edsAfter)}`);
    if (closeForm) {
      if (putsAfterHeadB() !== 0) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);
      const keptBefore = keptTexts(await storedFor(id).catch(() => null));
      const { r1, r2 } = await closeReadRawB(id, 'abc');
      const shape = { r1: seShape(r1, 'abc\nd'), r2: seShape(r2, 'abc\nd') };
      const qrKept = [r1, r2].every((r) => r.units.includes(qLine));
      const dupAbc = [r1.units, r2.units].some((u) => u.filter((x) => x.startsWith('abc')).length >= 2);
      const ok = ['ONE', 'BOX', 'KEPT'].includes(shape.r2) && qrKept && !dupAbc;
      row(name, id, { form, how: 'close', base, headLine, edsAfter, keptBefore, r1, r2, shape, at: shape, qrKept, dupAbc, puts: net.filter((l) => /text-save/.test(l)) }, ok);
    } else {
      const putN = () => net.filter((l) => /PUT \/note-blocks\/:id\/text-save/.test(l)).length;
      for (let k = 0; k < 40 && putN() === 0; k += 1) await sleep(100);
      let sealed = false;
      if (putN() === 0) { sealed = true; await blurOutside(); for (let k = 0; k < 30 && putN() === 0; k += 1) await sleep(100); }
      await sleep(3000);
      const serverBefore = await serverUnits(id); const edsBefore = await edsM();
      await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1500);
      await open(id); await sleep(3000);
      const serverReopen = await serverUnits(id); const edsReopen = await edsM();
      const raw = (xs) => (xs || []).map((x) => JSON.stringify(x));
      row(name, id, { form: 'idle', reading: true, base, edsAfter, sealed, shape: seShape({ units: plainM(serverReopen) }, 'abc\nd'), serverBefore: raw(serverBefore), edsBefore: raw(edsBefore), serverReopen: raw(serverReopen), edsReopen: raw(edsReopen), puts: net.filter((l) => /text-save/.test(l)).map((l) => JSON.stringify(l)) }, true);
    }
  });
}

