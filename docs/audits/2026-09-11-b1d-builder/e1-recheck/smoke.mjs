// Reproducible synthetic Chrome/CDP component test. Requires serve.mjs on 5201.
// A fresh headless test profile is isolated from the user's Chrome profile.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const presets = ['default', 'quiet-ink', 'warm-paper', 'workbench'];
const preset = process.argv[2] || 'default';
if (!presets.includes(preset)) throw new Error('Expected a B1d preset argument');
const audit = resolve(fixtureDirectory, preset);
mkdirSync(audit, { recursive: true });
const root = resolve(fixtureDirectory, '../../../..');
const chromePath = process.env.E1_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!existsSync(chromePath)) throw new Error('Set E1_CHROME_PATH to a Chrome executable.');
const port = 9392 + presets.indexOf(preset);
const profile = resolve(fixtureDirectory, 'runtime-profiles/b1d-e1-synthetic-chrome-' + preset);
mkdirSync(profile, { recursive: true });
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--in-process-gpu', '--no-sandbox', '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
let chromeLog = '';
chrome.stderr.on('data', data => { chromeLog += data.toString(); });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
const evidence = { status: 'running', preset, syntheticOnly: true, persistenceCoverage: false, browser: null, assertions: [], borders: [], screenshots: [], errors: [], callbacks: [] };
let seq = 0;
const pending = new Map();
const events = [];
async function send(method, params = {}) {
  const id = ++seq;
  return new Promise((res, rej) => { const timer=setTimeout(()=>rej(new Error('CDP timeout: '+method)),10000); pending.set(id, { res:(value)=>{clearTimeout(timer);res(value);}, rej:(error)=>{clearTimeout(timer);rej(error);} }); ws.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function assert(name, expression) {
  const detail = await evaluate(expression);
  const pass = typeof detail === 'boolean' ? detail : Boolean(detail?.pass);
  evidence.assertions.push({ name, pass, detail });
  if (!pass) throw new Error(`Assertion failed: ${name}: ${JSON.stringify(detail)}`);
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(resolve(audit, `${name}.png`), Buffer.from(r.data, 'base64'));
  evidence.screenshots.push(`${name}.png`);
}
async function click(selector, text) {
  const point = await evaluate(`(() => { const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})]; const el = nodes.find(n => ${text ? `[n.getAttribute('aria-label'),n.getAttribute('title'),n.textContent.trim(),...([...n.children].filter(c=>c.tagName==='SPAN').map(c=>c.textContent.trim()))].includes(${JSON.stringify(text)})` : 'true'}); if (!el) throw new Error('Missing target ' + ${JSON.stringify(text || selector)}); if(el.disabled) throw new Error('Disabled target'); el.scrollIntoView({block:'nearest'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  await pause(90);
}
async function key(key, code = key, modifiers = 0) {
  const windowsVirtualKeyCode = ({Tab:9,Escape:27,ArrowUp:38,ArrowDown:40,Home:36,End:35,Enter:13})[key] || key.toUpperCase().charCodeAt(0);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode });
  await pause(70);
}
const state = `JSON.parse(document.querySelector('[data-smoke-state]').textContent)`;
const popover = '[data-note-toolbar-popover] > [data-note-overlay]';
async function inspectStyles(name, selector, mode, forcedHoverTargets = 0) {
  const r = await evaluate(`(() => {
    const root=document.querySelector(${JSON.stringify(selector)}); if(!root) throw new Error('Missing overlay');
    const sides=['Top','Right','Bottom','Left'];
    const rootRect=root.getBoundingClientRect();
    const result={overlay:${JSON.stringify(name)},state:${JSON.stringify(mode)},forcedHoverTargets:${forcedHoverTargets},selector:${JSON.stringify(selector)},descendants:root.querySelectorAll('*').length,nestedBorders:[],hairlineSeparators:[],shadows:[],roundedDescendants:[],staticBackgrounds:[],geometry:{clientWidth:root.clientWidth,scrollWidth:root.scrollWidth,width:rootRect.width,overflowing:[],tooltips:[]}};
    for(const el of root.querySelectorAll('*')) {
      const cs=getComputedStyle(el); const widths=sides.map(side=>parseFloat(cs['border'+side+'Width']));
      const radius=[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomLeftRadius,cs.borderBottomRightRadius];
      if(radius.some(r=>parseFloat(r)>0))result.roundedDescendants.push({tag:el.tagName,class:typeof el.className==='string'?el.className:'svg',radius});
      if(cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&!el.matches(':hover,:focus,:focus-visible'))result.staticBackgrounds.push({tag:el.tagName,class:typeof el.className==='string'?el.className:'svg',background:cs.backgroundColor});
      const rect=el.getBoundingClientRect();
      if(rect.width&&rect.right>rootRect.right+1)result.geometry.overflowing.push({tag:el.tagName,class:typeof el.className==='string'?el.className:'svg',left:rect.left,right:rect.right,width:rect.width});
      if(el.hasAttribute('data-tip')){const after=getComputedStyle(el,'::after');result.geometry.tooltips.push({left:rect.left,right:rect.right,width:after.width,pseudoLeft:after.left,pseudoRight:after.right,transform:after.transform,visibility:after.visibility});}
      if(cs.boxShadow !== 'none') result.shadows.push({tag:el.tagName,class:el.className,shadow:cs.boxShadow});
      if(!widths.some(w=>w>0)) continue;
      const entry={tag:el.tagName,class:typeof el.className==='string'?el.className:el.className.baseVal,text:el.textContent.trim().slice(0,85),widths};
      // A single horizontal 1px rule is a separator. Two/four sides or vertical rules are boxes.
      if(widths.filter(w=>w>0).length===1 && widths.every(w=>w<=1) && (widths[0]>0 || widths[2]>0)) result.hairlineSeparators.push(entry);
      else result.nestedBorders.push(entry);
    }
    result.pass=result.nestedBorders.length===0 && result.shadows.length===0 && result.roundedDescendants.length===0 && result.staticBackgrounds.length===0; return result;
  })()`);
  evidence.borders.push(r);
  evidence.assertions.push({ name: `${name} (${mode}): zero nested borders, shadows, rounded boxes and static card backgrounds`, pass: r.pass, detail: { nestedBorders: r.nestedBorders.length, hairlineSeparators: r.hairlineSeparators.length, shadows: r.shadows.length,roundedDescendants:r.roundedDescendants.length,staticBackgrounds:r.staticBackgrounds.length } });
  // Preserve failure evidence and continue to audit every remaining surface.
}
async function borders(name,selector){
  await inspectStyles(name,selector,'rest');
  const {root:documentRoot}=await send('DOM.getDocument');
  const {nodeId}=await send('DOM.querySelector',{nodeId:documentRoot.nodeId,selector});
  const {nodeIds}=await send('DOM.querySelectorAll',{nodeId,selector:'button:not(:disabled), [role="button"], summary, input:not(:disabled), select:not(:disabled)'});
  await Promise.all(nodeIds.map(nodeId=>send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']})));
  try { await inspectStyles(name,selector,'hover',nodeIds.length); }
  finally { await Promise.all(nodeIds.map(nodeId=>send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]}))); }
}
async function more() { await click('button', 'More note actions'); }
async function close() { await click(`${popover} button`, 'Close'); }
try {
  let targets;
  for(let i=0;i<50;i++){try {targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());break;}catch{await pause(100);}}
  if(!targets) throw new Error('Chrome CDP did not become available');
  ws = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
  ws.onmessage=({data})=>{const msg=JSON.parse(data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p?.rej(new Error(JSON.stringify(msg.error))):p?.res(msg.result);}else events.push(msg);};
  ws.onclose=()=>{for(const p of pending.values())p.rej(new Error('Chrome connection closed: '+chromeLog));pending.clear();};
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('CSS.enable');
  evidence.browser = await send('Browser.getVersion');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:5201/?preset=' + preset});
  for(let i=0;i<100;i++){if(await evaluate(`Boolean(document.querySelector('[data-smoke-state]'))`))break;await pause(150);}
  await shot('00-closed');
  await assert('Initial overlays closed', `Object.values(${state}.open).every(v=>!v)`);
  await more(); await shot('01-more'); await borders('More',popover);
  await click('summary','纸面外观'); await shot('01b-more-appearance'); await borders('More (appearance open)',popover);
  await click('summary','部件样式'); await shot('01d-component-switches'); await borders('More (all component switches open)',popover);
  await assert('Paper appearance text uses the effective skin ink', `(() => {
    const raw=document.querySelector('[data-e1-skin-root]').style.getPropertyValue('--sk-ink');
    const channels=raw.slice(1,7).match(/../g).map(part=>parseInt(part,16));
    const expected='rgb('+channels.join(', ')+')';
    const colors=[...document.querySelectorAll('[data-paper-appearance] summary,[data-paper-appearance] label,[data-paper-appearance] select')].map(el=>getComputedStyle(el).color);
    return {pass:colors.length===12&&colors.every(color=>color===expected),expected,colors};
  })()`);
  await assert('Production paper appearance has inherit plus four presets', `document.querySelector('[data-paper-appearance] select').options.length===5`);
  const selectedPreset = preset === 'warm-paper' ? 'workbench' : 'warm-paper';
  await evaluate(`(() => {const select=document.querySelector('[data-paper-appearance] select');select.value=${JSON.stringify(selectedPreset)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(120);
  await assert('Production paper preset control dispatches and changes context', `${state}.skinPreset===${JSON.stringify(selectedPreset)}&&${state}.callbacks.some(c=>c.name==='skin'&&c.value?.preset===${JSON.stringify(selectedPreset)})`);
  await shot('01c-more-override'); await borders('More (paper override selected)',popover);
  await click('button','清除覆写');
  await assert('Clearing the override returns to inherited preset', `${state}.skinSelection===null&&${state}.skinPreset===${JSON.stringify(preset)}`);
  await click('summary','纸面外观');
  await assert('Dead placeholder absent', `!document.body.textContent.includes('Note-level actions') && !document.body.textContent.includes('History, duplicate, archive')`);
  await click('button','New PageStack'); await click('button','Add to favorites');
  await assert('More preserved callbacks', `${state}.callbacks.some(c=>c.name==='createPageStack') && ${state}.callbacks.some(c=>c.name==='favorite')`);
  for(const [attribute,value,field] of [['font-size','20','fontSizePx'],['line-height','32','lineHeightPx'],['paragraph-spacing','12','paragraphSpacingPx']]){
    await click('[data-typography-'+attribute+']'); await key('a','KeyA',2); await send('Input.insertText',{text:value}); await key('Tab');
    await assert('Typography '+field, `${state}.profile.${field}===${value}`);
  }
  await evaluate(`(() => { const el=document.querySelector('[data-typography-font-family]');const opt=[...el.options].find(o=>o.text==='Georgia');el.value=opt.value;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(90);
  await assert('Typography font family callback', `${state}.profile.fontFamily.includes('Georgia')`);
  await shot('02-typography'); await click('button','Reset');
  await assert('Typography reset dispatched', `${state}.callbacks.filter(c=>c.name==='typography').length>=5 && ${state}.profile.fontSizePx!==20`);
  await close(); await click('button','Add tags'); await shot('03-info'); await borders('Info (current cover metadata)','[data-note-cover-popup]');
  await assert('Info statistics and current header entry', `document.querySelector('[data-note-cover-popup] dl').textContent.includes('Blocks3') && !${state}.open.more`);
  await click('button','Close note metadata'); await more(); await click('button','Deleted blocks'); await shot('04-trash'); await borders('Deleted blocks',popover);
  await click('button','Restore Deleted theorem');
  await assert('Restore invokes complete synthetic block and reaches empty state', `${state}.trashedCount===0 && ${state}.callbacks.find(c=>c.name==='restoreBlock').value.id==='e1-deleted' && document.body.textContent.includes('Nothing to restore.')`);
  await close(); await click('button','Toggle layout mode'); await pause(290); await shot('05-layout'); await borders('Layout',popover);
  await assert('Layout enabled with panel', `${state}.layout && ${state}.open.layout`);
  for(const name of ['Add page below selected','Add page below Page 2','Split stack at Page 2','Duplicate Page 2 to new stack','Set Page 2 as primary','Detach Page 2 to new PageStack','Delete Page 2']) await click('button',name);
  await click('[data-page-stack-panel-row="e1-stack-2"] button','Merge with previous PageStack');
  await click('[data-page-stack-panel-row="e1-stack-1"] button','Collapse PageStack');
  await click('[data-page-frame-row="e1-page-2"] > span');
  await assert('Layout row and action callback IDs preserved', `['addPageBelow','splitStack','duplicatePage','primaryPage','detachPage','deletePage','selectPage'].every(n=>${state}.callbacks.some(c=>c.name===n&&c.value==='e1-page-2')) && ${state}.callbacks.some(c=>c.name==='mergeStack'&&c.value==='e1-stack-2') && ${state}.callbacks.some(c=>c.name==='collapseStack'&&c.value==='e1-page-1')`);
  await click('button','Toggle layout mode'); await assert('Layout toggles off', `!${state}.layout`);
  await click('button','Preview export boundary'); await shot('06-export');
  for(const name of ['Toggle block type overlay','Toggle AI visibility overlay','Toggle export status overlay','Toggle label overlay']) {
    const before=await evaluate(`document.querySelector('[aria-label=${JSON.stringify(name)}]').getAttribute('aria-pressed')`);
    await click('button',name);
    await assert(name, `document.querySelector('[aria-label=${JSON.stringify(name)}]').getAttribute('aria-pressed')!==${JSON.stringify(before)}`);
  }
  await evaluate(`document.querySelectorAll('details').forEach(el=>el.open=true)`);
  await shot('07-export-all-details'); await borders('Export preview (all details open)',popover);
  await assert('Export panel has no horizontal overflow', `(() => {const el=document.querySelector('[data-note-overlay="export"]');return {pass:el.scrollWidth<=el.clientWidth,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth}})()`);
  const help=await evaluate(`(() => {const el=document.querySelector('[aria-label="Block type overlay help"]');el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...help});await pause(220);await shot('07b-export-help');
  await assert('Export help stays inside panel on hover', `(() => {const el=document.querySelector('[data-note-overlay="export"]');const help=document.querySelector('[aria-label="Block type overlay help"]');const pseudo=getComputedStyle(help,'::after');return {pass:el.scrollWidth<=el.clientWidth&&pseudo.right==='0px'&&Number(pseudo.opacity)===1,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,pseudoRight:pseudo.right,opacity:pseudo.opacity}})()`);
  await assert('Export original groups and warnings rendered', `document.querySelectorAll('details').length===7 && document.body.textContent.includes('Boundary example') && document.body.textContent.includes('Scratch example') && document.body.textContent.includes('formal page boundary')`);
  await close(); await more(); await click('button','Delete note'); await shot('08-delete'); await borders('Delete confirmation','dialog[open]');
  await assert('Delete dialog centered inside viewport', `(() => {const r=document.querySelector('dialog[open]').getBoundingClientRect();return {pass:Math.abs(r.left+r.width/2-innerWidth/2)<1&&Math.abs(r.top+r.height/2-innerHeight/2)<1,left:r.left,top:r.top,width:r.width,height:r.height}})()`);
  await assert('Delete confirmation opens without dispatch', `!!document.querySelector('dialog[open]') && !${state}.callbacks.some(c=>c.name==='trashNote')`);
  await click('dialog button','Cancel'); await assert('Delete cancel does not dispatch', `!document.querySelector('dialog[open]') && !${state}.callbacks.some(c=>c.name==='trashNote')`);
  await click('button','Delete note'); await click('dialog button','Move to Trash');
  await assert('Delete confirm dispatches once and closes', `!document.querySelector('dialog[open]') && ${state}.callbacks.filter(c=>c.name==='trashNote').length===1`);
  await click('[data-page-reading-view-options]'); await shot('09-view-menu'); await borders('View options','[data-page-reading-view-menu]');
  await assert('View icon opens above toolbar and excludes More', `(() => {const m=document.querySelector('[data-page-reading-view-menu]').getBoundingClientRect(),b=document.querySelector('[data-page-reading-view-options]').getBoundingClientRect();return {pass:m.bottom<=b.top-7&&${state}.open.view&&!${state}.open.more,bottom:m.bottom,triggerTop:b.top}})()`);
  for(const [gear,label,scale] of [['fit_width','Fit width',900/794],['fit_page','Fit page',600/1123],['physical','100% physical',1]]){
    if(!await evaluate(`!!document.querySelector('[data-page-reading-view-menu]')`))await click('[data-page-reading-view-options]');
    await click('[role="menuitemradio"]',label);
    await assert('View '+gear+' changes synthetic view with production derivation', `${state}.gear===${JSON.stringify(gear)} && Math.abs(${state}.displayScale-${scale})<0.00001 && !${state}.open.view`);
    await click('[data-page-reading-view-options]');
    await assert('View '+gear+' sole checked row', `document.querySelectorAll('[role="menuitemradio"][aria-checked="true"]').length===1 && document.querySelector('[data-page-reading-select="${gear}"]').getAttribute('aria-checked')==='true'`);
    await shot('10-view-'+gear);
  }
  await more(); await assert('More excludes View', `${state}.open.more&&!${state}.open.view`);
  await click('[data-page-reading-view-options]'); await click('button','Preview export boundary');
  await assert('Preview excludes View', `${state}.open.preview&&!${state}.open.view`);
  await click('[data-page-reading-view-options]'); await assert('View excludes Preview', `${state}.open.view&&!${state}.open.preview`);
  await key('Escape'); await assert('View Escape closes and restores focus', `!${state}.open.view&&document.activeElement.matches('[data-page-reading-view-options]')`);
  await click('[data-smoke-control="source"]'); await shot('11-source-snapshot'); await borders('Source snapshot','[class*="sourceJumpPanel"]');
  await click('button','Close source'); await assert('Source snapshot close', `!document.querySelector('[class*="sourceJumpPanel"]')`);
  await click('[data-smoke-control="readonly"]'); await more(); await shot('12-readonly');
  await assert('Readonly existing restrictions retained', `document.querySelector('[aria-label="Delete note"]').disabled && document.querySelector('[data-typography-font-size]').disabled && document.querySelector('[data-typography-font-family]').disabled && document.querySelector('[aria-label="New PageStack"]').disabled`);
  await close(); await click('[data-smoke-control="readonly"]'); await click('[data-smoke-control="modal"]'); await more();
  await assert('Modal deletion remains disabled', `document.querySelector('[aria-label="Delete note"]').disabled && document.querySelector('[aria-label="Delete note"]').title==='Open full page to use this'`);
  evidence.callbacks = await evaluate(`${state}.callbacks`);
  evidence.errors = events.filter(e=>e.method==='Runtime.exceptionThrown');
  evidence.assertions.push({name:'No browser runtime exceptions',pass:evidence.errors.length===0,detail:evidence.errors.length});
  if(evidence.errors.length)throw new Error('Browser runtime exceptions');
  evidence.status=evidence.assertions.every(a=>a.pass)?'passed':'failed';
  if(evidence.status==='failed')process.exitCode=1;
} catch(error) {
  evidence.status='failed'; evidence.failure=String(error.stack||error);
  if(ws?.readyState===WebSocket.OPEN){try{await shot('failure');}catch{}}
  process.exitCode=1;
} finally {
  evidence.errors = events.filter(e=>e.method==='Runtime.exceptionThrown');
  evidence.consoleErrors = events.filter(e=>e.method==='Runtime.consoleAPICalled' && e.params.type==='error');
  evidence.counts={passed:evidence.assertions.filter(a=>a.pass).length,failed:evidence.assertions.filter(a=>!a.pass).length,overlays:new Set(evidence.borders.map(b=>b.overlay.split(' (')[0])).size,namedOverlayStates:new Set(evidence.borders.map(b=>b.overlay)).size,inspectionSamples:evidence.borders.length,
    nestedBorders:evidence.borders.reduce((n,b)=>n+b.nestedBorders.length,0),hairlineSeparators:evidence.borders.filter(b=>b.state==='rest').reduce((n,b)=>n+b.hairlineSeparators.length,0),forcedHoverTargets:evidence.borders.filter(b=>b.state==='hover').reduce((n,b)=>n+b.forcedHoverTargets,0)};
  writeFileSync(resolve(audit,'smoke-report.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({status:evidence.status,counts:evidence.counts,failure:evidence.failure},null,2));
  ws?.close(); chrome.kill();
}
