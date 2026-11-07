// Island check of the F3b server half: upload the tester's third corpus (F3-第三样本.docx) to MY island test account,
// let the island project it, and compare every paragraph with what the frozen F3b copy produced locally (third-f3bt.json)
// and what the old code produced (third-f3bt-base.json). Run once before the deploy (expect base) and once after (expect F3b).
// Usage: TAG=pre|post node island-f3b-docx.mjs
import fs from 'node:fs';
const HERE = '<scratch>';
const EV = 'D:/Coinsides/v2.x/Coincides/docs/audits/2026-11-05-toggle-formula-builder/tester-f3b';
const API = 'http://127.0.0.1:13002/api';
const TAG = process.env.TAG || 'pre';
const OUT = `${HERE}/island-f3b-runs`; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cells = fs.readFileSync('<home>/.claude/ops/island-test-accounts.md', 'utf8').split('\n').find((l) => l.includes('<my-test-account>')).split('|').map((c) => c.trim());
const J = { 'Content-Type': 'application/json' };
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email: cells[2], password: cells[3] }) })).json();
const A = { Authorization: `Bearer ${token}` };
const call = async (method, path, body) => { const r = await fetch(`${API}${path}`, { method, headers: { ...A, ...J }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let b = null; try { b = t ? JSON.parse(t) : null; } catch { b = t; } return { status: r.status, body: b }; };
const stateFile = `${HERE}/island-f3b.json`;
let state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
if (!state.courseId) { state.courseId = (await call('POST', '/courses', { name: '实测·F3b岛上', code: 'F3BI', semester: 'r04' })).body.id; fs.writeFileSync(stateFile, JSON.stringify(state, null, 1)); }
const form = new FormData();
form.append('course_id', state.courseId);
form.append('origin_entry_kind', 'project_upload');
form.append('file', new Blob([fs.readFileSync(process.env.FILE || `${EV}/F3-第三样本.docx`)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `F3第三样本-${TAG}.docx`);
const up = await fetch(`${API}/sources/upload`, { method: 'POST', headers: A, body: form });
const upBody = await up.json();
const sourceId = upBody.source?.id || upBody.source_record?.id || upBody.id || upBody.record?.id;
console.log('upload', up.status, sourceId);
await call('POST', `/sources/${sourceId}/materialize`, {});
let m;
for (let i = 0; i < 90; i += 1) { m = (await call('GET', `/sources/${sourceId}`)).body.materialization; if (m?.projection_note_id || /failed/.test(m?.status || '')) break; await sleep(2000); }
const noteId = m?.projection_note_id;
console.log('materialization', m?.status, noteId, m?.error_code);
const r = await call('GET', `/notes/${noteId}/blocks`);
const list = (Array.isArray(r.body) ? r.body : (r.body?.blocks || [])).sort((a, b) => a.order_index - b.order_index);
const texts = [];
for (const x of list) {
  const units = x.content_json?.text_flow?.units || [];
  if (units.length) units.forEach((u) => texts.push(u.text)); else if (x.plain_text) texts.push(...x.plain_text.split('\n'));
}
const post = JSON.parse(fs.readFileSync(`${EV}/third-f3bt.json`, 'utf8')).rows;
const base = JSON.parse(fs.readFileSync(`${EV}/third-f3bt-base.json`, 'utf8')).rows;
const baseBy = Object.fromEntries(base.map((x) => [x.label, x.text]));
const rows = []; const tally = { asF3b: 0, asBase: 0, bothSame: 0, neither: 0, missing: 0 };
for (const p of post) {
  const got = texts.find((t) => t && t.startsWith(`${p.label}：`));
  const b = baseBy[p.label];
  let k;
  if (got === undefined) k = 'missing';
  else if (got === p.text && got === b) k = 'bothSame';
  else if (got === p.text) k = 'asF3b';
  else if (got === b) k = 'asBase';
  else k = 'neither';
  tally[k] += 1;
  rows.push({ label: p.label, k, got, f3b: p.text, base: b });
}
const res = { tag: TAG, at: new Date().toISOString(), sourceId, noteId, status: m?.status, blocks: list.length, units: texts.length, tally, rows };
fs.writeFileSync(`${OUT}/${TAG}.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ tag: TAG, status: m?.status, blocks: list.length, units: texts.length, tally }));
for (const x of rows.filter((x) => x.k === 'neither' || x.k === 'missing')) console.log(JSON.stringify(x).slice(0, 400));
