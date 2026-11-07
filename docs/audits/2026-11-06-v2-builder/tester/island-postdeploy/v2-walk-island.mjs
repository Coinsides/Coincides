// V2 walk, before vs after, real backend (island through the tunnel), my test account only.
// pre = current client (HEAD) on 13141; post = HEAD + the 7 V2 files on 13145. Real mouse and wheel events via CDP.
import fs from 'node:fs';
import { launch, sleep } from './verify-p2/harness/cdp.mjs';
const HERE = '<scratch>';
const OUT = `${HERE}/v2-runs-island`; fs.mkdirSync(OUT, { recursive: true });
const LOCAL = process.env.LOCAL === '1';
const API = LOCAL ? 'http://127.0.0.1:13121/api' : 'http://127.0.0.1:13002/api';
const lc = LOCAL ? JSON.parse(fs.readFileSync('<tmp>/r04a/cred.json', 'utf8')) : null;
const cells = LOCAL ? [null, null, lc.email, lc.password] : fs.readFileSync('<home>/.claude/ops/island-test-accounts.md', 'utf8').split('\n').find((l) => l.includes('<my-test-account>')).split('|').map((c) => c.trim());
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: cells[2], password: cells[3] }) })).json();
const data = JSON.parse(fs.readFileSync(`${HERE}/${LOCAL ? 'v2-data-local.json' : 'v2-data.json'}`, 'utf8'));
const PHASE = process.env.PHASE || 'views';
const BUILDS = [['island', 'http://127.0.0.1:13002']];
const SIZES = [[1440, 900], [1280, 600], [1024, 768], [760, 900]];
const b = await launch({ port: 9400 + Math.floor(Math.random() * 400), profile: `${OUT}/profile-${PHASE}`, width: 1440, height: 900 });
const rows = [];
const shot = async (name) => { const r = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); fs.writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
const size = async (w, h) => { await b.cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); };
const login = async (origin) => { await b.cdp('Page.navigate', { url: `${origin}/#/login` }); await sleep(3000); await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`); };
const go = async (origin, hash, wait = 6500) => { await b.cdp('Page.navigate', { url: `${origin}/?r=${Date.now()}#${hash}` }); await sleep(wait); };
const STATE = `(()=>{const main=document.querySelector('[data-app-main-scroll="true"]');const pages=document.querySelector('[data-note-source-pages]');const vp=document.querySelector('[data-note-source-pages-viewport]');const toggles=[...document.querySelectorAll('[data-source-view-toggle]')].map(t=>{const r=t.getBoundingClientRect();const cs=getComputedStyle(t.closest('[data-source-view-float]')||t);return {top:Math.round(r.top),left:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height),float:Boolean(t.closest('[data-source-view-float]')),display:cs.display,visible:r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'}});const ov=document.querySelector('[data-note-overview-root]');return {pagesActive:Boolean(pages),overview:Boolean(ov),mainScroll:main?Math.round(main.scrollTop):null,mainOverflow:main?getComputedStyle(main).overflowY:null,vp:vp?{sh:vp.scrollHeight,ch:vp.clientHeight,st:Math.round(vp.scrollTop)}:null,toggles,innerH:innerHeight,innerW:innerWidth}})()`;
const state = () => b.ev(STATE);
const hit = (x, y) => b.ev(`(()=>{const e=document.elementFromPoint(${x},${y});if(!e)return null;if(e.closest('[aria-label="Close page overview"]'))return 'overview-close';const t=e.closest('[data-source-view-toggle]');if(t)return 'toggle:'+(e.closest('button')?.textContent||'');return e.tagName+'.'+String(e.className).slice(0,40)})()`);
const buttonByText = (txt, scope = 'document') => b.ev(`(()=>{const root=${scope};const bs=[...root.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&(x.textContent.trim()===${JSON.stringify(txt)}||x.getAttribute('aria-label')===${JSON.stringify(txt)})});if(!bs.length)return null;const r=bs[0].getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
const add = (row) => { rows.push(row); fs.appendFileSync(`${OUT}/rows-${PHASE}.jsonl`, `${JSON.stringify(row)}\n`); console.log(JSON.stringify(row).slice(0, 400)); };

if (PHASE === 'views') {
  for (const [label, origin] of BUILDS) {
    await login(origin);
    for (const [w, h] of SIZES) {
      await size(w, h);
      await go(origin, `/notes/${data.noteId}`);
      const r = { build: label, size: `${w}x${h}`, open: await state() };
      // Into the original pages, through the floating switch if the note opened in text.
      if (!r.open.pagesActive) { const p = await buttonByText('Pages'); r.toPages = p; if (p) { await b.click(p.x, p.y); await sleep(2500); } }
      r.pages = await state();
      // B-79: eight wheel ticks with the pointer over the header switch.
      const hdr = r.pages.toggles.find((t) => !t.float && t.visible) || r.pages.toggles.find((t) => t.visible);
      if (hdr) {
        const x = hdr.left + Math.round(hdr.w / 2); const y = hdr.top + Math.round(hdr.h / 2);
        await b.move(x, y); for (let i = 0; i < 8; i += 1) { await b.wheel(x, y, 120); await sleep(120); }
        await sleep(600);
        r.afterWheel = await state();
        const h2 = r.afterWheel.toggles.find((t) => !t.float) || r.afterWheel.toggles[0];
        r.switchReachable = h2 ? (h2.top >= 0 && h2.top + h2.h <= r.afterWheel.innerH && String(await hit(h2.left + 10, h2.top + Math.round(h2.h / 2))).startsWith('toggle')) : false;
        if (w === 1440 && h === 900 || w === 760) await shot(`${label}-${w}x${h}-pages-after-wheel`);
      } else r.noHeaderSwitch = true;
      // Back to text with a real click on Text, then B-78: Overview's close button under the floating switch.
      const t = await buttonByText('Text'); r.toText = Boolean(t);
      if (t) { await b.click(t.x, t.y); await sleep(2500); }
      r.text = await state();
      const ovBtn = await b.ev(`(()=>{const bs=[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();const n=(x.getAttribute('aria-label')||'')+' '+x.textContent;return r.width>0&&/Overview/.test(n)&&!/Close/.test(n)});if(!bs.length)return null;const r=bs[0].getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
      r.overviewButton = Boolean(ovBtn);
      if (ovBtn) {
        await b.click(ovBtn.x, ovBtn.y); await sleep(2500);
        r.overviewOpen = await state();
        const close = await b.ev(`(()=>{const e=document.querySelector('[aria-label="Close page overview"]');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
        r.closeHit = close ? await hit(close.x, close.y) : 'no close button';
        if (w === 1440 && h === 900) await shot(`${label}-${w}x${h}-overview-open`);
        if (close) { await b.click(close.x, close.y); await sleep(2000); }
        r.afterClose = await state();
        r.closedCleanly = r.afterClose ? (!r.afterClose.overview && !r.afterClose.pagesActive) : null;
        const fl = r.afterClose.toggles.find((x) => x.float);
        r.floatBack = fl ? fl.visible : false;
        if (w === 1440 && h === 900) await shot(`${label}-${w}x${h}-after-close`);
      }
      // In-app round trip with state: away to the project page and back by hash, then the wheel again.
      await b.ev(`location.hash='#/projects/${data.courseId}';1`); await sleep(3000);
      await b.ev(`location.hash='#/notes/${data.noteId}';1`); await sleep(4500);
      r.inApp = await state();
      add(r);
    }
  }
}

if (PHASE === 'b78') {
  const openOverview = async () => {
    const direct = await b.ev(`(()=>{const bs=[...document.querySelectorAll('button,[role=menuitem]')].filter(x=>{const r=x.getBoundingClientRect();const n=(x.getAttribute('aria-label')||'')+' '+x.textContent;return r.width>0&&/Overview/.test(n)&&!/Close/.test(n)});if(!bs.length)return null;const r=bs[0].getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
    if (direct) { await b.click(direct.x, direct.y); await sleep(2500); return 'direct'; }
    // Narrow windows fold the toolbar groups behind menu buttons; open each until Overview shows.
    const folds = await b.ev(`(()=>[...document.querySelectorAll('button[aria-haspopup],button[aria-expanded]')].filter(x=>x.getBoundingClientRect().width>0&&x.getBoundingClientRect().top>innerHeight-140).map(x=>{const r=x.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),n:(x.getAttribute('aria-label')||x.textContent).slice(0,30)}}))()`);
    for (const f of folds) {
      await b.click(f.x, f.y); await sleep(700);
      const item = await b.ev(`(()=>{const bs=[...document.querySelectorAll('button,[role=menuitem]')].filter(x=>{const r=x.getBoundingClientRect();const n=(x.getAttribute('aria-label')||'')+' '+x.textContent;return r.width>0&&/Overview/.test(n)&&!/Close/.test(n)});if(!bs.length)return null;const r=bs[0].getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
      if (item) { await b.click(item.x, item.y); await sleep(2500); return `menu:${f.n}`; }
      await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(300);
    }
    return null;
  };
  for (const [label, origin] of BUILDS) {
    await login(origin);
    for (const [w, h] of [[1440, 900], [1024, 768], [760, 900]]) {
      await size(w, h);
      await go(origin, `/notes/${data.noteId}`);
      const r = { build: label, size: `${w}x${h}`, open: await state() };
      const t = await buttonByText('Text'); if (t) { await b.click(t.x, t.y); await sleep(2500); }
      r.text = await state();
      r.how = await openOverview();
      r.overviewOpen = await state();
      const close = await b.ev(`(()=>{const e=document.querySelector('[aria-label="Close page overview"]');if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
      r.closeHit = close ? await hit(close.x, close.y) : 'no close button';
      await shot(`b78-${label}-${w}x${h}-overview`);
      if (close) { await b.click(close.x, close.y); await sleep(2000); }
      r.afterClose = await state();
      r.result = r.afterClose.overview ? 'overview still open' : r.afterClose.pagesActive ? 'switched to pages' : 'closed, still text';
      const fl = r.afterClose.toggles.find((x) => x.float); r.floatBack = fl ? fl.visible : false;
      add(r);
    }
    // Pages view at a short window: the page itself must still scroll to its end with the wheel over it.
    await size(1280, 600);
    await go(origin, `/notes/${data.noteId}`);
    const p = await buttonByText('Pages'); if (p) { await b.click(p.x, p.y); await sleep(2500); }
    const before = await state();
    for (let i = 0; i < 20; i += 1) { await b.wheel(840, 400, 150); await sleep(80); }
    await sleep(600);
    const after = await state();
    const vpRect = await b.ev(`(()=>{const v=document.querySelector('[data-note-source-pages-viewport]');if(!v)return null;const r=v.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom)}})()`);
    add({ build: label, step: 'pages-scroll-1280x600', before: before.vp, after: after.vp, atEnd: after.vp ? after.vp.st >= after.vp.sh - after.vp.ch - 2 : null, vpRect, innerH: after.innerH, mainScroll: after.mainScroll });
    await shot(`pages-scroll-${label}-1280x600`);
  }
}

if (PHASE === 'gallery') {
  await size(1440, 900);
  const gallery = async (label, origin, tag) => {
    await go(origin, '/group-gallery', 9000);
    const txt = await b.ev(`(document.querySelector('main')||document.body).innerText`);
    add({ build: label, step: `gallery-${tag}`, notInAnyNote: /Not in any note/.test(txt), onNote: txt.includes('V2 走查组·笔记上'), early: txt.includes('V2 走查组') && (txt.match(/V2 走查组/g) || []).length, loading: /Loading content groups/.test(txt), excerpt: txt.slice(0, 900) });
    await shot(`${label}-gallery-${tag}`);
  };
  const dialog = async (label, origin, confirm) => {
    await go(origin, '/sources', 8000);
    const rowBtn = await b.ev(`(()=>{const rows=[...document.querySelectorAll('tr,li,[role=row],[class*=row],[class*=Row]')].filter(r=>r.textContent.includes('V2走查样本.pdf'));for(const r of rows){const x=[...r.querySelectorAll('button')].find(b=>/Rebuild/i.test((b.getAttribute('aria-label')||'')+b.textContent));if(x){const q=x.getBoundingClientRect();return {x:Math.round(q.x+q.width/2),y:Math.round(q.y+q.height/2)}}}return null})()`);
    if (!rowBtn) { add({ build: label, step: 'rebuild-dialog', found: false }); await shot(`${label}-sources`); return; }
    await b.click(rowBtn.x, rowBtn.y); await sleep(4000);
    const dlg = await b.ev(`(()=>{const d=document.querySelector('[role=dialog],[role=alertdialog]');return d?d.innerText:null})()`);
    await shot(`${label}-rebuild-dialog`);
    add({ build: label, step: 'rebuild-dialog', found: true, text: dlg });
    const btn = await b.ev(`(()=>{const d=document.querySelector('[role=dialog],[role=alertdialog]');if(!d)return null;const want=${confirm ? '/^Replace projection|^Rebuild|^替换/' : '/^Cancel|^取消/'};const x=[...d.querySelectorAll('button')].find(b=>want.test(b.textContent.trim()));if(!x)return null;const r=x.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),t:x.textContent.trim()}})()`);
    if (btn) { await b.click(btn.x, btn.y); await sleep(confirm ? 25000 : 1500); }
    add({ build: label, step: confirm ? 'rebuild-confirmed' : 'rebuild-cancelled', button: btn?.t ?? null });
  };
  for (const [label, origin] of BUILDS) { await login(origin); await gallery(label, origin, 'before'); }
  await login(BUILDS[0][1]); await dialog('pre', BUILDS[0][1], false);
  await login(BUILDS[1][1]); await dialog('post', BUILDS[1][1], true);
  for (const [label, origin] of BUILDS) { await login(origin); await gallery(label, origin, 'after'); }
}
await b.close(); process.exit(0);
