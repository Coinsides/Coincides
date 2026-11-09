// edsM() already returns the line strings (not {v,...}); the A-20b arms read .v by mistake (smoke b-smoke-r3e, 11-09).
const fs = require('fs');
for (const f of ['a20n_arms.mjs', 'a20b_arms_add.mjs']) {
  let s = fs.readFileSync(f, 'utf8');
  const pairs = [
    ["edsPasted.some((x) => x.v === 'abcXQ')", "edsPasted.includes('abcXQ')"],
    ['edsPasted: edsPasted.map((x) => x.v)', 'edsPasted'],
    ['(await edsM()).map((x) => x.v)', '(await edsM())'],
  ];
  const n = {};
  for (const [a, b] of pairs) { n[a.slice(0, 24)] = s.split(a).length - 1; s = s.split(a).join(b); }
  if (s.includes('x.v)') && /edsM\(\)\)\.map\(\(x\) => x\.v\)/.test(s)) throw new Error('left over');
  fs.writeFileSync(f, s);
  console.log(f, JSON.stringify(n));
}
