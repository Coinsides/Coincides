
// WINDOWENTER-land-i (Main_Designer 11-09, ruling 乙 guard: only a window-sourced '\n' splits on landing; x REPS). No existing arm
// judges this shape (acc11 GEO-enter builds the same two-line box but reads geometry only; acc10 HL reads the words only).
// The words box made the way the regression probes make it (acc11 keptByLeave, withEnter): on the empty line '# ' + 'kept',
// Enter, 'body' while the heading split's unit-transfer reply is delayed 4 s; a hash leave to the other note at once; back
// after 6 s. The box holds 'kept' + newline + 'body' (a window record); it lands by itself (manual: 留字框 多半会自己回去).
// Read the box on return and the server after the landing. Expected on every build (pre, r3e, A-20b): SPLIT = 'kept' and
// 'body' as separate units, each once, no unit holding the newline. Red: ONE (one unit 'kept\nbody'), a word twice, a word lost.
for (let i = 0; i < REPSM; i += 1) {
  const name = `WINDOWENTER-land-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20b windowenter ${i}`);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['warmup', ''])) throw new Error(`setup: server is ${JSON.stringify(base)}, not ['warmup','']`);
    if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(await edsM())}`);
    await watch(); await watchM(); mark();
    respRule = ({ u }) => (/unit-transfer/.test(u) ? { delay: 4000 } : null);
    await typeHash(); await typeText('kept', 90); await enter(); await sleep(40); await typeText('body', 50);
    const edsTyped = await edsM();
    await goHash(other); await sleep(6000);
    respRule = () => null;
    await goHash(id); await sleep(1500);
    const boxAtReturn = (await boxes().catch(() => [])).map((x) => x.v);
    const keptAtReturn = keptTexts(await storedFor(id).catch(() => null));
    // wait for the landing: the box gone (up to 15 s), then 3 s more
    let landedAt = null; const T = Date.now();
    for (let k = 0; k < 60; k += 1) { const bx = (await boxes().catch(() => [])).map((x) => x.v); if (!bx.some((v) => v.includes('body') || v.includes('kept'))) { landedAt = Date.now() - T; break; } await sleep(250); }
    await sleep(3000);
    const blocks = (await blocksOf(id)).map((us) => us.map((u) => u.replace(/^\[[a-z_0-9]+\]/, '')));
    const rawBlocks = await blocksOf(id);
    const flat = blocks.flat(); const eds = await edsM(); const boxEnd = (await boxes().catch(() => [])).map((x) => x.v);
    const one = flat.some((u) => u.includes('kept') && u.includes('body'));
    const nK = flat.filter((u) => u.includes('kept')).length; const nB = flat.filter((u) => u.includes('body')).length;
    const shape = one ? 'ONE' : nK >= 1 && nB >= 1 ? 'SPLIT' : boxEnd.some((v) => v.includes('body') || v.includes('kept')) ? 'BOX' : 'LOST';
    const ok = shape === 'SPLIT' && nK === 1 && nB === 1 && !flat.some((u) => u.includes('\n'));
    row(name, id, { base, edsTyped, boxAtReturn, keptAtReturn, landedAt, blocks, rawBlocks, eds, boxEnd, shape, nK, nB, puts: net.filter((l) => /text-save|unit-transfer|note-blocks/.test(l)).slice(0, 40) }, ok);
  });
}

