// Tester(1) 2026-11-10, Main_Designer ruling (e): re-read HL / HL2 / N-b2 rows with a FOURTH place - "offered by a
// recovery item with Apply" (A-20+ receipt path). The old rule's result is kept as a reading (row.ok).
// Usage: node reread-items.mjs <run dir> [...]   (rows need itemsAtReopen (acc10i / acc11i / acc13i) or items (hum_probe))
import fs from 'node:fs';
const strip = (u) => String(u).replace(/^\[[a-z_0-9]+\]/, '');
for (const dir of process.argv.slice(2)) {
  const f = `${dir}/rows.jsonl`; if (!fs.existsSync(f)) { console.log(`${dir}: NO ROWS`); continue; }
  const rows = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  console.log(`== ${dir.split('/').pop()}`);
  for (const r of rows) {
    if (r.error) { console.log(`  ${r.name}: SETUP ERROR`); continue; }
    const items = r.itemsAtReopen ?? r.items ?? null;
    const units = (r.blocks || []).flat().map(strip);
    const stored = JSON.stringify(r.storedHere ?? r.storedAfter ?? []) + (r.reopened?.buf || '') + JSON.stringify((r.boxes || []).map((x) => x.v ?? x));
    const offered = (w) => (items || []).some((x) => x.t.includes(w) && (x.buttons || []).includes('Apply'));
    const placeOf = (w) => (units.some((u) => u === w) ? 'server (own line)' : units.some((u) => u.includes(w)) ? 'server (inside a line)' : stored.includes(w) ? 'box / buffer / kept record' : offered(w) ? 'recovery item with Apply' : 'NOWHERE');
    if (/^(HL|HLH|HL2)/.test(r.name)) {
      const body = /HLH/.test(r.name) ? 'bodyline' : 'body';
      const head = placeOf('head'); const b = placeOf(body);
      const ok4 = head !== 'NOWHERE' && b !== 'NOWHERE';
      console.log(`  ${r.name.padEnd(34)} old rule ${r.ok ? 'green' : 'RED'} -> new rule ${ok4 ? 'green' : 'RED'}: head ${head}; ${body} ${b}; server ${JSON.stringify(r.blocks)}; items ${JSON.stringify((items || []).map((x) => `${x.t.replace(/^A block edits? (is|are) waiting for recovery /, '')} [${(x.buttons || []).join('/')}]`))}${r.afterApply ? `; after Apply ${JSON.stringify({ clicked: r.afterApply.clicked, blocks: r.afterApply.blocks, items: (r.afterApply.items || []).map((x) => x.t.slice(0, 80)), alerts: r.afterApply.alerts })}` : ''}`);
    } else if (/N-?b2/i.test(r.name)) {
      const noteLine = units.filter((u) => u === 'note').length;
      const itemText = (items || []).filter((x) => (x.buttons || []).includes('Apply')).map((x) => x.t.replace(/^A block edits? (is|are) waiting for recovery /, ''));
      const merged = itemText.some((t) => /noteintro/.test(t));
      const cls = noteLine === 1 ? 'note on its own line on the server' : stored.includes('note\\n') || stored.includes('note\n') ? 'note kept (box / record)' : merged ? 'letters offered by a recovery item as "noteintro" (the typed line break lost)' : itemText.some((t) => /note/.test(t)) ? 'note offered by a recovery item' : 'NOWHERE';
      console.log(`  ${r.name.padEnd(34)} old rule ${r.ok ? 'green' : 'RED'} -> ${cls}; server ${JSON.stringify(r.blocks)}; screen before leaving ${JSON.stringify(r.screen?.eds ?? r.atLeave?.eds ?? null)}; items ${JSON.stringify(itemText)}${r.afterApply ? `; after Apply ${JSON.stringify({ clicked: r.afterApply.clicked, blocks: r.afterApply.blocks, items: (r.afterApply.items || []).map((x) => x.t.slice(0, 80)), alerts: r.afterApply.alerts })}` : ''}`);
    }
  }
}
