// A-19 extra arms, run on pre and post (built dists + own backends, scratch account):
//  CONVFAIL : docx whose conversion fails (fake converter 'fail' file): opens in Text; click Pages -> what shows
//             (could-not-be-generated + Try again?); click Text -> back to text (no dead end).
//  REGFAIL  : the page register request answered 500 in the browser (CDP Fetch) for a PDF note and an image note:
//             what shows (failed-to-load + Retry?), then let it through and click Retry -> pages appear?
//  TEXTMEM  : same tab: PDF note switched to Text, then the image note opens -> image (pages only) or text?
// usage: node misc-probe.mjs <label> <frontOrigin> <backendPort> <cdpPort> <ctlDir>
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client, makePdf, docx, DOCX_MIME } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [LABEL, ORIGIN, BACKEND, CDPPORT, CTL] = process.argv.slice(2);
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const rowsFile = new URL('rows.jsonl', OUT);
const { upload, waitReg, setup } = client(Number(BACKEND));
const { token, courseId } = await setup();
const FIX = new URL('./fixtures/', import.meta.url);
const pdf = await upload(token, courseId, 'm.pdf', 'application/pdf', await makePdf('Misc', 3));
await waitReg(token, pdf.note, (r) => r.status === 'complete', 90000).catch(() => null);
const img = await upload(token, courseId, 'm.png', 'image/png', fs.readFileSync(new URL('png-alpha-600x600.png', FIX)));
fs.writeFileSync(`${CTL}/fail`, '');
const bad = await upload(token, courseId, 'm-fail.docx', DOCX_MIME, docx('Failconv', 30));
await waitReg(token, bad.note, (r) => r.status === 'failed', 90000).catch(() => null);
fs.rmSync(`${CTL}/fail`, { force: true });
const b = await launch({ port: Number(CDPPORT), profile: `<tmp>/a19acc/prof-${LABEL}`, width: 1280, height: 900 });
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
const waitFor = async (expr, ms = 30000) => { const s = Date.now(); for (;;) { if (await b.ev(expr).catch(() => false)) return Date.now() - s; if (Date.now() - s > ms) return -1; await sleep(150); } };
const open = async (note, viaHash = false) => { if (!viaHash) { await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(250); await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${note}` }); } else await b.ev(`location.hash='#/notes/${note}';'ok'`); await waitFor(`!!document.querySelector('[data-note-host-mode]')`, 30000); await sleep(3500); };
const SEEN = String.raw`(()=>{const main=document.querySelector('main')||document.body;const words=['could not','Could not','Retry','Try again','failed','Failed','load','Generat','generat'];
const lines=main.innerText.split('\n').map((s)=>s.trim()).filter((s)=>s&&words.some((w)=>s.includes(w))).slice(0,6);
const buttons=[...document.querySelectorAll('button')].filter((x)=>x.offsetParent!==null).map((x)=>x.textContent.trim()).filter((t)=>/retry|try again|generat/i.test(t));
const pressed=[...document.querySelectorAll('[data-source-view-toggle] button[aria-pressed="true"]')].find((x)=>x.offsetParent!==null);
return {lines,buttons,pressed:pressed?pressed.textContent.trim():null,toggles:[...document.querySelectorAll('[data-source-view-toggle]')].filter((g)=>g.offsetParent!==null).length,
pagesActive:!!document.querySelector('[data-note-source-pages-active="true"]'),imgs:[...document.querySelectorAll('[data-note-source-pages] img')].filter((x)=>x.getBoundingClientRect().width>8&&x.complete&&x.naturalWidth>0).length,
textBlocks:document.querySelectorAll('[data-note-host-mode] [data-block-id]').length}})()`;
const clickBtn = async (re) => { const p = await b.ev(`(()=>{const x=[...document.querySelectorAll('[data-source-view-toggle] button, button')].find((x)=>x.offsetParent!==null&&${re}.test(x.textContent.trim()));if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:x.textContent.trim()}})()`); if (!p) return null; await b.click(p.x, p.y); await sleep(2500); return p.t; };
const rec = (name, data) => { fs.appendFileSync(rowsFile, JSON.stringify({ label: LABEL, arm: name, ...data }) + '\n'); console.log(`${name.padEnd(10)} ${JSON.stringify(data).slice(0, 700)}`); };

// REGFAIL (pdf, image): fail the register GET at request stage, then release and click Retry.
let failing = true;
await b.cdp('Fetch.enable', { patterns: [{ urlPattern: '*by-projection-note*pages*', requestStage: 'Request' }] });
b.on('Fetch.requestPaused', async (p) => { if (failing && p.request.method === 'GET') { if (process.env.MODE === 'net') await b.cdp('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' }); else await b.cdp('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 500, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from('{"error":"injected"}').toString('base64') }); } else await b.cdp('Fetch.continueRequest', { requestId: p.requestId }); });
for (const [kind, note] of [['pdf', pdf.note], ['image', img.note]]) {
  failing = true; const tOpen = Date.now(); await open(note); const samples = [];
  for (const at of [4000, 10000, 20000]) { while (Date.now() - tOpen < at) await sleep(200); const s = await b.ev(SEEN); samples.push({ at, lines: s.lines, buttons: s.buttons, toggles: s.toggles, pagesActive: s.pagesActive, imgs: s.imgs, textBlocks: s.textBlocks }); }
  failing = false; const rRetry = await clickBtn('/^(Retry|Try again)$/'); await sleep(4000); const r1 = await b.ev(SEEN);
  rec(`REGFAIL-${kind}`, { samples, retry: rRetry, afterRelease: { lines: r1.lines, buttons: r1.buttons, toggles: r1.toggles, pagesActive: r1.pagesActive, imgs: r1.imgs } });
}
await b.cdp('Fetch.disable');
console.log(`DONE ${LABEL}`); await b.close(); process.exit(0);
