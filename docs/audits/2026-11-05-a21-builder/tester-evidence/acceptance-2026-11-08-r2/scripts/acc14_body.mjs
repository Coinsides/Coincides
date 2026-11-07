// RETRY (Main_Designer's question): a kept box whose words can never land (record '' -> 'kept\nbody' on a unit holding
// '#', the acc12 shape) retries every 800 ms and each retry calls history.boundary(). Does that cut a person's typing on
// another line into extra saves and undo steps? Same typing on a note with no box is the control.
//   Typing: 10 s of steady keys (about 95 characters at ~105 ms per key) at the end of the 'warmup' line.
//   Counted: text-save requests sent while typing and in the 6 s after; then Ctrl+Z presses until the line is back to
//   'warmup' (cap 80); then 10 s idle with the box present, text-saves counted.
const ONLY14 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want14 = (name) => !ONLY14 || ONLY14.some((p) => name.startsWith(p));
const REP14 = Number(process.env.REP14 || 2);
const STUCK = `keptbody`;
const makeStuckBox = async (id) => {
  let n = 0;
  rule = ({ u }) => { if (/text-save/.test(u) && n++ === 0) return 'hold'; return 'continue'; };
  await typeHash(); await typeText('kept'); await enter(); await sleep(40); await typeText('body', 50);
  await goHash(other); await sleep(3000);
  rule = () => 'continue'; await release(); await sleep(4000);
  await goHash(id); await sleep(5000);
  await open(id); await sleep(4500);
};
const typeOnWarmup = async () => {
  // The kept box sits fixed in the viewport; scroll the note 240 px so the 'warmup' line is clear of it.
  await b.wheel(820, 600, 240); await sleep(1200);
  const w = await edAt('warmup');
  if (!w) return { found: false };
  await b.click(w.x + 20, w.y + Math.min(w.h, 24) / 2); await sleep(400);
  const act = (await win()).active;
  await press('End', 'End', 35); await sleep(200);
  mark();
  const words = 'the quick brown fox jumps over the lazy dog and keeps on typing for ten seconds now';
  const t0w = Date.now(); let typed = '';
  for (const c of words) { if (Date.now() - t0w > 10000) break; if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); typed += c; await sleep(95); }
  const typingMs = Date.now() - t0w;
  await sleep(6000);
  const savesTyping = net.filter((l) => /text-save/.test(l) && !/RESP/.test(l));
  const after = await edAt('warmup');
  // Undo steps back to 'warmup' (focus stays in the line).
  let undos = 0; let value = after ? after.v : null;
  while (value !== null && value !== 'warmup' && undos < 80) { await undo(); undos += 1; await sleep(220); const e = await edAt('warmup'); value = e ? e.v : null; }
  const undone = value === 'warmup';
  await sleep(2500);
  // Idle 10 s with nothing typed.
  mark(); await sleep(10000);
  const savesIdle = net.filter((l) => /text-save/.test(l) && !/RESP/.test(l));
  return { found: true, active: act, typed: typed.length, typingMs, saves: savesTyping.length, saveLines: savesTyping.map((l) => l.slice(0, 90)), lineAfter: after ? after.v : null, undos, undone, idleSaves: savesIdle.length, idleLines: savesIdle.map((l) => l.slice(0, 90)) };
};
for (const [base, withBox] of [['RETRY-stuckBox', true], ['RETRY-control', false]]) for (let i = 0; i < REP14; i += 1) {
  const name = `${base}-${i}`;
  if (!want14(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R ${base} ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    if (withBox) await makeStuckBox(id);
    else { await typeText('plain', 60); await sleep(2500); await open(id); await sleep(4500); }
    // Keep the setup's own requests and the editor lines right after reopen: the one merged-unit row ('warmup',
    // '# kept', 'body' in one unit) had no setup log.
    const setupNet = [...net]; const setupLines = (await b.ev(GEO)).lines.map((l) => l.v); const setupAlerts = (await win()).alerts;
    const bx = await boxes(); const storedNow = await storedFor(id);
    const stuck = bx.length > 0;
    const r = await typeOnWarmup();
    const bxAfter = await boxes();
    lastStoredHere = await storedFor(id);
    const blocks = await blocksOf(id);
    row(name, id, { withBox, stuck, boxes: bx, storedNow, setupNet, setupLines, setupAlerts, ...r, boxesAfter: bxAfter, blocks, void: withBox && !stuck ? 'no stuck box' : null }, true);
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
