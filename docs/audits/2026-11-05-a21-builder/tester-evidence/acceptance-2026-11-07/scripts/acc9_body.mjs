// Z2: the one real-shape loss (gamma lines never saved; the island's row shows the gamma block at save revision 1, i.e.
// never updated after the structure created it). Hypothesis to test: typing starts in the block a body-after-heading
// structure just created before that structure's unit-transfer reply reaches the client. Here the reply is held 2 s at
// the response stage and 'gamma one' / 'gamma two' are typed at once. Network and alerts are recorded throughout.
const ONLY9 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want9 = (name) => !ONLY9 || ONLY9.some((p) => name.startsWith(p));
const lines = async (ws) => { for (let i = 0; i < ws.length; i += 1) { if (i) { await enter(); await sleep(60); } await typeText(ws[i], 70); } };
const domUnits = () => b.ev(`[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.value)`);
const REP9 = Number(process.env.REP9 || 4);
for (const delay of [2000, 0]) for (let i = 0; i < (delay ? REP9 : 2); i += 1) {
  const name = `Z2-newBlockTyping-${delay}-${i}`;
  if (!want9(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R z2 ${delay} ${i}`);
    await open(other); await sleep(1500); await goHash(id); await sleep(2500); await clickTaRetry(); await sleep(800);
    await lines(['beta one', 'beta two', 'beta three']); await sleep(2500);
    await enter(); await sleep(800); await typeHash(); await typeText('Second heading', 70); await sleep(3500);
    await watch(); mark();
    if (delay) respRule = ({ u }) => (/unit-transfer/.test(u) ? { delay } : null);
    await enter(); await sleep(150);
    await lines(['gamma one', 'gamma two']);
    await sleep(4000); respRule = () => null;
    await sleep(3000);
    const w = await win(); const dom = await domUnits();
    await blurOutside(); await sleep(3000);
    const server = (await serverBlocks(id)).map((x) => x.units);
    await shot(`${name}-before-reload`);
    await open(id); await sleep(4500);
    const reloaded = (await serverBlocks(id)).map((x) => x.units);
    const all = JSON.stringify(reloaded);
    row(name, id, { delay, dom, alerts: w.alerts, server, reloaded }, all.includes('gamma one') && all.includes('gamma two'));
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
