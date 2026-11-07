// LL: seen once in r2.1 GEO-long-0 (controller byte-identical to r2): the first structure's unit-transfer reply held
// 9 s at the response stage, words typed in the window, address leave at once, back 11 s later. The re-run structure's
// unit-transfer came back 409; the note then showed the words as a heading but the server never had them, nothing was
// stored, and typing on another line did nothing. Here: same steps, then the state (alerts, read-only probe), wait,
// and a full reopen: are the words anywhere (note, box, this note's stored record)?
//   LL-long : 'kept wrap … end' (about 120 characters, 30 ms per key), no Enter.
//   LL-short: 'kept', no Enter. Same 9 s reply hold.
//   LL-4s   : 'kept', 4 s reply hold (the X-slowAddr hold), as the control for the hold length.
const ONLY15 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want15 = (name) => !ONLY15 || ONLY15.some((p) => name.startsWith(p));
const REP15 = Number(process.env.REP15 || 3);
for (const [base, words, delay, gap] of [
  ['LL-long', `kept ${'wrap '.repeat(22)}end`, 9000, 30],
  ['LL-short', 'kept', 9000, 90],
  ['LL-4s', 'kept', 4000, 90],
]) for (let i = 0; i < REP15; i += 1) {
  const name = `${base}-${i}`;
  if (!want15(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R ${name}`); lastId = id;
    await arriveAndWarm(id);
    await typeText('below', 50); await sleep(2500);
    const w = await edAt('warmup');
    if (w) { await b.click(w.x + 40, w.y + 10); await sleep(300); await press('End', 'End', 35); await sleep(200); await enter(); await sleep(2500); }
    await watch(); mark();
    respRule = ({ u }) => (/unit-transfer/.test(u) ? { delay } : null);
    await typeHash(); await typeText(words, gap);
    await goHash(other); await sleep(Math.max(6000, delay + 2000));
    respRule = () => null;
    await goHash(id); await sleep(5000);
    const back = await win(); const bx1 = await boxes(); const lines1 = (await b.ev(GEO)).lines.map((l) => l.v);
    // Read-only probe: type on 'warmup'.
    const e = await edAt('warmup'); let roProbe = null;
    if (e) { await b.click(e.x + 20, e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('End', 'End', 35); await typeText(' up', 90); await sleep(800); const a = await edAt('warmup'); roProbe = { active: (await win()).active, after: a ? a.v : null }; }
    await sleep(10000);
    const later = await win(); const blocksLater = await blocksOf(id); const storedLater = await storedFor(id); await shot(`${name}-later`);
    await open(id); await sleep(5000);
    const reopened = await win(); const bx2 = await boxes(); const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    await shot(`${name}-reopened`);
    const key = words.split(' ')[0] === 'kept' && words.length > 10 ? 'end' : 'kept';
    const inNote = JSON.stringify(blocks.flat().map(strip)).includes(key);
    const kept = bx2.some((x) => x.v.includes(key)) || JSON.stringify(lastStoredHere).includes(key);
    const outcome = inNote ? 'in-note' : kept ? 'kept' : 'LOST';
    row(name, id, { back, bx1, lines1, roProbe, later, blocksLater, storedLater, reopened, bx2, blocks, outcome }, outcome !== 'LOST');
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
