// A-19 legacy arm, step 2: open the seeded notes (same library) on a given front end and record what a person sees.
//   images : first screen at 1 s / 4 s / 10 s; if a generate / retry button shows, click it, 12 s later look again;
//            the shown picture's size, ratio and bytes (= original?), overflow, toggle.
//   pdf/docx: landing view, toggle, text view chips, View-original jumps 3/7/11, memory (Text -> other note -> back),
//            reload (back to default).
// usage: node legacy-probe.mjs <label> <frontOrigin> <backendPort> [kinds=image,pdf,docx]
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
import { client } from 'file:///<home>/.claude/ops/tester-kit/harness/lib.mjs';
const [LABEL, ORIGIN, BACKEND, KINDS = 'image,pdf,docx'] = process.argv.slice(2);
const A = '<tmp>/a19acc';
const acct = JSON.parse(fs.readFileSync(`${A}/legacy-account.json`, 'utf8'));
const map = JSON.parse(fs.readFileSync(`${A}/legacy-map.json`, 'utf8')).filter((x) => KINDS.split(',').includes(x.kind));
const manifest = JSON.parse(fs.readFileSync(new URL('./fixtures/manifest.json', import.meta.url), 'utf8'));
const OUT = new URL(`./runs/${LABEL}/`, import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const rowsFile = new URL('rows.jsonl', OUT);
const { api, reg } = client(Number(BACKEND));
const { token } = await api('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: acct.email, password: acct.password }) });
const prof = new URL(`./profiles/${LABEL}`, import.meta.url).pathname.replace(/^\//, '');
const b = await launch({ port: 9614, profile: prof, width: 1280, height: 900 });
const exceptions = [];
b.on('Runtime.exceptionThrown', (p) => exceptions.push(String(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text).slice(0, 200)));
await b.cdp('Page.navigate', { url: `${ORIGIN}/` }); await sleep(800);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)});'ok'`);
const waitFor = async (expr, ms = 30000) => { const s = Date.now(); for (;;) { if (await b.ev(expr).catch(() => false)) return Date.now() - s; if (Date.now() - s > ms) return -1; await sleep(150); } };
const realClick = async (expr) => { const p = await b.ev(`(()=>{const el=${expr};if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),t:el.textContent.trim().slice(0,40)}})()`); if (!p) return null; await sleep(250); await b.click(p.x, p.y); return p.t || true; };
const open = async (note) => { await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(200); await b.cdp('Page.navigate', { url: `${ORIGIN}/#/notes/${note}` }); await waitFor(`!!document.querySelector('[data-note-host-mode]')`, 30000); };
const SHOT = fs.readFileSync(new URL('./a19-probe.mjs', import.meta.url), 'utf8').match(/const SHOT = String\.raw`([\s\S]*?)`;\n/)[1];
const STATE = String.raw`(()=>{const vp=document.querySelector('[data-note-source-pages-viewport]');let top=null;if(vp){const vr=vp.getBoundingClientRect();for(const el of vp.querySelectorAll('[data-source-page-number]')){const r=el.getBoundingClientRect();if(r.top<=vr.top+60)top=Number(el.dataset.sourcePageNumber);}}
const pressed=[...document.querySelectorAll('[data-source-view-toggle] button[aria-pressed="true"]')].find((x)=>x.offsetParent!==null);
return {active:!!document.querySelector('[data-note-source-pages-active="true"]'),topPage:top,pressed:pressed?pressed.textContent.trim():null,
chips:[...document.querySelectorAll('[data-source-page-jump]')].map((x)=>Number(x.dataset.sourcePageJump)).length,
blocks:document.querySelectorAll('[data-note-host-mode] [data-block-id]').length,
toggles:[...document.querySelectorAll('[data-source-view-toggle]')].filter((g)=>g.offsetParent!==null).map((g)=>g.textContent.trim())}})()`;
const TOGGLE_SHOWN = `[...document.querySelectorAll('[data-source-view-toggle] button[aria-pressed="true"]')].some((x)=>x.offsetParent!==null)`;
const TEXTBTN = `[...document.querySelectorAll('[data-source-view-toggle] button')].find((x)=>x.offsetParent!==null&&/text/i.test(x.textContent))`;
const pageSha = (src) => b.ev(`(async()=>{try{const r=await fetch(${JSON.stringify(src)},{headers:{authorization:'Bearer '+localStorage.getItem('coincides_auth_token')}});const a=await r.arrayBuffer();const d=await crypto.subtle.digest('SHA-256',a);return {status:r.status,bytes:a.byteLength,sha:[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}}catch(e){return {error:String(e).slice(0,80)}}})()`);
const other = map.find((x) => x.kind === 'image' && x.note)?.note;

for (const item of map) {
  const row = { label: LABEL, kind: item.kind, name: item.name, note: item.note, source: item.id };
  if (!item.note) { row.skipped = 'no note at seed'; fs.appendFileSync(rowsFile, JSON.stringify(row) + '\n'); console.log(`${item.name} skipped (no note)`); continue; }
  exceptions.length = 0;
  try {
    row.reg0 = await reg(token, item.note).then((r) => ({ status: r.status, n: (r.pages || []).length, fields: r.pages && r.pages[0] ? Object.keys(r.pages[0]) : null, tv: r.pages ? r.pages.map((p) => p.text_view) : null })).catch((e) => ({ error: String(e.message).slice(0, 120) }));
    if (item.kind === 'image') {
      const m = manifest.find((x) => x.name === item.name);
      const t0 = Date.now(); await open(item.note);
      row.shots = [];
      for (const at of [1000, 4000, 10000]) { while (Date.now() - t0 < at) await sleep(100); const s = await b.ev(SHOT); s.at = at; row.shots.push(s); }
      const hasImg = (s) => (s.imgs || []).some((x) => x.onScreen && x.tag === 'IMG' && x.complete && x.nw > 0);
      if (!hasImg(row.shots[2])) {
        row.clicked = await realClick(`[...document.querySelectorAll('button')].find((x)=>x.offsetParent!==null&&/generat|retry|try again|生成|重试/i.test(x.textContent))`);
        if (row.clicked) { await sleep(12000); const s = await b.ev(SHOT); s.at = 'after-click'; row.shots.push(s); }
      }
      const last = row.shots[row.shots.length - 1];
      const im = (last.imgs || []).filter((x) => x.onScreen && x.tag === 'IMG').sort((p, q) => q.w * q.h - p.w * p.h)[0];
      row.visible = hasImg(last);
      if (im) {
        const want = m.display ? m.display[0] / m.display[1] : null;
        row.shown = { w: im.w, h: im.h, nw: im.nw, nh: im.nh, want: want && Math.round(want * 1e4) / 1e4, ratio: Math.round((im.w / im.h) * 1e4) / 1e4 };
        row.ratioOk = want ? Math.abs(im.w / im.h - want) / want < 0.015 || Math.abs(im.w - im.h * want) <= 1.5 : null;
        if (im.src) { row.served = await pageSha(im.src); row.servedIsOriginal = row.served.sha === m.sha256; }
      }
      row.overflowX = !!(last.ovMain && last.ovMain.sw > last.ovMain.cw + 1) || last.ovDoc.sw > last.ovDoc.cw + 1;
      row.toggleShown = (last.toggles || []).length > 0;
      row.reg1 = await reg(token, item.note).then((r) => ({ status: r.status, n: (r.pages || []).length, tv: r.pages ? r.pages.map((p) => p.text_view) : null })).catch((e) => ({ error: String(e.message).slice(0, 120) }));
      const shot = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 });
      fs.writeFileSync(new URL(`${item.name}.jpg`, OUT), Buffer.from(shot.result.data, 'base64'));
    } else {
      await open(item.note); await sleep(2500);
      row.landing = await b.ev(STATE);
      row.toText = await realClick(TEXTBTN); await sleep(1500);
      row.inText = await b.ev(STATE);
      row.jumps = [];
      if (item.kind === 'pdf') for (const page of [3, 7, 11]) {
        const ok = await realClick(`document.querySelector('[data-source-page-jump="${page}"]')`); await sleep(2200);
        const s = await b.ev(STATE); row.jumps.push({ page, clicked: !!ok, topPage: s.topPage, active: s.active, pressed: s.pressed });
        await realClick(TEXTBTN); await sleep(1200);
      }
      // Memory: Text chosen, go to another note and come back by hash.
      row.beforeAway = await b.ev(STATE);
      await b.ev(`location.hash='#/notes/${other}';'ok'`); await sleep(2500);
      await b.ev(`location.hash='#/notes/${item.note}';'ok'`);
      row.backWait = await waitFor(TOGGLE_SHOWN, 15000); await sleep(800);
      row.afterBack = await b.ev(STATE);
      await b.cdp('Page.reload'); await waitFor(`!!document.querySelector('[data-note-host-mode]')`, 30000);
      row.reloadWait = await waitFor(TOGGLE_SHOWN, 15000); await sleep(1500);
      row.afterReload = await b.ev(STATE);
      const shot = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 });
      fs.writeFileSync(new URL(`${item.name}.jpg`, OUT), Buffer.from(shot.result.data, 'base64'));
    }
  } catch (e) { row.error = String(e.stack || e).slice(0, 300); }
  row.exceptions = [...exceptions];
  fs.appendFileSync(rowsFile, JSON.stringify(row) + '\n');
  if (item.kind === 'image') console.log(`${item.name.padEnd(38)} visible=${row.visible ?? '-'} click=${row.clicked ?? '-'} ratioOk=${row.ratioOk ?? '-'} orig=${row.servedIsOriginal ?? '-'} ovX=${row.overflowX ?? '-'} toggle=${row.toggleShown ?? '-'} reg=${JSON.stringify(row.reg0).slice(0, 60)} ${row.error ? 'ERR ' + row.error.slice(0, 60) : ''}`);
  else console.log(`${item.kind} landing=${row.landing?.pressed}/${row.landing?.active} toggles=${JSON.stringify(row.landing?.toggles)} text: blocks=${row.inText?.blocks} chips=${row.inText?.chips} jumps=${(row.jumps || []).map((j) => `${j.page}->${j.topPage}`).join(',')} back=${row.afterBack?.pressed}(${row.backWait}ms) reload=${row.afterReload?.pressed}/${row.afterReload?.active} ex=${row.exceptions.length} ${row.error ? 'ERR ' + row.error.slice(0, 60) : ''}`);
}
console.log(`DONE ${LABEL}`);
await b.close(); process.exit(0);
