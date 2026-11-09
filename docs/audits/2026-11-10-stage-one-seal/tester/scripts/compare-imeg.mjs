// Tester(1) 2026-11-10: the IME guard gate (A-25 order ① :121) - Enter / Esc / '/' pressed while composing.
// Gate as ruled by Main_Designer on 2026-11-10 (stage-one seal, second batch, ruling ①):
//   * the build must behave as the A-20b r2 base AFTER removing the base's first-letter drift (the base leaves the first
//     pinyin letter in front of the committed word - e.g. 'd第一' - the IME-new defect A-25 fixed in k25; comparing
//     against it unnormalised would measure against a fixed defect);
//   * Esc / '/': same final server units, same editor lines, same block count, same slash-menu presence at the key and
//     after the commit (after the normalisation);
//   * Enter: three conditions instead of equality - no words lost (the committed word on the server), exactly one line
//     break (a unit split or a raw newline inside a unit, counted together), the slash menu never open.
//     How the break is stored (a unit split on the build, a raw '\n' inside the unit on the base) is a READING, not a
//     difference. Main_Designer's reading (by the text model, not measured): one unit per line is the model's shape; the
//     base's in-unit '\n' is the odd shape; A-25 moved composing text into the draft buffer and splits on a real line
//     break at the handover, which removed it - not a regression.
// LIMIT: CDP's Input.imeSetComposition is not a real IME. Enter during the simulated composition inserts a newline on
// both builds; a real IME usually consumes Enter to commit. What a real IME does on Enter / Esc while composing is on
// Henry's P2 list.
// Usage: node compare-imeg.mjs <base run dir> <build run dir>   exit 1 = gate red (stop and report), 2 = no rows.
import fs from 'node:fs';
const [baseDir, buildDir] = process.argv.slice(2);
const load = (d) => { const f = `${d}/rows.jsonl`; if (!fs.existsSync(f)) { console.log(`NO ROWS in ${d}: NOT TESTED`); process.exit(2); } return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); };
// first-letter drift: one ASCII letter directly before the first CJK character at the start of a unit
const drift = (s) => String(s).replace(/^[A-Za-z](?=[一-鿿])/, '');
const shape = (r, norm) => r.error ? { setupError: String(r.error).slice(0, 120) } : {
  server: (r.end?.server ?? []).map((u) => (norm ? drift(u) : u)), blockCount: r.end?.blockCount ?? null,
  eds: (r.end?.eds || []).map((e) => (norm ? drift(e.v) : e.v)), menuAtKey: (r.atKey?.menu || []).length > 0, menuAfterCommit: (r.afterCommit?.menu || []).length > 0,
};
const breaks = (units) => (units.length ? units.length - 1 : 0) + units.join('').split('\n').length - 1;
const enterGate = (s, word) => {
  if (s.setupError) return { ok: false, why: 'setup error' };
  const units = s.server || [];
  const noLoss = units.join('').includes(word);
  const oneBreak = breaks(units) === 1;
  const noMenu = !s.menuAtKey && !s.menuAfterCommit;
  return { ok: noLoss && oneBreak && noMenu, noLoss, oneBreak, noMenu, stored: units.length > 1 ? 'unit split' : (units.join('').includes('\n') ? "raw '\\n' inside the unit" : 'no break') };
};
const base = Object.fromEntries(load(baseDir).map((r) => [r.name, r])); const build = Object.fromEntries(load(buildDir).map((r) => [r.name, r]));
let red = 0;
for (const name of [...new Set([...Object.keys(base), ...Object.keys(build)])].sort()) {
  const a = base[name] ? shape(base[name], true) : null; const b = build[name] ? shape(build[name], false) : null;
  const raw = base[name] ? shape(base[name], false) : null;
  let ok; let note;
  if (!a || !b) { ok = false; note = 'missing on one side'; }
  else if (/IMEG-enter/.test(name)) {
    const gb = enterGate(b, '第一'); const ga = enterGate(a, '第一');
    ok = gb.ok; note = `Enter gate (no loss / one break / no menu): build ${JSON.stringify(gb)}; base ${JSON.stringify(ga)} - break stored as a ${gb.stored} on the build, ${ga.stored} on the base (READING)`;
  } else { ok = JSON.stringify(a) === JSON.stringify(b); note = ok ? 'same as the base after the first-letter normalisation' : 'DIFFERENT after the normalisation'; }
  if (!ok) red += 1;
  console.log(`${name.padEnd(16)} ${ok ? 'GREEN' : 'RED'}  ${note}\n   base (raw)        ${JSON.stringify(raw)}\n   base (normalised) ${JSON.stringify(a)}\n   build             ${JSON.stringify(b)}`);
}
console.log(red ? `GATE RED: ${red} arm(s)` : 'GATE GREEN: Esc and / behave as the base (first-letter drift removed); Enter keeps the word, one line break, no menu');
process.exit(red ? 1 : 0);
