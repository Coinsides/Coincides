// Cross-check builder's draft backend (3001) against my post backend (3592): same png, same register and bytes?
import fs from 'node:fs';
import crypto from 'node:crypto';
import { sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const FIX = new URL('./fixtures/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX), 'utf8'));
for (const port of [3001, 3592]) {
  const { api, reg, setup } = client(port);
  const { token, courseId } = await setup();
  for (const name of ['png-land-800x600.png', 'jpeg-exif6-1600x900.jpg', 'unread-png-zero-width.png']) {
    const m = manifest.find((x) => x.name === name);
    const form = new FormData(); form.set('course_id', courseId); form.set('origin_entry_kind', 'project_upload'); form.set('file', new Blob([fs.readFileSync(new URL(name, FIX))], { type: m.mime }), name);
    const u = await api('/sources/upload', { method: 'POST', body: form }, token); const id = u.source_record_id ?? u.source?.id ?? u.record?.id ?? u.id;
    await sleep(300); try { await api(`/sources/${id}/materialize`, { method: 'POST' }, token); } catch { /* started */ }
    let d; for (let i = 0; i < 100; i += 1) { d = await api(`/sources/${id}`, {}, token); if (d.materialization?.projection_note_id) break; await sleep(300); }
    const note = d.materialization.projection_note_id; let r; for (let i = 0; i < 100; i += 1) { r = await reg(token, note); if (r.status === 'complete' || r.status === 'failed') break; await sleep(300); }
    const p = r.pages?.[0]; let sha = null;
    if (p) { const res = await fetch(`http://127.0.0.1:${port}/api/canvas-assets/${encodeURIComponent(p.asset_id)}/blob`, { headers: { authorization: `Bearer ${token}` } }); sha = crypto.createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex'); }
    console.log(String(port).padEnd(5), name.padEnd(26), JSON.stringify({ parser: d.materialization.parser_key ?? null, mat: d.materialization.status, supported: r.supported, text_view: r.text_view, status: r.status, failed: r.failed_pages, dims: p ? [p.image_width, p.image_height] : null, bytesOriginal: sha ? sha === m.sha256 : null }));
  }
}
