
// K. Item 1, the stall variant: nothing fails, one request is only slow (12 s), so the 10 s watchdog fires first.
// K1/K2 hold the role edit's text-save (third after the '#' on the fixed build, second on the old one);
// K3 holds the first structure's reorder. K2 and K3 type Enter and a body inside the window.
const ROLE_SAVE = Number(process.env.ROLE_SAVE || 3);
const END = process.env.END || 'release';
const cases = END === 'fail' ? [
  ['K4-roleSaveStallThenDrop-enter', 'save', true],
  ['K5-reorderStallThenDrop-enter', 'reorder', true],
] : [
  ['K1-roleSaveStall-noEnter', 'save', false],
  ['K2-roleSaveStall-enter', 'save', true],
  ['K3-reorderStall-enter', 'reorder', true],
];
for (const [base, what, withEnter] of cases) for (let i = 0; i < 2; i += 1) {
  const name = `${base}-${i}`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R ${base} ${i}`);
    await watch(); mark();
    let saves = 0; let reorders = 0;
    rule = ({ u }) => {
      if (what === 'save' && /text-save/.test(u)) { saves += 1; if (saves === ROLE_SAVE) return 'hold'; }
      if (what === 'reorder' && /blocks\/reorder/.test(u) && reorders++ === 0) return 'hold';
      return 'continue';
    };
    await typeHash(); await typeText(withEnter ? 'two' : 'kept');
    if (withEnter) { await enter(); await sleep(60); await typeText('body'); }
    await sleep(1500); const s1 = await win();
    await sleep(10000); const s11 = await win(); await shot(`${name}-screen`);
    const heldCount = held.length;
    rule = () => 'continue';
    if (END === 'fail') { while (held.length) await b.cdp('Fetch.failRequest', { requestId: held.shift(), errorReason: 'ConnectionReset' }).catch(() => {}); } else await release();
    await sleep(4000); const after = await win();
    await blurOutside(); await sleep(2500);
    const blocks = await blocksOf(id);
    await open(id); await sleep(3500);
    const reopened = await win(); const blocksAfter = await blocksOf(id); await shot(`${name}-reloaded`);
    const text = flat(blocksAfter) + JSON.stringify(reopened.stored) + (reopened.buf || '');
    const words = withEnter ? ['two', 'body'] : ['kept'];
    row(name, id, { heldCount, s1, s11, after, blocks, reopened, blocksAfter }, words.every((w) => text.includes(w)));
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
