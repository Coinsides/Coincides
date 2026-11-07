// Three classes per acceptance row (same reading as the builder's classifier, plus a split-out "words in, structure not"):
//   1  = the note's blocks equal the expected blocks exactly
//   2  = the words are not in the note, but kept for THIS note (box on screen after reopen, or this note's stored entry)
//   3u = all words in the note but not in their structure (unsplit / merged) — counted as 3, shown apart
//   3  = lost, duplicated, misplaced
// Usage: node analyze-acc.mjs <runLabel> [<runLabel> ...]   (reads runs/<label>/rows.jsonl)
import fs from 'node:fs';
const HERE = '<session-tmp>/scratchpad/verify-editor';
const H = (t) => `[heading_1]${t}`;
const EXP = [
  // Round-2 arms first: /^K[2-5]/ below would otherwise catch K25.
  [/^K25-.*noEnter/, { words: ['kept'], blocks: [['warmup'], [H('kept')]] }],
  [/^K25-.*-enter/, { words: ['two', 'body'], blocks: [['warmup'], [H('two')], ['body']] }],
  [/^KU-/, { words: ['two', 'body'], blocks: [['warmup'], [H('two')], ['body']] }],
  [/^HL|^EDGE-/, { words: ['head', 'body'], blocks: [['warmup'], [H('head')], ['body']] }],
  [/^A0|^A1/, { words: ['abcd', 'body'], blocks: [['warmup'], [H('abcd')], ['body']] }],
  [/^A2-heldLeave-enter/, { words: ['abcd', 'body'], blocks: [['warmup'], [H('abcd')], ['body']] }],
  [/^A2-heldLeave-noEnter/, { words: ['abcd'], blocks: [['warmup'], [H('abcd')]] }],
  [/^B-reorder500-enter/, { words: ['abcd', 'body'], blocks: [['warmup'], [H('abcd')], ['body']] }],
  [/^B-reorder500-noEnter/, { words: ['abcd'], blocks: [['warmup'], [H('abcd')]] }],
  [/^C-save500/, { words: ['kept'], blocks: [['warmup'], [H('kept')]] }],
  [/^D-stallSecond/, { words: ['two', 'body'], blocks: [['warmup'], [H('two')], ['body']] }],
  [/^E-caretStart/, { words: ['big'], blocks: [[H('big intro')]] }],
  [/^F-sameId/, { words: ['xy'], blocks: [['warmup', 'second', 'third'], [H('head')], [H('xybody')]] }],
  [/^I-wrongBlock/, { words: ['kept'], blocks: [['warmup', 'second', 'third', 'fourth'], [H('head')], ['body'], [H('kept')]] }],
  [/^H-unload/, { words: ['head'], blocks: [['warmup'], [H('head')]] }],
  [/^X-/, { words: ['kept', 'body'], blocks: [['warmup'], [H('kept')], ['body']] }],
  [/^K1/, { words: ['kept'], blocks: [['warmup'], [H('kept')]] }],
  [/^K[2-5]/, { words: ['two', 'body'], blocks: [['warmup'], [H('two')], ['body']] }],
];
const finalBlocks = (r) => {
  const b = r.blocksAfter ?? r.blocks;
  if (!Array.isArray(b)) return null;
  return b.map((x) => (Array.isArray(x) ? x : x.units));
};
const classify = (r) => {
  if (r.cls) return { cls: r.cls === '3?' ? '3u' : r.cls, note: r.note || '' };
  if (r.error) return { cls: 'ERR', note: r.error.slice(0, 120) };
  const e = EXP.find(([re]) => re.test(r.name));
  if (!e) return { cls: r.ok ? 'ok' : 'bad', note: 'criterion of the scenario itself' };
  const { words, blocks } = e[1];
  const fb = finalBlocks(r) || [];
  if (JSON.stringify(fb) === JSON.stringify(blocks)) return { cls: '1' };
  // Right, plus empty leftover blocks (no units) from an abandoned structure: counted apart as 1e.
  const noEmpty = fb.filter((x) => x.length > 0);
  if (noEmpty.length < fb.length && JSON.stringify(noEmpty) === JSON.stringify(blocks)) return { cls: '1e', note: `${fb.length - noEmpty.length} empty block(s) left` };
  // Role prefixes stripped before any word search: 'head' must not match '[heading_1]'.
  const strip = (u) => u.replace(/^\[[a-z_0-9]+\]/, '');
  const texts = fb.flat().map(strip).filter((t) => t !== '');
  const expTexts = blocks.flat().map(strip);
  const all = JSON.stringify(texts);
  // Kept for THIS note: the box on screen (after reopen, or still on this note when the row was read) or its stored entry.
  // Kept = the box after a full reopen, or this note's stored entry. Rows with no reopen (I) use the box on this note
  // when the row was read. A box seen on return before reopen can be a live window, so it does not count.
  const kept = `${r.reopened ? (r.reopened.buf ?? '') : (r.after?.buf ?? '')} ${JSON.stringify(r.storedHere ?? [])}`;
  const dup = words.some((w) => all.split(w).length - 1 > 1 || (all.includes(w) && kept.includes(w)));
  if (dup) return { cls: '3', note: `duplicated ${JSON.stringify(fb)}` };
  if (JSON.stringify(texts) === JSON.stringify(expTexts)) return { cls: '3u', note: `words and order right, structure ${JSON.stringify(fb)}` };
  // The heading never took: same words in order, the heading line still starts with a literal '#' (its space eaten).
  const noHash = texts.map((t) => t.replace(/^#\s?/, ''));
  if (JSON.stringify(noHash) === JSON.stringify(expTexts) && texts.some((t) => t.startsWith('#'))) return { cls: '3h', note: `heading not applied, literal # left: ${JSON.stringify(fb)}` };
  const inNote = words.every((w) => all.includes(w));
  if (!inNote && words.every((w) => all.includes(w) || kept.includes(w))) {
    // Kept, and what is in the note is the untouched rest (no merged or moved text).
    const rest = texts.every((t) => expTexts.includes(t) || t === '');
    // Kept, and the only extra in the note is the literal '#' the person typed (the heading never started): 2h.
    if (!rest && texts.every((t) => expTexts.includes(t) || t === '' || /^#\s?$/.test(t))) return { cls: '2h', note: `kept, literal # left in the note: kept ${kept.slice(0, 40)} note ${JSON.stringify(fb)}` };
    return { cls: rest ? '2' : '3', note: `${rest ? '' : 'note changed elsewhere; '}kept: ${kept.slice(0, 80)} note ${JSON.stringify(fb)}` };
  }
  return { cls: '3', note: `${inNote ? 'misplaced or merged' : 'lost'}: ${JSON.stringify(fb)}` };
};
for (const label of process.argv.slice(2)) {
  const p = `${HERE}/runs/${label}/rows.jsonl`;
  if (!fs.existsSync(p)) { console.log(label, 'no rows'); continue; }
  const rows = fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const by = {};
  const detail = [];
  for (const r of rows) {
    const c = classify(r);
    const group = r.name.replace(/-\d+$/, '');
    (by[group] ??= {})[c.cls] = ((by[group] ??= {})[c.cls] || 0) + 1;
    detail.push({ name: r.name, cls: c.cls, ok: r.ok, note: c.note });
  }
  fs.writeFileSync(`${HERE}/runs/${label}/classified.json`, JSON.stringify({ by, detail }, null, 1));
  console.log(`== ${label}: ${rows.length} rows`);
  for (const [g, c] of Object.entries(by)) console.log(`  ${g.padEnd(34)} ${Object.entries(c).map(([k, v]) => `${k}:${v}`).join(' ')}`);
}
