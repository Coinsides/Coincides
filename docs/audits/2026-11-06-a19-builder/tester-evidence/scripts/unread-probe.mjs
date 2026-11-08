// (b) path: files that pass intake as images but whose size cannot be read. Per file: upload, materialization state,
// note, page register (status, failed_pages); open the note: what text and buttons show; click Retry (if any) and look
// again. usage: node unread-probe.mjs <label> <frontOrigin> <backendPort> <port>
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [LABEL, ORIGIN, BACKEND, CDPPORT = '9635'] = process.argv.slice(2);
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const FIX = new URL('./fixtures/', import.meta.url);
const files = ['unread-png-zero-width.png', 'unread-jpeg-no-sof.jpg', 'unread-webp-unknown.webp'];
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX), 'utf8'));
const { api, reg, setup } = client(Number(BACKEND));
const { token, courseId } = await setup();
const b = await launch({ port: Number(CDPPORT), profile: `<tmp>/a19acc/prof-${LABEL}`, width: 1280, height: 900 });
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
const SEEN = String.raw`(()=>{const main=document.querySelector('main')||document.body;const words=['could not','Could not','Retry','Try again','retry','无法','重试','failed','Failed','generat','Generat','准备','Preparing'];
const lines=main.innerText.split('\n').map((s)=>s.trim()).filter((s)=>words.some((w)=>s.includes(w))).slice(0,6);
const buttons=[...document.querySelectorAll('button')].filter((x)=>x.offsetParent!==null).map((x)=>x.textContent.trim()).filter((t)=>/retry|try again|generat|重试|生成/i.test(t));
const imgs=[...document.querySelectorAll('[data-note-source-pages] img')].filter((x)=>x.getBoundingClientRect().width>8).map((x)=>({nw:x.naturalWidth,complete:x.complete}));
return {lines,buttons,imgs,pages:!!document.querySelector('[data-note-source-pages]'),toggle:[...document.querySelectorAll('[data-source-view-toggle]')].filter((g)=>g.offsetParent!==null).length}})()`;
for (const name of files) {
  const m = manifest.find((x) => x.name === name);
  const row = { label: LABEL, name };
  const form = new FormData(); form.set('course_id', courseId); form.set('origin_entry_kind', 'project_upload'); form.set('file', new Blob([fs.readFileSync(new URL(name, FIX))], { type: m.mime }), name);
  try {
    const u = await api('/sources/upload', { method: 'POST', body: form }, token); const id = u.source_record_id ?? u.source?.id ?? u.record?.id ?? u.id; row.source = id;
    await sleep(300); try { await api(`/sources/${id}/materialize`, { method: 'POST' }, token); } catch { /* started */ }
    let d = null; for (let i = 0; i < 60; i += 1) { d = await api(`/sources/${id}`, {}, token); if (d.materialization?.projection_note_id || d.materialization?.status === 'failed') break; await sleep(300); }
    row.mat = d.materialization ? { status: d.materialization.status, parser: d.materialization.parser_key ?? null, error: d.materialization.error_message ?? null } : null;
    row.note = d.materialization?.projection_note_id ?? null;
    if (row.note) {
      await sleep(4000);
      row.reg = await reg(token, row.note).then((r) => ({ status: r.status, supported: r.supported, text_view: r.text_view, failed: r.failed_pages, n: (r.pages || []).length })).catch((e) => ({ error: String(e.message).slice(0, 120) }));
      await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(200);
      await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${row.note}` }); await sleep(8000);
      row.seen1 = await b.ev(SEEN);
      const p = await b.ev(`(()=>{const x=[...document.querySelectorAll('button')].find((x)=>x.offsetParent!==null&&/retry|try again|重试/i.test(x.textContent));if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:x.textContent.trim()}})()`);
      if (p) { await b.click(p.x, p.y); row.clicked = p.t; await sleep(8000); row.seen2 = await b.ev(SEEN); row.reg2 = await reg(token, row.note).then((r) => ({ status: r.status, failed: r.failed_pages })).catch((e) => ({ error: String(e.message).slice(0, 120) })); }
      const s = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 }); fs.writeFileSync(new URL(`${name}.jpg`, OUT), Buffer.from(s.result.data, 'base64'));
    }
  } catch (e) { row.error = String(e.stack || e).slice(0, 300); }
  fs.appendFileSync(new URL('rows.jsonl', OUT), JSON.stringify(row) + '\n');
  console.log(`${name.padEnd(28)} mat=${JSON.stringify(row.mat)} note=${row.note ? 'y' : 'n'} reg=${JSON.stringify(row.reg)} seen=${JSON.stringify(row.seen1)} retry=${row.clicked ?? '-'} after=${JSON.stringify(row.seen2 ?? null)} reg2=${JSON.stringify(row.reg2 ?? null)}`);
}
console.log('DONE'); await b.close(); process.exit(0);
