// Review repros: the independent review's surviving findings, driven in the real app against the real backend.
// Requests are steered inside this Chrome only (Fetch at the Request stage); the server is untouched.
const ctrl = (k, code, vk, commands) => b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 2, commands }).then(() => b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 2 }));
const undo = () => ctrl('z', 'KeyZ', 90, ['undo']);
const home = () => press('Home', 'Home', 36);
const goHash = (id) => b.ev(`location.hash='#/notes/${id}';1`);
const typeText = async (t, gap = 90) => { for (const c of t) { if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(gap); } };
const short = (u) => u.replace(/^.*\/api/, '').replace(/[0-9a-f-]{36}/g, ':id').replace(/\?.*$/, '');
const summarize = (pd) => { try { const j = JSON.parse(pd); const units = j?.block?.content_json?.text_flow?.units || j?.content_json?.text_flow?.units; if (Array.isArray(units)) return units.map((u) => `${u.writing_role && u.writing_role !== 'paragraph' ? `[${u.writing_role}]` : ''}${u.text}`).join('|'); return ''; } catch { return ''; } };
let rule = () => 'continue'; const held = []; const net = []; let t0 = Date.now(); let respRule = () => null;
const mark = () => { t0 = Date.now(); net.length = 0; };
b.on('Fetch.requestPaused', (p) => {
  if (p.responseStatusCode !== undefined || p.responseErrorReason) {
    let act = null; try { act = respRule({ u: short(p.request.url) }); } catch { act = null; }
    const go = () => b.cdp('Fetch.continueResponse', { requestId: p.requestId }).catch(() => b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}));
    net.push(`${Date.now() - t0} RESP ${short(p.request.url)} ${p.responseStatusCode}${act && act.delay ? ` [respDelay${act.delay}]` : ''}`);
    if (act && act.delay) setTimeout(go, act.delay); else go();
    return;
  }
  const m = p.request.method; const u = short(p.request.url);
  if (m === 'GET' || m === 'OPTIONS' || /source-anchors/.test(u)) { b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}); return; }
  let act = 'continue'; try { act = rule({ m, u, pd: p.request.postData ? summarize(p.request.postData) : '' }) || 'continue'; } catch { act = 'continue'; }
  const tag = act === 'continue' ? '' : ` [${typeof act === 'object' ? `delay${act.delay}` : act}]`;
  net.push(`${Date.now() - t0} ${m} ${u}${tag}${/text-save/.test(u) && p.request.postData ? ` ${summarize(p.request.postData)}` : ''}`);
  if (act === 'hold') held.push(p.requestId);
  else if (act === '500') b.cdp('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 500, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"injected"}').toString('base64') }).catch(() => {});
  else if (typeof act === 'object' && act.delay) setTimeout(() => b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}), act.delay);
  else b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {});
});
await b.cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }, { urlPattern: '*unit-transfer*', requestStage: 'Response' }] });
const release = async () => { while (held.length) await b.cdp('Fetch.continueRequest', { requestId: held.shift() }).catch(() => {}); };
const WIN = `(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const n=document.querySelector('[data-structure-typing-notice]');const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0);const a=document.activeElement;return {buf:t?t.value:null,boxes:window.__bufs||0,focusBuf:a===t,active:(a?.tagName||'')+(a?.dataset?.runtimeTextflowEditor?':editor':'')+(a?.value!==undefined?'='+a.value.slice(0,40)+'@'+a.selectionStart:''),notice:n?n.innerText.slice(0,90):null,eds:eds.map(e=>e.value),alerts:[...new Set([...(window.__alerts||[]),...[...document.querySelectorAll('[role=alert],[class*=toast],[class*=Toast]')].map(x=>x.innerText.replace(/\\s+/g,' ').slice(0,90))].filter(Boolean))].slice(0,6),stored:Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')).map(k=>localStorage.getItem(k).slice(0,160))}})()`;
const win = () => b.ev(WIN);
// Kept words of THIS note only (the key ends with the note id); the old check read every note's entries.
const storedFor = (id) => b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')&&k.endsWith(${JSON.stringify(id)})).map(k=>localStorage.getItem(k))`);
let lastStoredHere = null;
// Count every words box that appears and every alert text, from the moment this is called on the current page.
const watch = () => b.ev(`(()=>{window.__bufs=0;window.__alerts=[];const grab=()=>{for(const x of document.querySelectorAll('[role=alert],[class*=toast],[class*=Toast]')){const s=x.innerText.replace(/\\s+/g,' ').slice(0,90);if(s&&!window.__alerts.includes(s))window.__alerts.push(s)}};new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches?.('textarea[data-structure-typing-buffer]')||n.querySelector?.('textarea[data-structure-typing-buffer]'))window.__bufs++}grab()}).observe(document.body,{childList:true,subtree:true,characterData:true});1})()`);
const shot = async (name) => { const r = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
const blocksOf = async (id) => (await serverBlocks(id)).map((x) => x.units);
const flat = (bl) => JSON.stringify(bl);
const row = (name, id, data, ok) => { add({ arm: 'RV', name, id, ...data, storedHere: lastStoredHere, net: [...net], ok }); lastStoredHere = null; };
const prep = async (title) => { const id = await fresh(title); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500); return id; };
const scenario = async (name, fn) => {
  rule = () => 'continue'; respRule = () => null; held.length = 0; mark();
  console.log('---', name);
  try { await fn(); } catch (e) { add({ arm: 'RV', name, ok: false, error: String(e).slice(0, 300), net: [...net] }); }
  rule = () => 'continue'; await release();
};
const tabAt = (title) => b.ev(`(()=>{const t=[...document.querySelectorAll('[role=tab],[class*=tab] *')].find(x=>x.children.length===0&&x.textContent.trim()===${JSON.stringify(title)});if(!t)return null;const r=t.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const ONLY_RV = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (name) => !ONLY_RV || ONLY_RV.some((p) => name.startsWith(p));

// A page-side timeline of the words box: every change of its value (null = no box), the '#', the Enter, the last
// key, the first mouse press and the first route change, all in ms from the moment it is installed.
const traceOn = () => b.ev(`(()=>{const T0=performance.now();const now=()=>Math.round(performance.now()-T0);window.__trace=[];window.__hashKeyAt=null;window.__enterAt=null;window.__lastKeyAt=null;window.__clickAt=null;window.__routeAt=null;let last='~';let lastH=location.hash;window.__hashes=[];clearInterval(window.__traceTimer);window.__traceTimer=setInterval(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const v=t?t.value:null;const k=v===null?'~null':v;if(k!==last){window.__trace.push([now(),v]);last=k}const h=location.hash;if(h!==lastH){window.__hashes.push([now(),h.replace(/[0-9a-f-]{36}/g,':id')]);lastH=h}},10);document.addEventListener('keydown',e=>{const t=now();window.__lastKeyAt=t;if(e.key==='#'&&window.__hashKeyAt===null)window.__hashKeyAt=t;if(e.key==='Enter'&&window.__enterAt===null)window.__enterAt=t},true);document.addEventListener('mousedown',()=>{if(window.__clickAt===null)window.__clickAt=now()},true);window.addEventListener('hashchange',()=>{if(window.__routeAt===null)window.__routeAt=now()});1})()`);
const traceGet = () => b.ev(`({trace:window.__trace,hashKeyAt:window.__hashKeyAt,enterAt:window.__enterAt,lastKeyAt:window.__lastKeyAt,clickAt:window.__clickAt,routeAt:window.__routeAt,hashes:window.__hashes})`);
const other = await newNote('R other');
const clickTaRetry = async () => { for (let k = 0; ; k += 1) { try { return await clickTa(0); } catch (e) { if (k >= 3) throw e; await sleep(1500); } } };
const arriveAndWarm = async (id) => { await open(other); await sleep(1500); await goHash(id); await sleep(2500); await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500); };
