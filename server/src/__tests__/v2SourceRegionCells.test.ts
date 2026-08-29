import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import {
  SOURCE_ARTIFACT_CELL_GEOMETRY_TRIGGERS,
  SOURCE_ARTIFACT_CELL_GEOMETRY_UNAVAILABLE_DECLARATION,
  SOURCE_ARTIFACT_COUNT_BASES,
  parseSourceArtifact,
  type SourceArtifact,
  type SourceArtifactTableBlock,
} from '../services/sourceArtifact.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import {
  getImprintFragmentsByAnchor,
  getSourceImprint,
  validateSourceImprint,
  type PageAnchor,
  type SourceImprintInput,
} from '../services/sourceImprints.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';
import { mineruParserVersion } from '../services/sourceMineruParser.js';

type TestDb = Awaited<ReturnType<typeof initDb>>;

const SELECTION_ROOT = 'D:/Coinsides/v12.9-selection';
const SAMPLE_PDF = join(SELECTION_ROOT, 'samples', 'ielts-listening-sample-tasks-2023.pdf');
const MINERU_PYTHON = join(SELECTION_ROOT, 'tools', 'mineru', '.venv', 'Scripts', 'python.exe');
const ORIGINAL_PAGE_INDEX = 29;
const ENV_KEYS = [
  'COINCIDES_PDF_PARSER',
  'COINCIDES_MINERU_COMMAND_JSON',
  'COINCIDES_MINERU_COMMAND_TIMEOUT_MS',
  'COINCIDES_MINERU_LANGUAGE',
  'COINCIDES_MINERU_PYTHON',
  'SOURCE_BLOB_DIR',
  'CANVAS_ASSET_DIR',
] as const;

const PDFIUM_CROP = String.raw`import importlib.metadata
import json
import sys
import pypdfium2 as pdfium

document = pdfium.PdfDocument(sys.argv[1])
page = document[int(sys.argv[2])]
text_page = page.get_textpage()
width, height = page.get_size()
x0, y0, x1, y1 = json.loads(sys.argv[3])
box = (x0 * width, height - y1 * height, x1 * width, height - y0 * height)
text = text_page.get_text_bounded(*box)
print(json.dumps({
    "version": importlib.metadata.version("pypdfium2"),
    "media_size": [width, height],
    "crop_box": box,
    "text": text,
}, ensure_ascii=True))
text_page.close()
page.close()
document.close()
`;

function seedUserCourse(db: TestDb) {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, 'hash', 'Region Cells User', datetime('now'))
  `).run(userId, `${userId}@example.com`);
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, 'Region Cells Project', datetime('now'), datetime('now'))
  `).run(courseId, userId);
  return { userId, courseId };
}

async function onePagePdf(): Promise<Buffer> {
  const source = await PDFDocument.load(readFileSync(SAMPLE_PDF));
  const output = await PDFDocument.create();
  const [page] = await output.copyPages(source, [ORIGINAL_PAGE_INDEX]);
  output.addPage(page);
  return Buffer.from(await output.save());
}

async function intakePdf(
  db: TestDb,
  userId: string,
  courseId: string,
  sourceRootDir: string,
  filename: string,
  bytes: Buffer,
) {
  const tempDir = join(sourceRootDir, '.tmp');
  const uploadPath = join(tempDir, `${uuidv4()}.upload`);
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(uploadPath, bytes);
  return intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: {
      path: uploadPath,
      originalname: filename,
      mimetype: 'application/pdf',
      size: bytes.length,
    },
  }, { rootDir: sourceRootDir });
}

function tableBlock(artifact: SourceArtifact): SourceArtifactTableBlock {
  const tables = artifact.blocks.filter((block): block is SourceArtifactTableBlock => block.kind === 'table');
  assert.equal(tables.length, 1, 'the real MinerU page must yield exactly one table-level fragment');
  return tables[0];
}

function pdfiumCrop(pdfPath: string, bbox: [number, number, number, number]) {
  const result = execFileSync(MINERU_PYTHON, [
    '-B',
    '-c',
    PDFIUM_CROP,
    pdfPath,
    '0',
    JSON.stringify(bbox),
  ], { encoding: 'utf8' });
  return JSON.parse(result) as {
    version: string;
    media_size: [number, number];
    crop_box: [number, number, number, number];
    text: string;
  };
}

function ocrTextKey(value: string): string {
  // MinerU HTML is OCR text while PDFium reads the embedded text layer. Removing
  // only whitespace and Unicode punctuation reconciles collapsed spaces, smart
  // quotes and dotted answer blanks while preserving case, letters, numbers and £.
  return value.replace(/[\s\p{P}]+/gu, '');
}

function normalizedBbox(block: SourceArtifactTableBlock): [number, number, number, number] {
  const [width, height] = block.source_region.page_size;
  const [x0, y0, x1, y1] = block.source_region.raw_bbox;
  return [x0 / width, y0 / height, x1 / width, y1 / height];
}

function inputFromStored(
  sourceFileId: string,
  stored: ReturnType<typeof getSourceImprint>,
): SourceImprintInput {
  return {
    source_file_id: sourceFileId,
    transcriber: {
      name: stored.imprint.transcriber_name,
      version: stored.imprint.transcriber_version,
      lockfile: stored.imprint.transcriber_lockfile,
      lockfile_hash: stored.imprint.transcriber_lockfile_hash as string,
    },
    anchor_fidelity: stored.imprint.anchor_fidelity,
    text_normalization: stored.imprint.text_normalization,
    fragments: stored.fragments.map((fragment) => ({
      seq: fragment.seq,
      text: fragment.text,
      role: fragment.role,
      anchor: fragment.anchor,
      style: fragment.style,
      lang: fragment.lang,
    })),
    warnings: stored.imprint.warnings,
  };
}

test('V12.9c c-1b-2 keeps MinerU table regions honest and declares cell geometry unavailable', async (t) => {
  assert.equal(existsSync(SAMPLE_PDF), true, `missing read-only evidence sample: ${SAMPLE_PDF}`);
  assert.equal(existsSync(MINERU_PYTHON), true, `missing pinned MinerU runtime: ${MINERU_PYTHON}`);

  const directory = mkdtempSync(join(tmpdir(), 'coincides-source-region-cells-'));
  const sourceRootDir = join(directory, 'source-blobs');
  const canvasAssetRootDir = join(directory, 'canvas-assets');
  const environment = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    delete process.env.COINCIDES_MINERU_COMMAND_JSON;
    delete process.env.COINCIDES_MINERU_COMMAND_TIMEOUT_MS;
    process.env.COINCIDES_PDF_PARSER = 'mineru';
    process.env.COINCIDES_MINERU_LANGUAGE = 'en';
    process.env.COINCIDES_MINERU_PYTHON = MINERU_PYTHON;
    process.env.SOURCE_BLOB_DIR = sourceRootDir;
    process.env.CANVAS_ASSET_DIR = canvasAssetRootDir;

    const pdfBytes = await onePagePdf();
    const parserInputPath = join(directory, 'listening-page-30.pdf');
    writeFileSync(parserInputPath, pdfBytes);
    const artifact = await parseSourceArtifact({
      parser_key: 'mineru',
      parser_version: mineruParserVersion(),
      file_path: parserInputPath,
      original_filename: 'ielts-listening-page-30.pdf',
      mime_type: 'application/pdf',
    });
    const table = tableBlock(artifact);

    const db = await initDb(join(directory, 'test.db'));
    const { userId, courseId } = seedUserCourse(db);
    const intake = await intakePdf(
      db,
      userId,
      courseId,
      sourceRootDir,
      'ielts-listening-page-30.pdf',
      pdfBytes,
    );
    const materialized = await materializeSourceNow(db, userId, intake.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
      parseArtifact: async () => artifact,
    });
    assert.equal(materialized.status, 'materialized');

    const imprintRow = db.prepare(`
      SELECT id FROM source_imprints
      WHERE source_file_id = ? AND user_id = ? AND status = 'accepted'
    `).get(intake.source.file.id, userId) as { id: string };
    assert.ok(imprintRow?.id);
    const stored = getSourceImprint(db, userId, imprintRow.id);
    assert.equal(stored.imprint.anchor_fidelity, 'region');
    assert.equal(stored.fragments.length, artifact.blocks.length);
    const sourceFile = db.prepare('SELECT storage_key FROM source_files WHERE id = ?')
      .get(intake.source.file.id) as { storage_key: string };
    const storedPdfPath = join(sourceRootDir, sourceFile.storage_key);

    await t.test('K-1/K-3 locate the table by exact anchor with hit and exclusion, and red on wider or inferred boxes', () => {
      const tableFragment = stored.fragments.find((fragment) => fragment.role === 'table_row');
      assert.ok(tableFragment, 'the whole-table grain must be declared table_row, never cell');
      assert.equal(tableFragment.anchor.family, 'page');
      const anchor = tableFragment.anchor as PageAnchor;
      assert.ok(anchor.bbox);
      const addressed = getImprintFragmentsByAnchor(db, userId, imprintRow.id, {
        match: 'exact',
        anchor,
      });
      assert.equal(addressed.length, 1);
      assert.equal(addressed[0].id, tableFragment.id);

      const crop = pdfiumCrop(storedPdfPath, anchor.bbox);
      const cropKey = ocrTextKey(crop.text);
      const tableKey = ocrTextKey(tableFragment.text);
      const otherFragment = stored.fragments.find((fragment) => fragment.text.includes('Complete the table below.'));
      assert.ok(otherFragment);
      const otherKey = ocrTextKey(otherFragment.text);
      assert.equal(cropKey.includes(tableKey), true, 'table region must hit the complete table fragment text');
      assert.equal(cropKey.includes(otherKey), false, 'table region must exclude another fragment unique to the page');

      const wholePage = pdfiumCrop(storedPdfPath, [0, 0, 1, 1]);
      assert.equal(ocrTextKey(wholePage.text).includes(tableKey), true, 'whole page still passes the hit half');
      assert.equal(
        ocrTextKey(wholePage.text).includes(otherKey),
        true,
        'whole-page mutant must fail the exclusion half',
      );

      const blockIndex = anchor.block_index as number;
      const inferredBySequence: [number, number, number, number] = [
        0,
        (blockIndex - 1) / stored.fragments.length,
        1,
        blockIndex / stored.fragments.length,
      ];
      const inferredCrop = pdfiumCrop(storedPdfPath, inferredBySequence);
      assert.equal(
        ocrTextKey(inferredCrop.text).includes(tableKey),
        false,
        'block-sequence page partition must not masquerade as the actual table bbox',
      );
      console.info('[region-cells] K-1', JSON.stringify({
        pypdfium2: crop.version,
        anchor,
        crop_box: crop.crop_box,
        crop_text: crop.text,
        hit: true,
        excluded_unique_text: otherFragment.text,
        whole_page_exclusion_red: true,
        inferred_bbox_hit_red: true,
      }));
    });

    await t.test('K-2 rejects a valid table-family anchor mixed into the real page-family imprint', () => {
      const mixed = structuredClone(inputFromStored(intake.source.file.id, stored));
      mixed.fragments[0].anchor = { family: 'table', sheet: 'Sheet1', cell: 'A1' };
      const validation = validateSourceImprint(mixed, null);
      assert.equal(validation.accepted, false);
      assert.equal(validation.reasons.some((reason) => (
        reason.code === 'anchor_invalid'
        && reason.detail === 'One imprint must use a single anchor family'
      )), true);
    });

    await t.test('K-3 rejects page+bbox and region-without-bbox mutations of the real MinerU imprint', () => {
      const accepted = inputFromStored(intake.source.file.id, stored);

      const pageWithBbox = structuredClone(accepted);
      pageWithBbox.anchor_fidelity = 'page';
      const pageValidation = validateSourceImprint(pageWithBbox, null);
      assert.equal(pageValidation.accepted, false);
      assert.equal(pageValidation.reasons.some((reason) => (
        reason.code === 'fidelity_overclaim'
        && reason.detail === 'Page fidelity cannot carry a region bbox'
      )), true);

      const regionWithoutBbox = structuredClone(accepted);
      const tableFragment = regionWithoutBbox.fragments.find((fragment) => fragment.role === 'table_row');
      assert.ok(tableFragment && tableFragment.anchor.family === 'page');
      const { bbox: _bbox, ...pageOnly } = tableFragment.anchor;
      tableFragment.anchor = pageOnly;
      const regionValidation = validateSourceImprint(regionWithoutBbox, null);
      assert.equal(regionValidation.accepted, false);
      assert.equal(regionValidation.reasons.some((reason) => (
        reason.code === 'fidelity_overclaim'
        && reason.detail === 'Region fidelity requires a bbox'
      )), true);
    });

    await t.test('K-4 normalizes one MinerU middle coordinate face, locks the denominator, and never clamps overflow', async () => {
      assert.deepEqual(table.source_region, {
        coordinate_space: 'mineru-middle-page',
        raw_bbox: [56, 132, 531, 325],
        page_size: [595, 841],
      });
      const expected = [
        0.09411764705882353,
        0.15695600475624258,
        0.892436974789916,
        0.3864447086801427,
      ];
      assert.deepEqual(normalizedBbox(table), expected);
      const tableFragment = stored.fragments.find((fragment) => fragment.role === 'table_row');
      assert.ok(tableFragment && tableFragment.anchor.family === 'page' && tableFragment.anchor.bbox);
      assert.deepEqual(tableFragment.anchor.bbox, expected);
      assert.equal(tableFragment.anchor.bbox.every((value) => value >= 0 && value <= 1), true);

      const media = pdfiumCrop(storedPdfPath, [0, 0, 1, 1]).media_size;
      const ratio = [media[0] / 595, media[1] / 841];
      assert.ok(Math.abs(ratio[0] - 1.0005378274356618) < 1e-12);
      assert.ok(Math.abs(ratio[1] - 1.0010939154698648) < 1e-12);
      const mediaDenominator = [56 / media[0], 132 / media[1], 531 / media[0], 325 / media[1]];
      assert.notDeepEqual(mediaDenominator, expected, 'media-box denominator mutant must fail the exact mapping lock');

      const contentListFace: SourceArtifact = structuredClone(artifact);
      tableBlock(contentListFace).source_region.raw_bbox = [94, 156, 892, 386];
      const variant = await PDFDocument.load(pdfBytes);
      variant.setTitle('coordinate-face-redpoint');
      const variantBytes = Buffer.from(await variant.save());
      const redIntake = await intakePdf(
        db,
        userId,
        courseId,
        sourceRootDir,
        'coordinate-face-redpoint.pdf',
        variantBytes,
      );
      const redResult = await materializeSourceNow(db, userId, redIntake.source.id, {
        sourceRootDir,
        canvasAssetRootDir,
        parseArtifact: async () => contentListFace,
      });
      assert.equal(redResult.status, 'failed');
      const rejected = db.prepare(`
        SELECT status, rejection_reasons_json FROM source_imprints
        WHERE source_file_id = ? ORDER BY created_at DESC, id DESC LIMIT 1
      `).get(redIntake.source.file.id) as { status: string; rejection_reasons_json: string };
      assert.equal(rejected.status, 'rejected');
      const reasons = JSON.parse(rejected.rejection_reasons_json) as Array<{ code: string; detail?: string }>;
      assert.equal(reasons.some((reason) => reason.code === 'anchor_invalid'), true);

      const reversedFace: SourceArtifact = structuredClone(artifact);
      tableBlock(reversedFace).source_region.raw_bbox = [531, 132, 56, 325];
      const reversedVariant = await PDFDocument.load(pdfBytes);
      reversedVariant.setTitle('coordinate-order-redpoint');
      const reversedBytes = Buffer.from(await reversedVariant.save());
      const reversedIntake = await intakePdf(
        db,
        userId,
        courseId,
        sourceRootDir,
        'coordinate-order-redpoint.pdf',
        reversedBytes,
      );
      const reversedResult = await materializeSourceNow(db, userId, reversedIntake.source.id, {
        sourceRootDir,
        canvasAssetRootDir,
        parseArtifact: async () => reversedFace,
      });
      assert.equal(reversedResult.status, 'failed');
      const reversedRejected = db.prepare(`
        SELECT status, rejection_reasons_json FROM source_imprints
        WHERE source_file_id = ? ORDER BY created_at DESC, id DESC LIMIT 1
      `).get(reversedIntake.source.file.id) as { status: string; rejection_reasons_json: string };
      assert.equal(reversedRejected.status, 'rejected');
      const reversedReasons = JSON.parse(reversedRejected.rejection_reasons_json) as Array<{
        code: string;
        detail?: string;
      }>;
      assert.equal(reversedReasons.some((reason) => reason.code === 'anchor_invalid'), true);
      console.info('[region-cells] K-4', JSON.stringify({
        raw_bbox: table.source_region.raw_bbox,
        page_size: table.source_region.page_size,
        normalized: expected,
        media_size: media,
        media_to_mineru_ratio: ratio,
        cross_face_x1: 892 / 595,
        overflow_rejection: reasons,
        reversed_bbox_rejection: reversedReasons,
      }));
    });

    await t.test('K-5 keeps count bases closed and reports different values for the same real table', () => {
      assert.deepEqual(SOURCE_ARTIFACT_COUNT_BASES, [
        'table_fragment_count',
        'cell_text_count',
        'non_empty_td_count',
      ]);
      assert.equal(SOURCE_ARTIFACT_COUNT_BASES.includes('free_text_basis' as never), false);
      const tableFragment = stored.fragments.find((fragment) => fragment.role === 'table_row');
      assert.ok(tableFragment);
      assert.deepEqual(tableFragment.style, { source_table: table.table });
      const persistedTable = (tableFragment.style as { source_table: SourceArtifactTableBlock['table'] }).source_table;
      assert.equal(persistedTable.counts.every((count) => (
        SOURCE_ARTIFACT_COUNT_BASES.includes(count.basis)
        && Number.isInteger(count.value)
        && count.value >= 0
      )), true);
      const byBasis = new Map(persistedTable.counts.map((count) => [count.basis, count.value]));
      assert.equal(byBasis.get('table_fragment_count'), 1);
      assert.equal(byBasis.get('cell_text_count'), 20);
      assert.equal(byBasis.get('non_empty_td_count'), 20);
      assert.notEqual(byBasis.get('table_fragment_count'), byBasis.get('cell_text_count'));
      assert.equal(Math.max(...persistedTable.cells.map((cell) => cell.row_index)) + 1, 4);
      assert.equal(Math.max(...persistedTable.cells.map((cell) => cell.column_index + cell.column_span)), 5);
    });

    await t.test('K-7 explicitly declares unavailable cell geometry and all three lawful triggers', () => {
      assert.equal(
        SOURCE_ARTIFACT_CELL_GEOMETRY_UNAVAILABLE_DECLARATION,
        '单元格几何寻址：本转写器不可达',
      );
      assert.deepEqual(SOURCE_ARTIFACT_CELL_GEOMETRY_TRIGGERS, [
        'switch_to_transcriber_with_cell_geometry',
        'mineru_standard_output_includes_cell_bboxes',
        'patched_independent_transcriber_identity',
      ]);
      const tableFragment = stored.fragments.find((fragment) => fragment.role === 'table_row');
      assert.ok(tableFragment?.style);
      const persistedTable = (tableFragment.style as { source_table: SourceArtifactTableBlock['table'] }).source_table;
      assert.ok(persistedTable);
      const declaration = persistedTable.cell_geometry_addressing;
      assert.equal(declaration.status, 'unavailable_for_this_transcriber');
      assert.equal(declaration.declaration, '单元格几何寻址：本转写器不可达');
      assert.deepEqual(declaration.triggers, [
        'switch_to_transcriber_with_cell_geometry',
        'mineru_standard_output_includes_cell_bboxes',
        'patched_independent_transcriber_identity',
      ]);
      assert.deepEqual(declaration.patched_transcriber_policy, {
        transcriber_name_must_differ_from: 'mineru',
        patch_bytes_must_be_in_lockfile_fingerprint: true,
        silent_patch_forbidden: true,
      });
      assert.equal(
        Object.prototype.hasOwnProperty.call(persistedTable, 'cell_geometry_addressing'),
        true,
        'unavailable must not be omitted',
      );
    });
  } finally {
    closeDb();
    for (const key of ENV_KEYS) {
      const value = environment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
