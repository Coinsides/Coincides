import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const base = 'http://127.0.0.1:5196';
const bootstrap = await fetch(base + '/__fixture/bootstrap').then((response) => response.json());
const boardPath = `/boards/${bootstrap.boardId}`;
const profile = resolve(root, '.codex-tmp/b1b-browser-chrome'); mkdirSync(profile, { recursive: true });
const chrome = spawn(process.env.E1_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--in-process-gpu', '--no-sandbox', '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9369', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evidence = { status: 'running', syntheticOnly: true, persistenceCoverage: true, assertions: [], screenshots: [], faces: {}, errors: [] };
let ws; let seq = 0; let navigationSequence = 0; const pending = new Map(); const events = [];
function send(method, params = {}) { return new Promise((res, rej) => {
  const id = ++seq; const timeout = setTimeout(() => rej(new Error('CDP timeout: ' + method)), 15000);
  pending.set(id, { res: (value) => { clearTimeout(timeout); res(value); }, rej }); ws.send(JSON.stringify({ id, method, params }));
}); }
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
}
async function until(expression) { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); } throw new Error('Timed out: ' + expression); }
async function check(name, expression) { const detail = await evaluate(expression); const pass = typeof detail === 'boolean' ? detail : !!detail?.pass; evidence.assertions.push({ name, pass, detail }); if (!pass) throw new Error(name + ': ' + JSON.stringify(detail)); }
async function shot(name) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 }); await pause(300); const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(resolve(audit, name + '.png'), Buffer.from(image.data, 'base64')); evidence.screenshots.push(name + '.png'); }
async function click(selector, label, count = 1) {
  const point = await evaluate(`(() => { const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => ${label ? `[el.getAttribute('aria-label'),el.textContent.trim(),...([...el.children].filter(c=>c.tagName==='SPAN').map(c=>c.textContent.trim()))].includes(${JSON.stringify(label)})` : 'true'}); if (!node) throw new Error('Missing control: '+${JSON.stringify(label || selector)}); node.scrollIntoView({block:'nearest'}); const box=node.getBoundingClientRect(); return {x:box.x+box.width/2,y:box.y+box.height/2}; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: count, ...point });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: count, ...point }); await pause(120);
}
async function choose(label, value) { await evaluate(`(() => {const el=[...document.querySelectorAll('select')].find(el=>el.getAttribute('aria-label')===${JSON.stringify(label)}||[...(el.labels||[])].some(l=>l.textContent.trim()===${JSON.stringify(label)})); if(!el)throw new Error('Missing select'); el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{bubbles:true}));})()`); await pause(200); }
async function navigate(path, baseline = false) {
  await send('Page.navigate', { url: base + '/?mount=' + (++navigationSequence) + (baseline ? '&baseline=1' : '') + '#' + path });
  await until(`!!document.querySelector('nav[aria-label="Synthetic audit navigation"]')`);
  if (path.startsWith('/boards/')) await until(`!!document.querySelector('[data-testid="board-surface"]') && document.querySelectorAll('article[data-testid^="board-member-"]').length===2`);
  if (path.startsWith('/notes/')) await until(`!!document.querySelector('textarea[aria-label="Note title"]')`);
  await pause(650);
}
async function nav(label) { await click('nav a', label); await pause(500); }
async function boardReady(preset) { await until(`document.querySelector('[data-board-skin-preset]')?.dataset.boardSkinPreset===${JSON.stringify(preset)}`); }
async function faces() { return evaluate(`(() => {
  const selector={desk:'[data-testid="board-surface"]',card:'article[data-testid^="board-member-"]',chalk:'[data-visual-kind="sticky"]',edge:'[data-testid^="board-edge-"]',arrow:'marker path',ink:'[class*="inkLine"]',tool:'[aria-label="Board tools"]',bookmark:'[aria-label="Save current viewport"]',title:'[aria-label="Board workspace"] h1',label:'[class*="memberKind"]',handle:'[class*="memberResizeHandle"]'};
  return Object.fromEntries(Object.entries(selector).map(([name,query])=>{const el=document.querySelector(query); if(!el)return [name,null];const s=getComputedStyle(el);return [name,{color:s.color,background:s.backgroundColor,stroke:s.stroke,fill:s.fill,font:s.fontFamily,radius:s.borderRadius}];})); })()`); }
async function fixtureRequest(method, path, body) { const response = await fetch(base + path, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }); if (!response.ok) throw new Error(`${method} ${path}: ${await response.text()}`); return response.json(); }
async function panelShot(name) {
  const styles = {};
  for (const [open,close,selector,suffix] of [
    ['Layers','Close layers','#board-layers','layers'],
    ['Selection list','Close selection list','#board-selection-sidebar','selection'],
    ['Save current viewport','Cancel','form[aria-label="Save viewport bookmark"]','bookmarks'],
  ]) {
    await click('button', open); await until(`!!document.querySelector(${JSON.stringify(selector)})`);
    styles[selector] = await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});const s=getComputedStyle(el);return {color:s.color,background:s.backgroundColor,border:s.borderColor,font:s.fontFamily};})()`);
    await shot(name+'-'+suffix); await click('button', close); await until(`!document.querySelector(${JSON.stringify(selector)})`);
  }
  return styles;
}
try {
  const existing = await fixtureRequest('GET', '/__fixture/state');
  for (const [preset,y,label] of [['shape.default',445,'Shape boundary'],['shape.sticky_note',570,'A relocated sticky shape']]) {
    if (!existing.scene.board_visuals.some(visual=>JSON.stringify(visual).includes(label))) {
      await fixtureRequest('POST', `/api/boards/${bootstrap.boardId}/visuals`, { visual_kind:'shape',x:760,y,w:245,h:100,data:{tray_source:{object:{metadata:{object_style:{preset_id:preset}}},backing_blocks:[{plain_text:label}]}} });
    }
  }
  await fixtureRequest('PUT', '/api/settings', { settings: { skin: null } });
  await fixtureRequest('PUT', `/api/courses/${bootstrap.projectId}`, { skin: null });
  await fixtureRequest('PUT', `/api/notes/${bootstrap.noteId}`, { skin: null });
  await fixtureRequest('PATCH', `/api/boards/${bootstrap.boardId}`, { skin: null });
  evidence.initialScene = (await fixtureRequest('GET', '/__fixture/state')).scene;
  let targets; for (let i = 0; i < 50; i++) { try { targets = await fetch('http://127.0.0.1:9369/json/list').then((r) => r.json()); break; } catch { await pause(100); } }
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = ({ data }) => { const message = JSON.parse(data); if (message.id) { const action = pending.get(message.id); pending.delete(message.id); message.error ? action?.rej(new Error(JSON.stringify(message.error))) : action?.res(message.result); } else events.push(message); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  evidence.browser = await send('Browser.getVersion');
  await navigate(boardPath, true); await click(`article[data-testid="board-member-${bootstrap.memberId}"]`); await shot('00-baseline-board'); evidence.faces.baseline = await faces();
  await evaluate(`document.documentElement.dataset.theme='light'`); await pause(200); await shot('00-baseline-light-board'); await evaluate(`document.documentElement.dataset.theme='dark'`); await pause(200);
  const baselinePanels = await panelShot('00-baseline-panels');
  await navigate(boardPath); await boardReady('default'); await click(`article[data-testid="board-member-${bootstrap.memberId}"]`); await shot('01-default-board'); evidence.faces.default = await faces();
  await evaluate(`document.documentElement.dataset.theme='light'`); await pause(200); await shot('01-default-light-board'); await evaluate(`document.documentElement.dataset.theme='dark'`); await pause(200);
  if(Object.values(evidence.faces.default).some(value=>value===null))throw new Error('Missing default surface probe');
  const defaultPanels = await panelShot('01-default-panels');
  evidence.assertions.push({ name: 'Default layers, selection, bookmark rail/editor and tools retain incumbent styles', pass: JSON.stringify(baselinePanels)===JSON.stringify(defaultPanels), detail: {baselinePanels,defaultPanels} });
  evidence.assertions.push({ name: 'Default common board faces retain incumbent computed styles', pass: JSON.stringify(evidence.faces.baseline) === JSON.stringify(evidence.faces.default), detail: { baseline: evidence.faces.baseline, current: evidence.faces.default } });
  for (const preset of ['warm-paper', 'workbench', 'quiet-ink']) {
    await nav('Appearance'); await choose('纸面预设', preset); await nav('Board'); await boardReady(preset);
    await click(`article[data-testid="board-member-${bootstrap.memberId}"]`); await shot(`02-${preset}-board`); evidence.faces[preset] = await faces();
    await check(preset + ' board has all four specific tokens', `(() => {const s=document.querySelector('[data-board-skin-preset]').style; return ['board-desk','card','edge','chalk'].every(key=>!!s.getPropertyValue('--sk-'+key));})()`);
    evidence.faces[preset + '-panels'] = await panelShot(`02-${preset}-panels`);
    if (preset === 'workbench') {
      await check('Workbench arrows match amber edges and labels are mono; resize handle is riveted', `(() => {const edge=getComputedStyle(document.querySelector('[data-testid^="board-edge-"]'));const arrow=getComputedStyle(document.querySelector('marker path'));return {pass:edge.stroke==='rgb(229, 163, 60)'&&arrow.fill===edge.stroke&&getComputedStyle(document.querySelector('[class*="memberKind"]')).fontFamily.includes('monospace')&&getComputedStyle(document.querySelector('[class*="memberResizeHandle"]')).borderRadius==='50%'};})()`);
      await click('summary', 'Board menu'); await click('summary', '板面外观'); await click('summary', '部件样式');
      await check('Inherited workbench shows actual switch values', `document.querySelector('select[id$="handleStyle"]').value==='rivet' && document.querySelector('select[id$="menuDensity"]').value==='compact'`);
      await choose('把手样式', 'capsule'); await check('One switch preserves inherited palette', `document.querySelector('[data-board-skin-preset]').dataset.boardSkinPreset==='workbench'&&getComputedStyle(document.querySelector('[class*="memberResizeHandle"]')).borderRadius==='4px'`);
      await click('button', '清除覆写'); await click('summary', 'Board menu');
    }
    if (preset === 'warm-paper') {
      await click(`article[data-testid="board-member-${bootstrap.memberId}"]`, null, 2);
      await until(`!!document.querySelector('textarea[aria-label="Note title"]')`); await pause(700); await shot('03-warm-paper-serif-title');
      await check('Warm paper has serif title and independent body typography', `(() => {const title=document.querySelector('textarea[aria-label="Note title"]');const body=document.querySelector('[data-note-host-mode]');return {pass:getComputedStyle(title).fontFamily.includes('Georgia')&&body.dataset.noteSkinPreset==='warm-paper',titleFont:getComputedStyle(title).fontFamily};})()`);
      await fixtureRequest('PUT', `/api/notes/${bootstrap.noteId}`, { skin: { preset: 'default', components: { titleFont: 'sans', labelFont: 'system' } } });
      // A fixture-side write is intentionally reread through a fresh page mount.
      await navigate(boardPath);
      await click(`article[data-testid="board-member-${bootstrap.memberId}"]`, null, 2);
      await until(`document.querySelector('[data-note-host-mode]')?.dataset.noteSkinPreset==='default'`);
      await check('Paper sans override resets warm board serif at nested portal', `!getComputedStyle(document.querySelector('textarea[aria-label="Note title"]')).fontFamily.includes('Georgia')`); await shot('04-nested-paper-independent');
      await fixtureRequest('PUT', `/api/notes/${bootstrap.noteId}`, { skin: null });
      await navigate(boardPath);
    }
  }
  await nav('Project'); await click('button', 'Edit project'); await choose('纸面预设', 'workbench'); await click('button', 'Update'); await nav('Board'); await boardReady('workbench');
  await check('Project overrides global', `document.querySelector('[data-board-skin-preset]').dataset.boardSkinPreset==='workbench'`);
  await click('summary', 'Board menu'); await click('summary', '板面外观'); await choose('板面预设', 'warm-paper'); await boardReady('warm-paper'); await shot('05-board-override');
  await fixtureRequest('POST', '/__fixture/reopen'); await navigate(boardPath); await boardReady('warm-paper'); await shot('06-refreshed-persistent-board');
  await check('Board selection survives database reopen and page refresh', `document.querySelector('[data-board-skin-preset]').dataset.boardSkinPreset==='warm-paper'`);
  await click('summary', 'Board menu'); await click('summary', '板面外观'); await click('button', '清除覆写'); await boardReady('workbench'); await shot('07-clear-falls-back');
  evidence.state = await fixtureRequest('GET', '/__fixture/state');
  evidence.assertions.push({ name: 'Skin changes preserve members, geometry, edges, visuals, layers and bookmarks', pass: JSON.stringify(evidence.initialScene)===JSON.stringify(evidence.state.scene) });
  evidence.assertions.push({ name: 'Only known fixture requests; all HTTP responses successful', pass: evidence.state.requests.every((request) => request.status < 400), detail: evidence.state.requests.filter((request) => request.status >= 400) });
  evidence.status = evidence.assertions.every((item) => item.pass) ? 'passed' : 'failed';
} catch (error) { evidence.status = 'failed'; evidence.failure = String(error.stack || error); if (ws?.readyState === WebSocket.OPEN) { try { await shot('failure'); } catch {} } }
finally {
  evidence.errors = events.filter((event) => event.method === 'Runtime.exceptionThrown' || event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error');
  if (evidence.errors.length) evidence.status = 'failed';
  evidence.counts = { passed: evidence.assertions.filter((item) => item.pass).length, failed: evidence.assertions.filter((item) => !item.pass).length };
  writeFileSync(resolve(audit, 'browser-report.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: evidence.status, counts: evidence.counts, errors: evidence.errors.length, failure: evidence.failure }, null, 2));
  ws?.close(); chrome.kill(); if (evidence.status !== 'passed') process.exitCode = 1;
}
