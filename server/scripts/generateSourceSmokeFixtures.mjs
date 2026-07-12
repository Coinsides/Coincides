import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';

const outputDir = resolve(process.cwd(), '..', '.codex-tmp', 'source-smoke-fixtures');
await mkdir(outputDir, { recursive: true });

await writeFile(
  resolve(outputDir, 'source-smoke.txt'),
  'Source Smoke Fixture\n\nDefinition: a source preserves evidence.\n\nExample: a note projection cites this paragraph.\n',
  'utf8',
);

await writeFile(
  resolve(outputDir, 'source-smoke.md'),
  '# Source Smoke Fixture\n\n## Definition\n\nA Source keeps the original fact separate from its reading projection.\n',
  'utf8',
);

await writeFile(
  resolve(outputDir, 'source-smoke.csv'),
  'kind,value\nsource,original\nprojection,derived\n',
  'utf8',
);

const pdf = await PDFDocument.create();
const page = pdf.addPage([612, 792]);
const font = await pdf.embedFont(StandardFonts.Helvetica);
page.drawText('Source Smoke Fixture', { x: 72, y: 720, size: 18, font });
page.drawText('The original remains evidence; the projection remains derived.', { x: 72, y: 686, size: 11, font });
await writeFile(resolve(outputDir, 'source-smoke.pdf'), await pdf.save());

const docx = new JSZip();
docx.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
docx.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
docx.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Source Smoke Fixture</w:t></w:r></w:p>
    <w:p><w:r><w:t>The original remains evidence; the projection remains derived.</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`);
await writeFile(resolve(outputDir, 'source-smoke.docx'), await docx.generateAsync({ type: 'nodebuffer' }));

const corruptDocx = new JSZip();
corruptDocx.file('broken.txt', 'This is a ZIP container without a Word document part.');
await writeFile(
  resolve(outputDir, 'source-smoke-corrupt.docx'),
  await corruptDocx.generateAsync({ type: 'nodebuffer' }),
);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.aoa_to_sheet([
    ['kind', 'value'],
    ['source', 'original'],
    ['projection', 'derived'],
  ]),
  'Source',
);
XLSX.writeFile(workbook, resolve(outputDir, 'source-smoke.xlsx'));

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP4z8DAwMDAxMDAwAAAFAABJzQnCgAAAABJRU5ErkJggg==',
  'base64',
);
await writeFile(resolve(outputDir, 'source-smoke.png'), png);

console.log(outputDir);
