// docx with no converter configured: register, POST generate (expect 409 source_pages_converter_unavailable), and what
// the note shows (toggle? text?). Also a PDF and an image on the same backend as controls.
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client, makePdf, docx, DOCX_MIME } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [LABEL, ORIGIN, BACKEND, CDPPORT] = process.argv.slice(2);
const { upload, reg, setup } = client(Number(BACKEND));
const { token, courseId } = await setup();
const items = [['docx', await upload(token, courseId, 'nc.docx', DOCX_MIME, docx('Noconv', 30))], ['pdf', await upload(token, courseId, 'nc.pdf', 'application/pdf', await makePdf('Noconv', 2))], ['image', await upload(token, courseId, 'nc.png', 'image/png', fs.readFileSync(new URL('./fixtures/png-tiny-16x16.png', import.meta.url)))]];
await sleep(6000);
const b = await launch({ port: Number(CDPPORT), profile: `<tmp>/a19acc/prof-${LABEL}`, width: 1280, height: 900 });
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
for (const [kind, x] of items) {
  const r = await reg(token, x.note).catch((e) => ({ error: String(e.message).slice(0, 100) }));
  const g = await fetch(`http://127.0.0.1:${BACKEND}/api/sources/${x.id}/pages/generate`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  const gt = (await g.text()).slice(0, 120);
  await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(250); await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${x.note}` }); await sleep(6000);
  const s = await b.ev(String.raw`(()=>({toggles:[...document.querySelectorAll('[data-source-view-toggle]')].filter((g)=>g.offsetParent!==null).map((g)=>g.textContent.trim()),pagesActive:!!document.querySelector('[data-note-source-pages-active="true"]'),imgs:[...document.querySelectorAll('[data-note-source-pages] img')].filter((i)=>i.complete&&i.naturalWidth>0).length,blocks:document.querySelectorAll('[data-note-host-mode] [data-block-id]').length,lines:(document.querySelector('main')||document.body).innerText.split('\n').filter((l)=>/could not|Generat|Try again|unavailable|converter/i.test(l)).slice(0,4)}))()`);
  console.log(LABEL.padEnd(12), kind.padEnd(6), 'reg', JSON.stringify({ s: r.status, sup: r.supported, tv: r.text_view }), 'generate', g.status, gt.replace(/\s+/g, ' ').slice(0, 90), '| view', JSON.stringify(s));
}
await b.close(); process.exit(0);
