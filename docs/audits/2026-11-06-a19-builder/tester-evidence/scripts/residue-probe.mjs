// A-19 delete / Rebuild residue (Tester(1)). API calls the UI makes (rematerialize {confirm:true}, DELETE source),
// plus a read-only look at the backend's data dir and DB. Flow: F0 files -> import A (jpeg) and B (lossless webp) ->
// F1 -> Rebuild A -> F2 -> delete B -> F3 -> delete A -> F4. Expect F4 == F0, rows for A and B gone, old asset URLs 404.
// usage: node residue-probe.mjs <label> <backendPort> <dataDir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const require = createRequire('<repo>/server/package.json');
const Database = require('better-sqlite3');
const [LABEL, BACKEND, DATA] = process.argv.slice(2);
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const FIX = new URL('./fixtures/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX), 'utf8'));
const { api, reg, setup } = client(Number(BACKEND));
const BASE = `http://127.0.0.1:${BACKEND}/api`;
const { token, courseId } = await setup();
const log = []; const say = (...a) => { const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); log.push(s); console.log(s); };
const walk = (dir, out = new Map()) => { if (!fs.existsSync(dir)) return out; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else out.set(path.relative(DATA, p).replace(/\\/g, '/'), fs.statSync(p).size); } return out; };
const files = () => { const m = new Map(); for (const d of ['blobs', 'assets', 'uploads', 'appdata']) walk(path.join(DATA, d), m); return m; };
const diff = (a, b) => ({ added: [...b.keys()].filter((k) => !a.has(k)), removed: [...a.keys()].filter((k) => !b.has(k)) });
const db = () => new Database(path.join(DATA, 'data', 'app.db'), { readonly: true, fileMustExist: true });
const rows = (srcIds, mids, notes) => { const d = db(); const q = (sql, ...p) => d.prepare(sql).get(...p).c; const r = {};
  r.source_records = srcIds.reduce((s, id) => s + q('SELECT COUNT(*) c FROM source_records WHERE id=?', id), 0);
  r.source_files = srcIds.reduce((s, id) => s + q('SELECT COUNT(*) c FROM source_files WHERE source_record_id=?', id), 0);
  r.source_materializations = srcIds.reduce((s, id) => s + q('SELECT COUNT(*) c FROM source_materializations WHERE source_record_id=?', id), 0);
  r.source_pages = srcIds.reduce((s, id) => s + q('SELECT COUNT(*) c FROM source_pages WHERE source_record_id=?', id), 0);
  r.canvas_assets = mids.reduce((s, m) => s + q("SELECT COUNT(*) c FROM canvas_assets WHERE id LIKE ? OR storage_key LIKE ?", `%${m}%`, `%${m}%`), 0)
    + notes.reduce((s, n) => s + q('SELECT COUNT(*) c FROM canvas_assets WHERE origin_note_id=?', n), 0);
  r.notes = notes.reduce((s, n) => s + q('SELECT COUNT(*) c FROM notes WHERE id=?', n), 0);
  d.close(); return r; };
const blob = async (assetId) => { const r = await fetch(`${BASE}/canvas-assets/${encodeURIComponent(assetId)}/blob`, { headers: { authorization: `Bearer ${token}` } }); const a = Buffer.from(await r.arrayBuffer()); return { status: r.status, sha: r.status === 200 ? crypto.createHash('sha256').update(a).digest('hex') : null }; };
const up = async (name) => { const m = manifest.find((x) => x.name === name); const form = new FormData(); form.set('course_id', courseId); form.set('origin_entry_kind', 'project_upload'); form.set('file', new Blob([fs.readFileSync(new URL(name, FIX))], { type: m.mime }), name);
  const u = await api('/sources/upload', { method: 'POST', body: form }, token); const id = u.source_record_id ?? u.source?.id ?? u.record?.id ?? u.id; await sleep(300); try { await api(`/sources/${id}/materialize`, { method: 'POST' }, token); } catch { /* started */ }
  let d; for (let i = 0; i < 100; i += 1) { d = await api(`/sources/${id}`, {}, token); if (d.materialization?.projection_note_id) break; await sleep(300); }
  const note = d.materialization.projection_note_id; let r; for (let i = 0; i < 100; i += 1) { r = await reg(token, note); if (r.status === 'complete' || r.status === 'failed') break; await sleep(300); }
  return { id, note, sha: m.sha256, mid: d.materialization.id, asset: r.pages?.[0]?.asset_id ?? null, regStatus: r.status }; };
const matIdOf = (assetId) => (assetId ? assetId.split(':')[1] : null);

const F0 = files(); say('F0 files', F0.size);
const A = await up('jpeg-1600x900.jpg'); const B = await up('webp-simple-vp8l-1000x700.webp');
say('A', { note: A.note, reg: A.regStatus, asset: A.asset }); say('B', { note: B.note, reg: B.regStatus, asset: B.asset });
const F1 = files(); const d01 = diff(F0, F1); say('import added', d01.added.length, d01.added); say('import removed', d01.removed.length);
say('A blob', await blob(A.asset), 'orig', A.sha.slice(0, 12)); say('B blob', await blob(B.asset), 'orig', B.sha.slice(0, 12));
const midsA = [matIdOf(A.asset), A.mid].filter(Boolean); const midsB = [matIdOf(B.asset), B.mid].filter(Boolean);
say('rows after import', rows([A.id, B.id], [...midsA, ...midsB], [A.note, B.note]));
// Rebuild A
const preview = await api(`/sources/${A.id}/rematerialize`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, token).catch((e) => ({ error: String(e.message).slice(0, 200) }));
say('rebuild preview', JSON.stringify(preview).slice(0, 300));
const res = await api(`/sources/${A.id}/rematerialize`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true }) }, token).catch((e) => ({ error: String(e.message).slice(0, 200) }));
say('rebuild result', JSON.stringify(res).slice(0, 300));
let A2note = null; for (let i = 0; i < 100; i += 1) { const d = await api(`/sources/${A.id}`, {}, token); if (d.materialization?.projection_note_id && d.materialization.projection_note_id !== A.note) { A2note = d.materialization.projection_note_id; A.mid2 = d.materialization.id; break; } await sleep(300); }
let r2; for (let i = 0; i < 100 && A2note; i += 1) { r2 = await reg(token, A2note); if (r2.status === 'complete' || r2.status === 'failed') break; await sleep(300); }
A.asset2 = r2?.pages?.[0]?.asset_id ?? null; midsA.push(matIdOf(A.asset2), A.mid2);
say('A after rebuild', { newNote: A2note, reg: r2 ? { status: r2.status, n: (r2.pages || []).length, text_view: r2.text_view } : null, asset2: A.asset2 });
say('A old asset blob', await blob(A.asset), 'A new asset blob', A.asset2 ? await blob(A.asset2) : null);
const oldNote = await fetch(`${BASE}/notes/${A.note}`, { headers: { authorization: `Bearer ${token}` } }); say('A old note GET', oldNote.status);
const F2 = files(); const d12 = diff(F1, F2); say('rebuild added', d12.added, 'removed', d12.removed);
// Delete B, then A
const delB = await fetch(`${BASE}/sources/${B.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }); say('DELETE B', delB.status); await sleep(2500);
const F3 = files(); const d23 = diff(F2, F3); say('delete B removed', d23.removed, 'added', d23.added);
say('B blob after delete', await blob(B.asset)); say('rows B after delete', rows([B.id], midsB.filter(Boolean), [B.note]));
const delA = await fetch(`${BASE}/sources/${A.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }); say('DELETE A', delA.status); await sleep(2500);
const F4 = files(); const d04 = diff(F0, F4); say('F4 vs F0 added', d04.added, 'removed', d04.removed);
say('A blobs after delete', await blob(A.asset), A.asset2 ? await blob(A.asset2) : null);
say('rows A after delete', rows([A.id], midsA.filter(Boolean), [A.note, A2note].filter(Boolean)));
fs.writeFileSync(new URL('log.txt', OUT), log.join('\n') + '\n');
console.log(`DONE ${LABEL}`);
