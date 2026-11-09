// Tester(1) 2026-11-10, stage-one seal void-arm classification (Main_Designer ruling 4 (b): setup broken -> fix in <= 30 min).
// Makes env-aware copies (originals untouched):
//   acc11v_probe.mjs / acc18v_probe.mjs: keptByLeave uses max(delay, KEPT_DELAY) when KEPT_DELAY is set. On b734197e an
//     in-app leave is held while the structure is pending (A-20), so the 4 s pending of the old recipe saves everything
//     and no box forms; the 'long' GEO shape (9 s pending) still produced a box on the stage-end run.
//   acc12v_probe.mjs: BAN_NAV=1 leaves with a full page navigation while the first text-save is held (the page dies with
//     the save unanswered, as HEADCLOSE / HL do) instead of the in-app hash leave that A-20 holds until the save is done.
import fs from 'node:fs';
const D = '<scratch>/a20reg';
const patch = (src, dst, pairs) => {
  let s = fs.readFileSync(`${D}/${src}`, 'utf8');
  for (const [from, to] of pairs) { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`${src}: expected exactly one '${from.slice(0, 60)}', found ${n}`); s = s.replace(from, to); }
  fs.writeFileSync(`${D}/${dst}`, s); console.log(`${dst} written`);
};
const KB = 'const keptByLeave = async (words, withEnter, body, delay = 4000, gap = 90) => {';
const KB2 = `${KB}\n  if (process.env.KEPT_DELAY) delay = Math.max(delay, Number(process.env.KEPT_DELAY));`;
patch('acc11_probe.mjs', 'acc11v_probe.mjs', [[KB, KB2]]);
patch('acc18_probe.mjs', 'acc18v_probe.mjs', [[KB, KB2]]);
const BAN_FROM = "    await goHash(other); await sleep(3000);\n    rule = () => 'continue'; await release(); await sleep(4000);";
const BAN_TO = "    if (process.env.BAN_NAV) { await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${other}` }); rule = () => 'continue'; held.length = 0; await sleep(7000); }\n    else { await goHash(other); await sleep(3000);\n    rule = () => 'continue'; await release(); await sleep(4000); }";
patch('acc12_probe.mjs', 'acc12v_probe.mjs', [[BAN_FROM, BAN_TO]]);
