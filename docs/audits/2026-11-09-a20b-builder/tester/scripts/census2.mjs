// Census 2 (11-09): any row where a unit is a scrambled form of a word the probe typed into a fresh block
// (same letters, not equal, not a prefix: e.g. rmup/ywa from warmup, ainbpl from plainb). Words: warmup, plainb, hbody.
import fs from 'node:fs';
const dir = process.argv[2];
const WORDS = ['warmup', 'plainb', 'hbody'];
const sig = (s) => [...s].sort().join('');
const out = {};
for (const d of fs.readdirSync(dir)) {
  const f = `${dir}/${d}/rows.jsonl`; if (!fs.existsSync(f)) continue;
  const b = d.replace(/-.*/, '').replace(/^(pre3e|preb)$/, 'pre');
  out[b] = out[b] || { rows: 0, setupRows: 0, hits: [] };
  for (const l of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
    out[b].rows += 1;
    if (/warmup|rmup/.test(l)) out[b].setupRows += 1;
    const units = l.split(/[^a-z0-9]+/).filter(Boolean);
    let hit = null;
    for (const w of WORDS) {
      // a scramble of w alone, or w split into two adjacent units (rmup + wa) appearing in the same row
      const bad = units.find((u) => u !== w && u.length === w.length && sig(u) === sig(w));
      const split = units.find((u, i) => u !== w && w.includes(u) && !w.startsWith(u) && u.length >= 2 && w.endsWith(u) && units.some((v) => v === w.slice(0, w.length - u.length) + '' && false));
      const tail = w === 'warmup' && units.includes('rmup');
      if (bad || tail) { hit = `${w}->${bad || 'rmup'}`; break; }
    }
    if (hit) { const j = JSON.parse(l); out[b].hits.push(`${d}:${j.name}:${hit}${j.error ? ' (setup error)' : ''}${j.ok ? ' ok' : ''}`); }
  }
}
for (const [b, v] of Object.entries(out).sort()) if (v.rows) console.log(`${b.padEnd(8)} rows ${String(v.rows).padStart(4)}  setup-rows ${String(v.setupRows).padStart(4)}  scrambles ${v.hits.length}${v.hits.length ? '  ' + v.hits.join(' ; ') : ''}`);
