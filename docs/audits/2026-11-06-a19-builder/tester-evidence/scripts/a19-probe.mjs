// A-19 image arms (Tester(1)). DOM-only, so it runs against a built dist. One fresh scratch account per run, on a local
// backend only. For each fixture: upload as a Source, wait for the projection note, open it in a 1280x900 window, and
// at 1 s / 4 s / 10 s record what is on the first screen: page images (rect, natural size, bytes = original?),
// horizontal overflow, the text/original toggle, notices and buttons. Rows go to runs/<label>/rows.jsonl.
// usage: node a19-probe.mjs <label> <frontOrigin> <backendPort> [<fixture names comma-separated>|ALL]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';

const [LABEL, ORIGIN, BACKEND, PICK = 'ALL'] = process.argv.slice(2);
const HERE = new URL('./', import.meta.url);
const FIX = new URL('./fixtures/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX), 'utf8'));
const chosen = PICK === 'ALL' ? manifest : PICK.split(',').map((n) => manifest.find((m) => m.name === n) ?? (() => { throw new Error('no fixture ' + n); })());
const OUT = new URL(`./runs/${LABEL}/`, HERE); fs.mkdirSync(OUT, { recursive: true });
const rowsFile = new URL('rows.jsonl', OUT);
const { api, reg, setup } = client(Number(BACKEND));
// Own upload: like the harness one, but returns the source state instead of throwing when no note appears.
const upload = async (tok, course, name, mime, buf) => {
  const form = new FormData();
  form.set('course_id', course); form.set('origin_entry_kind', 'project_upload');
  form.set('file', new Blob([buf], { type: mime }), name);
  const up = await api('/sources/upload', { method: 'POST', body: form }, tok);
  const id = up.source_record_id ?? up.source?.id ?? up.record?.id ?? up.id;
  await sleep(300);
  try { await api(`/sources/${id}/materialize`, { method: 'POST' }, tok); } catch { /* intake may have started it */ }
  let d = null;
  for (let i = 0; i < 100; i += 1) {
    d = await api(`/sources/${id}`, {}, tok);
    if (d.materialization?.projection_note_id) return { id, note: d.materialization.projection_note_id, state: pick(d) };
    if (d.materialization?.status === 'failed') break;
    await sleep(300);
  }
  return { id, note: null, state: pick(d) };
};
const pick = (d) => d ? { status: d.status ?? d.source?.status ?? null, parser: d.parser_key ?? d.source?.parser_key ?? null, mime: d.mime_type ?? d.source?.mime_type ?? null,
  mat: d.materialization ? { status: d.materialization.status, error: d.materialization.error_message ?? null } : null, keys: Object.keys(d).slice(0, 20) } : null;
const { token, courseId } = await setup();
const prof = new URL(`./profiles/${LABEL}`, HERE).pathname.replace(/^\//, '');
const b = await launch({ port: 9634, profile: prof, width: 1280, height: 900 });
const exceptions = [];
b.on('Runtime.exceptionThrown', (p) => exceptions.push(String(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text).slice(0, 200)));
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);

const SHOT = String.raw`(async()=>{
  const vw = innerWidth, vh = innerHeight;
  const vis = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  const main = document.querySelector('[data-app-main-scroll="true"]');
  const pagesEl = document.querySelector('[data-note-source-pages]');
  const scope = pagesEl || main || document.body;
  const imgs = [];
  for (const el of scope.querySelectorAll('img, canvas')) {
    const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) continue;
    const o = { tag: el.tagName, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, onScreen: vis(r) };
    if (el.tagName === 'IMG') { o.nw = el.naturalWidth; o.nh = el.naturalHeight; o.complete = el.complete; o.src = el.currentSrc || el.src; o.fit = getComputedStyle(el).objectFit; }
    else { o.cw = el.width; o.ch = el.height; }
    imgs.push(o);
  }
  const bg = [...scope.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e).backgroundImage; return s && s !== 'none' && s.includes('url('); }).slice(0, 3).map((e) => { const r = e.getBoundingClientRect(); return { cls: String(e.className).slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; });
  const pageBoxes = [...document.querySelectorAll('[data-source-page-number]')].map((e) => { const r = e.getBoundingClientRect(); return { n: Number(e.dataset.sourcePageNumber), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top) }; }).slice(0, 4);
  const toggles = [...document.querySelectorAll('[data-source-view-toggle]')].filter((g) => g.offsetParent !== null).map((g) => g.textContent.trim().slice(0, 40));
  const vp = document.querySelector('[data-note-source-pages-viewport]');
  const words = ['could not', 'Try again', 'Retry', 'Generate', 'generat', 'Loading', 'failed', '无法', '生成', '重试'];
  const text = (document.querySelector('main') || document.body).innerText;
  const notes = words.filter((w) => text.includes(w));
  const lines = text.split('\n').map((s) => s.trim()).filter((s) => words.some((w) => s.includes(w))).slice(0, 6);
  const buttons = [...document.querySelectorAll('button')].filter((x) => x.offsetParent !== null && x.getBoundingClientRect().width > 0).map((x) => x.textContent.trim()).filter((t) => /retry|try again|generat|生成|重试|original|text/i.test(t)).slice(0, 8);
  const ovMain = main ? { sw: main.scrollWidth, cw: main.clientWidth } : null;
  const ovDoc = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
  const vpBox = vp ? (() => { const r = vp.getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), sw: vp.scrollWidth, cw: vp.clientWidth }; })() : null;
  return { hash: location.hash, pages: !!pagesEl, pagesActive: !!document.querySelector('[data-note-source-pages-active="true"]'), imgs, bg, pageBoxes, toggles, notes, lines, buttons, ovMain, ovDoc, vpBox };
})()`;
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const pageSha = (src) => b.ev(`(async()=>{try{const r=await fetch(${JSON.stringify(src)},{headers:{authorization:'Bearer '+localStorage.getItem('coincides_auth_token')}});const a=await r.arrayBuffer();const d=await crypto.subtle.digest('SHA-256',a);return {status:r.status,type:r.headers.get('content-type'),bytes:a.byteLength,sha:[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}}catch(e){return {error:String(e).slice(0,80)}}})()`);

for (const m of chosen) {
  const row = { label: LABEL, fixture: m.name, mime: m.mime, bytes: m.bytes, sha256: m.sha256, pixel: m.pixel, display: m.display, expect: m.expect };
  const t0 = Date.now();
  try {
    const buf = fs.readFileSync(new URL(m.name, FIX));
    try { const up = await upload(token, courseId, m.name, m.mime, buf); row.source = up.id; row.note = up.note; row.state = up.state; }
    catch (e) { row.uploadError = String(e.message).slice(0, 300); }
    row.tUpload = Date.now() - t0;
    if (row.note) {
      row.reg0 = await reg(token, row.note).catch((e) => ({ error: String(e.message).slice(0, 200) }));
      exceptions.length = 0;
      await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(200);
      const tOpen = Date.now();
      await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${row.note}` });
      row.shots = [];
      for (const at of [1000, 4000, 10000]) {
        while (Date.now() - tOpen < at) await sleep(100);
        const s = await b.ev(SHOT).catch((e) => ({ error: String(e.message).slice(0, 120) }));
        s.at = at; row.shots.push(s);
      }
      // First moment an on-screen image of the right size was there (polled after the fact from the shots).
      const last = row.shots[row.shots.length - 1];
      const im = (last.imgs || []).filter((x) => x.onScreen && x.tag === 'IMG').sort((a, c) => c.w * c.h - a.w * a.h)[0];
      if (im && im.src) { row.served = await pageSha(im.src); row.servedIsOriginal = row.served.sha === m.sha256; }
      row.reg1 = await reg(token, row.note).catch((e) => ({ error: String(e.message).slice(0, 200) }));
      const shot = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
      fs.writeFileSync(new URL(`${m.name}.jpg`, OUT), Buffer.from(shot.result.data, 'base64'));
      row.exceptions = [...exceptions];
      // Derived checks
      if (im) {
        const want = m.display ? m.display[0] / m.display[1] : null;
        row.shown = { w: im.w, h: im.h, nw: im.nw, nh: im.nh, ratio: Math.round((im.w / im.h) * 1e4) / 1e4, want: want && Math.round(want * 1e4) / 1e4 };
        row.ratioOk = want ? Math.abs(im.w / im.h - want) / want < 0.015 || Math.abs(im.w - im.h * want) <= 1.5 : null;
      }
      row.firstScreenImage = !!(row.shots.find((s) => (s.imgs || []).some((x) => x.onScreen && x.tag === 'IMG' && x.complete && x.nw > 0)));
      row.firstScreenAt = (row.shots.find((s) => (s.imgs || []).some((x) => x.onScreen && x.tag === 'IMG' && x.complete && x.nw > 0)) || {}).at ?? null;
      row.overflowX = !!(last.ovMain && last.ovMain.sw > last.ovMain.cw + 1) || last.ovDoc.sw > last.ovDoc.cw + 1;
      row.toggleShown = (last.toggles || []).length > 0;
    }
  } catch (e) { row.error = String(e.stack || e).slice(0, 400); }
  fs.appendFileSync(rowsFile, JSON.stringify(row) + '\n');
  console.log(`${m.name.padEnd(38)} note=${row.note ? 'y' : 'n'} img=${row.firstScreenImage ?? '-'}@${row.firstScreenAt ?? '-'} ratioOk=${row.ratioOk ?? '-'} orig=${row.servedIsOriginal ?? '-'} ovX=${row.overflowX ?? '-'} toggle=${row.toggleShown ?? '-'} ${row.uploadError ? 'UPLOAD ' + row.uploadError.slice(0, 60) : ''}${!row.note && row.state ? 'STATE ' + JSON.stringify({ s: row.state.status, p: row.state.parser, m: row.state.mat }).slice(0, 140) : ''}${row.error ? 'ERR ' + row.error.slice(0, 80) : ''}`);
}
console.log(`DONE ${LABEL}: ${chosen.length} fixtures`);
await b.close(); process.exit(0);
