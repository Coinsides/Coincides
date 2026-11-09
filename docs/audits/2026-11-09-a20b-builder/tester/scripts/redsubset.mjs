// red-row subset check for pairs: every BAD row name on the new side must also be BAD on the pre side (arm+name; round index kept)
import fs from 'fs';
const [, , preL, newL] = process.argv;
const keys = (f) => { const s = new Set(); for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l.startsWith('BAD ')) continue; try { const j = JSON.parse(l.slice(4)); s.add(`${j.arm}:${String(j.name).replace(/-\d+$/, '')}${j.round != null ? '#' + j.round : ''}`); } catch { const m = l.match(/"arm":"([^"]+)","name":"([^"]+)"/); if (m) s.add(`${m[1]}:${m[2].replace(/-\d+$/, '')}?`); } } return s; };
const P = keys(preL), N = keys(newL);
const notInPre = [...N].filter((k) => !P.has(k)); const preOnly = [...P].filter((k) => !N.has(k));
console.log(JSON.stringify({ pre: P.size, new: N.size, newNotInPre: notInPre, preOnly }));
