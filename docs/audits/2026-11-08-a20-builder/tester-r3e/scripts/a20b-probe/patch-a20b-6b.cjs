// A-20b batch 6 (Tester 11-09): ALLOWEXTRA=1 (pre runs only) lets the A-20b close arms go on when a save other than the head
// went out before the close (pre saves at once and has no lane), so pre's outcome under the same steps is read instead of a setup
// error. The saves are in each row's 'puts'; rows also carry extraPuts. Without the env var the arms throw as before (on r3e /
// A-20b an extra save means the scenario was not built).
const fs = require('fs');
const f = 'a20n_arms.mjs'; let whole = fs.readFileSync(f, 'utf8'); const M = whole.indexOf('---- A-20b arms (Tester 11-09;'); if (M < 0) throw new Error('marker'); const head = whole.slice(0, M); let s = whole.slice(M);
if (whole.includes('ALLOWEXTRA')) { console.log('already'); process.exit(0); }
fs.writeFileSync('a20n_arms.v26-pre-allowextra.mjs', whole);
const a = "    if (extraPuts !== 0) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);";
const n1 = s.split(a).length - 1;
s = s.split(a).join("    if (extraPuts !== 0 && !process.env.ALLOWEXTRA) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);\n    globalThis.__extraPuts = extraPuts;");
const b2 = "      if (putsAfterHeadB() !== 0) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);";
const n2 = s.split(b2).length - 1;
s = s.split(b2).join("      globalThis.__extraPuts = putsAfterHeadB();\n      if (globalThis.__extraPuts !== 0 && !process.env.ALLOWEXTRA) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);");
s = s.split("row(name, id, { how: 'close',").join("row(name, id, { extraPuts: globalThis.__extraPuts ?? null, how: 'close',").split("row(name, id, { form, how: 'close',").join("row(name, id, { extraPuts: globalThis.__extraPuts ?? null, form, how: 'close',"); s = head + s;
fs.writeFileSync(f, s);
console.log('throw sites softened under ALLOWEXTRA:', n1, '+', n2, '; rows with extraPuts:', (s.match(/extraPuts: globalThis.__extraPuts/g) || []).length);
