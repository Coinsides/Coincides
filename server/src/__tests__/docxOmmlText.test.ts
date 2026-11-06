import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { inlineDocxFormulas, inlineDocxFormulasOrOriginal } from '../services/docxOmmlText.js';
import { parseSourceArtifact } from '../services/sourceArtifact.js';
import { getSourceRecordDetail, intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { materializeSourceNow, waitForScheduledSourceMaterializations } from '../services/sourceMaterialization.js';
import { rematerializeSource } from '../services/sourceReprojection.js';

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
const r = (text: string) => `<m:r><m:t>${text}</m:t></m:r>`;
const t = (text: string) => `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
const p = (...parts: string[]) => `<w:p>${parts.join('')}</w:p>`;
const om = (body: string) => `<m:oMath>${body}</m:oMath>`;
const frac = (a: string, b: string) => `<m:f><m:num>${a}</m:num><m:den>${b}</m:den></m:f>`;

async function docx(body: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function textOf(body: string): Promise<string> {
  return (await mammoth.extractRawText({ buffer: (await inlineDocxFormulas(await docx(body))).buffer })).value.trim();
}

const formula = async (body: string) => textOf(p(om(body)));
const math = (latex: string) => `\\(${latex}\\)`;
const katex = createRequire(new URL('../../../client/package.json', import.meta.url)).resolve('katex');
const parsesInKatex = async (text: string) => {
  const { default: engine } = await import(pathToFileURL(katex).href);
  for (const match of text.matchAll(/\\\(([\s\S]*?)\\\)/g)) engine.__parse(match[1], { throwOnError: true, strict: 'ignore', displayMode: true });
};

const styled = (text: string, props: string) => `<m:r><m:rPr>${props}</m:rPr><m:t>${text}</m:t></m:r>`;
const phantom = (show: string) => `<m:phant><m:phantPr><m:show m:val="${show}"/></m:phantPr><m:e>${r('y')}</m:e></m:phant>`;

const STRUCTURES: Array<[string, string, string]> = [
  ['fraction', frac(r('C'), r('i')), '\\frac{C}{i}'],
  ['nested fraction', frac(r('1'), frac(r('1'), r('1+x'))), '\\frac{1}{\\frac{1}{1+x}}'],
  ['linear fraction keeps its grouping', `<m:f><m:fPr><m:type m:val="lin"/></m:fPr><m:num>${r('a+b')}</m:num><m:den>${r('c+d')}</m:den></m:f>`, '\\frac{a+b}{c+d}'],
  ['skewed fraction keeps its grouping', `<m:f><m:fPr><m:type m:val="skw"/></m:fPr><m:num>${r('a+b')}</m:num><m:den>${r('c+d')}</m:den></m:f>`, '\\frac{a+b}{c+d}'],
  ['superscript', `<m:sSup><m:e>${r('x')}</m:e><m:sup>${r('2')}</m:sup></m:sSup>`, '{x}^{2}'],
  ['subscript', `<m:sSub><m:e>${r('C')}</m:e><m:sub>${r('t')}</m:sub></m:sSub>`, '{C}_{t}'],
  ['both scripts', `<m:sSubSup><m:e>${r('x')}</m:e><m:sub>${r('i')}</m:sub><m:sup>${r('2')}</m:sup></m:sSubSup>`, '{x}_{i}^{2}'],
  ['square root', `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${r('x')}</m:e></m:rad>`, '\\sqrt{x}'],
  ['nth root', `<m:rad><m:deg>${r('3')}</m:deg><m:e>${r('x')}</m:e></m:rad>`, '\\sqrt[3]{x}'],
  ['sum', `<m:nary><m:naryPr><m:chr m:val="∑"/></m:naryPr><m:sub>${r('t=1')}</m:sub><m:sup>${r('T')}</m:sup><m:e>${r('x')}</m:e></m:nary>`, '\\sum_{t=1}^{T}{x}'],
  ['integral by default', `<m:nary><m:sub>${r('0')}</m:sub><m:sup>${r('1')}</m:sup><m:e>${r('f')}</m:e></m:nary>`, '\\int_{0}^{1}{f}'],
  ['parentheses', `<m:d><m:e>${r('a')}</m:e></m:d>`, '\\left(a\\right)'],
  ['custom delimiters', `<m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val="}"/></m:dPr><m:e>${r('a')}</m:e><m:e>${r('b')}</m:e></m:d>`, '\\left[a | b\\right\\}'],
  ['open delimiter', `<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e>${r('a')}</m:e></m:d>`, '\\left\\{a\\right.'],
  ['a named delimiter does not swallow the next letter', `<m:d><m:dPr><m:begChr m:val="⟨"/><m:endChr m:val="⟩"/></m:dPr><m:e>${r('x')}</m:e></m:d>${r('y')}`, '\\left\\langle x\\right\\rangle y'],
  ['function', `<m:func><m:fName>${r('ln')}</m:fName><m:e>${r('x')}</m:e></m:func>`, '\\ln{x}'],
  ['unknown function', `<m:func><m:fName>${r('Var')}</m:fName><m:e>${r('x')}</m:e></m:func>`, '\\operatorname{Var}{x}'],
  ['limit', `<m:func><m:fName><m:limLow><m:e>${r('lim')}</m:e><m:lim>${r('n→∞')}</m:lim></m:limLow></m:fName><m:e>${r('x')}</m:e></m:func>`, '\\lim_{n→∞}{x}'],
  ['arg min', `${r('θ=')}<m:func><m:fName><m:limLow><m:e>${r('arg min')}</m:e><m:lim>${r('w')}</m:lim></m:limLow></m:fName><m:e>${frac(r('1'), r('n'))}</m:e></m:func>`, 'θ=\\operatorname*{arg min}_{w}{\\frac{1}{n}}'],
  ['symbol stacked over a relation', `<m:limUpp><m:e>${r('=')}</m:e><m:lim>${r('def')}</m:lim></m:limUpp>`, '\\overset{def}{=}'],
  ['labelled brace', `<m:limLow><m:e><m:groupChr><m:e>${r('a+b')}</m:e></m:groupChr></m:e><m:lim>${r('n')}</m:lim></m:limLow>`, '\\underbrace{a+b}_{n}'],
  ['matrix', `<m:m><m:mr><m:e>${r('a')}</m:e><m:e>${r('b')}</m:e></m:mr><m:mr><m:e>${r('c')}</m:e><m:e>${r('d')}</m:e></m:mr></m:m>`, '\\begin{matrix} a & b \\\\ c & d \\end{matrix}'],
  ['equation array keeps alignment', `<m:eqArr><m:e>${r('x&amp;=1')}</m:e><m:e>${r('y&amp;=2')}</m:e></m:eqArr>`, '\\begin{aligned} x&=1 \\\\ y&=2 \\end{aligned}'],
  ['accent', `<m:acc><m:accPr><m:chr m:val="̂"/></m:accPr><m:e>${r('β')}</m:e></m:acc>`, '\\hat{β}'],
  ['bar on top', `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${r('x')}</m:e></m:bar>`, '\\overline{x}'],
  ['bar without pos sits below, as the standard says', `<m:bar><m:e>${r('x')}</m:e></m:bar>`, '\\underline{x}'],
  ['symbol font', `<m:r><w:sym w:font="Symbol" w:char="F044"/></m:r>${r('x')}`, 'Δx'],
  ['tracked change keeps only the final text', `${r('x=')}<w:del w:id="1"><m:r><m:t>2</m:t></m:r></w:del><w:ins w:id="2">${r('3')}</w:ins>`, 'x=3'],
  ['special characters', r('a_b%c#d&amp;e$f'), 'a\\_b\\%c\\#d\\&e\\$f'],
  ['double-struck keeps the reals apart from R', styled('R', '<m:scr m:val="double-struck"/>'), '\\mathbb{R}'],
  ['script', styled('L', '<m:scr m:val="script"/>'), '\\mathcal{L}'],
  ['fraktur', styled('g', '<m:scr m:val="fraktur"/>'), '\\mathfrak{g}'],
  ['bold is a different symbol', `${styled('X', '<m:sty m:val="b"/>')}${r('=X')}`, '\\mathbf{X}=X'],
  ['bold italic', styled('x', '<m:sty m:val="bi"/>'), '\\boldsymbol{x}'],
  ['bold Greek', styled('β', '<m:sty m:val="b"/>'), '\\boldsymbol{β}'],
  ['only the letters of a styled run take the style', styled('X+Y', '<m:sty m:val="b"/>'), '\\mathbf{X}+\\mathbf{Y}'],
  ['bold double-struck', styled('R', '<m:scr m:val="double-struck"/><m:sty m:val="b"/>'), '\\boldsymbol{\\mathbb{R}}'],
  ['upright and roman change nothing', `${styled('sin', '<m:sty m:val="p"/>')}${styled('x', '<m:scr m:val="roman"/>')}`, 'sinx'],
  ['normal text is not restyled', styled('price', '<m:nor/><m:sty m:val="b"/>'), '\\text{price}'],
  ['a structure deleted through its control mark is gone', `${r('y=')}<m:nary><m:naryPr><m:chr m:val="∑"/><m:ctrlPr><w:del w:id="1"/></m:ctrlPr></m:naryPr><m:sub/><m:sup/><m:e/></m:nary><w:ins w:id="2">${r('x')}</w:ins>`, 'y=x'],
  ['a deleted fraction leaves no shell', `${r('a')}<m:f><m:fPr><m:ctrlPr><w:del w:id="1"/></m:ctrlPr></m:fPr><m:num><w:del w:id="2">${r('1')}</w:del></m:num><m:den><w:del w:id="3">${r('2')}</w:del></m:den></m:f>`, 'a'],
  ['phantom hidden with 0', phantom('0'), '\\phantom{y}'],
  ['phantom hidden with off', phantom('off'), '\\phantom{y}'],
  ['phantom hidden with false', phantom('false'), '\\phantom{y}'],
  ['phantom shown', phantom('1'), 'y'],
  ['a symbol in the private range', '<m:r><w:sym w:font="Symbol" w:char="F0A3"/></m:r>', '≤'],
  ['a plain box', `<m:borderBox><m:e>${r('x')}</m:e></m:borderBox>`, 'x'],
  ['an insertion mark in run properties keeps the text', `${r('x=')}<m:r><w:rPr><w:ins w:id="1" w:author="a"/></w:rPr><m:t>3</m:t></m:r>`, 'x=3'],
  ['an ordinary font keeps the text', '<m:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t>x</m:t></m:r>', 'x'],
  ['a hidden empty degree is a square root', `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${r('x')}</m:e></m:rad>`, '\\sqrt{x}'],
];

for (const [name, body, expected] of STRUCTURES) {
  test(`OMML ${name}`, async () => {
    const text = await formula(body);
    assert.equal(text, math(expected));
    await parsesInKatex(text);
  });
}

test('a formula stays where it was, in the running text, and a dollar in prose is left alone', async () => {
  assert.equal(
    await textOf(p(t('永续年金 $100 的 PV = '), om(frac(r('C'), r('i'))), t(' = 面值,'), om(r('x')), t(' 结束。'))),
    '永续年金 $100 的 PV = \\(\\frac{C}{i}\\) = 面值,\\(x\\) 结束。',
  );
});

test('display formulas: in a paragraph, several in one, and directly in the body', async () => {
  assert.equal(await textOf(p(`<m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>${om(r('a'))}${om(r('b'))}</m:oMathPara>`)), '\\(a\\) \\(b\\)');
  assert.equal(await textOf(`${p(t('前'))}<m:oMathPara>${om(r('c'))}</m:oMathPara>${p(t('后'))}`), '前\n\n\\(c\\)\n\n后');
});

test('a line break inside a formula makes two formulas instead of gluing them', async () => {
  assert.equal(await formula(`${r('a=b')}<m:r><w:br/></m:r>${r('c=d')}`), '\\(a=b\\) \\(c=d\\)');
});

const DECLARES = /^\[公式未能转换,见原页(;原文字符:.*)?\]$/;

for (const [name, body] of [
  ['an unknown structure', `<m:futureThing><m:deep>${r('αβ')}</m:deep></m:futureThing>`],
  ['a stray child of a known structure', `<m:f><m:num>${r('a')}</m:num><m:den>${r('b')}</m:den><m:stray>${r('LOST')}</m:stray></m:f>`],
  ['a font it cannot read', '<m:r><w:sym w:font="Wingdings" w:char="F044"/></m:r>'],
  ['an unknown delimiter', `<m:d><m:dPr><m:begChr m:val="⟦"/></m:dPr><m:e>${r('x')}</m:e></m:d>`],
  ['an unknown operator', `<m:nary><m:naryPr><m:chr m:val="⨁"/></m:naryPr><m:e>${r('x')}</m:e></m:nary>`],
  ['an unknown accent', `<m:acc><m:accPr><m:chr m:val="★"/></m:accPr><m:e>${r('x')}</m:e></m:acc>`],
  ['a script it does not know', styled('R', '<m:scr m:val="unknown-alphabet"/>')],
  ['an alphabet on letters it does not cover', styled('β', '<m:scr m:val="double-struck"/>')],
  ['a symbol outside the font ranges', '<m:r><w:sym w:font="Symbol" w:char="2264"/></m:r>'],
  ['a numbering mark in an equation array', `<m:eqArr><m:e>${r('E=mc#(1)')}</m:e></m:eqArr>`],
  ['a struck-through box', `<m:borderBox><m:borderBoxPr><m:strikeBLTR m:val="1"/></m:borderBoxPr><m:e>${r('x')}</m:e></m:borderBox>`],
  ['a run marked deleted in its own properties', `${r('x=')}<m:r><w:rPr><w:del w:id="1" w:author="a"/></w:rPr><m:t>2</m:t></m:r>${r('3')}`],
  ['text in a symbol-encoded font', '<m:r><m:rPr><m:nor/></m:rPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr><m:t>a+b</m:t></m:r>'],
  ['a hidden degree that still holds text', `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg>${r('3')}</m:deg><m:e>${r('x')}</m:e></m:rad>`],
  ['a hidden upper limit that still holds text', `<m:nary><m:naryPr><m:chr m:val="∑"/><m:supHide m:val="1"/></m:naryPr><m:sub>${r('i')}</m:sub><m:sup>${r('n')}</m:sup><m:e>${r('x')}</m:e></m:nary>`],
  ['a line break it cannot place', `<m:f><m:num>${r('a')}<m:r><w:br/></m:r>${r('b')}</m:num><m:den>${r('c')}</m:den></m:f>`],
] as const) {
  test(`${name} is declared, never written as a formula`, async () => {
    const text = await formula(body);
    assert.match(text, DECLARES);
    assert.doesNotMatch(text, /\\\(/);
  });
}

test('a declared formula keeps its original characters as a note, outside any delimiter', async () => {
  assert.equal(await formula(`<m:futureThing>${r('αβ')}</m:futureThing>`), '[公式未能转换,见原页;原文字符:αβ]');
});

test('a delimiter among the original characters cannot open a formula inside the note', async () => {
  const text = await formula(`<m:futureThing>${r('\\(x\\)')}</m:futureThing>`);
  assert.match(text, /^\[公式未能转换/);
  assert.doesNotMatch(text, /\\\(/);
});

test('a break in a styled run keeps the style on both lines', async () => {
  assert.equal(await formula(`<m:r><m:rPr><m:sty m:val="b"/></m:rPr><m:t>X</m:t><w:br/><m:t>Y</m:t></m:r>`), '\\(\\mathbf{X}\\) \\(\\mathbf{Y}\\)');
});

test('an empty formula leaves nothing behind, and mammoth no longer warns', async () => {
  assert.equal(await textOf(p(t('文本'), '<m:oMath/>')), '文本');
  const { buffer } = await inlineDocxFormulas(await docx(p(t('a '), om(frac(r('1'), r('2'))))));
  assert.deepEqual((await mammoth.extractRawText({ buffer })).messages, []);
});

test('other warnings still stand after formulas are handled', async () => {
  const { buffer } = await inlineDocxFormulas(await docx(p(t('a '), om(r('x')), '<w:unknownThing/>')));
  const { messages } = await mammoth.extractRawText({ buffer });
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /unknownThing/);
  assert.doesNotMatch(messages[0].message, /oMath/);
});

test('a document with no formula is returned untouched, byte for byte', async () => {
  const buffer = await docx(`${p(t('标题 oMathlike words'))}${p(t('正文'))}`);
  assert.equal((await inlineDocxFormulas(buffer)).buffer, buffer);
  const plain = await docx(p(t('正文')));
  assert.equal((await inlineDocxFormulas(plain)).buffer, plain);
});

test('any failure in formula handling returns the original', async () => {
  const buffer = await docx(p(t('a'), om(r('x'))));
  const original = console.warn;
  const warned: string[] = [];
  console.warn = (...args: unknown[]) => { warned.push(args.join(' ')); };
  try {
    assert.equal((await inlineDocxFormulasOrOriginal(buffer, async () => { throw new Error('synthetic failure'); })).buffer, buffer);
    const notAZip = Buffer.from('not a zip');
    assert.equal((await inlineDocxFormulasOrOriginal(notAZip)).buffer, notAZip);
  } finally {
    console.warn = original;
  }
  assert.ok(warned.some((line) => line.includes('synthetic failure')));
});

interface Fixture { db: Awaited<ReturnType<typeof initDb>>; userId: string; courseId: string; root: string; sourceRootDir: string; canvasAssetRootDir: string }

async function withDb(run: (f: Fixture) => Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'coincides-omml-'));
  const sourceRootDir = join(root, 'sources');
  const canvasAssetRootDir = join(root, 'assets');
  mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });
  const db = await initDb(':memory:');
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare("INSERT OR REPLACE INTO database_meta (key, value) VALUES ('coordinate_contract', 'v2')").run();
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')").run(userId, `${userId}@example.test`);
  db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Synthetic')").run(courseId, userId);
  try {
    await run({ db, userId, courseId, root, sourceRootDir, canvasAssetRootDir });
  } finally {
    await waitForScheduledSourceMaterializations();
    closeDb();
    rmSync(root, { recursive: true, force: true, maxRetries: 3 });
  }
}

async function upload(f: Fixture, body: Buffer) {
  const path = join(f.sourceRootDir, '.tmp', `${uuidv4()}.upload`);
  writeFileSync(path, body);
  const intake = await intakeSourceTempFile(f.db, f.userId, {
    course_id: f.courseId,
    origin_entry_kind: 'project_upload',
    file: { path, originalname: 'finance.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: body.length },
  }, { rootDir: f.sourceRootDir });
  const published = await materializeSourceNow(f.db, f.userId, intake.source.id, { sourceRootDir: f.sourceRootDir, canvasAssetRootDir: f.canvasAssetRootDir });
  assert.equal(published.status, 'materialized');
  return { id: intake.source.id, noteId: published.projection_note_id! };
}

function blocks(f: Fixture, noteId: string): string[] {
  return (f.db.prepare(`
    SELECT nb.plain_text FROM note_block_placements p JOIN note_blocks nb ON nb.id = p.block_id
    WHERE p.note_id = ? ORDER BY p.order_index ASC
  `).all(noteId) as Array<{ plain_text: string }>).map((row) => row.plain_text);
}

const FINANCE_BODY = [
  p(t('现值公式 PV = '), om(frac(r('C'), r('i'))), t(' = 结果')),
  p(om(`<m:nary><m:naryPr><m:chr m:val="∑"/></m:naryPr><m:sub>${r('t=1')}</m:sub><m:sup>${r('T')}</m:sup><m:e>${frac(`<m:sSub><m:e>${r('C')}</m:e><m:sub>${r('t')}</m:sub></m:sSub>`, `<m:sSup><m:e>${r('(1+i)')}</m:e><m:sup>${r('t')}</m:sup></m:sSup>`)}</m:e></m:nary>`)),
].join('');

test('through the real publish: the note reads the formula, no = =, no warning banner', async () => {
  await withDb(async (f) => {
    const { id, noteId } = await upload(f, await docx(FINANCE_BODY));
    assert.deepEqual(blocks(f, noteId), [
      '现值公式 PV = \\(\\frac{C}{i}\\) = 结果',
      '\\(\\sum_{t=1}^{T}{\\frac{{C}_{t}}{{(1+i)}^{t}}}\\)',
    ]);
    assert.equal(getSourceRecordDetail(f.db, f.userId, id, { rootDir: f.sourceRootDir }).materialization.has_parser_messages, false);
  });
});

test('a declared formula raises the notice through the real publish', async () => {
  await withDb(async (f) => {
    const { id, noteId } = await upload(f, await docx(p(t('前 '), om(`<m:futureThing>${r('αβ')}</m:futureThing>`), t(' 后'))));
    assert.deepEqual(blocks(f, noteId), ['前 [公式未能转换,见原页;原文字符:αβ] 后']);
    assert.equal(getSourceRecordDetail(f.db, f.userId, id, { rootDir: f.sourceRootDir }).materialization.has_parser_messages, true);
  });
});

for (const [name, damage] of [
  ['an unclosed body', (xml: string) => xml.replace('</w:body>', '')],
  ['an unclosed paragraph', (xml: string) => xml.replace('</w:p>', '')],
] as const) {
  test(`${name} with a formula fails exactly like the same damage without one, not as an empty note`, async () => {
    const damaged = async (body: string) => {
      const zip = await JSZip.loadAsync(await docx(body));
      const xml = await zip.file('word/document.xml')!.async('string');
      const broken = damage(xml);
      assert.notEqual(broken, xml);
      zip.file('word/document.xml', broken);
      return zip.generateAsync({ type: 'nodebuffer' });
    };
    await assert.rejects(inlineDocxFormulas(await damaged(p(t('正文'), om(r('x'))))), /could not be read/);
    const original = console.warn;
    console.warn = () => undefined;
    try {
      await withDb(async (f) => {
        const publish = async (body: Buffer) => {
          const path = join(f.sourceRootDir, '.tmp', `${uuidv4()}.upload`);
          writeFileSync(path, body);
          const intake = await intakeSourceTempFile(f.db, f.userId, {
            course_id: f.courseId,
            origin_entry_kind: 'project_upload',
            file: { path, originalname: 'finance.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: body.length },
          }, { rootDir: f.sourceRootDir });
          const { status, projection_note_id: note, error_code: code } = await materializeSourceNow(f.db, f.userId, intake.source.id, { sourceRootDir: f.sourceRootDir, canvasAssetRootDir: f.canvasAssetRootDir });
          return { status, note, code };
        };
        const withFormula = await publish(await damaged(p(t('正文'), om(r('x')))));
        assert.deepEqual(withFormula, { status: 'failed', note: null, code: 'invalid_or_corrupt' });
        assert.deepEqual(withFormula, await publish(await damaged(p(t('正文')))));
      });
    } finally {
      console.warn = original;
    }
  });
}

test('paragraph locators and blocks of a formula-free document match plain mammoth', async () => {
  const body = await docx(`${p(t('第一段'))}${p(t('第二段'))}${p(t('第三段'))}`);
  const path = join(tmpdir(), `coincides-omml-${uuidv4()}.docx`);
  writeFileSync(path, body);
  try {
    const artifact = await parseSourceArtifact({
      parser_key: 'native-docx', parser_version: '1.12.0', file_path: path,
      original_filename: 'plain.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    } as never);
    const raw = (await mammoth.extractRawText({ buffer: body })).value.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    assert.deepEqual(artifact.blocks.map((block) => block.text), raw);
    assert.deepEqual(artifact.blocks.map((block) => block.locator), [1, 2, 3].map((index) => ({ kind: 'docx_paragraph', index })));
  } finally {
    rmSync(path, { force: true });
  }
});

test('an older note gets the formula through one rebuild, on a new note', async () => {
  await withDb(async (f) => {
    const { id, noteId } = await upload(f, await docx(FINANCE_BODY));
    // What a note published before this change looks like.
    f.db.prepare("UPDATE note_blocks SET plain_text = '现值公式 PV =  = 结果' WHERE id IN (SELECT block_id FROM note_block_placements WHERE note_id = ?) AND plain_text LIKE '现值%'").run(noteId);
    const rebuilt = await rematerializeSource(f.db, f.userId, id, { sourceRootDir: f.sourceRootDir, canvasAssetRootDir: f.canvasAssetRootDir });
    assert.notEqual(rebuilt.projection_note_id, noteId);
    assert.equal(blocks(f, rebuilt.projection_note_id)[0], '现值公式 PV = \\(\\frac{C}{i}\\) = 结果');
  });
});
