// A-19 legacy arm, step 1 (on the PRE backend): one scratch account; import every image fixture, one 12-page PDF and
// one docx; wait until the PDF and docx pages are registered. Writes the account (scratch only, local DB, never the
// repo) and the note map to <tmp>/a19acc/legacy-*.json.
// usage: node legacy-seed.mjs <backendPort>
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client, makePdf, docx, DOCX_MIME } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [BACKEND] = process.argv.slice(2);
const A = '<tmp>/a19acc';
const FIX = new URL('./fixtures/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX), 'utf8'));
const { api, waitReg } = client(Number(BACKEND));
const J = (b) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
const email = `legacy-${randomBytes(4).toString('hex')}@example.test`; const password = randomBytes(12).toString('hex');
const r = await api('/auth/register', J({ email, password, name: 'Legacy' }));
const token = r.token;
await api('/settings/onboarding-complete', { method: 'PUT' }, token);
const course = await api('/courses', J({ name: 'Legacy', color: '#3366ff' }), token);
fs.writeFileSync(`${A}/legacy-account.json`, JSON.stringify({ email, password, courseId: course.id }, null, 1));
const up = async (name, mime, buf) => {
  const form = new FormData(); form.set('course_id', course.id); form.set('origin_entry_kind', 'project_upload');
  form.set('file', new Blob([buf], { type: mime }), name);
  const u = await api('/sources/upload', { method: 'POST', body: form }, token);
  const id = u.source_record_id ?? u.source?.id ?? u.record?.id ?? u.id;
  await sleep(300); try { await api(`/sources/${id}/materialize`, { method: 'POST' }, token); } catch { /* started by intake */ }
  for (let i = 0; i < 100; i += 1) { const d = await api(`/sources/${id}`, {}, token); if (d.materialization?.projection_note_id) return { id, note: d.materialization.projection_note_id }; if (d.materialization?.status === 'failed') break; await sleep(300); }
  return { id, note: null };
};
const map = [];
for (const m of manifest) {
  if (m.name === 'bad-empty.png') continue;
  const x = await up(m.name, m.mime, fs.readFileSync(new URL(m.name, FIX)));
  map.push({ kind: 'image', name: m.name, ...x });
  console.log('image', m.name, x.note ? 'note' : 'no note');
}
for (const [kind, name, mime, buf] of [['pdf', 'Legacy.pdf', 'application/pdf', await makePdf('Legacy', 12)], ['docx', 'Legacy.docx', DOCX_MIME, docx('Legacy', 80)]]) {
  const x = await up(name, mime, buf);
  const reg = await waitReg(token, x.note, (q) => q.status === 'complete', 90000).catch((e) => ({ error: String(e.message).slice(0, 150) }));
  map.push({ kind, name, ...x, pagesAtSeed: reg.pages ? reg.pages.length : null, regAtSeed: reg.error ?? reg.status, pageKeys: reg.pages && reg.pages[0] ? Object.keys(reg.pages[0]) : null });
  console.log(kind, name, x.note ? 'note' : 'no note', 'pages', reg.pages ? reg.pages.length : reg.error, 'page fields', reg.pages && reg.pages[0] ? Object.keys(reg.pages[0]).join(',') : '-');
}
fs.writeFileSync(`${A}/legacy-map.json`, JSON.stringify(map, null, 1));
console.log(`seeded ${map.length}`);
