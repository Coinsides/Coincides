// Island, deployed client: does the source-view switch come back after an in-app round trip (project page and back by hash)?
// The views walk saw no switch once at 760x900 after 4.5 s. Poll every 500 ms for 15 s and record when it shows.
import fs from 'node:fs';
import { launch, sleep } from './verify-p2/harness/cdp.mjs';
const HERE = '<scratch>';
const OUT = `${HERE}/v2-runs-island`;
const API = 'http://127.0.0.1:13002/api';
const ORIGIN = 'http://127.0.0.1:13002';
const cells = fs.readFileSync('<home>/.claude/ops/island-test-accounts.md', 'utf8').split(/\r?\n/).find((l) => l.includes('<my-test-account>')).split('|').map((c) => c.trim());
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: cells[2], password: cells[3] }) })).json();
const data = JSON.parse(fs.readFileSync(`${HERE}/v2-data.json`, 'utf8'));
const b = await launch({ port: 9200 + Math.floor(Math.random() * 300), profile: `${OUT}/profile-inapp`, width: 1440, height: 900 });
const STATE = `(()=>{const toggles=[...document.querySelectorAll('[data-source-view-toggle]')].map(t=>{const r=t.getBoundingClientRect();return {top:Math.round(r.top),left:Math.round(r.left),float:Boolean(t.closest('[data-source-view-float]')),visible:r.width>0&&r.height>0}});return {hash:location.hash.slice(0,60),pages:Boolean(document.querySelector('[data-note-source-pages]')),toggles,loading:/Loading/.test((document.querySelector('main')||document.body).innerText.slice(0,400)),textLen:(document.querySelector('main')||document.body).innerText.length}})()`;
await b.cdp('Page.navigate', { url: `${ORIGIN}/#/login` }); await sleep(3000);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`);
const plan = [[760, 900], [760, 900], [760, 900], [1440, 900], [760, 900], [760, 900], [1440, 900], [760, 900], [1440, 900]];
let n = 0;
for (const [w, h] of plan) {
  n += 1;
  await b.cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${data.noteId}` }); await sleep(6500);
  const open = await b.ev(STATE);
  await b.ev(`location.hash='#/projects/${data.courseId}';1`); await sleep(3000);
  const t0 = Date.now();
  await b.ev(`location.hash='#/notes/${data.noteId}';1`);
  const trace = []; let firstToggleMs = null; let shotDone = false;
  for (let i = 0; i < 30; i += 1) {
    await sleep(500);
    const s = await b.ev(STATE);
    const vis = s.toggles.filter((t) => t.visible).length;
    trace.push({ ms: Date.now() - t0, vis, pages: s.pages, loading: s.loading, len: s.textLen });
    if (vis && firstToggleMs === null) firstToggleMs = Date.now() - t0;
    if (!vis && i === 8 && !shotDone) { const r = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); fs.writeFileSync(`${OUT}/inapp-${n}-${w}-no-switch-at-4.5s.jpg`, Buffer.from(r.result.data, 'base64')); shotDone = true; }
    if (firstToggleMs !== null && i >= 9) break;
  }
  const row = { n, size: `${w}x${h}`, openToggles: open.toggles.length, openPages: open.pages, firstToggleMs, at4500: trace.find((x) => x.ms >= 4500) || null, last: trace[trace.length - 1] };
  fs.appendFileSync(`${OUT}/rows-inapp.jsonl`, `${JSON.stringify({ ...row, trace })}\n`);
  console.log(JSON.stringify(row));
}
await b.close(); process.exit(0);
