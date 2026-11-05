import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  return (await mammoth.extractRawText({ buffer: await inlineDocxFormulas(await docx(body)) })).value.trim();
}

const formula = async (body: string) => textOf(p(om(body)));

const STRUCTURES: Array<[string, string, string]> = [
  ['fraction', frac(r('C'), r('i')), '$\\frac{C}{i}$'],
  ['nested fraction', frac(r('1'), frac(r('1'), r('1+x'))), '$\\frac{1}{\\frac{1}{1+x}}$'],
  ['linear fraction', `<m:f><m:fPr><m:type m:val="lin"/></m:fPr><m:num>${r('a')}</m:num><m:den>${r('b')}</m:den></m:f>`, '$a/b$'],
  ['superscript', `<m:sSup><m:e>${r('x')}</m:e><m:sup>${r('2')}</m:sup></m:sSup>`, '${x}^{2}$'],
  ['subscript', `<m:sSub><m:e>${r('C')}</m:e><m:sub>${r('t')}</m:sub></m:sSub>`, '${C}_{t}$'],
  ['both scripts', `<m:sSubSup><m:e>${r('x')}</m:e><m:sub>${r('i')}</m:sub><m:sup>${r('2')}</m:sup></m:sSubSup>`, '${x}_{i}^{2}$'],
  ['square root', `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${r('x')}</m:e></m:rad>`, '$\\sqrt{x}$'],
  ['nth root', `<m:rad><m:deg>${r('3')}</m:deg><m:e>${r('x')}</m:e></m:rad>`, '$\\sqrt[3]{x}$'],
  ['sum', `<m:nary><m:naryPr><m:chr m:val="∑"/></m:naryPr><m:sub>${r('t=1')}</m:sub><m:sup>${r('T')}</m:sup><m:e>${r('x')}</m:e></m:nary>`, '$\\sum_{t=1}^{T}{x}$'],
  ['integral by default', `<m:nary><m:sub>${r('0')}</m:sub><m:sup>${r('1')}</m:sup><m:e>${r('f')}</m:e></m:nary>`, '$\\int_{0}^{1}{f}$'],
  ['parentheses', `<m:d><m:e>${r('a')}</m:e></m:d>`, '$\\left(a\\right)$'],
  ['custom delimiters', `<m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val="}"/></m:dPr><m:e>${r('a')}</m:e><m:e>${r('b')}</m:e></m:d>`, '$\\left[a | b\\right\\}$'],
  ['open delimiter', `<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e>${r('a')}</m:e></m:d>`, '$\\left\\{a\\right.$'],
  ['function', `<m:func><m:fName>${r('ln')}</m:fName><m:e>${r('x')}</m:e></m:func>`, '$\\ln{x}$'],
  ['unknown function', `<m:func><m:fName>${r('Var')}</m:fName><m:e>${r('x')}</m:e></m:func>`, '$\\operatorname{Var}{x}$'],
  ['limit', `<m:func><m:fName><m:limLow><m:e>${r('lim')}</m:e><m:lim>${r('n→∞')}</m:lim></m:limLow></m:fName><m:e>${r('x')}</m:e></m:func>`, '$\\lim_{n→∞}{x}$'],
  ['matrix', `<m:m><m:mr><m:e>${r('a')}</m:e><m:e>${r('b')}</m:e></m:mr><m:mr><m:e>${r('c')}</m:e><m:e>${r('d')}</m:e></m:mr></m:m>`, '$\\begin{matrix} a & b \\\\ c & d \\end{matrix}$'],
  ['accent', `<m:acc><m:accPr><m:chr m:val="̂"/></m:accPr><m:e>${r('β')}</m:e></m:acc>`, '$\\hat{β}$'],
  ['bar', `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${r('x')}</m:e></m:bar>`, '$\\overline{x}$'],
  ['special characters', r('a_b%c#d&amp;e$f'), '$a\\_b\\%c\\#d\\&e\\$f$'],
];

for (const [name, body, expected] of STRUCTURES) {
  test(`OMML ${name}`, async () => {
    assert.equal(await formula(body), expected);
  });
}

test('a formula stays where it was, in the running text, with Chinese around it', async () => {
  assert.equal(
    await textOf(p(t('永续年金 PV = '), om(frac(r('C'), r('i'))), t(' = 面值,'), om(r('x')), t(' 结束。'))),
    '永续年金 PV = $\\frac{C}{i}$ = 面值,$x$ 结束。',
  );
});

test('display formulas: in a paragraph, several in one, and directly in the body', async () => {
  assert.equal(await textOf(p(`<m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>${om(r('a'))}${om(r('b'))}</m:oMathPara>`)), '$a$ $b$');
  assert.equal(await textOf(`${p(t('前'))}<m:oMathPara>${om(r('c'))}</m:oMathPara>${p(t('后'))}`), '前\n\n$c$\n\n后');
});

test('an unknown structure gives up its text, and no m:t is ever dropped', async () => {
  assert.equal(await formula(`<m:futureThing><m:deep>${r('αβ')}<m:deeper>${r('γ')}</m:deeper></m:deep></m:futureThing>`), '$αβγ$');
  assert.equal(await formula(`<m:box><m:e>${r('x')}</m:e></m:box>${r('y')}`), '$xy$');
  // Children of a known structure outside its named slots are not read by the converter.
  const stray = await formula(`<m:f><m:num>${r('a')}</m:num><m:den>${r('b')}</m:den><m:stray>${r('LOST')}</m:stray></m:f>`);
  assert.equal(stray, '$abLOST$', 'the guard falls back to plain text rather than lose LOST');
});

test('every m:t character survives across all structures, in order', async () => {
  const everything = STRUCTURES.map(([, body]) => body).join('');
  const source = [...everything.matchAll(/<m:t>([^<]*)<\/m:t>/g)].map((match) => match[1].replace('&amp;', '&')).join('').replace(/\s/g, '');
  const output = (await formula(everything)).replace(/\s/g, '');
  let position = 0;
  for (const char of source) {
    position = output.indexOf(char, position);
    assert.notEqual(position, -1, `lost ${char}`);
    position += char.length;
  }
});

test('an empty formula leaves nothing behind, and mammoth no longer warns', async () => {
  assert.equal(await textOf(p(t('文本'), '<m:oMath/>')), '文本');
  const buffer = await inlineDocxFormulas(await docx(p(t('a '), om(frac(r('1'), r('2'))))));
  assert.deepEqual((await mammoth.extractRawText({ buffer })).messages, []);
});

test('other warnings still stand after formulas are handled', async () => {
  const buffer = await inlineDocxFormulas(await docx(p(t('a '), om(r('x')), '<w:unknownThing/>')));
  const { messages } = await mammoth.extractRawText({ buffer });
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /unknownThing/);
  assert.doesNotMatch(messages[0].message, /oMath/);
});

test('a document with no formula is returned untouched, byte for byte', async () => {
  const buffer = await docx(`${p(t('标题 oMathlike words'))}${p(t('正文'))}`);
  assert.equal(await inlineDocxFormulas(buffer), buffer);
  const plain = await docx(p(t('正文')));
  assert.equal(await inlineDocxFormulas(plain), plain);
});

test('any failure in formula handling returns the original', async () => {
  const buffer = await docx(p(t('a'), om(r('x'))));
  const original = console.warn;
  const warned: string[] = [];
  console.warn = (...args: unknown[]) => { warned.push(args.join(' ')); };
  try {
    assert.equal(await inlineDocxFormulasOrOriginal(buffer, async () => { throw new Error('synthetic failure'); }), buffer);
    const notAZip = Buffer.from('not a zip');
    assert.equal(await inlineDocxFormulasOrOriginal(notAZip), notAZip);
  } finally {
    console.warn = original;
  }
  assert.ok(warned.some((line) => line.includes('synthetic failure')));
});

test('malformed XML that mentions a formula is refused by the handler, not swallowed into bad text', async () => {
  const zip = new JSZip();
  zip.file('word/document.xml', `<w:document ${NS}><w:body><m:oMath></w:body>`);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  await assert.rejects(inlineDocxFormulas(buffer));
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
      '现值公式 PV = $\\frac{C}{i}$ = 结果',
      '$\\sum_{t=1}^{T}{\\frac{{C}_{t}}{{(1+i)}^{t}}}$',
    ]);
    assert.equal(getSourceRecordDetail(f.db, f.userId, id, { rootDir: f.sourceRootDir }).materialization.has_parser_messages, false);
  });
});

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
    assert.equal(blocks(f, rebuilt.projection_note_id)[0], '现值公式 PV = $\\frac{C}{i}$ = 结果');
  });
});
