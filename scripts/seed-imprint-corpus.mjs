#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const serverRoot = join(repoRoot, 'server');
const databasePath = join(serverRoot, 'coincides.db');
const sourceRootDir = join(serverRoot, 'uploads', 'source-blobs');
const canvasAssetRootDir = join(serverRoot, 'uploads', 'canvas-assets');
const sourceTempDir = join(sourceRootDir, '.tmp');
const evidenceRoot = resolve('D:/Coinsides/v12.9-selection/samples');

const seedAccountEmail = 'test@test.com';
const corpus = [
  {
    volume: 'academic-reading',
    filename: 'ielts-academic-reading-sample-tasks-2023.pdf',
  },
  {
    volume: 'academic-writing-responses',
    filename: 'ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf',
  },
  {
    volume: 'academic-writing-tasks',
    filename: 'ielts-academic-writing-sample-tasks-2023.pdf',
  },
  {
    volume: 'academic-listening',
    filename: 'ielts-listening-sample-tasks-2023.pdf',
  },
];

function requireUnsetPdfParser() {
  if (Object.prototype.hasOwnProperty.call(process.env, 'COINCIDES_PDF_PARSER')) {
    throw new Error('COINCIDES_PDF_PARSER must be absent; this seed measures the production default parser');
  }
}

async function removeIfPresent(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function selectExistingAccountAndCourse(db) {
  const row = db.prepare(`
    SELECT
      u.id AS user_id,
      u.email,
      u.name AS user_name,
      c.id AS course_id,
      c.name AS course_name
    FROM users u
    JOIN courses c ON c.user_id = u.id
    WHERE u.email = ?
    ORDER BY c.created_at ASC, c.id ASC
    LIMIT 1
  `).get(seedAccountEmail);
  if (!row) {
    throw new Error(`Existing seed account/course not found for ${seedAccountEmail}; no user or course was created`);
  }
  return row;
}

function readChainRows(db, userId, sourceRecordId) {
  return db.prepare(`
    SELECT
      sr.id AS source_record_id,
      sf.id AS source_file_id,
      sf.original_filename,
      sm.id AS materialization_id,
      sm.parser_key,
      sm.parser_version,
      sm.status AS materialization_status,
      sm.error_code AS materialization_error_code,
      si.id AS imprint_id,
      si.status AS imprint_status,
      si.anchor_fidelity,
      si.transcriber_name,
      si.transcriber_version,
      si.transcriber_lockfile_hash,
      si.fragment_count AS declared_fragment_count,
      COUNT(f.id) AS actual_fragment_count
    FROM source_records sr
    JOIN source_files sf
      ON sf.source_record_id = sr.id AND sf.user_id = sr.user_id
    JOIN source_materializations sm
      ON sm.source_record_id = sr.id
      AND sm.source_file_id = sf.id
      AND sm.user_id = sr.user_id
    LEFT JOIN source_imprints si
      ON si.source_file_id = sf.id AND si.user_id = sr.user_id
    LEFT JOIN imprint_fragments f ON f.imprint_id = si.id
    WHERE sr.id = ? AND sr.user_id = ?
    GROUP BY
      sr.id, sf.id, sf.original_filename,
      sm.id, sm.parser_key, sm.parser_version, sm.status, sm.error_code,
      si.id, si.status, si.anchor_fidelity,
      si.transcriber_name, si.transcriber_version,
      si.transcriber_lockfile_hash, si.fragment_count
    ORDER BY si.created_at ASC, si.id ASC
  `).all(sourceRecordId, userId);
}

function diagnosticError(message, workOrderStep, workOrderCode) {
  const error = new Error(message);
  error.workOrderStep = workOrderStep;
  error.workOrderCode = workOrderCode;
  return error;
}

function assertCompletedChain(volume, chainRows) {
  if (chainRows.length === 0) {
    throw diagnosticError(
      `[${volume}] source materialization chain is missing`,
      'scheduleSourceMaterialization',
      'audit:materialization_chain_missing',
    );
  }

  for (const row of chainRows) {
    if (
      row.imprint_id !== null
      && Number(row.declared_fragment_count) !== Number(row.actual_fragment_count)
    ) {
      throw diagnosticError(
        `[${volume}] fragment_count mismatch for imprint ${row.imprint_id}: `
        + `${row.declared_fragment_count} declared vs ${row.actual_fragment_count} actual`,
        'storeSourceImprint',
        'audit:fragment_count_mismatch',
      );
    }
  }

  const materialization = chainRows[0];
  if (materialization.materialization_status !== 'materialized') {
    throw diagnosticError(
      `[${volume}] materialization stopped at ${materialization.materialization_status}`
      + ` (${materialization.materialization_error_code || 'no_error_code'})`,
      'scheduleSourceMaterialization',
      materialization.materialization_error_code || 'audit:materialization_not_materialized',
    );
  }
  if (materialization.parser_key !== 'native-pdf' || materialization.parser_version !== '2.4.5') {
    throw diagnosticError(
      `[${volume}] unexpected parser ${materialization.parser_key}@${materialization.parser_version}`,
      'scheduleSourceMaterialization',
      'audit:unexpected_parser_identity',
    );
  }

  const accepted = chainRows.filter((row) => (
    row.imprint_status === 'accepted'
    && row.transcriber_name === 'native-pdf'
    && row.transcriber_version === '2.4.5'
  ));
  if (accepted.length !== 1) {
    throw diagnosticError(
      `[${volume}] expected exactly one accepted native-pdf@2.4.5 imprint; found ${accepted.length}`,
      'storeSourceImprint',
      'audit:accepted_imprint_cardinality',
    );
  }
  if (Number(accepted[0].actual_fragment_count) === 0) {
    throw diagnosticError(
      `[${volume}] storeSourceImprint produced zero fragments (code=audit:zero_fragments)`,
      'storeSourceImprint',
      'audit:zero_fragments',
    );
  }
}

async function main() {
  requireUnsetPdfParser();

  const serverRequire = createRequire(join(serverRoot, 'package.json'));
  const Database = serverRequire('better-sqlite3');
  const sourceFileIntakeUrl = pathToFileURL(join(
    serverRoot,
    'src',
    'services',
    'sourceFileIntake.ts',
  )).href;
  const sourceMaterializationUrl = pathToFileURL(join(
    serverRoot,
    'src',
    'services',
    'sourceMaterialization.ts',
  )).href;
  const {
    ensureSourceStorageDirectories,
    intakeSourceTempFile,
  } = await import(sourceFileIntakeUrl);
  const {
    scheduleSourceMaterialization,
    waitForScheduledSourceMaterializations,
  } = await import(sourceMaterializationUrl);

  ensureSourceStorageDirectories(sourceRootDir);
  await mkdir(sourceTempDir, { recursive: true });

  const db = new Database(databasePath, { fileMustExist: true });
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  try {
    const account = selectExistingAccountAndCourse(db);
    console.log(JSON.stringify({
      event: 'seed_identity',
      parser_environment: 'COINCIDES_PDF_PARSER_UNSET',
      user_id: account.user_id,
      email: account.email,
      user_name: account.user_name,
      course_id: account.course_id,
      course_name: account.course_name,
    }));

    for (const entry of corpus) {
      let step = 'intakeSourceTempFile';
      let fallbackCode = 'audit:evidence_stat_failed';
      console.log(JSON.stringify({ event: 'volume_start', volume: entry.volume }));
      try {
        const evidencePath = join(evidenceRoot, entry.filename);
        const evidenceStat = await stat(evidencePath);
        if (!evidenceStat.isFile()) {
          throw diagnosticError(
            `[${entry.volume}] evidence path is not a file`,
            step,
            'audit:evidence_not_file',
          );
        }

        const tempPath = join(sourceTempDir, `${randomUUID()}.upload`);
        let intake;
        try {
          fallbackCode = 'audit:managed_temp_copy_failed';
          await copyFile(evidencePath, tempPath);
          fallbackCode = 'audit:intake_failed';
          intake = await intakeSourceTempFile(db, account.user_id, {
            course_id: account.course_id,
            origin_entry_kind: 'project_upload',
            file_mtime: evidenceStat.mtime.toISOString(),
            file: {
              path: tempPath,
              originalname: entry.filename,
              mimetype: 'application/pdf',
              size: evidenceStat.size,
            },
          }, {
            rootDir: sourceRootDir,
            expandContainers: false,
          });
        } finally {
          await removeIfPresent(tempPath);
        }

        step = 'scheduleSourceMaterialization';
        fallbackCode = 'audit:schedule_failed';
        const scheduled = scheduleSourceMaterialization(
          db,
          account.user_id,
          intake.source.id,
          { sourceRootDir, canvasAssetRootDir },
        );
        fallbackCode = 'audit:scheduled_work_wait_failed';
        await waitForScheduledSourceMaterializations();

        step = 'storeSourceImprint';
        fallbackCode = 'audit:chain_query_failed';
        const chainRows = readChainRows(db, account.user_id, intake.source.id);
        console.log(JSON.stringify({
          event: 'volume_chain',
          volume: entry.volume,
          intake_created: intake.created,
          intake_deduplicated: intake.deduplicated,
          schedule_claimed: scheduled.claimed,
          chain: chainRows,
        }));
        fallbackCode = 'audit:chain_invariant_failed';
        assertCompletedChain(entry.volume, chainRows);
      } catch (error) {
        console.error(JSON.stringify({
          event: 'volume_failure',
          volume: entry.volume,
          step: error?.workOrderStep || step,
          code: error?.workOrderCode || error?.details?.code || error?.code || fallbackCode,
        }));
        throw error;
      }
    }

    console.log(JSON.stringify({ event: 'seed_complete', volumes: corpus.length }));
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
