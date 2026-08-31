#!/usr/bin/env node

import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const serverRoot = join(repoRoot, 'server');
const databasePath = join(serverRoot, 'coincides.db');

function safeFailureCode(error) {
  const allowed = new Set([
    'missing_api_key',
    'empty_batch',
    'invalid_input',
    'network_error',
    'http_error',
    'invalid_response',
    'invalid_configuration',
    'budget_exceeded',
    'fragment_not_found',
    'vector_identity_conflict',
    'provider_contract_mismatch',
  ]);
  return allowed.has(error?.code) ? error.code : 'unexpected_error';
}

async function main() {
  const initUrl = pathToFileURL(join(serverRoot, 'src', 'db', 'init.ts')).href;
  const providerUrl = pathToFileURL(join(serverRoot, 'src', 'embedding', 'dashscope.ts')).href;
  const serviceUrl = pathToFileURL(join(serverRoot, 'src', 'services', 'imprintEmbedding.ts')).href;
  const { closeDb, initDb } = await import(initUrl);
  const { getDashScopeCredentialMetadata } = await import(providerUrl);
  const { embedImprintFragments } = await import(serviceUrl);

  const credential = getDashScopeCredentialMetadata();
  console.log(JSON.stringify({
    event: 'dashscope_credential_status',
    present: credential.present,
    length: credential.length,
  }));
  if (!credential.present) {
    const error = new Error('credential unavailable');
    error.code = 'missing_api_key';
    throw error;
  }

  const db = await initDb(databasePath);
  try {
    const result = await embedImprintFragments(db, { batchSize: 10 });
    console.log(JSON.stringify({
      event: 'imprint_embedding_complete',
      model_id: result.modelId,
      total_fragments: result.totalFragments,
      pending_fragments: result.pendingFragments,
      inserted: result.inserted,
      already_embedded: result.alreadyEmbedded,
      skipped: result.skipped,
      api_calls: result.apiCalls,
      input_characters: result.inputCharacters,
      batch_size: result.batchSize,
      retry_count: result.retryCount,
    }));
  } finally {
    closeDb();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    event: 'imprint_embedding_failure',
    code: safeFailureCode(error),
  }));
  process.exitCode = 1;
});
