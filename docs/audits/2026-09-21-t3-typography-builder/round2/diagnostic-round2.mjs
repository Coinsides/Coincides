import http from 'node:http';
import fs from 'node:fs';
import { createPageFramePrintProfile } from '../../client/src/pages/Notes/canvasEngine/pageFramePrintScaleService.ts';
import { createPageFrameDefaultTypographyProfile } from '../../client/src/pages/Notes/canvasEngine/pageFrameTypographyService.ts';
import { documentTypographyToCssVars } from '../../client/src/pages/Notes/canvasEngine/typographyProfileService.ts';
import { derivePageReadingViewport } from '../../client/src/pages/Notes/canvasEngine/pageReadingViewportService.ts';
const print = createPageFramePrintProfile('A4');
const profile = createPageFrameDefaultTypographyProfile({ ...print, templateId: 'a4_portrait' });
const cssVars = documentTypographyToCssVars(profile);
const cases = [0.5, 1, 1.5, 2].map(stepFactor => derivePageReadingViewport({
  viewState: { gear: 'fit_width', stepFactor }, availableWidth: 665, availableHeight: 720,
  paperWidth: print.width, paperHeight: print.height, physicalScale: print.physicalScale,
}));
const letterPrint = createPageFramePrintProfile('Letter');
const letterProfile = createPageFrameDefaultTypographyProfile({ ...letterPrint, templateId: 'letter_portrait' });
const variants = [
  { print, profile, cssVars, cases },
  { print: letterPrint, profile: letterProfile, cssVars: documentTypographyToCssVars(letterProfile), cases },
];
const css = fs.readFileSync(new URL('../../client/src/pages/Notes/canvasEngine/blocks/TableBlockProjection.module.css', import.meta.url), 'utf8');
const noteCss = fs.readFileSync(new URL('../../client/src/pages/Notes/NoteDetail.module.css', import.meta.url), 'utf8');
const slot = noteCss.match(/\.pageFrameSlot\s*\{([^}]+)\}/)[1];
const html = `<!doctype html><meta charset="utf-8"><title>T3 round two computed typography</title>
<style>${css}.paper{transform-origin:0 0}.body{font-size:var(--document-font-size);line-height:var(--document-line-height);font-family:var(--document-font-family)}.folio{${slot}}</style>
<h1>T3 round two, synthetic DOM only</h1><pre id="result">Running</pre>
<div id="paper" class="paper"><div id="content"><p class="body">Typography 标尺</p>
<div class="viewport"><table class="table"><tbody><tr><td>甲</td><td>乙</td><td>丙</td></tr></tbody></table></div>
<span class="folio">1</span></div></div>
<script>
const inputs=${JSON.stringify(variants)};
const paper=document.getElementById('paper'), content=document.getElementById('content');
const rows=[];
for(const input of inputs){
paper.style.width=input.print.width+'px';content.style.width=input.print.contentWidth+'px';
for(const [k,v] of Object.entries(input.cssVars))content.style.setProperty(k,v);
for(const columns of [3,8]){
document.querySelector('tr').innerHTML=Array.from({length:columns},(_,i)=>'<td>'+(columns===3?'甲乙丙'[i]:'LongColumnContent'+i)+'</td>').join('');
for(const c of input.cases){
paper.style.transform='scale('+c.displayScale+')';
const body=getComputedStyle(document.querySelector('.body')),cell=getComputedStyle(document.querySelector('td'));
const table=document.querySelector('table').getBoundingClientRect(),box=content.getBoundingClientRect();
const font=parseFloat(body.fontSize),cellFont=parseFloat(cell.fontSize),folio=parseFloat(getComputedStyle(document.querySelector('.folio')).fontSize);
rows.push({paperSize:input.print.pageSize,columns,step:c.stepFactor,scale:c.displayScale,computedBody:font,bodyEquivalent:font/904*900,lineHeight:parseFloat(body.lineHeight),lineRatio:parseFloat(body.lineHeight)/font,computedCell:cellFont,cellEquivalent:cellFont/904*900,cellRatio:cellFont/font,folioEquivalent:folio/904*900,tableWidth:table.width/c.displayScale,contentWidth:box.width/c.displayScale,leftGap:(table.left-box.left)/c.displayScale,rightGap:(box.right-table.right)/c.displayScale});
}}}
const result={scope:'synthetic DOM, production CSS without substitution, no app or user data',userAgent:navigator.userAgent,inputs,rows};
document.getElementById('result').textContent=JSON.stringify(result,null,2);
</script>`;
http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);}).listen(5193,'127.0.0.1',()=>console.log('T3 round2 ready http://127.0.0.1:5193'));
