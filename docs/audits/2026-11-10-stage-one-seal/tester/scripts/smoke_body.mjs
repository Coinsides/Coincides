// ---- Stage-one seal regression: "save once from the UI" smokes (Tester(1), 2026-11-10) ----
// What: a probe BODY, concatenated after a25_head.mjs. One arm per feature group whose writes go to the server; 1 round
// each (Main_Designer ruling for the stage-one seal regression: ~10 smokes instead of 27 API round-trips).
// Build: cat a25_head.mjs smoke_body.mjs > smoke_probe.mjs
// Run (local backend only; the arms seed notes / blocks / an image through the API):
//   CREDROOT=<scratch dir> OUTDIR=<scratch dir> PRESET=a4_portrait CDPPORT=<free port, not 9615> [ONLY=SM-table,SM-tag]
//   node smoke_probe.mjs <label> <front origin> http://127.0.0.1:<port>/api local
// Each arm runs in its own fresh note (newNote; A4 portrait via PRESET). PASS = the save reached the server (read back
// through the API, polled up to ~8 s) AND a reload shows the same state on screen and on the server. A missing control or
// a step that cannot be done throws -> the row is a setup error (NOT TESTED), never ok.
// Selectors and routes are cited from the island build b734197e (client/src/pages/Notes/canvasEngine/... unless noted).
//   SM-heading   paragraph 'alpha' (API); click the end of the line; type ' /h2' + Enter (slash menu: noteSlashCommands.ts
//                :78-79 heading-2, keyword 'h2'; trigger regex :197). Pass: server = one block, unit [heading_2]'alpha'
//                (no '/h2'); a text-save / block write was sent; reload: server same, the editor shows 'alpha'.
//   SM-quote     paragraph (API); select it; 段落样式 -> 引文, source '出处甲' -> 保存样式. Pass: the placement's
//                display_overrides_json.paragraph_furniture_v1 = {variant:'quote', source:'出处甲'}, text unchanged,
//                PUT /notes/:id/block-placements/:pid sent; reload: server same, [data-paragraph-furniture=quote] shows
//                '出处甲'.
//   SM-callout   as SM-quote with 提示框, label '冷知识' -> {variant:'callout', label:'冷知识'}; reload shows '冷知识'.
//   SM-paper     笔记外观 -> 整本纸型 = a5_portrait. Pass: GET /canvas-objects/by-note/:id pageFrameCollection.paperDefault
//                .templateId = a5_portrait, every frame 637.07 x 904 (A5 at 904 px per 210 mm), text unchanged, PUT
//                .../page-frame-collection sent; reload: the select reads a5_portrait, server same.
//   SM-table     插入 -> 表格; caption '新法表', R1C1 '甲一', R1C2 '乙一'; Ctrl+Enter (button if Ctrl+Enter sent nothing).
//                Pass: one new block_type 'table' with exactly that content_json, paragraph unchanged; reload: server
//                same, the caption is on screen.
//   SM-timeline  插入 -> 时间线; title '宋初年表', entry 1 year '960' label '北宋建立'; Save timeline. Pass: one new
//                block_type 'component', component_kind 'timeline', that title and the one entry; reload: same, title on
//                screen.
//   SM-image     PNG 320x160 built here, uploaded (POST /canvas-assets/images), media block + placement made through the
//                API as pasteMediaBlock does; click the image; 编辑图片; Zoom range -> 1.5; Save. Pass: the media block's
//                metadata.media.edit_v1.zoom = 1.5, rotation 0, asset_id unchanged, PUT /note-blocks/:id sent; reload:
//                server same, the paper's SVG viewBox = the window edit_v1 describes (mediaImageEdit.ts:26-41).
//   SM-tag       cover metadata row -> Add tags -> 'smoke-tag' -> Add tag. Pass: GET /notes/:id/tags has it, POST sent;
//                reload: the chip is shown.
//   SM-binding   装订 -> 显示装订 on, 眉中 slot text '眉中文字' -> 保存装订. Pass: GET /notes/:id/binding-settings has
//                enabled true and sections[0].slots['header-center'].text = '眉中文字', PUT sent; reload: server same,
//                a page slot shows '眉中文字'.
// Never clicked: 问 Agent, anything that calls a model, Replay / View differences / Discard.
const SM_ONLY = process.env.ONLY ? process.env.ONLY.split(',').map((s) => s.trim()).filter(Boolean) : null;
const wantSM = (n) => !SM_ONLY || SM_ONLY.some((p) => n.startsWith(p));
if (!/^http:\/\/127\.0\.0\.1:\d+\/api$/.test(API)) { await b.close(); throw new Error('the smoke probe writes through the API: local backend only'); }
const { deflateSync } = await import('node:zlib');

// ---- helpers copied from a25d_body.mjs (the D body is not part of this probe) ----
const EDSD = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,h:r.height}})`;
const clickLine = async (v, where) => { const e = (await b.ev(EDSD)).find((x) => x.v === v); if (!e) return false; await b.click(e.x + 120, e.y + Math.min(e.h, 24) / 2); await sleep(300); if (where === 'start') await press('Home', 'Home', 36); else await press('End', 'End', 35); await sleep(200); return true; };
const flowD = (texts) => ({ block_type: 'paragraph', content_json: { body: texts.join(String.fromCharCode(10)), text_flow: { textflow_version: 'TextBlockContentV1',
  units: texts.map((t, k) => ({ id: `tu-${k + 1}`, text: t, writing_role: 'paragraph', indent_level: 0, order_index: k, metadata: {}, status: 'active' })),
  inline_structures: [], metadata: {} } }, order_index: 0 });
const blocksRaw = async (noteId) => { const j = await (await fetch(`${API}/notes/${noteId}/blocks`, { headers: auth })).json(); return Array.isArray(j) ? j : (j.blocks || []); };
const cjOf = (blk) => (typeof blk.content_json === 'string' ? JSON.parse(blk.content_json) : blk.content_json);
const watchToasts = () => b.ev(String.raw`(()=>{const T0=performance.now();window.__toastsSM=[];const seen=new WeakSet();const sel='[role=alert],[class*=toast],[class*=Toast]';
const take=(el)=>{if(seen.has(el))return;seen.add(el);setTimeout(()=>{const s=(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,110);if(s)window.__toastsSM.push({t:Math.round(performance.now()-T0),s})},60)};
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches&&n.matches(sel))take(n);if(n.querySelectorAll)for(const x of n.querySelectorAll(sel))take(x)}}).observe(document.body,{childList:true,subtree:true});1})()`);
const toastsNow = () => b.ev('(window.__toastsSM||[]).slice()').catch(() => null);

// ---- smoke helpers ----
const slashKey = () => key('/', 'Slash', 191, '/');
const obj = (v) => { if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } } return v && typeof v === 'object' ? v : null; };
const same = (a, w) => !!a && typeof a === 'object' && Object.keys(a).length === Object.keys(w).length && Object.keys(w).every((k) => a[k] === w[k]);
const blocksFull = async (noteId) => (await blocksRaw(noteId)).sort((a, c) => a.order_index - c.order_index)
  .map((x) => ({ id: x.id, placement_id: x.placement_id, type: x.block_type, order: x.order_index, cj: cjOf(x) || {}, overrides: obj(x.display_overrides_json) || {}, meta: obj(x.metadata) || {} }));
const unitsOfBlock = (blk) => (blk?.cj?.text_flow?.units || []).filter((u) => u.status !== 'deleted').map((u) => `${u.writing_role && u.writing_role !== 'paragraph' ? `[${u.writing_role}]` : ''}${u.text}`);
const seedNote = async (title, texts) => {
  const id = await newNote(title);
  if (texts) { const r = await fetch(`${API}/notes/${id}/blocks`, { method: 'POST', headers: auth, body: JSON.stringify(flowD(texts)) }); if (!r.ok) throw new Error(`setup: paragraph block ${r.status}`); }
  return id;
};
const sent = (re) => net.filter((l) => re.test(l));
// Poll fn() until it returns {ok:true} or ms elapse; the last reading is returned either way (with waited ms).
const until = async (fn, ms = 8000) => { const t = Date.now(); let last = null; for (;;) { try { last = await fn(); } catch (e) { last = { ok: false, error: String(e).slice(0, 200) }; } if (last?.ok) return { ...last, waited: Date.now() - t }; if (Date.now() - t >= ms) return { ...(last || { ok: false }), waited: Date.now() - t }; await sleep(400); } };
// Page side: the first VISIBLE element matching sel (optionally inside a visible `within`, with exact / prefix text).
const PV = 'const vis=(e)=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(!e.checkVisibility||e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))};';
const FIND = (sel, opts = {}) => `(()=>{${PV}const scopes=${opts.within ? `[...document.querySelectorAll(${JSON.stringify(opts.within)})].filter(vis)` : '[document]'};for(const s of scopes)for(const e of s.querySelectorAll(${JSON.stringify(sel)}))if(vis(e)${opts.text == null ? '' : `&&(e.textContent||'').trim()===${JSON.stringify(opts.text)}`}${opts.startsWith == null ? '' : `&&(e.textContent||'').trim().startsWith(${JSON.stringify(opts.startsWith)})`})return e;return null})()`;
const locate = (sel, opts = {}) => b.ev(`(()=>{const e=${FIND(sel, opts)};if(!e)return null;let r=e.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth){e.scrollIntoView({block:'center',inline:'center'});r=e.getBoundingClientRect()}return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,disabled:!!e.disabled,value:('value' in e)?e.value:null,checked:('checked' in e)?e.checked:null,title:e.getAttribute('title'),text:(e.textContent||'').trim().slice(0,80)}})()`);
const waitFor = async (sel, ms = 5000, opts = {}) => { const t = Date.now(); for (;;) { const at = await locate(sel, opts).catch(() => null); if (at && (!opts.enabled || !at.disabled)) return at; if (Date.now() - t > ms) return at || null; await sleep(200); } };
const clickOn = async (sel, what, opts = {}) => {
  const at = await waitFor(sel, opts.ms ?? 5000, { ...opts, enabled: true });
  if (!at) throw new Error(`setup: no ${what} (${sel}${opts.within ? ` in ${opts.within}` : ''}${opts.text ? ` text=${opts.text}` : ''})`);
  if (at.disabled) throw new Error(`setup: ${what} is disabled${at.title ? ` (${at.title})` : ''}`);
  await b.click(at.x, at.y); await sleep(opts.after ?? 300); return at;
};
// Real typing: click the field, select its content, Input.insertText; the read-back must equal the text or it is a setup error.
const fill = async (sel, text, what, opts = {}) => {
  const at = await waitFor(sel, opts.ms ?? 5000, { ...opts, enabled: true });
  if (!at) throw new Error(`setup: no ${what} (${sel})`);
  if (at.disabled) throw new Error(`setup: ${what} is disabled`);
  await b.click(at.x, at.y); await sleep(150);
  const focused = await b.ev(`(()=>{const e=${FIND(sel, opts)};if(!e)return false;e.focus();if(typeof e.select==='function')e.select();return document.activeElement===e})()`);
  if (!focused) throw new Error(`setup: ${what} did not take focus`);
  await ins(text); await sleep(250);
  const v = await b.ev(`(()=>{const e=${FIND(sel, opts)};return e?e.value:null})()`);
  if (v !== text) throw new Error(`setup: ${what} reads ${JSON.stringify(v)} after typing ${JSON.stringify(text)}`);
  return v;
};
// Native <select>: the value setter + a bubbling change event (React's onChange for select listens to change).
const setSelect = async (sel, value, what, opts = {}) => {
  const r = await b.ev(`(()=>{const e=${FIND(sel, opts)};if(!e)return {missing:true};const options=[...e.options].map(o=>o.value);if(e.disabled)return {disabled:true,value:e.value,options};if(!options.includes(${JSON.stringify(value)}))return {noOption:true,value:e.value,options};const before=e.value;Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));return {before,after:e.value,options}})()`);
  if (r.missing) throw new Error(`setup: no ${what} (${sel})`);
  if (r.disabled) throw new Error(`setup: ${what} is disabled (value ${r.value})`);
  if (r.noOption) throw new Error(`setup: ${what} has no option ${value} (options ${JSON.stringify(r.options)})`);
  return r;
};
const SLASHMENU = String.raw`[...document.querySelectorAll('[class*=slashMenu]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,160))`;
// Every fragment of one block on paper (article[data-block-id], BlockEditorLayer.tsx:486), its visible text.
const blockText = (blockId) => b.ev(String.raw`[...document.querySelectorAll(${JSON.stringify(`article[data-block-id="${blockId}"]`)})].map(e=>(e.innerText||'').replace(/\s+/g,' ').trim()).join(' | ').slice(0,300)`).catch(() => null);
const allOk = (check) => Object.values(check).every(Boolean);

// ---- SM-heading: slash command /h2 converts the line to a second-level heading ----
if (wantSM('SM-heading')) await scenario('SM-heading', async () => {
  const id = await seedNote('A25 SM heading', ['alpha']);
  const before = await blocksFull(id); if (before.length !== 1) throw new Error(`setup: expected 1 block, got ${before.length}`);
  await open(id); await sleep(2500); await watchToasts();
  mark();
  if (!(await clickLine('alpha'))) throw new Error('setup: no editor line "alpha" to click');
  // detectSlashTrigger (noteSlashCommands.ts:197) needs a space or line start before '/'.
  await typeText(' ', 90); await slashKey(); await sleep(120); await keysAt('h2', 90); await sleep(700);
  const menu = await b.ev(SLASHMENU).catch(() => null);
  const typed = (await b.ev(EDSD)).map((x) => x.v);
  await enter(); await sleep(1500);
  const afterEnter = (await b.ev(EDSD)).map((x) => x.v);
  const expectUnits = ['[heading_2]alpha'];
  const srv = await until(async () => { const bl = await blocksFull(id); const units = bl.flatMap(unitsOfBlock); return { ok: bl.length === 1 && eq(units, expectUnits), count: bl.length, units }; });
  const reqs = sent(/^\d+ (PUT|POST|PATCH) \/(note-blocks|notes)\//);
  const toasts = await toastsNow();
  await open(id); await sleep(3000);
  const bl2 = await blocksFull(id); const units2 = bl2.flatMap(unitsOfBlock);
  const st = await state().catch(() => null);
  const eds2 = (await b.ev(EDSD)).map((x) => x.v);
  await shot('SM-heading');
  const check = {
    saved: srv.ok,
    request: reqs.length > 0,
    reloadServer: bl2.length === 1 && eq(units2, expectUnits),
    reloadScreen: (eds2.includes('alpha') || (st?.chapters || []).includes('alpha')) && !eds2.some((v) => v.includes('/h2')),
  };
  row('SM-heading', id, { menu, typed, afterEnter, server: srv, reqs, toasts, reload: { count: bl2.length, units: units2, eds: eds2, chapters: st?.chapters ?? null }, check }, allOk(check));
});

// ---- SM-quote / SM-callout: paragraph style through the block control bar ----
// Control bar: BlockControlBarLayer.tsx:106 renders paragraphStyleControl (BlockEditorLayer.tsx:559-560, shown while the
// block is active). ParagraphFurnitureEditor.tsx:11 button[aria-label=段落样式]; :35 the editor [role=dialog][aria-label=
// 段落样式]; :40-41 select[aria-label=段落样式] (plain/quote/callout); :43 textarea[aria-label=引文出处]; :44 input[aria-label=
// 提示标签]; :46 button 保存样式. Save = PUT /notes/:id/block-placements/:pid {display_overrides_json} (useNoteCanvasDataAdapter
// .ts:1894). On paper: ParagraphFurnitureDecoration.tsx:11 [data-paragraph-furniture], :14-17 stamp 引 / label / source.
const furnitureArm = (name, variant, fieldSel, fieldWhat, text, expectF) => async () => {
  const id = await seedNote(`A25 ${name}`, ['alpha beta']);
  await open(id); await sleep(2500); await watchToasts();
  mark();
  if (!(await clickLine('alpha beta'))) throw new Error('setup: no editor line "alpha beta" to click');
  await sleep(400);
  await clickOn('button[aria-label="段落样式"]', 'the 段落样式 button in the block control bar');
  const dlg = '[role="dialog"][aria-label="段落样式"]';
  if (!(await waitFor(dlg, 3000))) throw new Error('setup: the 段落样式 editor did not open');
  const picked = await setSelect('select[aria-label="段落样式"]', variant, 'the 段落样式 select', { within: dlg });
  await sleep(300);
  await fill(fieldSel, text, fieldWhat, { within: dlg });
  await clickOn('button', 'the 保存样式 button', { within: dlg, text: '保存样式' });
  const srv = await until(async () => { const bl = await blocksFull(id); const f = bl[0]?.overrides?.paragraph_furniture_v1 ?? null; const units = unitsOfBlock(bl[0]);
    return { ok: bl.length === 1 && same(f, expectF) && eq(units, ['alpha beta']), furniture: f, units, count: bl.length }; });
  const editorClosed = !(await locate(dlg).catch(() => null));
  const reqs = sent(/^\d+ PUT \/notes\/[^/\s]+\/block-placements\//);
  const toasts = await toastsNow();
  await open(id); await sleep(3000);
  const bl2 = await blocksFull(id); const f2 = bl2[0]?.overrides?.paragraph_furniture_v1 ?? null;
  const dom = await until(async () => { const list = await b.ev(String.raw`[...document.querySelectorAll('[data-paragraph-furniture]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({variant:e.dataset.paragraphFurniture,text:(e.innerText||e.textContent||'').replace(/\s+/g,' ').trim().slice(0,120)}))`);
    return { ok: list.some((x) => x.variant === variant && x.text.includes(text)), list }; }, 6000);
  const eds2 = (await b.ev(EDSD)).map((x) => x.v);
  await shot(name);
  const check = {
    saved: srv.ok,
    request: reqs.length > 0,
    reloadServer: bl2.length === 1 && same(f2, expectF) && eq(unitsOfBlock(bl2[0]), ['alpha beta']),
    reloadScreen: dom.ok && eds2.includes('alpha beta'),
  };
  row(name, id, { picked, server: srv, editorClosed, reqs, toasts, reload: { furniture: f2, units: unitsOfBlock(bl2[0]), dom: dom.list, eds: eds2 }, check }, allOk(check));
};
if (wantSM('SM-quote')) await scenario('SM-quote', furnitureArm('SM-quote', 'quote', 'textarea[aria-label="引文出处"]', 'the 引文出处 field', '出处甲', { variant: 'quote', source: '出处甲' }));
if (wantSM('SM-callout')) await scenario('SM-callout', furnitureArm('SM-callout', 'callout', 'input[aria-label="提示标签"]', 'the 提示标签 field', '冷知识', { variant: 'callout', label: '冷知识' }));

// ---- SM-paper: whole-note paper preset A5 portrait ----
// NoteChromeLayer.tsx:450 button[aria-label=笔记外观] (bottom toolbar, NoteWritingSurfaceLayer.tsx:2151 noteTools);
// SkinFloatCard.tsx:168 [data-skin-float-card], :193 展开外观浮卡 (when collapsed); PaperSizeControls.tsx:111
// select[aria-label=整本纸型], :119 readout [aria-label=笔记默认尺寸]. Value a5_portrait: pageFrameTemplateService.ts:93.
// The select is disabled unless usePaperSize is enabled (useNoteCanvasRuntimeController.ts:266-268: coordinate contract
// v2, page surface). Save = PUT /canvas-objects/by-note/:id/page-frame-collection (canvasObjectRepository.ts:155-156);
// read = GET /canvas-objects/by-note/:id (canvasObjectRepository.ts:98), paperDefault kept by the server
// (server canvasObjects.ts:1587-1588). A5 geometry: 148 / 210 mm at 904 px per 210 mm (pageFramePrintScaleService.ts:37-44,
// A4 width 904 in shared/types/pageGeometry.ts) -> 637.07 x 904.
const A5 = { w: 148 * 904 / 210, h: 904 };
const collectionOf = async (noteId) => {
  const j = await (await fetch(`${API}/canvas-objects/by-note/${noteId}`, { headers: auth })).json();
  const c = j?.pageFrameCollection; if (!c) return null;
  return { paperDefault: c.paperDefault ?? null, primaryFrameId: c.primaryFrameId ?? null,
    frames: (c.pageFrames || []).map((f) => ({ id: f.id, templateId: f.templateId, pageSize: f.pageSize, width: f.width, height: f.height })) };
};
const isA5 = (c) => !!c && c.paperDefault?.templateId === 'a5_portrait' && c.frames.length > 0
  && c.frames.every((f) => Math.abs(f.width - A5.w) < 1 && Math.abs(f.height - A5.h) < 1);
// Opens the card only when it is not already open (the button toggles it); waits up to 8 s for the select to be enabled
// (it is disabled while the note loads or paper.busy); returns the last reading, disabled or not, or null.
const openAppearance = async () => {
  if (!(await locate('[data-skin-float-card]').catch(() => null))) { await clickOn('button[aria-label="笔记外观"]', 'the 笔记外观 button'); await sleep(800); }
  const expand = await locate('button[aria-label="展开外观浮卡"]').catch(() => null);
  if (expand) { await b.click(expand.x, expand.y); await sleep(500); }
  return waitFor('select[aria-label="整本纸型"]', 8000, { enabled: true });
};
if (wantSM('SM-paper')) await scenario('SM-paper', async () => {
  const id = await seedNote('A25 SM paper', ['alpha beta']);
  const contract = await (await fetch(`${API}/canvas-objects/coordinate-contract`, { headers: auth })).json().catch(() => null);
  const coll0 = await collectionOf(id);
  await open(id); await sleep(2500); await watchToasts();
  mark();
  const sel0 = await openAppearance();
  if (!sel0) throw new Error('setup: no 整本纸型 select in the 笔记外观 card');
  if (sel0.disabled) throw new Error(`setup: the 整本纸型 select is disabled (paper editing off; coordinate contract ${JSON.stringify(contract)})`);
  const picked = await setSelect('select[aria-label="整本纸型"]', 'a5_portrait', 'the 整本纸型 select');
  const srv = await until(async () => { const c = await collectionOf(id); const units = (await blocksFull(id)).flatMap(unitsOfBlock);
    return { ok: isA5(c) && eq(units, ['alpha beta']), collection: c, units }; });
  const reqs = sent(/^\d+ PUT \/canvas-objects\/by-note\/[^/\s]+\/page-frame-collection/);
  const toasts = await toastsNow();
  const alerts = await b.ev(`[...document.querySelectorAll('[data-paper-size-controls] [role=alert]')].map(e=>e.textContent)`).catch(() => null);
  await open(id); await sleep(3000);
  const c2 = await collectionOf(id); const units2 = (await blocksFull(id)).flatMap(unitsOfBlock);
  const sel2 = await openAppearance();
  const readout = await b.ev(`(()=>{const e=document.querySelector('[aria-label="笔记默认尺寸"]');return e?e.textContent:null})()`).catch(() => null);
  await shot('SM-paper');
  const check = {
    saved: srv.ok,
    request: reqs.length > 0,
    reloadServer: isA5(c2) && eq(units2, ['alpha beta']),
    reloadScreen: !!sel2 && sel2.value === 'a5_portrait',
  };
  row('SM-paper', id, { contract, before: coll0, picked, server: srv, reqs, toasts, alerts, reload: { collection: c2, units: units2, select: sel2?.value ?? null, readout }, expectA5: A5, check }, allOk(check));
});

// ---- SM-table / SM-timeline: insert menu -> editor dialog -> one new block ----
// NoteInsertMenu.tsx:44 button[aria-label=插入]; :69 [data-note-insert-command] (ids noteSlashCommands.ts:37 insert-table,
// :38 insert-timeline). TableBlockEditor.tsx:119 [role=dialog][aria-modal=true]; :127 textarea[aria-label="Table caption"];
// :152 textarea[aria-label="Row r, column c"]; :51 Ctrl+Enter saves; :170-171 'Save table'. Default payload: headers
// [Column 1, Column 2], rows 2x2 empty (tableBlockService.ts:46-47). ComponentBlockEditor.tsx:89 dialog; :97 textarea[aria-label=
// "Timeline title"]; :112 input[aria-label="Entry 1 year"]; :114 textarea[aria-label="Entry 1 label"]; :169-170 'Save
// timeline'. Create = POST /notes/:id/blocks (useNoteCanvasRuntimeController.ts:707-726 -> useNoteCanvasDataAdapter.ts:1545).
const MODAL = '[role="dialog"][aria-modal="true"]';
const insertVia = async (commandId, label) => {
  await clickOn('button[aria-label="插入"]', 'the 插入 button in the bottom toolbar');
  const item = await waitFor(`[data-note-insert-command="${commandId}"]`, 3000);
  if (!item) throw new Error(`setup: no ${label} item in the insert menu`);
  if (item.disabled) throw new Error(`setup: ${label} is disabled in the insert menu (${item.title})`);
  await b.click(item.x, item.y); await sleep(700);
  if (!(await waitFor(MODAL, 4000))) throw new Error(`setup: the ${label} editor did not open`);
};
if (wantSM('SM-table')) await scenario('SM-table', async () => {
  const id = await seedNote('A25 SM table', ['alpha beta']);
  await open(id); await sleep(2500); await watchToasts();
  mark();
  await insertVia('insert-table', '表格');
  await fill('textarea[aria-label="Table caption"]', '新法表', 'the table caption', { within: MODAL });
  await fill('textarea[aria-label="Row 1, column 1"]', '甲一', 'cell row 1 column 1', { within: MODAL });
  await fill('textarea[aria-label="Row 1, column 2"]', '乙一', 'cell row 1 column 2', { within: MODAL });
  const createRe = /^\d+ POST \/notes\/[^/\s]+\/blocks/;
  let saveVia = 'ctrl+enter';
  await press('Enter', 'Enter', 13, 2);
  for (let k = 0; k < 30 && !sent(createRe).length; k += 1) await sleep(100);
  if (!sent(createRe).length) { saveVia = 'Save table button (Ctrl+Enter sent no create within 3 s)'; await clickOn('button', 'the Save table button', { within: MODAL, text: 'Save table' }); }
  const expectT = { caption: '新法表', headers: ['Column 1', 'Column 2'], rows: [['甲一', '乙一'], ['', '']] };
  const tableSame = (cj) => !!cj && cj.caption === expectT.caption && eq(cj.headers, expectT.headers) && eq(cj.rows, expectT.rows);
  const readT = async () => { const bl = await blocksFull(id); const t = bl.filter((x) => x.type === 'table'); const p = bl.filter((x) => x.type === 'paragraph');
    return { ok: bl.length === 2 && t.length === 1 && tableSame(t[0].cj) && p.length === 1 && eq(unitsOfBlock(p[0]), ['alpha beta']), count: bl.length, tables: t.map((x) => ({ id: x.id, cj: x.cj })), paragraph: p.map(unitsOfBlock) }; };
  const srv = await until(readT);
  const dialogClosed = !(await locate(MODAL).catch(() => null));
  const reqs = sent(/^\d+ (POST|PUT) /).filter((l) => /\/blocks|block-placements/.test(l));
  const toasts = await toastsNow();
  await open(id); await sleep(3000);
  const r2 = await readT();
  const tableId = r2.tables[0]?.id ?? srv.tables?.[0]?.id ?? null;
  const dom = await until(async () => { const t = tableId ? await blockText(tableId) : null; return { ok: !!t && t.includes('新法表'), text: t }; }, 6000);
  await shot('SM-table');
  const check = { saved: srv.ok, request: sent(createRe).length > 0, reloadServer: r2.ok, reloadScreen: dom.ok };
  row('SM-table', id, { saveVia, server: srv, dialogClosed, reqs, toasts, reload: { server: r2, dom: dom.text }, check }, allOk(check));
});
if (wantSM('SM-timeline')) await scenario('SM-timeline', async () => {
  const id = await seedNote('A25 SM timeline', ['alpha beta']);
  await open(id); await sleep(2500); await watchToasts();
  mark();
  await insertVia('insert-timeline', '时间线');
  await fill('textarea[aria-label="Timeline title"]', '宋初年表', 'the timeline title', { within: MODAL });
  await fill('input[aria-label="Entry 1 year"]', '960', 'entry 1 year', { within: MODAL });
  await fill('textarea[aria-label="Entry 1 label"]', '北宋建立', 'entry 1 label', { within: MODAL });
  await clickOn('button', 'the Save timeline button', { within: MODAL, text: 'Save timeline' });
  const tlSame = (cj) => !!cj && cj.component_kind === 'timeline' && cj.params?.title === '宋初年表' && Array.isArray(cj.params?.entries)
    && cj.params.entries.length === 1 && cj.params.entries[0].year === '960' && cj.params.entries[0].label === '北宋建立';
  const readC = async () => { const bl = await blocksFull(id); const c = bl.filter((x) => x.type === 'component'); const p = bl.filter((x) => x.type === 'paragraph');
    return { ok: bl.length === 2 && c.length === 1 && tlSame(c[0].cj) && p.length === 1 && eq(unitsOfBlock(p[0]), ['alpha beta']), count: bl.length, components: c.map((x) => ({ id: x.id, cj: x.cj })), paragraph: p.map(unitsOfBlock) }; };
  const srv = await until(readC);
  const dialogClosed = !(await locate(MODAL).catch(() => null));
  const createRe = /^\d+ POST \/notes\/[^/\s]+\/blocks/;
  const reqs = sent(/^\d+ (POST|PUT) /).filter((l) => /\/blocks|block-placements/.test(l));
  const toasts = await toastsNow();
  await open(id); await sleep(3000);
  const r2 = await readC();
  const compId = r2.components[0]?.id ?? srv.components?.[0]?.id ?? null;
  const dom = await until(async () => { const t = compId ? await blockText(compId) : null; return { ok: !!t && t.includes('宋初年表'), text: t }; }, 6000);
  await shot('SM-timeline');
  const check = { saved: srv.ok, request: sent(createRe).length > 0, reloadServer: r2.ok, reloadScreen: dom.ok };
  row('SM-timeline', id, { server: srv, dialogClosed, reqs, toasts, reload: { server: r2, dom: dom.text }, check }, allOk(check));
});

// ---- SM-image: media block (seeded through the API) -> 编辑图片 -> Zoom 1.5 -> Save ----
// Seed as pasteMediaBlock does (mediaBlockPasteService.ts:77-88): upload POST /canvas-assets/images multipart file +
// note_id + width + height (canvasAssetRepository.ts:61-71; server routes/canvasAssets.ts:37, png allowed); create
// POST /notes/:id/blocks block_type media, content_json {}, metadata = template metadata (shared/types/index.ts:641-651,
// 740-748: template_id media.image, system_type media, learning_role note, taxonomy_version v2.1.1) + media {asset_id,
// naturalWidth, naturalHeight, alt} (server validators/index.ts:759-764); placement PUT /canvas-objects/by-note/:id/
// block-placements/:pid {block_id, layout} as buildLayoutPayload writes a frame-local formal_page box (placementService.ts:
// 692-707; mediaLayoutAfterBlock width = min(natural width, 760)). UI: the block = article[data-block-id] (BlockEditorLayer.tsx
// :486; mousedown selects it, :457-462); BlockControlBarLayer.tsx:107-110 button[aria-label=编辑图片]; MediaImageEditor.tsx:170
// dialog, :213 input[type=range] (Zoom, enabled once the image loaded), :216 output %, :227 'Save'. Save = PUT
// /note-blocks/:id {metadata} with media.edit_v1 (useNoteCanvasDataAdapter.ts:1918-1926). On paper (MediaBlockProjection.tsx
// :22-26): svg[data-media-block-asset] viewBox = the crop window (mediaImageEdit.ts:12-19, 26-41).
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const pngChunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
// RGB, 8 bit, no interlace; left half warm, right half cool (so a crop is visible on a screenshot).
const makePng = (w, h) => {
  const stride = w * 3 + 1; const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y += 1) { raw[y * stride] = 0; for (let x = 0; x < w; x += 1) { const p = y * stride + 1 + x * 3; const l = x < w / 2; raw[p] = l ? 200 : 40; raw[p + 1] = l ? 60 : 90; raw[p + 2] = l ? 40 : 210; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
};
const IMG = { w: 320, h: 160 };
// The window edit_v1 describes, in image pixels (rotation 0). crop null + zoom = a centred 1/zoom window (approximation of
// coverPositionToCrop at position 0,0 with the image's own aspect; tolerance widened for that case).
const expectWindow = (edit) => {
  if (!edit) return null;
  if (edit.crop) return { approx: false, box: [edit.crop.x * IMG.w / 100, edit.crop.y * IMG.h / 100, edit.crop.w * IMG.w / 100, edit.crop.h * IMG.h / 100] };
  if (edit.zoom != null) { const s = 100 / edit.zoom; const o = (100 - s) / 2; return { approx: true, box: [o * IMG.w / 100, o * IMG.h / 100, s * IMG.w / 100, s * IMG.h / 100] }; }
  return null;
};
const mediaOf = (bl, assetId) => bl.find((x) => x.type === 'media' && x.meta?.media?.asset_id === assetId) || null;
if (wantSM('SM-image')) await scenario('SM-image', async () => {
  const id = await seedNote('A25 SM image', ['alpha beta']);
  const png = makePng(IMG.w, IMG.h);
  const fd = new FormData();
  fd.append('file', new Blob([png], { type: 'image/png' }), 'smoke.png'); fd.append('note_id', id); fd.append('width', String(IMG.w)); fd.append('height', String(IMG.h));
  const up = await fetch(`${API}/canvas-assets/images`, { method: 'POST', headers: { Authorization: auth.Authorization }, body: fd });
  const upJ = await up.json().catch(() => ({}));
  const assetId = upJ.assetId || upJ.asset_id || upJ.id;
  if (!up.ok || !assetId) throw new Error(`setup: image upload ${up.status} ${JSON.stringify(upJ).slice(0, 160)}`);
  const mk = await fetch(`${API}/notes/${id}/blocks`, { method: 'POST', headers: auth, body: JSON.stringify({ block_type: 'media', content_json: {}, plain_text: '',
    metadata: { template_id: 'media.image', system_type: 'media', learning_role: 'note', taxonomy_version: 'v2.1.1', media: { asset_id: assetId, naturalWidth: IMG.w, naturalHeight: IMG.h, alt: 'smoke.png' } } }) });
  const mkJ = await mk.json().catch(() => ({}));
  if (!mk.ok) throw new Error(`setup: media block ${mk.status} ${JSON.stringify(mkJ).slice(0, 160)}`);
  const seeded = mediaOf(await blocksFull(id), assetId);
  if (!seeded) throw new Error('setup: the media block is not on the server after the create');
  const coll = await collectionOf(id);
  const frameId = coll?.primaryFrameId || coll?.frames?.[0]?.id || null;
  let placement = { status: 'skipped (no page frame)' };
  if (frameId && seeded.placement_id) {
    const pr = await fetch(`${API}/canvas-objects/by-note/${id}/block-placements/${seeded.placement_id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ block_id: seeded.id,
      layout: { x: 0, y: 120, width: IMG.w, height: IMG.h, surface: 'formal_page', boundary_role: 'inside', version: 'V2.BN.8', coordinate_space: 'page_frame_local', frame_id: frameId, export_role: 'included', width_mode: 'manual' } }) });
    placement = { status: pr.status, body: pr.ok ? null : (await pr.text().catch(() => '')).slice(0, 200) };
  }
  await open(id); await sleep(2500);
  const shown = await waitFor(`[data-media-block-asset="${assetId}"][data-media-block-state="loaded"]`, 12000);
  if (!shown) throw new Error(`setup: the image did not load on the paper (placement ${JSON.stringify(placement)})`);
  await watchToasts();
  mark();
  await clickOn(`article[data-block-id="${seeded.id}"]`, 'the image block');
  await clickOn('button[aria-label="编辑图片"]', 'the 编辑图片 button in the block control bar', { ms: 4000 });
  const range = await waitFor('input[type="range"]', 12000, { within: MODAL, enabled: true });
  if (!range) throw new Error('setup: no Zoom range in the image editor');
  if (range.disabled) throw new Error('setup: the Zoom range stayed disabled (image not loaded in the editor)');
  const zoomSet = await b.ev(`(()=>{const e=${FIND('input[type="range"]', { within: MODAL })};if(!e)return null;const before=e.value;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'1.5');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return {before,after:e.value}})()`);
  await sleep(700);
  const zoomShown = await b.ev(`(()=>{const d=${FIND(MODAL)};const o=d&&d.querySelector('output');const r=d&&d.querySelector('input[type="range"]');return {output:o?o.textContent:null,value:r?r.value:null}})()`);
  if (zoomShown?.value !== '1.5') throw new Error(`setup: the Zoom range did not take 1.5 (${JSON.stringify(zoomShown)})`);
  await clickOn('button', 'the Save button of the image editor', { within: MODAL, text: 'Save' });
  const zoomOk = (e) => !!e && typeof e.zoom === 'number' && Math.abs(e.zoom - 1.5) < 0.011 && e.rotation === 0;
  const srv = await until(async () => { const m = mediaOf(await blocksFull(id), assetId); const e = m?.meta?.media?.edit_v1 ?? null;
    return { ok: !!m && m.id === seeded.id && zoomOk(e), blockId: m?.id ?? null, edit: e }; });
  const editorClosed = !(await locate(MODAL).catch(() => null));
  const reqs = sent(/^\d+ PUT \/note-blocks\/[^/\s]+$/);
  const toasts = await toastsNow();
  await open(id); await sleep(3000);
  const m2 = mediaOf(await blocksFull(id), assetId); const e2 = m2?.meta?.media?.edit_v1 ?? null;
  const svg = await until(async () => { const v = await b.ev(`(()=>{const e=document.querySelector('svg[data-media-block-asset="${assetId}"]');return e?{viewBox:e.getAttribute('viewBox'),rotation:e.getAttribute('data-media-image-rotation')}:null})()`); return { ok: !!v, ...(v || {}) }; }, 10000);
  const win = expectWindow(e2);
  const got = svg.viewBox ? svg.viewBox.trim().split(/[\s,]+/).map(Number) : null;
  const tol = win?.approx ? 1 : 0.05;
  const viewBoxOk = !!win && !!got && got.length === 4 && got.every((v, k) => Math.abs(v - win.box[k]) <= tol);
  await shot('SM-image');
  const check = {
    saved: srv.ok,
    request: reqs.length > 0,
    reloadServer: !!m2 && m2.id === seeded.id && zoomOk(e2) && JSON.stringify(e2) === JSON.stringify(srv.edit),
    reloadScreen: svg.ok && viewBoxOk,
  };
  // info only: whether the saved crop window matches the zoom (1/zoom of each side), not part of the gate.
  const cropMatchesZoom = e2?.crop ? Math.abs(e2.crop.w - 100 / e2.zoom) < 2 && Math.abs(e2.crop.h - 100 / e2.zoom) < 2 : null;
  row('SM-image', id, { assetId, mediaBlock: seeded.id, placement, zoomSet, zoomShown, server: srv, editorClosed, reqs, toasts,
    reload: { edit: e2, svg, expectWindow: win, viewBox: got }, info: { cropMatchesZoom }, check }, allOk(check));
});

// ---- SM-tag: note tag through the cover metadata row ----
// NoteCoverMetadata.tsx:136 [data-note-cover-metadata=true]; :153 button[aria-label="Add tags"]; :164-165 popup
// [data-note-cover-popup=true]; :169-170 input placeholder "Tag name"; :171 submit 'Add tag'; :142-151 chips under
// [aria-label="Note tags"]. Routes: GET / POST /notes/:id/tags (noteMetadataRepository.ts:39, 42).
const tagsOf = async (noteId) => { const j = await (await fetch(`${API}/notes/${noteId}/tags`, { headers: auth })).json(); return (j?.tags || []).map((t) => t.label); };
if (wantSM('SM-tag')) await scenario('SM-tag', async () => {
  const id = await seedNote('A25 SM tag', ['alpha beta']);
  const before = await tagsOf(id);
  await open(id); await sleep(2500); await watchToasts();
  mark();
  // 11-10 diagnostic: with no tags and no references the row is data-empty and the button sits at opacity 0 until the
  // pointer is over it (checkVisibility false, so the visible-only finder skipped it). A person hovers first: so do we.
  const tagBtn = await b.ev(`(()=>{const e=document.querySelector('[data-note-cover-metadata="true"] button[aria-label="Add tags"]');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (!tagBtn) throw new Error('setup: no Add tags button in the DOM');
  await b.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tagBtn.x, y: tagBtn.y }); await sleep(600);
  await clickOn('[data-note-cover-metadata="true"] button[aria-label="Add tags"]', 'the Add tags button on the note cover (after hover)');
  const POP = '[data-note-cover-popup="true"]';
  if (!(await waitFor(POP, 3000))) throw new Error('setup: the note metadata popup did not open');
  await fill('input[placeholder="Tag name"]', 'smoke-tag', 'the tag name field', { within: POP });
  await clickOn('button[type="submit"]', 'the Add tag button', { within: POP, text: 'Add tag' });
  const srv = await until(async () => { const tags = await tagsOf(id); return { ok: tags.filter((t) => t === 'smoke-tag').length === 1, tags }; });
  const reqs = sent(/^\d+ POST \/notes\/[^/\s]+\/tags/);
  const toasts = await toastsNow();
  await open(id); await sleep(3000);
  const tags2 = await tagsOf(id);
  const dom = await until(async () => { const t = await b.ev(`(()=>{const e=document.querySelector('[data-note-cover-metadata="true"] [aria-label="Note tags"]');return e?e.textContent:null})()`); return { ok: !!t && t.includes('smoke-tag'), text: t }; }, 8000);
  await shot('SM-tag');
  const check = { saved: srv.ok, request: reqs.length > 0, reloadServer: tags2.filter((t) => t === 'smoke-tag').length === 1, reloadScreen: dom.ok };
  row('SM-tag', id, { before, server: srv, reqs, toasts, reload: { tags: tags2, dom: dom.text }, check }, allOk(check));
});

// ---- SM-binding: 装订 panel, header-centre slot text ----
// NoteChromeLayer.tsx:414 [data-note-toolbar-actions=true], :457-459 the 装订 button (text only, no aria-label);
// NoteBindingPanel.tsx:44 form[aria-label=装订设置]; :76 checkbox labelled 显示装订; :101-102 <details> summary 眉中 +
// input[aria-label=眉中文案]; :117 submit 保存装订. Routes: GET /notes/:id/binding-settings (useNoteBinding.ts:19),
// PUT (useNoteCanvasDataAdapter.ts:1025). On paper: PageFrameSlotsLayer.tsx:24-28 [data-page-frame-slot].
const bindingOf = async (noteId) => (await (await fetch(`${API}/notes/${noteId}/binding-settings`, { headers: auth })).json())?.binding_settings ?? null;
const bindingOk = (bs) => !!bs && bs.enabled === true && bs.sections?.[0]?.slots?.['header-center']?.text === '眉中文字';
if (wantSM('SM-binding')) await scenario('SM-binding', async () => {
  const id = await seedNote('A25 SM binding', ['alpha beta']);
  const before = await bindingOf(id);
  await open(id); await sleep(2500); await watchToasts();
  mark();
  await clickOn('[data-note-toolbar-actions="true"] button', 'the 装订 button', { text: '装订' });
  const FORM = 'form[aria-label="装订设置"]';
  if (!(await waitFor(FORM, 3000))) throw new Error('setup: the 装订 panel did not open');
  const toggle = await b.ev(`(()=>{const f=${FIND(FORM)};if(!f)return null;const l=[...f.querySelectorAll('label')].find(x=>(x.textContent||'').trim()==='显示装订');const i=l&&l.querySelector('input[type="checkbox"]');if(!i)return null;const r=i.getBoundingClientRect();return {checked:i.checked,x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (!toggle) throw new Error('setup: no 显示装订 checkbox in the 装订 panel');
  if (!toggle.checked) { await b.click(toggle.x, toggle.y); await sleep(300); }
  const toggled = await b.ev(`(()=>{const f=${FIND(FORM)};const l=f&&[...f.querySelectorAll('label')].find(x=>(x.textContent||'').trim()==='显示装订');const i=l&&l.querySelector('input[type="checkbox"]');return i?i.checked:null})()`);
  if (toggled !== true) throw new Error(`setup: 显示装订 is not on after the click (${toggled})`);
  await clickOn('details > summary', 'the 眉中 slot (summary)', { within: FORM, startsWith: '眉中' });
  await fill('input[aria-label="眉中文案"]', '眉中文字', 'the 眉中文案 field', { within: FORM });
  // 11-10 diagnostic: the form was valid and requestSubmit() sent the PUT, but the first run's click sent nothing (the
  // button sits next to the bottom toolbar). Click it only if it is what is under the point; otherwise press Enter in the
  // 眉中 field (implicit submission, a person's other way to save). saveVia records which.
  const sub = await b.ev(`(()=>{const f=document.querySelector('form[aria-label="装订设置"]');const s=f&&[...f.querySelectorAll('button[type=submit]')].find(e=>e.textContent.trim()==='保存装订');if(!s)return null;s.scrollIntoView({block:'center'});const r=s.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const hit=document.elementFromPoint(x,y);return {x,y,hitIsButton:!!hit&&(hit===s||s.contains(hit)),hit:hit?hit.tagName+(hit.getAttribute('aria-label')?':'+hit.getAttribute('aria-label'):''):null}})()`);
  if (!sub) throw new Error('setup: no 保存装订 button');
  var bindSaveVia = sub.hitIsButton ? 'click' : `Enter in the field (the point hit ${sub.hit})`;
  if (sub.hitIsButton) { await b.click(sub.x, sub.y); await sleep(300); }
  else { const f = await locate('input[aria-label="眉中文案"]', { within: FORM }); if (f) { await b.click(f.x, f.y); await sleep(150); } await enter(); await sleep(300); }
  const srv = await until(async () => { const bs = await bindingOf(id); return { ok: bindingOk(bs), enabled: bs?.enabled ?? null, headerCenter: bs?.sections?.[0]?.slots?.['header-center'] ?? null }; });
  const panelClosed = !(await locate(FORM).catch(() => null));
  const reqs = sent(/^\d+ PUT \/notes\/[^/\s]+\/binding-settings/);
  const toasts = await toastsNow();
  await open(id); await sleep(3000);
  const bs2 = await bindingOf(id);
  const dom = await until(async () => { const list = await b.ev(`[...document.querySelectorAll('[data-page-frame-slot]')].map(e=>({kind:e.getAttribute('data-page-frame-slot'),pos:e.getAttribute('data-page-frame-slot-position'),text:(e.textContent||'').trim()})).filter(x=>x.text)`);
    return { ok: list.some((x) => x.text.includes('眉中文字')), list: list.slice(0, 8) }; }, 8000);
  await shot('SM-binding');
  const check = { saved: srv.ok, request: reqs.length > 0, reloadServer: bindingOk(bs2), reloadScreen: dom.ok };
  row('SM-binding', id, { saveVia: bindSaveVia, before: before ? { enabled: before.enabled, headerCenter: before.sections?.[0]?.slots?.['header-center'] ?? null } : null,
    enabledBefore: toggle.checked, server: srv, panelClosed, reqs, toasts,
    reload: { enabled: bs2?.enabled ?? null, headerCenter: bs2?.sections?.[0]?.slots?.['header-center'] ?? null, dom: dom.list }, check }, allOk(check));
});

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, failed: rows.filter((x) => !x.ok).map((x) => x.name),
  notTested: rows.filter((x) => x.error).map((x) => x.name), red: rows.filter((x) => !x.ok && !x.error).map((x) => x.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((x) => !x.ok && !x.error).length}, not tested ${rows.filter((x) => x.error).length}`);
log.end(); await b.close(); process.exit(0);
