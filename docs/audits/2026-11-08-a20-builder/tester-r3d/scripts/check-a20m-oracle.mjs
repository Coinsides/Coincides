// Before judging a package with a20m: are the judge's message texts still the build's own? (11-08 review finding:
// rule 2 is a text match; a reworded LEFT_UNSAVED would read as 0 and the row would go green.)
// Usage: node check-a20m-oracle.mjs <package dir>   (reads <pkg>/src/.../useNoteRouteSaveBoundary.tsx and the dist JS)
// Exit 1 = a20m BACKIN rows of that package are VOID until the judge is updated.
import fs from 'node:fs';
import path from 'node:path';
import { LEFT_RE, SAVE_FAILURE_TEXT } from './a20m_judge.mjs';
const pkg = process.argv[2];
const f = path.join(pkg, 'src/client/src/pages/Notes/canvasEngine/hooks/useNoteRouteSaveBoundary.tsx');
let bad = 0;
const src = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
if (!src) { console.log(`MISSING ${f}`); bad += 1; }
const constOf = (name) => { const m = src && src.match(new RegExp(`const ${name} = '([^']+)'`)); return m ? m[1] : null; };
const left = constOf('LEFT_UNSAVED'); const fail = constOf('SAVE_FAILURE');
console.log(`LEFT_UNSAVED  src: ${JSON.stringify(left)}  judge ${LEFT_RE}  ${left && LEFT_RE.test(left) ? 'MATCH' : 'NO MATCH'}`);
console.log(`SAVE_FAILURE  src: ${JSON.stringify(fail)}  judge ${JSON.stringify(SAVE_FAILURE_TEXT)}  ${fail === SAVE_FAILURE_TEXT ? 'MATCH' : 'NO MATCH'}`);
if (!(left && LEFT_RE.test(left))) bad += 1; if (fail !== SAVE_FAILURE_TEXT) bad += 1;
// the shipped bundle must carry the same strings (the src snapshot and the dist are the same build)
const assets = path.join(pkg, 'dist/client/assets');
const js = fs.existsSync(assets) ? fs.readdirSync(assets).filter((x) => /^index-.*\.js$/.test(x)) : [];
for (const x of js) { const s = fs.readFileSync(path.join(assets, x), 'utf8'); const a = left && s.includes(left); const c = fail && s.includes(fail); console.log(`dist ${x}: LEFT_UNSAVED ${a ? 'present' : 'ABSENT'}, SAVE_FAILURE ${c ? 'present' : 'ABSENT'}`); if (!a || !c) bad += 1; }
if (!js.length) { console.log('MISSING dist index-*.js'); bad += 1; }
console.log(bad ? `VOID: ${bad} mismatch(es) - update a20m_judge.mjs before judging a20m rows` : 'oracle ok');
process.exit(bad ? 1 : 0);
