// Tester(1) 2026-11-10, stage-end kit fix (Main_Designer ruling 4: void != ok): the r2.3c / pair probes mark a row whose
// precondition did not hold as ok:true with a `void` reason (acc11 TWO2: "two kept records were not both on screen"),
// and redsubset.mjs only reads BAD rows, so a void row read as green for three rounds. This scans run dirs and prints,
// per run: rows, red (ok false), NOT TESTED (void / precondition false / setup error), and tested-and-green.
// Usage: node count-void.mjs <run dir> [<run dir> ...]
import fs from 'node:fs';
let anyVoid = 0;
for (const dir of process.argv.slice(2)) {
  const label = dir.split(/[\\/]/).pop();
  const f = `${dir}/rows.jsonl`;
  if (!fs.existsSync(f)) { console.log(`${label.padEnd(18)} NO ROWS (the probe did not run)`); continue; }
  const rows = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const notTested = rows.filter((r) => r.void || r.precondition === false || r.error);
  const red = rows.filter((r) => !r.ok && !notTested.includes(r));
  const green = rows.length - red.length - notTested.length;
  anyVoid += notTested.length;
  const why = [...new Set(notTested.map((r) => `${String(r.name).replace(/-\d+$/, '')}: ${String(r.void || r.error || 'precondition false').slice(0, 70)}`))];
  console.log(`${label.padEnd(18)} rows ${rows.length}; red ${red.length}; NOT TESTED ${notTested.length}${why.length ? ` (${why.join(' | ')})` : ''}; tested green ${green}`);
}
process.exit(anyVoid ? 3 : 0);
