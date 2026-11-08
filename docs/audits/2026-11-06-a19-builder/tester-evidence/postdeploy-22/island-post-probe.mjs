// A-19 post-deploy check on the island (Tester(1)): island front end through the tunnel, MY test account only (login,
// never register). Parts:
//  OLD  : pre-A-19 PDF (R4-原页走查样张.pdf) and docx: landing, toggle, text, View-original jumps 3/7/11 (pdf),
//         memory (Text -> other note -> back), reload; register text_view. Old image (识图测试-路由器.png): Generate,
//         visible, shown ratio = natural, page bytes = the Source's own blob.
//  NEW  : upload a few fixtures: first screen, ratio, bytes = original, no toggle; the unreadable one: page fails +
//         Try again, note stands. Then DELETE each new Source and check its page image is 404.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
const [LABEL, CDPPORT = '9638'] = process.argv.slice(2);
const ORIGIN = 'http://127.0.0.1:13002'; const API = `${ORIGIN}/api`;
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const rowsFile = new URL('rows.jsonl', OUT);
const cells = fs.readFileSync('<home>/.claude/ops/island-test-accounts.md', 'utf8').split(String.fromCharCode(10)).find((l) => l.includes('t1.r04@e')).split('|').map((s) => s.trim());
const J = { 'content-type': 'application/json' };
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email: cells[2], password: cells[3] }) })).json();
const H = { authorization: `Bearer ${token}` };
const api = async (p, init = {}) => { const r = await fetch(`${API}${p}`, { ...init, headers: { ...(init.headers || {}), ...H } }); const t = await r.text(); return { status: r.status, body: t ? (() => { try { return JSON.parse(t); } catch { return t; } })() : null }; };
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const blobSha = async (path) => { const r = await fetch(`${API}${path}`, { headers: H }); return { status: r.status, sha: r.status === 200 ? sha(Buffer.from(await r.arrayBuffer())) : null }; };
const reg = async (note) => (await api(`/sources/by-projection-note/${note}/pages`)).body;
const srcs = JSON.parse(fs.readFileSync('<tmp>/a19acc/island-sources.json', 'utf8'));
const oldPdf = srcs.find((s) => s.parser === 'native-pdf' && s.name.startsWith('R4-原页走查样张'));
const oldDocx = srcs.find((s) => s.parser === 'native-docx' && s.name.startsWith('R4-金融讲义'));
const oldImg = srcs.find((s) => s.parser === 'native-image');
const course = (await api(`/sources/${oldPdf.id}`)).body;
const COURSE = course.placements?.[0]?.course_id ?? course.course_id ?? '2247e6ee-3564-4a8a-8537-f547e10c51e8';
const b = await launch({ port: Number(CDPPORT), profile: `<tmp>/a19acc/prof-${LABEL}`, width: 1280, height: 900 });
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(1000);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
const waitFor = async (expr, ms = 30000) => { const s = Date.now(); for (;;) { if (await b.ev(expr).catch(() => false)) return Date.now() - s; if (Date.now() - s > ms) return -1; await sleep(150); } };
const open = async (note) => { await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(250); await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${note}` }); await waitFor(`!!document.querySelector('[data-note-host-mode]')`, 40000); };
const TOGGLE = `[...document.querySelectorAll('[data-source-view-toggle] button[aria-pressed="true"]')].some((x)=>x.offsetParent!==null)`;
const STATE = String.raw`(()=>{const vp=document.querySelector('[data-note-source-pages-viewport]');let top=null;if(vp){const vr=vp.getBoundingClientRect();for(const el of vp.querySelectorAll('[data-source-page-number]')){const r=el.getBoundingClientRect();if(r.top<=vr.top+60)top=Number(el.dataset.sourcePageNumber);}}
const pressed=[...document.querySelectorAll('[data-source-view-toggle] button[aria-pressed="true"]')].find((x)=>x.offsetParent!==null);
const imgs=[...document.querySelectorAll('[data-note-source-pages] img')].filter((x)=>{const r=x.getBoundingClientRect();return r.width>8&&x.complete&&x.naturalWidth>0&&r.top<innerHeight&&r.bottom>0}).map((x)=>{const r=x.getBoundingClientRect();return {w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,nw:x.naturalWidth,nh:x.naturalHeight,src:x.currentSrc||x.src}});
const main=document.querySelector('main')||document.body;const lines=main.innerText.split('\n').map((s)=>s.trim()).filter((s)=>/could not|Try again|Generat/i.test(s)).slice(0,4);
return {active:!!document.querySelector('[data-note-source-pages-active="true"]'),topPage:top,pressed:pressed?pressed.textContent.trim():null,toggles:[...document.querySelectorAll('[data-source-view-toggle]')].filter((g)=>g.offsetParent!==null).length,
chips:document.querySelectorAll('[data-source-page-jump]').length,blocks:document.querySelectorAll('[data-note-host-mode] [data-block-id]').length,imgs,lines,
ovX:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}})()`;
const realClick = async (expr) => { const p = await b.ev(`(()=>{const el=${expr};if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:el.textContent.trim().slice(0,40)}})()`); if (!p) return null; await sleep(250); await b.click(p.x, p.y); return p.t || true; };
const TEXTBTN = `[...document.querySelectorAll('[data-source-view-toggle] button')].find((x)=>x.offsetParent!==null&&/^text$/i.test(x.textContent.trim()))`;
const pageSha = (src) => b.ev(`(async()=>{const r=await fetch(${JSON.stringify(src)});const a=await r.arrayBuffer();const d=await crypto.subtle.digest('SHA-256',a);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')})()`);
const rec = (name, data) => { fs.appendFileSync(rowsFile, JSON.stringify({ label: LABEL, arm: name, ...data }) + '\n'); console.log(`${name.padEnd(14)} ${JSON.stringify(data).slice(0, 600)}`); };

// OLD pdf / docx
for (const [kind, s] of [['old-pdf', oldPdf], ['old-docx', oldDocx]]) {
  const r = await reg(s.note);
  await open(s.note); await waitFor(TOGGLE, 20000); await sleep(1500);
  const landing = await b.ev(STATE);
  await realClick(TEXTBTN); await sleep(2000); const inText = await b.ev(STATE);
  const jumps = [];
  if (kind === 'old-pdf') for (const page of [3, 7, 11]) { const ok = await realClick(`document.querySelector('[data-source-page-jump="${page}"]')`); await sleep(2500); const st = await b.ev(STATE); jumps.push(`${page}->${st.topPage}${ok ? '' : '(no chip)'}`); await realClick(TEXTBTN); await sleep(1500); }
  await b.ev(`location.hash='#/notes/${oldImg.note}';'ok'`); await sleep(3000);
  await b.ev(`location.hash='#/notes/${s.note}';'ok'`); await waitFor(TOGGLE, 20000); await sleep(1000); const back = await b.ev(STATE);
  await b.cdp('Page.reload'); await waitFor(`!!document.querySelector('[data-note-host-mode]')`, 40000); await waitFor(TOGGLE, 20000); await sleep(1500); const reload = await b.ev(STATE);
  rec(kind, { name: s.name, reg: { status: r.status, supported: r.supported, text_view: r.text_view, n: (r.pages || []).length }, landing: { pressed: landing.pressed, active: landing.active, toggles: landing.toggles }, text: { pressed: inText.pressed, blocks: inText.blocks, chips: inText.chips }, jumps, back: back.pressed, reload: `${reload.pressed}/${reload.active}` });
}
// OLD image: Generate
{
  const r0 = await reg(oldImg.note);
  await open(oldImg.note); await sleep(5000); const s0 = await b.ev(STATE);
  const clicked = await realClick(`[...document.querySelectorAll('button')].find((x)=>x.offsetParent!==null&&/generate original page images/i.test(x.textContent))`);
  let s1 = s0; if (clicked) { for (let i = 0; i < 40; i += 1) { await sleep(1000); s1 = await b.ev(STATE); if (s1.imgs.length) break; } }
  const r1 = await reg(oldImg.note);
  const im = s1.imgs[0]; const src = await blobSha(`/sources/${oldImg.id}/blob`);
  const shown = im ? await pageSha(im.src) : null;
  rec('old-image', { name: oldImg.name, reg0: { status: r0.status, supported: r0.supported, text_view: r0.text_view }, before: { lines: s0.lines, toggles: s0.toggles }, clicked, after: { imgs: s1.imgs.length, toggles: s1.toggles, ovX: s1.ovX }, reg1: { status: r1.status, n: (r1.pages || []).length, dims: r1.pages?.[0] ? [r1.pages[0].image_width, r1.pages[0].image_height] : null },
    shown: im ? { w: im.w, h: im.h, nw: im.nw, nh: im.nh, ratioOk: Math.abs(im.w / im.h - im.nw / im.nh) / (im.nw / im.nh) < 0.015 } : null, bytesEqualSourceBlob: shown && src.sha ? shown === src.sha : null });
  const shot = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 }); fs.writeFileSync(new URL('old-image.jpg', OUT), Buffer.from(shot.result.data, 'base64'));
}
// NEW uploads
const FIX = new URL('./fixtures/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX), 'utf8'));
const created = [];
for (const name of ['png-land-800x600.png', 'jpeg-exif6-1600x900.jpg', 'webp-vp8x-alpha-1000x700.webp', 'png-tall-1200x4000.png', 'unread-png-zero-width.png']) {
  const m = manifest.find((x) => x.name === name);
  const form = new FormData(); form.set('course_id', COURSE); form.set('origin_entry_kind', 'project_upload'); form.set('file', new Blob([fs.readFileSync(new URL(name, FIX))], { type: m.mime }), `A19-post22-${name}`);
  const u = await api('/sources/upload', { method: 'POST', body: form }); const id = u.body?.source_record_id ?? u.body?.source?.id ?? u.body?.record?.id ?? u.body?.id; created.push(id);
  await sleep(300); await api(`/sources/${id}/materialize`, { method: 'POST' });
  let d; for (let i = 0; i < 120; i += 1) { d = (await api(`/sources/${id}`)).body; if (d.materialization?.projection_note_id) break; await sleep(500); }
  const note = d.materialization.projection_note_id; let r; for (let i = 0; i < 120; i += 1) { r = await reg(note); if (r.status === 'complete' || r.status === 'failed') break; await sleep(500); }
  const t0 = Date.now(); await open(note); while (Date.now() - t0 < 4000) await sleep(100); let st = await b.ev(STATE);
  if (!st.imgs.length && !st.lines.length) { await sleep(4000); st = await b.ev(STATE); }
  const im = st.imgs[0]; const want = m.display ? m.display[0] / m.display[1] : null;
  const bytes = im ? (await pageSha(im.src)) === m.sha256 : null;
  rec(`new:${name.slice(0, 10)}`, { name, upload: u.status, reg: { status: r.status, text_view: r.text_view, failed: r.failed_pages, dims: r.pages?.[0] ? [r.pages[0].image_width, r.pages[0].image_height] : null }, imgs: st.imgs.length, toggles: st.toggles, lines: st.lines, ovX: st.ovX,
    shown: im ? { w: im.w, h: im.h } : null, ratioOk: im && want ? Math.abs(im.w / im.h - want) / want < 0.015 : null, bytesOriginal: bytes, pageAsset: r.pages?.[0]?.asset_id ?? null, note });
}
// Clean up my new Sources, then check their page images are gone.
const rows = fs.readFileSync(rowsFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.arm.startsWith('new:'));
for (let i = 0; i < created.length; i += 1) {
  const del = await fetch(`${API}/sources/${created[i]}`, { method: 'DELETE', headers: H });
  await sleep(1500);
  const asset = rows[i]?.pageAsset; const after = asset ? await blobSha(`/canvas-assets/${encodeURIComponent(asset)}/blob`) : null;
  const n = rows[i]?.note ? (await fetch(`${API}/notes/${rows[i].note}`, { headers: H })).status : null;
  rec(`cleanup:${i}`, { name: rows[i]?.name, delete: del.status, pageImageAfter: after ? after.status : null, noteAfter: n });
}
console.log(`DONE ${LABEL}`); await b.close(); process.exit(0);
