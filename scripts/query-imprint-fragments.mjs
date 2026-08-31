#!/usr/bin/env node

import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MAX_API_CALLS = 10;
const MAX_INPUT_CHARACTERS = 5_000;
const WALKTHROUGH_ACCOUNT_EMAIL = 'test@test.com';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const serverRoot = join(repoRoot, 'server');
const databasePath = join(serverRoot, 'coincides.db');

function inputCharacters(values) {
  return values.reduce((sum, value) => sum + Array.from(value).length, 0);
}

function safeFailureCode(error) {
  const allowed = new Set([
    'missing_api_key',
    'empty_batch',
    'invalid_input',
    'network_error',
    'http_error',
    'invalid_response',
    'invalid_configuration',
    'provider_contract_mismatch',
    'ownership_receipt_missing',
    'hydration_failed',
  ]);
  return allowed.has(error?.code) ? error.code : 'unexpected_error';
}

async function main() {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    const error = new Error('query required');
    error.code = 'invalid_input';
    throw error;
  }
  if (inputCharacters([query]) > MAX_INPUT_CHARACTERS) {
    const error = new Error('input budget exceeded');
    error.code = 'invalid_input';
    throw error;
  }

  const initUrl = pathToFileURL(join(serverRoot, 'src', 'db', 'init.ts')).href;
  const providerUrl = pathToFileURL(join(serverRoot, 'src', 'embedding', 'dashscope.ts')).href;
  const serviceUrl = pathToFileURL(join(serverRoot, 'src', 'services', 'imprintRetrieval.ts')).href;
  const { closeDb, initDb } = await import(initUrl);
  const {
    createDashScopeEmbeddingProvider,
    getDashScopeCredentialMetadata,
  } = await import(providerUrl);
  const { retrieveImprintFragments } = await import(serviceUrl);

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
    const account = db.prepare(`
      SELECT id, email
      FROM users
      WHERE email = ?
      LIMIT 1
    `).get(WALKTHROUGH_ACCOUNT_EMAIL);
    if (!account) throw new Error('Walkthrough account is unavailable');

    const baseProvider = createDashScopeEmbeddingProvider();
    let apiCalls = 0;
    let totalInputCharacters = 0;
    const provider = {
      ...baseProvider,
      async embed(inputs) {
        const nextCalls = apiCalls + 1;
        const nextCharacters = totalInputCharacters + inputCharacters(inputs);
        if (nextCalls > MAX_API_CALLS || nextCharacters > MAX_INPUT_CHARACTERS) {
          const error = new Error('walkthrough budget exceeded');
          error.code = 'invalid_input';
          throw error;
        }
        apiCalls = nextCalls;
        totalInputCharacters = nextCharacters;
        return baseProvider.embed(inputs);
      },
    };

    const results = await retrieveImprintFragments(db, account.id, {
      query,
      k: 3,
      provider,
    });
    console.log(JSON.stringify({
      event: 'imprint_retrieval_complete',
      account: { id: account.id, email: account.email },
      query,
      api_calls: apiCalls,
      input_characters: totalInputCharacters,
      result_count: results.length,
      results,
    }, null, 2));
  } finally {
    closeDb();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    event: 'imprint_retrieval_failure',
    code: safeFailureCode(error),
  }));
  process.exitCode = 1;
});
