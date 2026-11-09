// Tester(1) 11-09: summarise traced D rows (matrix-dtrace*.mjs). Usage: node ana-dtrace.mjs <runs dir> [<runs dir> ...] [--full]
// Per row: ok, server units, POST /blocks send->end, the hand-off (first focus on an editor textarea), how many keys and
// Enters went into the draft before it, the text-save sequence (base revision and unit texts sent), and the first
// snapshot where any editor textarea holds text that is not a prefix of its expected line. --full prints red rows' traces.
import fs from 'node:fs';
const args = process.argv.slice(2); const full = args.includes('--full'); const dirs = args.filter((a) => a !== '--full');
const want = ['aa', 'bb', 'cc', 'dd', 'ee'];
for (const dir of dirs) {
  const rows = fs.readFileSync(`${dir}/rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const bad = rows.filter((r) => !r.ok);
  console.log(`== ${dir.split(/[\\/]/).pop()}: ${rows.length} rows, red ${bad.length}`);
  const tab = {};
  for (const r of rows) {
    const tr = r.trace || [];
    const post = tr.find((e) => e.ev === 'xhr' && e.phase === 'send' && e.m === 'POST' && /\/notes\/:id\/blocks$/.test(e.u));
    const postEnd = tr.find((e) => e.ev === 'xhr' && e.phase === 'end' && e.m === 'POST' && /\/notes\/:id\/blocks$/.test(e.u));
    const hand = tr.find((e) => e.ev === 'focus' && e.on === 'editor');
    const draftKeys = tr.filter((e) => e.ev === 'key' && e.on === 'draft' && (!hand || e.t < hand.t));
    const draftEnters = draftKeys.filter((e) => e.k === 'Enter').length;
    const saves = tr.filter((e) => e.ev === 'xhr' && e.phase === 'send' && /text-save/.test(e.u)).map((e) => `${e.t}:r${e.req && e.req.rev}:${JSON.stringify(e.req && e.req.u)}`);
    const odd = tr.find((e) => e.ev === 'snap' && e.v.filter((x) => x.startsWith('E:')).some((x, i) => { const v = x.slice(2).replace(/@\d+$/, ''); return v && !want[i]?.startsWith(v); }));
    const k = `${r.ok ? 'green' : 'RED'} draftEnters=${draftEnters}`; tab[k] = (tab[k] || 0) + 1;
    // builder's four (CODE-ANSWER-lines30): failed writes, the failure mark, 'Failed to save block' on the console, and
    // input the draft still takes after the hand-off; plus the draft's last caret / value before the hand-off.
    const failedEnds = tr.filter((e) => e.ev === 'xhr' && e.phase === 'end' && !(e.status >= 200 && e.status < 300)).map((e) => `${e.t}:${e.m} ${e.u} ${e.status}`);
    const mark = tr.some((e) => e.ev === 'snap' && e.v.some((x) => x.startsWith('FAILED-MARK')));
    const conFail = tr.filter((e) => e.ev === 'console' && /Failed to save/i.test(e.msg)).length;
    const draftAfter = hand ? tr.filter((e) => e.ev === 'input' && e.on === 'draft' && e.t > hand.t && e.i !== 0 && e.i !== 1).length : 0;
    const lastDraftSnap = hand ? [...tr.filter((e) => e.ev === 'snap' && e.t <= hand.t)].pop() : null;
    console.log(`  ${r.name.padEnd(12)} ${r.ok ? 'ok ' : 'RED'} server ${JSON.stringify(r.server)} POST ${post ? post.t : '-'}->${postEnd ? `${postEnd.t}(${postEnd.status})` : '-'} hand-off ${hand ? hand.t : '-'} draft keys ${draftKeys.map((e) => e.k === 'Enter' ? '⏎' : e.k).join('')} | first odd editor snap ${odd ? `${odd.t} ${JSON.stringify(odd.v)}` : '-'}`);
    console.log(`     failed writes ${failedEnds.length ? failedEnds.join(' ') : 0}; failure mark seen ${r.recorder === 'v2' ? mark : 'n/a(v1)'}, at row end ${r.endMark ? JSON.stringify(r.endMark) : 'n/a(v1)'}; 'Failed to save block' page/CDP ${r.recorder === 'v2' ? `${conFail}/${r.failedToSaveBlock}` : 'n/a(v1)'}; console err/warn ${r.consoleErrWarn ? r.consoleErrWarn.length : 'n/a'}; draft input after hand-off ${draftAfter}; last snap before hand-off ${lastDraftSnap ? JSON.stringify(lastDraftSnap.v) : '-'}`);
    if (r.consoleErrWarn && r.consoleErrWarn.length && (!r.ok || full)) console.log(`     console ${JSON.stringify(r.consoleErrWarn).slice(0, 600)}`);
    if (!r.ok || full) console.log(`     saves ${saves.join(' ')}`);
    if (!r.ok && full) for (const e of tr) console.log(`     ${String(e.t).padStart(5)} ${e.ev} ${e.phase || ''} ${e.m || ''} ${e.u || ''} ${e.status ?? ''} ${e.k ?? ''} ${e.on ?? ''} ${e.i ?? ''} ${JSON.stringify(e.v ?? e.req ?? '').slice(0, 110)}`);
  }
  console.log(`  tally ${JSON.stringify(tab)}`);
}
