// Read-only: my island test account's Sources (through the tunnel), to pick pre-A-19 PDF/docx/image notes for the
// post-deploy check. Prints parser, status, created time, projection note, page register status (and text_view).
import fs from 'node:fs';
const API = 'http://127.0.0.1:13002/api';
const cells = fs.readFileSync('<home>/.claude/ops/island-test-accounts.md', 'utf8').split(String.fromCharCode(10)).find((l) => l.includes('t1.r04@e')).split('|').map((s) => s.trim());
const email = cells[2]; const password = cells[3];
const J = { 'content-type': 'application/json' };
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) })).json();
const H = { authorization: `Bearer ${token}` };
const raw = await (await fetch(`${API}/sources?limit=500`, { headers: H })).json();
const list = Array.isArray(raw) ? raw : raw.sources ?? raw.items ?? raw.records ?? [];
console.log('sources', list.length, 'keys', Object.keys(list[0] || {}).slice(0, 18).join(','));
const rows = [];
for (const s of list) {
  const id = s.id ?? s.source_record_id;
  const d = await (await fetch(`${API}/sources/${id}`, { headers: H })).json();
  const m = d.materialization || {};
  const name = d.files?.[0]?.original_filename ?? d.file?.original_filename ?? d.original_filename ?? s.title ?? s.display_name ?? '';
  rows.push({ id, name: String(name).slice(0, 40), parser: m.parser_key ?? null, status: m.status ?? null, note: m.projection_note_id ?? null, created: d.created_at ?? s.created_at ?? null });
}
const want = rows.filter((r) => ['native-pdf', 'native-docx', 'native-image'].includes(r.parser) && r.note);
const by = {}; for (const r of want) (by[r.parser] ||= []).push(r);
for (const [k, v] of Object.entries(by)) {
  console.log(`== ${k}: ${v.length}`);
  for (const r of v.sort((a, b) => String(a.created).localeCompare(String(b.created))).slice(0, 4)) {
    const reg = await (await fetch(`${API}/sources/by-projection-note/${r.note}/pages`, { headers: H })).json().catch(() => ({}));
    console.log(' ', r.created, r.name.padEnd(40), 'reg', JSON.stringify({ s: reg.status, sup: reg.supported, tv: reg.text_view, n: (reg.pages || []).length }), 'note', r.note.slice(0, 8));
  }
}
fs.writeFileSync('<tmp>/a19acc/island-sources.json', JSON.stringify(want, null, 1));
