import http from 'node:http';
import fs from 'node:fs';
import { createPageFramePrintProfile } from '../../client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts';
import { createPageFrameDefaultTypographyProfile } from '../../client/src/pages/Notes/canvasEngine/pageFrameTypographyService.ts';
import { documentTypographyToCssVars } from '../../client/src/pages/Notes/canvasEngine/typographyProfileService.ts';
import { derivePageReadingViewport } from '../../client/src/pages/Notes/canvasEngine/pageReadingViewportService.ts';

// Synthetic document only. Imports are pure production presentation functions;
// no app server, user data, credentials, external requests, or model calls.
const print = createPageFramePrintProfile('A4');
const frame = { ...print, templateId: 'a4_portrait' };
const profile = createPageFrameDefaultTypographyProfile(frame);
const cssVars = documentTypographyToCssVars(profile);
const cases = [
  { availableWidth: 665, stepFactor: 1 },
  { availableWidth: 904, stepFactor: 1 },
  { availableWidth: 665, stepFactor: 0.5 },
  { availableWidth: 665, stepFactor: 1.5 },
  { availableWidth: 665, stepFactor: 2 },
].map(c => ({ ...c, ...derivePageReadingViewport({
  viewState: { gear: 'fit_width', stepFactor: c.stepFactor },
  availableWidth: c.availableWidth, availableHeight: 720,
  paperWidth: frame.width, paperHeight: frame.height, physicalScale: print.physicalScale,
}) }));
const tableCss = fs.readFileSync(new URL('../../client/src/pages/Notes/canvasEngine/blocks/TableBlockProjection.module.css', import.meta.url), 'utf8');
const html = `<!doctype html><meta charset="utf-8"><title>T3 isolated typography diagnostic</title>
<style>${tableCss}
.paper { box-sizing: border-box; transform-origin: 0 0; }
.body { font-size: var(--document-font-size); line-height: var(--document-line-height); font-family: var(--document-font-family); }
</style><h1>T3 isolated typography diagnostic</h1>
<pre id="result">Running</pre><div id="paper" class="paper"><div id="content"><p class="body"><span id="glyph">Typography 标尺</span></p>
<div class="viewport"><table class="table"><tbody><tr><td>Column A</td><td>Column B</td><td>Column C</td></tr></tbody></table></div>
<span id="folio" style="font-size:12px">1</span></div></div>
<script>
const input = ${JSON.stringify({ print, profile, cssVars, cases })};
const paper = document.getElementById('paper');
const content = document.getElementById('content');
paper.style.width = input.print.width + 'px';
content.style.width = input.print.contentWidth + 'px';
for (const [key, value] of Object.entries(input.cssVars)) content.style.setProperty(key, value);
const rows = input.cases.map(c => {
  paper.style.transform = 'scale(' + c.displayScale + ')';
  const body = document.querySelector('.body');
  const cell = document.querySelector('td');
  const computedFontPx = parseFloat(getComputedStyle(body).fontSize);
  const cellFontPx = parseFloat(getComputedStyle(cell).fontSize);
  const shownPaperWidth = paper.getBoundingClientRect().width;
  const glyphRect = document.getElementById('glyph').getBoundingClientRect();
  return { ...c, computedFontPx, cellFontPx, shownPaperWidth,
    computedTransform: getComputedStyle(paper).transform,
    mixedCoordinateEquivalent: computedFontPx / shownPaperWidth * 900,
    screenFontPx: computedFontPx * c.displayScale,
    sameCoordinateEquivalent: computedFontPx * c.displayScale / shownPaperWidth * 900,
    cellSameCoordinateEquivalent: cellFontPx * c.displayScale / shownPaperWidth * 900,
    cellBodyRatio: cellFontPx / computedFontPx,
    lineHeightRatio: parseFloat(getComputedStyle(body).lineHeight) / computedFontPx,
    glyphScreenWidth: glyphRect.width, glyphScreenHeight: glyphRect.height,
    glyphPaperRatio: glyphRect.width / shownPaperWidth,
    folioSameCoordinateEquivalent: parseFloat(getComputedStyle(document.getElementById('folio')).fontSize) * c.displayScale / shownPaperWidth * 900,
    tableWidth: document.querySelector('table').getBoundingClientRect().width,
    contentWidth: content.getBoundingClientRect().width,
  };
});
document.getElementById('result').textContent = JSON.stringify({
  scope: 'synthetic DOM using unmodified production profile, reading-scale functions and table CSS; not the user note',
  userAgent: navigator.userAgent, input, rows
}, null, 2);
</script>`;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html);
}).listen(5193, '127.0.0.1', () => console.log('T3 isolated diagnostic ready: http://127.0.0.1:5193'));
