
// ---- A-20b arms, second batch (Tester 11-09; Main_Designer 11-09 after Reviewer's small check: LINK-close withdrawn,
// SHIFTENTER-close added, SURROGATE-paste-close added; MULTIPASTE accepts both record starts 'abc' / 'abcdef') ----
const shiftEnterB = async () => { await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', modifiers: 8 }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, modifiers: 8 }); };
// raw kept-record texts (start / end strings, not JSON-escaped) of one read
const keptRawB = (stored) => (stored || []).flatMap((s) => { try { return JSON.parse(s).flatMap((e) => [e.initialText, e.text]).filter((x) => typeof x === 'string'); } catch { return []; } });
const closeReadRawB = async (id, receiptWord) => {
  const { r1, r2 } = await closeReadB(id, receiptWord);
  r1.keptRaw = keptRawB(await storedFor(id).catch(() => null)); // the store as it is after the second wait too
  r2.keptRaw = r1.keptRaw;
  return { r1, r2 };
};
// a lone surrogate (either half) or U+FFFD in a string
const BAD_UNIT = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]|�/;
const cps = (s) => Array.from(String(s)).map((c) => c.codePointAt(0).toString(16)).join(' ');

// SHIFTENTER-close-i (A-20b, Reviewer's third class; x REPS): server ['abc','q']; the head = 'r' at the end of 'q' (server
// ['abc','qr'], reply held 60 s). Then Shift+Enter at the end of 'abc' (a body line, not a heading) and no more typing: the
// line becomes 'abc' + newline inside the same unit. No other save may go out; close; reopen; read; +12 s. Pre / r3e
// expected: the newline lost. A-20b expected: a record with it (or landed). Red: the newline not offered at the second read;
// the 'qr' line changed; 'abc' twice on the server. Setup error if Shift+Enter splits the line instead (a split group).
for (let i = 0; i < REPSM; i += 1) {
  const name = `SHIFTENTER-close-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`A20b shiftenter close ${i}`);
    await typeText('abc', 90); await enter(); await sleep(200); await typeText('q', 90); await sleep(300);
    await blurOutside(); await sleep(3500);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['abc', 'q'])) throw new Error(`setup: server is ${JSON.stringify(base)}, not ['abc','q']`);
    await watch(); await watchM(); mark();
    const headLine = await headInFlightB(id, 'q', 'r', ['abc', 'qr']);
    if (!(await clickEndM((e) => e.v === 'abc'))) throw new Error(`setup: no 'abc' line ${JSON.stringify(await edsM())}`);
    await shiftEnterB(); await sleep(400);
    const edsAfter = await edsM(); const caret = await caretM(); const extraPuts = putsAfterHeadB();
    const nlIn = (s) => typeof s === 'string' && s.startsWith('abc') && s.includes('\n');
    if (!edsAfter.some(nlIn)) throw new Error(`setup: Shift+Enter did not leave 'abc' + newline in one line ${JSON.stringify(edsAfter)}`);
    if (extraPuts !== 0) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);
    const keptBefore = keptTexts(await storedFor(id).catch(() => null));
    const { r1, r2 } = await closeReadRawB(id, 'abc');
    const nlAt = (r) => (r.units.some(nlIn) ? 'server' : [...(r.boxes || []), ...(r.boxes9 || [])].some(nlIn) ? 'box'
      : (r.keptRaw || []).some(nlIn) ? 'kept' : (r.eds || r.eds9 || []).some(nlIn) ? 'screen' : 'nowhere');
    const at = { r1: nlAt(r1), r2: nlAt(r2) };
    const qrKept = [r1, r2].every((r) => r.units.includes('qr'));
    const dupAbc = [r1.units, r2.units].some((u) => u.filter((x) => x.startsWith('abc')).length >= 2);
    const ok = B_OFFERED.includes(at.r2) && qrKept && !dupAbc;
    row(name, id, { how: 'close', base, headLine, edsAfter, caret, keptBefore, r1, r2, at, qrKept, dupAbc, puts: net.filter((l) => /text-save/.test(l)) }, ok);
  });
}

// SURROGATE-paste-close-i (A-20b r2, Reviewer: the common-prefix helper must not cut a surrogate pair; x REPS): server
// ['abc😀def','q'] (the emoji committed with Input.insertText); the head = 'r' at the end of 'q' (reply held 60 s). Caret
// at 'abc|😀def' and '😁\nYQ' pasted: 😀 and 😁 share their high surrogate, so a prefix taken by code unit ends inside the
// pair. Close; reopen; read; +12 s. r1 positive control (Main_Designer): the landed line carries a broken code unit (a lone
// surrogate or U+FFFD); r2: 'abc😁😀def' clean (or the record clean); r3e: 😁 lost entirely. Red: a lone surrogate or U+FFFD
// anywhere (server, box, kept record, screen); 😁 not offered; 😀 gone from both the server and the boxes; 'qr' changed.
for (let i = 0; i < REPSM; i += 1) {
  const name = `SURROGATE-paste-close-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`A20b surrogate close ${i}`);
    await typeText('abc', 90); await ins('😀'); await sleep(150); await typeText('def', 90); await enter(); await sleep(200); await typeText('q', 90); await sleep(300);
    await blurOutside(); await sleep(3500);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['abc😀def', 'q'])) throw new Error(`setup: server is ${JSON.stringify(base)} (${base.map(cps).join(' | ')}), not ['abc😀def','q']`);
    await watch(); await watchM(); mark();
    const headLine = await headInFlightB(id, 'q', 'r', ['abc😀def', 'qr']);
    if (!(await clickEndM((e) => e.v === 'abc😀def'))) throw new Error(`setup: no 'abc😀def' line ${JSON.stringify(await edsM())}`);
    for (let k = 0; k < 4; k += 1) { await arrowLeft(); await sleep(60); }
    await sleep(150);
    const caret = await caretM();
    if (!caret || caret.s !== 3 || caret.e !== 3) throw new Error(`setup: the caret is not after 'abc' ${JSON.stringify(caret)}`);
    const pasted = await pasteM('😁\nYQ'); await sleep(400);
    const edsPasted = await edsM(); const extraPuts = putsAfterHeadB();
    if (!edsPasted.some((x) => x.startsWith('abc😁'))) throw new Error(`setup: the paste did not leave 'abc😁' ${JSON.stringify({ pasted, edsPasted })}`);
    if (extraPuts !== 0) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);
    const keptBefore = keptTexts(await storedFor(id).catch(() => null));
    const { r1, r2 } = await closeReadRawB(id, 'YQ');
    const places = { 'r1.server': r1.units, 'r1.box': [...(r1.boxes || []), ...(r1.boxes9 || [])], 'r1.screen': [...(r1.eds1 || []), ...(r1.eds9 || [])], kept: r1.keptRaw, 'r2.server': r2.units, 'r2.box': r2.boxes || [], 'r2.screen': r2.eds || [] };
    const badWhere = Object.entries(places).flatMap(([k, xs]) => (xs || []).filter((x) => BAD_UNIT.test(String(x))).map((x) => `${k}: ${JSON.stringify(x)} [${cps(x)}]`));
    const grinAt = { r1: tokAt('😁', r1), r2: tokAt('😁', r2) }; const yAt = { r1: tokAt('YQ', r1), r2: tokAt('YQ', r2) };
    const smileKept = [r1, r2].every((r) => r.units.some((u) => u.includes('😀')) || [...(r.boxes || []), ...(r.boxes9 || [])].some((x) => x.includes('😀')));
    const qrKept = [r1, r2].every((r) => r.units.includes('qr'));
    const line1 = { r1: r1.units[0], r1cp: cps(r1.units[0]), r2: r2.units[0], r2cp: cps(r2.units[0]) };
    const ok = badWhere.length === 0 && B_OFFERED.includes(grinAt.r2) && B_OFFERED.includes(yAt.r2) && smileKept && qrKept;
    row(name, id, { how: 'close', base, headLine, caret, pasted, edsPasted, keptBefore, r1, r2, badWhere, grinAt, yAt, smileKept, qrKept, line1, puts: net.filter((l) => /text-save/.test(l)) }, ok);
  });
}

