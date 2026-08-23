#!/usr/bin/env node

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SOURCE = new URL('../docs/generated/tool-face-manifest.json', import.meta.url);
const DEFAULT_DESTINATION = new URL('../server/dist/tool-face-manifest.json', import.meta.url);
const TEST_SOURCE_ENV = 'TOOL_FACE_COPY_TEST_SOURCE';
const TEST_DESTINATION_ENV = 'TOOL_FACE_COPY_TEST_DESTINATION';

function testOverride(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`${name} is available only when NODE_ENV=test`);
  }
  return resolve(value);
}

const source = testOverride(TEST_SOURCE_ENV, fileURLToPath(DEFAULT_SOURCE));
const destination = testOverride(
  TEST_DESTINATION_ENV,
  fileURLToPath(DEFAULT_DESTINATION),
);

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`Copied tool-face manifest bytes to ${destination}`);
