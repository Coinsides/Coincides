import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire('file:///D:/Coinsides/v2.x/Coincides/server/package.json');
const { PDFParse } = require('pdf-parse');
const dir = dirname(require.resolve('pdfjs-dist/package.json'));
const hex = (s) => '<' + [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('') + '>';
function pdf(content, fonts) {
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << ${Object.keys(fonts).map((k, i) => `/${k} ${5 + i} 0 R`).join(' ')} >> >> >>`,
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`, ...Object.values(fonts)];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out));
}
const cjkFont = '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> >>] >>';
const cases = {
  cjk: pdf(`BT /F1 18 Tf 72 760 Td ${hex('第一章消费者理论')} Tj ET`, { F1: cjkFont }),
  helv: pdf('BT /F1 14 Tf 72 760 Td (Helvetica not embedded) Tj ET', { F1: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' }),
  times: pdf('BT /F1 14 Tf 72 760 Td (Times not embedded) Tj ET', { F1: '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>' }),
  symbol: pdf('BT /F1 14 Tf 72 760 Td (abgdS) Tj ET', { F1: '<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>' }),
  unknown: pdf('BT /F1 14 Tf 72 760 Td (SimSun not embedded) Tj ET', { F1: '<< /Type /Font /Subtype /TrueType /BaseFont /SimSun >>' }),
};
const asPath = { cMapUrl: join(dir, 'cmaps') + '/', cMapPacked: true, standardFontDataUrl: join(dir, 'standard_fonts') + '/' };
const asUrl = { cMapUrl: pathToFileURL(join(dir, 'cmaps') + '/').href, cMapPacked: true, standardFontDataUrl: pathToFileURL(join(dir, 'standard_fonts') + '/').href };
const opts = { bare: {}, asPath, asUrl, urlSys: { ...asUrl, useSystemFonts: false }, urlFace: { ...asUrl, disableFontFace: false } };
for (const [c, data] of Object.entries(cases)) for (const [l, extra] of Object.entries(opts)) {
  const parser = new PDFParse({ data: data.slice(), ...extra });
  try {
    const shot = await parser.getScreenshot({ partial: [1], desiredWidth: 620, imageBuffer: true, imageDataUrl: false });
    writeFileSync(`v-${c}-${l}.png`, shot.pages[0].data);
    console.log(c, l, 'ok', shot.pages[0].data.length);
  } catch (e) { console.log(c, l, 'REJECTED', e.message.slice(0, 120)); }
  await parser.destroy().catch(() => undefined);
}
