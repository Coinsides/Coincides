// A-19 regression: the lineage chip ("Source p.N" + "View original", data-source-page-jump=N) on PDF and docx notes.
// Per note: open (default view), record which view it lands in; switch to text with the toggle; list the chips; click
// "View original" for pages 3, 7, 11 (real clicks); after each, which original page is at the top of the viewport and
// which toggle button is pressed. Built dist + its own local backend; fresh scratch account; docx via the fake converter.
// usage: node lineage-probe.mjs <label> <frontOrigin> <backendPort> [reps]
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client, makePdf, docx, DOCX_MIME } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [LABEL, ORIGIN, BACKEND, REPS = '2'] = process.argv.slice(2);
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const rowsFile = new URL('rows.jsonl', OUT);
const { upload, waitReg, setup } = client(Number(BACKEND));
const { token, courseId } = await setup();
const prof = new URL(`./profiles/${LABEL}`, import.meta.url).pathname.replace(/^\//, '');
const b = await launch({ port: 9613, profile: prof, width: 1280, height: 900 });
const exceptions = [];
b.on('Runtime.exceptionThrown', (p) => exceptions.push(String(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text).slice(0, 200)));
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
const waitFor = async (expr, ms = 30000) => { const s = Date.now(); for (;;) { if (await b.ev(expr).catch(() => false)) return Date.now() - s; if (Date.now() - s > ms) return -1; await sleep(150); } };
const STATE = String.raw`(()=>{const vp=document.querySelector('[data-note-source-pages-viewport]');let top=null;if(vp){const vr=vp.getBoundingClientRect();for(const el of vp.querySelectorAll('[data-source-page-number]')){const r=el.getBoundingClientRect();if(r.top<=vr.top+60)top=Number(el.dataset.sourcePageNumber);}}
const pressed=[...document.querySelectorAll('[data-source-view-toggle] button[aria-pressed="true"]')].find((x)=>x.offsetParent!==null);
return {active:!!document.querySelector('[data-note-source-pages-active="true"]'),topPage:top,pressed:pressed?pressed.textContent.trim():null,
chips:[...document.querySelectorAll('[data-source-page-jump]')].map((x)=>Number(x.dataset.sourcePageJump)),
refs:[...document.querySelectorAll('[data-page-flow-sources], [class*=sourceRef]')].length,
toggles:[...document.querySelectorAll('[data-source-view-toggle]')].filter((g)=>g.offsetParent!==null).map((g)=>g.textContent.trim())}})()`;
const realClick = async (expr) => { const p = await b.ev(`(()=>{const el=${expr};if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`); if (!p) return false; await sleep(250); await b.click(p.x, p.y); return true; };

for (let rep = 0; rep < Number(REPS); rep += 1) for (const kind of ['pdf', 'docx']) {
  const row = { label: LABEL, kind, rep };
  try {
    const up = kind === 'pdf' ? await upload(token, courseId, `L${rep}.pdf`, 'application/pdf', await makePdf(`L${rep}`, 12)) : await upload(token, courseId, `L${rep}.docx`, DOCX_MIME, docx(`L${rep}`, 80));
    row.note = up.note;
    row.reg = await waitReg(token, up.note, (r) => r.status === 'complete', 90000).then((r) => ({ status: r.status, pages: (r.pages || []).length })).catch((e) => ({ error: String(e.message).slice(0, 120) }));
    exceptions.length = 0;
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(200);
    await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${up.note}` });
    await waitFor(`!!document.querySelector('[data-note-host-mode]')`, 30000); await sleep(2500);
    row.landing = await b.ev(STATE);
    // To the text view.
    row.toText = await realClick(`[...document.querySelectorAll('[data-source-view-toggle] button')].find((x)=>x.offsetParent!==null&&/text/i.test(x.textContent))`);
    await sleep(1500);
    row.inText = await b.ev(STATE);
    row.jumps = [];
    for (const page of [3, 7, 11]) {
      const ok = await realClick(`document.querySelector('[data-source-page-jump="${page}"]')`);
      await sleep(2200);
      const s = await b.ev(STATE);
      row.jumps.push({ page, clicked: ok, topPage: s.topPage, active: s.active, pressed: s.pressed });
      await realClick(`[...document.querySelectorAll('[data-source-view-toggle] button')].find((x)=>x.offsetParent!==null&&/text/i.test(x.textContent))`);
      await sleep(1200);
    }
    row.exceptions = [...exceptions];
    row.ok = row.jumps.every((j) => j.clicked && j.topPage === j.page && j.active);
  } catch (e) { row.error = String(e.stack || e).slice(0, 300); }
  fs.appendFileSync(rowsFile, JSON.stringify(row) + '\n');
  console.log(`${kind} rep${rep} landing=${row.landing?.pressed ?? '-'}/${row.landing?.active ?? '-'} chips=${(row.inText?.chips || []).length} jumps=${(row.jumps || []).map((j) => `${j.page}->${j.topPage}`).join(',')} ok=${row.ok ?? '-'} ${row.error ? 'ERR ' + row.error.slice(0, 80) : ''}`);
}
console.log(`DONE ${LABEL}`);
await b.close(); process.exit(0);
