#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL = 'text-embedding-v4';
const ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings';
const TEST_TEXT = 'canvas engine';
const REQUESTED_DIMENSIONS = 1024;
const MAX_CALLS = 1;
const MAX_INPUT_CHARACTERS = 200;
const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.experiment');

function parseEnvValue(rawValue) {
  let value = rawValue.trim();
  if (
    value.length >= 2
    && ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, '').trim();
  }
  return value;
}

function readExperimentKey() {
  const text = readFileSync(ENV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const values = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?DASHSCOPE_API_KEY\s*=(.*)$/);
    if (match) values.push(parseEnvValue(match[1]));
  }
  return values;
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function main() {
  let keyValues;
  try {
    keyValues = readExperimentKey();
  } catch {
    emit({
      phase: 'preflight',
      key_exists: null,
      key_length: null,
      api_calls: 0,
      input_characters: 0,
      stopped: 'env_file_unreadable',
    });
    return;
  }

  const apiKey = keyValues.length === 1 ? keyValues[0] : '';
  emit({
    phase: 'preflight',
    key_exists: apiKey.length > 0,
    key_length: apiKey.length,
    model_requested: MODEL,
    requested_dimensions: REQUESTED_DIMENSIONS,
    api_calls: 0,
    input_characters: 0,
  });

  if (keyValues.length !== 1 || apiKey.length === 0) {
    emit({
      phase: 'result',
      success: false,
      http_status: null,
      vector_dimensions: null,
      response_model: null,
      elapsed_ms: 0,
      api_calls: 0,
      input_characters: 0,
      stopped: keyValues.length === 1 ? 'key_missing' : 'ambiguous_key_definition',
    });
    return;
  }

  const inputCharacters = TEST_TEXT.length;
  if (MAX_CALLS < 1 || inputCharacters > MAX_INPUT_CHARACTERS) {
    emit({
      phase: 'result',
      success: false,
      http_status: null,
      vector_dimensions: null,
      response_model: null,
      elapsed_ms: 0,
      api_calls: 0,
      input_characters: 0,
      stopped: 'local_budget_guard',
    });
    return;
  }

  const startedAt = performance.now();
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: TEST_TEXT,
        dimensions: REQUESTED_DIMENSIONS,
        encoding_format: 'float',
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    emit({
      phase: 'result',
      success: false,
      http_status: null,
      vector_dimensions: null,
      response_model: null,
      elapsed_ms: Math.round(performance.now() - startedAt),
      api_calls: 1,
      input_characters: inputCharacters,
      stopped: 'network_or_timeout',
    });
    return;
  }

  const elapsedMs = Math.round(performance.now() - startedAt);
  let body;
  try {
    body = await response.json();
  } catch {
    emit({
      phase: 'result',
      success: false,
      http_status: response.status,
      vector_dimensions: null,
      response_model: null,
      elapsed_ms: elapsedMs,
      api_calls: 1,
      input_characters: inputCharacters,
      stopped: response.ok ? 'invalid_json' : 'http_error',
    });
    return;
  }

  const embedding = Array.isArray(body?.data) && Array.isArray(body.data[0]?.embedding)
    ? body.data[0].embedding
    : null;
  const responseModelMatchesRequested = body?.model === MODEL;
  const responseModel = responseModelMatchesRequested ? MODEL : null;
  const validShape = embedding !== null && responseModelMatchesRequested;

  emit({
    phase: 'result',
    success: response.ok && validShape,
    http_status: response.status,
    vector_dimensions: embedding?.length ?? null,
    response_model: responseModel,
    response_model_matches_requested: responseModelMatchesRequested,
    elapsed_ms: elapsedMs,
    api_calls: 1,
    input_characters: inputCharacters,
    stopped: response.ok ? (validShape ? 'completed' : 'invalid_response_shape') : 'http_error',
  });
}

main().catch(() => {
  emit({
    phase: 'result',
    success: false,
    http_status: null,
    vector_dimensions: null,
    response_model: null,
    elapsed_ms: null,
    api_calls: 0,
    input_characters: 0,
    stopped: 'unexpected_local_error',
  });
});
