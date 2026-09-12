// Read the disposable fixture; reopen the same database and assert saved truth.
// Browser interactions and DOM observations are performed separately through CUA.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:5197';
const here = new URL('./', import.meta.url);
const get = async (path, options) => {
  const response = await fetch(base + path, options);
  assert.ok(response.ok, `${response.status} ${path}`);
  return response.json();
};
const save = (name, value) => writeFile(new URL(name, here), JSON.stringify(value, null, 2));
const before = await get('/__fixture/state');
assert.equal(before.syntheticOnly, true);
assert.match(before.database, /\.codex-tmp[\\/]b1c-browser[\\/]run-[^\\/]+[\\/]fixture\.sqlite$/);
const legacy = before.notes.find((entry) => entry.note.id === before.legacyNoteId);
assert.deepEqual(legacy, before.legacyBaseline);
const frames = before.notes.map(({note,canvas}) => ({
  id: note.id, title: note.title, page_format: note.page_format,
  frames: canvas.pageFrameCollection.pageFrames,
}));
for (const [preset, width, height, insets] of [
  ['a4_portrait', 904, 1278, {top: 0, right: 72, bottom: 96, left: 72}],
  ['letter_portrait', 904, 1170, {top: 0, right: 72, bottom: 96, left: 72}],
  ['screen_note', 1120, 720, {top: 48, right: 64, bottom: 64, left: 64}],
]) {
  const paper = frames.find((entry) => entry.page_format === preset && entry.frames[0].contentInset.left === insets.left);
  assert.ok(paper, preset);
  assert.equal(paper.frames.length, 1);
  assert.equal(paper.frames[0].width, width);
  assert.equal(paper.frames[0].height, height);
  assert.deepEqual(paper.frames[0].contentInset, insets);
}
const wallSample = frames.find((entry) => entry.title === 'Web long page smoke');
assert.equal(wallSample.frames[0].width, 1120);
assert.equal(wallSample.frames[0].contentInset.left, 94.85714285714286);
const finalNote = frames.find((entry) => entry.title === 'Web final width smoke');
assert.ok(finalNote);
const blocksBefore = await get(`/api/notes/${finalNote.id}/blocks`);
assert.deepEqual(blocksBefore.map((block) => block.plain_text.length).sort((a,b) => a-b), [76, 15869]);
assert.ok(blocksBefore.some((block) => block.plain_text.startsWith('FINAL-WEB-BEGIN') && block.plain_text.endsWith('FINAL-WEB-END')));
const after = await get('/__fixture/reopen', {method: 'POST'});
assert.deepEqual(after.notes, before.notes);
const blocksAfter = await get(`/api/notes/${finalNote.id}/blocks`);
assert.deepEqual(blocksAfter, blocksBefore);
const receipt = JSON.parse(await readFile(new URL('native-print-receipt.json', here), 'utf8'));
assert.equal(receipt.noteId, finalNote.id);
assert.equal(receipt.beforeprintSeen, true);
assert.equal(receipt.pages.length, 4);
assert.deepEqual(receipt.pages.map((page) => page.sliceOffset), [0, 1584, 3168, 4752]);
for (const page of receipt.pages) {
  assert.equal(page.canvas.width, '1120px');
  assert.equal(page.paperSize, 'A4');
  for (const fragment of page.fragments) assert.equal(fragment.css.width, '992px');
}
assert.ok(receipt.pages.at(-1).fragments.some((fragment) => fragment.text.some((text) => text.first.startsWith('FINAL-WEB-CONTINUATION'))));
const observations = JSON.parse(await readFile(new URL('browser-observations.json', here), 'utf8'));
const dom = observations.find((entry) => entry.label === 'Web-final-after-print-reload').dom;
assert.equal(dom.frameCount, 1);
assert.equal(Object.fromEntries(dom.frame)['data-page-frame-template'], 'screen_note');
assert.ok(Object.fromEntries(dom.frame).style.includes('--formal-page-width: 1120px'));
assert.ok(dom.editors.every((editor) => editor.width === '972px')); // 992 minus existing 20px editor padding.
const summary = {
  syntheticOnly: true, database: before.database, noteCount: before.notes.length,
  legacyExactEquality: true, sameDatabaseReopenExactEquality: true, textReopenExactEquality: true,
  frames, finalWebNoteId: finalNote.id, finalBlockLengths: blocksBefore.map((block) => block.plain_text.length),
  print: {beforeprintSeen: true, afterprintSeen: receipt.afterprintSeen, printMediaAtCapture: receipt.printMediaAtCapture,
    pages: receipt.pages.length, sliceOffsets: receipt.pages.map((page) => page.sliceOffset),
    frameWidth: 1120, derivedFrameHeight: 5859, contentWidth: 992, nativePreviewScreenshot: false},
  requestCountAtCapture: before.requests.length,
  nonSuccessRequests: before.requests.filter((request) => request.status >= 400).map(({method,path,status,body}) => ({method,path,status,plainTextLength:body?.plain_text?.length})),
  caveats: ['Native beforeprint DOM and a labeled frozen screen visualization; no native preview screenshot or afterprint claim.',
    'Existing text height estimation reserves space beyond measured glyphs; the current placed continuation is printed at its saved position.'],
};
await save('browser-pre-reopen.json', before);
await save('browser-post-reopen.json', after);
await save('browser-final-blocks.json', blocksAfter);
await save('browser-summary.json', summary);
console.log(JSON.stringify({pass: true, noteCount: summary.noteCount, legacyExactEquality: true, sameDatabaseReopenExactEquality: true,
  textReopenExactEquality: true, finalBlockLengths: summary.finalBlockLengths, print: summary.print,
  requestCount: summary.requestCountAtCapture, expectedSetupFailures: summary.nonSuccessRequests.length}, null, 2));
