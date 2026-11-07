// Three classes per row: 1 landed right / 2 not landed but kept and retrievable / 3 lost, duplicated or misplaced.
import fs from 'node:fs';
const files = process.argv.slice(2);
for (const f of files) {
  const rows = JSON.parse(fs.readFileSync(f, 'utf8'));
  const by = {};
  for (const r of rows) {
    if (!r.arm?.startsWith('enter_') && !r.arm?.startsWith('k_') && !r.arm?.startsWith('h_')) continue;
    const words = r.arm.startsWith('enter_leaveInApp') ? ['abcd', 'body'] : r.arm === 'enter_unload' ? ['head'] : r.arm.startsWith('h_') ? ['head', 'body'] : r.arm.startsWith('k_') ? ['kept'] : ['kept', 'body'];
    // K arms: in the note counts as structured only when the heading is a block of its own (2', same block unsplit, otherwise).
    if (r.arm.startsWith('k_') && r.blocks) r.split = r.blocks.includes('[heading_1]kept');
    const flat = (r.server || []).join('|');
    const count = (w) => (r.server || []).filter((t) => t.includes(w)).length;
    const dup = words.some((w) => count(w) > 1);
    // Kept = after reopening, this note's words are on screen in a box or in this note's record (rows with 'reopened');
    // older rows fall back to what was seen before reopening.
    const kept = r.reopened ? [...(r.reopened.boxes || []), ...(r.reopened.stored || [])].join(' ')
      : (r.seen?.stored || []).join(' ') + ' ' + ((r.seen?.onScreen || []).every(Boolean) ? words.join(' ') : '');
    let cls;
    if (dup) cls = 3;
    // K arms: in the note but heading and body in one block is 2' (kept, not split), never 1.
    else if (r.arm.startsWith('k_') && r.ok) cls = r.split ? 1 : 'p';
    else if (r.ok && (r.split || words.length < 2)) cls = 1;
    else if (r.ok) cls = 3; // all words there but not in their structure
    else cls = words.every((w) => flat.includes(w) || kept.includes(w)) ? 2 : 3;
    const a = (by[r.arm] ??= { n: 0, c1: 0, c2: 0, cp: 0, c3: 0, ms: [] });
    a.n += 1; a['c' + cls] += 1; if (typeof r.landedMs === 'number') a.ms.push(r.landedMs);
  }
  const all = Object.values(by).flatMap((a) => a.ms).sort((x, y) => x - y);
  const med = (xs) => xs.length ? xs[Math.floor((xs.length - 1) / 2)] : null;
  console.log(f.split(/[\/]/).pop(), JSON.stringify({ arms: Object.fromEntries(Object.entries(by).map(([k, a]) => [k, `n${a.n} ①${a.c1} ②${a.c2}${a.cp ? ` ②′${a.cp}` : ''} ③${a.c3}${a.ms.length ? ` land med ${med([...a.ms].sort((x, y) => x - y))} max ${Math.max(...a.ms)} (${a.ms.length})` : ''}`])),
    landed: all.length ? { n: all.length, median: med(all), max: all[all.length - 1] } : null }));
}
