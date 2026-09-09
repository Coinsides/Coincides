// Run start.mjs first. Entire production UI; synthetic in-memory data only.
// Browser profile and receipts are unique to this run. No user profile or PDF.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outputRoot = fileURLToPath(new URL('../../../.codex-tmp/overview-smoke/', import.meta.url));
await mkdir(outputRoot, { recursive: true });
const output = await mkdtemp(path.join(outputRoot, 'run-'));
console.log(`Overview smoke receipts: ${output}`);
const profile = await mkdtemp(path.join(output, 'chrome-'));
const executable = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const chrome = spawn(executable || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--in-process-gpu', '--disable-background-networking', '--disable-sync',
  ...(process.argv.includes('--isolated-chrome-no-sandbox') ? ['--no-sandbox'] : []),
  '--disable-extensions', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let diagnostics = '';
chrome.stderr.on('data', (chunk) => { diagnostics += chunk.toString(); });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let counter = 0;
const pending = new Map();
const errors = [];
const samples = [];
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out: ${expression}`);
}
async function screenshot(name) {
  const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
}
async function click(selector, captureBefore = false) {
  const encoded = JSON.stringify(selector);
  await evaluate(`document.querySelector(${encoded})?.scrollIntoView({block:'center',inline:'nearest'})`);
  const point = await evaluate(`(()=>{const node=document.querySelector(${encoded}); if(!node || node.disabled) return null; const rect=node.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};})()`);
  assert.ok(point, `enabled control ${selector}`);
  const before = captureBefore ? await sample() : null;
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  await delay(250);
  return before;
}
const sample = () => evaluate('window.__overviewSmoke.sample()');
function unchanged(baseline, current) {
  assert.equal(current.sourceRows, baseline.sourceRows, 'source rows unchanged');
  assert.equal(current.frames, baseline.frames, 'frame geometry unchanged');
  assert.equal(current.layouts, baseline.layouts, 'layout geometry unchanged');
  assert.equal(current.calls.filter((request) => request.method === 'PUT').length, 0, 'all PUT attempts are zero');
  assert.deepEqual(current.calls.slice(baseline.calls.length).filter((request) => request.method !== 'GET'), [], 'overview interaction makes zero writes of any method');
  assert.equal(current.printRootCount, 0, 'overview never mounts the print root');
}
try {
  let endpoint;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const [port, route] = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/);
      endpoint = `ws://127.0.0.1:${port}${route}`;
      break;
    } catch { await delay(100); }
  }
  assert.ok(endpoint, 'isolated Chrome must start');
  const connect = async (url) => {
    socket = new WebSocket(url);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const entry = pending.get(message.id);
      if (!entry) return;
      clearTimeout(entry.timer); pending.delete(message.id);
      message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
    };
  };
  await connect(endpoint);
  const target = await call('Target.createTarget', { url: 'about:blank' });
  const targets = await (await fetch(endpoint.replace('ws:', 'http:').replace(/\/devtools\/browser\/.+$/, '/json/list'))).json();
  socket.close();
  await connect(targets.find((item) => item.id === target.targetId).webSocketDebuggerUrl);
  await call('Runtime.enable');
  await call('Page.enable');
  for (const scenario of [
    { pages: 1, width: 1440, columns: 4 }, { pages: 4, width: 1440, columns: 4 },
    { pages: 9, width: 1440, columns: 4 }, { pages: 9, width: 900, columns: 3 },
    { pages: 9, width: 640, columns: 2 }, { pages: 4, width: 360, columns: 2 },
    { pages: 1, width: 1440, columns: 4, long: true },
    { pages: 9, width: 1440, columns: 4, blank: true },
    { pages: 1, width: 1440, columns: 4, gear: 'fit_page' },
    { pages: 4, width: 1440, columns: 4, gear: 'fit_page' },
    { pages: 4, width: 900, columns: 3, host: 'modal' },
    { pages: 9, width: 1440, columns: 4, resizeWidth: 640, target: 5 },
    { pages: 1, width: 1440, columns: 4, dirty: true },
  ]) {
    const label = `${scenario.pages}pages-${scenario.width}px${scenario.long ? '-long' : ''}${scenario.blank ? '-blank-last' : ''}${scenario.gear ? '-fit-page' : ''}${scenario.host ? '-modal' : ''}${scenario.resizeWidth ? '-resize-640' : ''}${scenario.dirty ? '-dirty-focus' : ''}`;
    const selectedPage = scenario.target || scenario.pages;
    await call('Emulation.setDeviceMetricsOverride', { width: scenario.width, height: 1100, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', { url: `http://127.0.0.1:5181/scripts/pageReadingSmoke/overview.html?pages=${scenario.pages}&long=${scenario.long ? 1 : 0}&blank=${scenario.blank ? 1 : 0}&host=${scenario.host || 'page'}` });
    await until('Boolean(window.__overviewSmoke?.sample().ready && document.querySelector("[data-note-overview-toggle]"))');
    await delay(800);
    if (scenario.gear === 'fit_page') {
      await click('[data-page-reading-control] button:nth-of-type(2)');
      await until('document.querySelector("[data-page-reading-gear]")?.dataset.pageReadingGear === "fit_page"');
    }
    if (scenario.dirty) {
      await click('textarea[data-block-id="overview-label-1"], [data-block-id="overview-label-1"] textarea');
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
      await call('Input.insertText', { text: 'DRAFT overview must preserve this unsaved text.' });
      await delay(200);
      assert.ok((await sample()).readingTexts.includes('DRAFT overview must preserve this unsaved text.'), 'synthetic text was edited through the live textarea');
      assert.equal((await sample()).activeEditorBlockId, 'overview-label-1', 'the draft editor is focused before opening overview');
      await evaluate('window.__overviewSmoke.rememberFocusedEditor()');
    }
    const baseline = await sample();
    if (scenario.gear) {
      assert.equal(baseline.readingGear, 'fit_page', 'fit page gear selected');
      assert.equal(baseline.effectiveReadingGear, scenario.pages === 1 ? 'fit_page' : 'fit_width', 'long reading page uses the existing fit-width fallback');
    }
    await screenshot(`${label}-reading`);
    const beforeOpenClick = await click('[data-note-overview-toggle]', true);
    await until('Boolean(document.querySelector("[data-note-overview-root]"))');
    await screenshot(`${label}-screen-1`);
    let first = await sample();
    assert.equal(first.columns, scenario.columns, `${label}: responsive column count`);
    if (scenario.resizeWidth) {
      await call('Emulation.setDeviceMetricsOverride', { width: scenario.resizeWidth, height: 1100, deviceScaleFactor: 1, mobile: false });
      await until('document.querySelector("[data-note-overview-grid]")?.dataset.columns === "2"');
      await delay(200);
      first = await sample();
      assert.equal(first.columns, 2, 'open overview responds to a narrower viewport');
    }
    assert.equal(first.editableElements, 0, 'thumbnails contain no writable editor controls');
    assert.equal(first.previewsInert, true, 'read-only thumbnail DOM is inert');
    assert.equal(await evaluate('(()=>{const control=document.querySelector("[data-note-overview-preview] textarea"); if(!control) return true; control.focus(); return document.activeElement!==control;})()'), true, 'thumbnail textarea cannot receive focus');
    assert.ok(first.previewWidths.length > 0 && first.previewWidths.every((width) => width >= 159.5), 'thumbnail minimum width is 160px');
    assert.equal(first.fragmentBlockIds.includes('overview-tray-only'), false, 'tray excluded');
    if (scenario.pages > 1) assert.equal(first.pageFragments.filter((page) => page.blockIds.includes('overview-cross-frame')).length, 2, 'cross-page content appears on both pages');
    if (scenario.long) assert.ok(first.longPageCount > 0, 'long page has explicit truncation marker');
    unchanged(baseline, first);
    const visited = new Set(first.pageIds);
    const screens = [first];
    if (scenario.pages === 9) assert.ok(first.screenCount > 1, 'nine pages require pagination');
    while (screens.at(-1).screen < first.screenCount) {
      await click('[data-note-overview-next]');
      const current = await sample();
      current.pageIds.forEach((id) => visited.add(id));
      unchanged(baseline, current);
      assert.ok(current.previewWidths.every((width) => width >= 159.5), 'last screen maintains minimum width');
      screens.push(current);
      await screenshot(`${label}-screen-${current.screen}`);
    }
    assert.equal(visited.size, scenario.pages, 'pagination reaches every page exactly by identity');
    while (!(await sample()).pageIds.includes(`overview-frame-${selectedPage}`)) await click('[data-note-overview-previous]');
    // Selection uses the live production button and the current reading scale.
    await click(`[data-note-overview-page][data-page-frame-id="overview-frame-${selectedPage}"]`);
    await until('!document.querySelector("[data-note-overview-root]")');
    await delay(400);
    const returned = await sample();
    unchanged(baseline, returned);
    const destination = returned.pageLabels.find((item) => item.page === selectedPage);
    if (scenario.blank) {
      assert.equal(returned.targetFrame?.id, `overview-frame-${selectedPage}`, 'blank last page remains the navigation target');
      assert.ok(returned.targetFrame.top >= returned.appRect.top - 1 && returned.targetFrame.top < returned.appRect.bottom, 'blank last page begins inside the reading viewport');
    } else {
      assert.ok(destination && destination.bottom > returned.appRect.top && destination.top < returned.appRect.bottom, 'selected page content is visible in reading viewport');
    }
    if (selectedPage > 1) assert.ok(returned.appScrollTop > 0, 'selected page scrolls the reading viewport');
    await screenshot(`${label}-returned-page-${selectedPage}`);
    const beforeReopen = await click('[data-note-overview-toggle]', true);
    await until('Boolean(document.querySelector("[data-note-overview-root]"))');
    await click('[data-note-overview-close]');
    const closed = await sample();
    assert.equal(closed.overview, false, 'close returns to reading');
    const receipt = { scenario, baseline, beforeOpenClick, first, screens, returned, beforeReopen, closed };
    samples.push(receipt);
    assert.ok(Math.abs(closed.appScrollTop - beforeReopen.appScrollTop) <= 1, `close restores the previous reading scroll position: before ${beforeReopen.appScrollTop}, after ${closed.appScrollTop}`);
    unchanged(baseline, closed);
    if (scenario.dirty) {
      assert.ok(closed.readingTexts.includes('DRAFT overview must preserve this unsaved text.'), 'closing overview preserves the unsaved draft');
      assert.equal(closed.activeEditorBlockId, 'overview-label-1', 'closing overview restores the original editor focus');
      assert.equal(closed.originalEditorFocused, true, 'the same editor DOM node regains focus');
    }
    console.log(`PASS ${label}: ${first.columns} columns, ${first.screenCount} screen(s), min ${Math.min(...first.previewWidths).toFixed(2)}px, selected page ${selectedPage}, zero writes`);
  }
  assert.deepEqual(errors, [], 'no browser runtime exceptions');
  console.log(`PASS overview functional browser smoke; receipts ${output}`);
} catch (error) {
  errors.push(String(error));
  await screenshot('failure').catch(() => undefined);
  const failure = await evaluate('({body:document.body.innerText,sample:window.__overviewSmoke?.sample()})').catch(() => null);
  await writeFile(path.join(output, 'failure.json'), JSON.stringify({ failure, errors }, null, 2));
  throw error;
} finally {
  await writeFile(path.join(output, 'receipts.json'), JSON.stringify({ samples, errors }, null, 2));
  await writeFile(path.join(output, 'chrome-diagnostics.txt'), diagnostics);
  if (socket?.readyState === 1) { await call('Browser.close').catch(() => undefined); socket.close(); }
  if (chrome.exitCode === null) await new Promise((resolve) => {
    chrome.once('exit', resolve);
    setTimeout(() => { chrome.kill(); resolve(); }, 3000);
  });
  const relative = path.relative(output, profile);
  assert.ok(relative.startsWith('chrome-') && !relative.includes(path.sep) && !path.isAbsolute(relative));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}
