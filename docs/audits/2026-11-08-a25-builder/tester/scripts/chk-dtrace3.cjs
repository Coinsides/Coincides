// Tester(1) 11-09: checks the expressions injected into matrix-dtrace3.mjs parse and kept their backslashes.
const s = require('fs').readFileSync(process.argv[2], 'utf8');
const grab = (name) => { const i = s.indexOf(`const ${name} = `); const j = s.indexOf('\n', i); return JSON.parse(s.slice(i + `const ${name} = `.length, j).replace(/;$/, '')); };
const rec = grab('DREC'); new Function(rec);
const lsq = grab('LSQ'); new Function(`return ${lsq}`);
const resq = grab('RESQ'); new Function(`return ${resq}`);
console.log('parse ok; RESQ keeps the /api/ regex:', resq.includes(String.raw`/\/api\//`), '; v3 flags', rec.includes('data-draft-phase'), '; T0', rec.includes('__dT0'), '; tag', s.includes("recorder: 'v3'"), '; ids regex in recorder', rec.includes(String.raw`/^https?:\/\/[^/]+/`));
