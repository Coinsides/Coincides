// ---- smoke diagnostics (Tester(1) 2026-11-10): why SM-tag / SM-image never reached their control, why SM-binding sent
// nothing. Read-only of the page except: one tag-row hover, one image click + hover, the 装订 panel opened and its
// 眉中 field typed, then form.requestSubmit() once. Build: a25_head + smoke_body lines 1-339 (ONLY=none skips the arms) + this.
const diag = {};
const visInfo = (sel) => `(()=>{const out=[];for(const e of document.querySelectorAll(${JSON.stringify(sel)})){const r=e.getBoundingClientRect();const cs=getComputedStyle(e);let p=e;const anc=[];for(let k=0;k<6&&p;k+=1,p=p.parentElement){const c=getComputedStyle(p);anc.push({tag:p.tagName,op:c.opacity,vis:c.visibility,disp:c.display,pe:c.pointerEvents,clip:c.clipPath!=='none'?c.clipPath:null,empty:p.getAttribute&&p.getAttribute('data-empty')})}out.push({x:r.left,y:r.top,w:r.width,h:r.height,op:cs.opacity,vis:cs.visibility,checkVis:e.checkVisibility?e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}):null,anc})}return out})()`;
// tag
{
  const id = await seedNote('diag tag', ['alpha beta']);
  await open(id); await sleep(3000);
  diag.tagBefore = await b.ev(visInfo('[data-note-cover-metadata="true"] button[aria-label="Add tags"]'));
  const r = (diag.tagBefore || [])[0];
  if (r) { await b.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x + r.w / 2, y: r.y + r.h / 2 }); await sleep(600); diag.tagAfterHover = await b.ev(visInfo('[data-note-cover-metadata="true"] button[aria-label="Add tags"]')); }
}
// image
{
  const id = await seedNote('diag image', ['alpha beta']);
  const png = makePng(IMG.w, IMG.h);
  const fd = new FormData(); fd.append('file', new Blob([png], { type: 'image/png' }), 'smoke.png'); fd.append('note_id', id); fd.append('width', String(IMG.w)); fd.append('height', String(IMG.h));
  const up = await fetch(`${API}/canvas-assets/images`, { method: 'POST', headers: { Authorization: auth.Authorization }, body: fd }); const upJ = await up.json().catch(() => ({}));
  const assetId = upJ.assetId || upJ.asset_id || upJ.id;
  const mk = await fetch(`${API}/notes/${id}/blocks`, { method: 'POST', headers: auth, body: JSON.stringify({ block_type: 'media', content_json: {}, plain_text: '',
    metadata: { template_id: 'media.image', system_type: 'media', learning_role: 'note', taxonomy_version: 'v2.1.1', media: { asset_id: assetId, naturalWidth: IMG.w, naturalHeight: IMG.h, alt: 'smoke.png' } } }) });
  diag.imageSeed = { up: up.status, assetId, mk: mk.status };
  const seeded = mediaOf(await blocksFull(id), assetId);
  await open(id); await sleep(4000);
  diag.imageShown = await b.ev(`(()=>{const e=document.querySelector('[data-media-block-asset="${assetId}"]');if(!e)return null;const r=e.getBoundingClientRect();return {state:e.getAttribute('data-media-block-state'),x:r.left,y:r.top,w:r.width,h:r.height}})()`);
  diag.article = await b.ev(visInfo(`article[data-block-id="${seeded ? seeded.id : 'none'}"]`));
  const a = (diag.article || [])[0];
  if (a) {
    await b.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + a.w / 2, y: a.y + Math.min(a.h, 80) / 2 }); await sleep(300);
    await b.click(a.x + a.w / 2, a.y + Math.min(a.h, 80) / 2); await sleep(1200);
    diag.afterClick = { editBtn: await b.ev(visInfo('button[aria-label="编辑图片"]')), toolbarButtons: await b.ev(`[...document.querySelectorAll('button[aria-label],button[title]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getAttribute('aria-label')||e.getAttribute('title')).slice(0,40)`), active: await b.ev(`(()=>{const e=document.activeElement;return e?e.tagName+(e.getAttribute('aria-label')?':'+e.getAttribute('aria-label'):''):null})()`) };
  }
}
// binding
{
  const id = await seedNote('diag binding', ['alpha beta']);
  await open(id); await sleep(3000); mark();
  await clickOn('[data-note-toolbar-actions="true"] button', 'the 装订 button', { text: '装订' });
  const FORM = 'form[aria-label="装订设置"]';
  diag.formOpen = !!(await waitFor(FORM, 3000));
  await clickOn('details > summary', 'the 眉中 slot (summary)', { within: FORM, startsWith: '眉中' });
  await fill('input[aria-label="眉中文案"]', '眉中文字', 'the 眉中文案 field', { within: FORM });
  diag.validity = await b.ev(`(()=>{const f=document.querySelector(${JSON.stringify(FORM)});if(!f)return null;const bad=[...f.querySelectorAll('input,select,textarea')].filter(e=>!e.checkValidity()).map(e=>({label:e.getAttribute('aria-label')||(e.closest('label')?e.closest('label').textContent.trim().slice(0,20):''),type:e.type,value:e.value,msg:e.validationMessage}));const s=[...f.querySelectorAll('button[type=submit]')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim(),x:r.left,y:r.top,w:r.width,h:r.height,disabled:e.disabled,inView:r.top>=0&&r.bottom<=innerHeight}});return {valid:f.checkValidity(),bad,submit:s}})()`);
  await b.ev(`(()=>{const f=document.querySelector(${JSON.stringify(FORM)});if(f)f.requestSubmit();return 1})()`); await sleep(2500);
  diag.afterRequestSubmit = { net: [...net], formStillOpen: !!(await b.ev(`!!document.querySelector(${JSON.stringify(FORM)})`)), alert: await b.ev(`[...document.querySelectorAll('form [role=alert]')].map(e=>e.textContent)`) };
}
fs.writeFileSync(`${OUT}/diag.json`, JSON.stringify(diag, null, 1));
console.log(JSON.stringify(diag).slice(0, 6000));
log.end(); await b.close(); process.exit(0);
