// Reproducing the independent review's claims myself, against the deployed parser module, before relaying any of them.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const SERVER = 'D:/Coinsides/v2.x/Coincides/server';
const require = createRequire(`${SERVER}/package.json`);
const JSZip = require('jszip');
const mammoth = require('mammoth');
const { parseSourceArtifact } = await import(pathToFileURL(`${SERVER}/src/services/sourceArtifact.ts`).href);
const HERE = '<session-tmp>/scratchpad/verify-island';
const SEED = '<session-tmp>/scratchpad/verify-v1f1/docs/F2-纯公式.docx';

const WR = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:i/></w:rPr>';
const CT = `<m:ctrlPr>${WR}</m:ctrlPr>`;
const mr = (t, nor) => `<m:r>${nor ? '<m:rPr><m:nor/></m:rPr>' : ''}${WR}<m:t xml:space="preserve">${t}</m:t></m:r>`;
const f = (a, b, type) => `<m:f><m:fPr>${type ? `<m:type m:val="${type}"/>` : ''}${CT}</m:fPr><m:num>${a}</m:num><m:den>${b}</m:den></m:f>`;
const sup = (a, b) => `<m:sSup><m:sSupPr>${CT}</m:sSupPr><m:e>${a}</m:e><m:sup>${b}</m:sup></m:sSup>`;
const sub = (a, b) => `<m:sSub><m:sSubPr>${CT}</m:sSubPr><m:e>${a}</m:e><m:sub>${b}</m:sub></m:sSub>`;
const low = (b, l) => `<m:limLow><m:limLowPr>${CT}</m:limLowPr><m:e>${b}</m:e><m:lim>${l}</m:lim></m:limLow>`;
const upp = (b, l) => `<m:limUpp><m:limUppPr>${CT}</m:limUppPr><m:e>${b}</m:e><m:lim>${l}</m:lim></m:limUpp>`;
const fn = (name, e) => `<m:func><m:funcPr>${CT}</m:funcPr><m:fName>${name}</m:fName><m:e>${e}</m:e></m:func>`;
const grp = (e) => `<m:groupChr><m:groupChrPr>${CT}</m:groupChrPr><m:e>${e}</m:e></m:groupChr>`;
const eq = (rows) => `<m:eqArr><m:eqArrPr>${CT}</m:eqArrPr>${rows.map((x) => `<m:e>${x}</m:e>`).join('')}</m:eqArr>`;
const om = (...x) => `<m:oMath>${x.join('')}</m:oMath>`;
const t = (s) => `<w:r><w:t xml:space="preserve">${s}</w:t></w:r>`;
const line = (label, body) => `<w:p>${t(`${label}：`)}${body}${t(' 句尾')}</w:p>`;
const A = 'w:author="a" w:date="2026-01-01T00:00:00Z"';
const OLE = '<w:r><w:object w:dxaOrig="600" w:dyaOrig="600"><v:shape id="_x0000_i1025" type="#_x0000_t75" style="width:30pt;height:30pt"><v:imagedata r:id="rIdEq" o:title=""/></v:shape><o:OLEObject Type="Embed" ProgID="Equation.3" ShapeID="_x0000_i1025" DrawAspect="Content" ObjectID="_1" r:id="rIdEqBin"/></w:object></w:r>';
const rows = [
  ['对照·lim', om(mr('1/2='), fn(low(mr('lim'), mr('x')), mr('y')))],
  ['argmin', om(mr('θ='), fn(low(mr('arg min'), mr('w')), f(mr('1'), mr('n')) + sup(mr('e'), mr('2'))))],
  ['argmax', om(mr('V='), fn(low(mr('argmax'), mr('x')), f(mr('C'), mr('1+r'))))],
  ['定义等号', om(sup(mr('σ'), mr('2')), upp(mr('='), mr('def')), f(mr('1'), mr('n')))],
  ['iid', om(mr('X'), upp(mr('∼'), mr('iid')), mr('N'), sup(mr('σ'), mr('2')), f(mr('C'), mr('i')))],
  ['limsup', om(fn(low(mr('lim sup'), mr('n→∞')), sub(mr('x'), mr('n'))))],
  ['带标签下括号', om(low(grp(mr('a+b')), mr('n')), mr('='), f(mr('c'), mr('d')))],
  ['符号w:sym', om('<m:r><w:sym w:font="Symbol" w:char="F044"/></m:r>', mr('x'))],
  ['修订', om(mr('x='), `<w:del w:id="31" ${A}><m:r><m:t>2</m:t></m:r></w:del><w:ins w:id="32" ${A}>${mr('3')}</w:ins>`)],
  ['式内换行', om(mr('a=b'), '<m:r><w:br/></m:r>', mr('c=d'))],
  ['方程组对齐', om(eq([mr('x&amp;=1'), mr('y&amp;=2')]))],
  ['斜分式', om(f(mr('a+b'), mr('c+d'), 'skw'))],
  ['线性分式', om(f(mr('a+b'), mr('c+d'), 'lin'))],
];
const bodyParts = [`<w:p>${t('F3 复核样本')}</w:p>`, ...rows.map(([l, b]) => line(l, b)),
  `<w:p>${t('OLE 公式：PV = ')}${OLE}${t(' = 面值')}</w:p>`,
  `<w:p>${t('有脚注的句子')}<w:r><w:footnoteReference w:id="2"/></w:r>${t(' 继续。')}</w:p>`,
];
const zip = await JSZip.loadAsync(fs.readFileSync(SEED));
const xml = await zip.file('word/document.xml').async('string');
const ns = xml.match(/<w:document[^>]*>/)[0];
const declared = ns.replace('>', (ns.includes('xmlns:v=') ? '' : ' xmlns:v="urn:schemas-microsoft-com:vml"') + (ns.includes('xmlns:o=') ? '' : ' xmlns:o="urn:schemas-microsoft-com:office:office"') + '>');
const sect = xml.match(/<w:sectPr.*<\/w:sectPr>/s)?.[0] ?? '';
zip.file('word/document.xml', xml.replace(ns, declared).replace(/<w:body>.*<\/w:body>/s, `<w:body>${bodyParts.join('')}${sect}</w:body>`));
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
zip.file('word/footnotes.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes ${W}><w:footnote w:id="2"><w:p><w:r><w:t>脚注正文：引用来源在这里。</w:t></w:r></w:p></w:footnote></w:footnotes>`);
const rels = await zip.file('word/_rels/document.xml.rels').async('string');
zip.file('word/_rels/document.xml.rels', rels.replace('</Relationships>', '<Relationship Id="rIdFn" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/><Relationship Id="rIdEq" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/><Relationship Id="rIdEqBin" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="embeddings/oleObject1.bin"/></Relationships>'));
zip.file('word/embeddings/oleObject1.bin', Buffer.from('not a real equation object'));
const types = await zip.file('[Content_Types].xml').async('string');
zip.file('[Content_Types].xml', types.replace('</Types>', '<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/></Types>'));
const out = join(HERE, 'docs', 'F3-复核样本.docx');
fs.writeFileSync(out, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));

const a = await parseSourceArtifact({ parser_key: 'native-docx', parser_version: 'verify', file_path: out, original_filename: 'F3.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
for (const b of a.blocks) console.log(b.text);
console.log('--- messages after fix:', JSON.stringify((a.metadata.parser_messages || []).map((m) => m.message.slice(0, 90))));
const plain = await mammoth.extractRawText({ buffer: fs.readFileSync(out) });
console.log('--- messages on plain mammoth:', JSON.stringify([...new Set(plain.messages.map((m) => m.message.slice(0, 90)))]));
