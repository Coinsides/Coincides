#!/usr/bin/env node

import { createRequire } from 'node:module';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOOL_REGISTRY,
  type ToolRegistryEntry,
} from '../server/src/toolFace/registry.js';
import type {
  ToolFaceJsonSchema,
  ToolFaceManifest,
} from '../shared/types/toolFaceManifest.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = resolve(REPO_ROOT, 'docs/generated/tool-face-manifest.json');
const serverRequire = createRequire(resolve(REPO_ROOT, 'server/package.json'));
const { zodToJsonSchema } = serverRequire('zod-to-json-schema') as {
  zodToJsonSchema: (
    schema: ToolRegistryEntry['input_schema'],
    options: { target: 'jsonSchema7'; $refStrategy: 'none' },
  ) => ToolFaceJsonSchema;
};

function serializeSchema(
  schema: ToolRegistryEntry['input_schema'],
): ToolFaceJsonSchema {
  return zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  });
}

export function buildToolFaceManifest(): ToolFaceManifest {
  const names = new Set<string>();
  return TOOL_REGISTRY.map((entry) => {
    if (names.has(entry.name)) {
      throw new Error(`Duplicate tool registry name: ${entry.name}`);
    }
    names.add(entry.name);

    return {
      name: entry.name,
      description: entry.description,
      input_schema: serializeSchema(entry.input_schema),
      output_schema: serializeSchema(entry.output_schema),
      truth: entry.truth,
      tier: entry.tier,
      human_entry: entry.human_entry,
      exposure: entry.exposure,
      scopes: entry.scopes,
    };
  });
}

function renderManifest(): string {
  return `${JSON.stringify(buildToolFaceManifest(), null, 2)}\n`;
}

function reportResult(verb: 'generated' | 'current'): void {
  const publicCount = TOOL_REGISTRY.filter((entry) => entry.exposure === 'public').length;
  if (publicCount === 0) {
    console.log(`0 条 public 条目；manifest ${verb === 'generated' ? '已生成' : '未过期'}，但未证明任何公开工具链。`);
    return;
  }
  console.log(`tool-face manifest ${verb === 'generated' ? '已生成' : '未过期'}：${TOOL_REGISTRY.length} 条条目，其中 ${publicCount} 条 public。`);
}

const expected = renderManifest();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const actual = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf8') : null;
  if (actual !== expected) {
    console.error('过期: docs/generated/tool-face-manifest.json');
    console.error('请运行: npm run docs:tool-face-manifest');
    process.exitCode = 1;
  } else {
    reportResult('current');
  }
} else {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, expected, 'utf8');
  reportResult('generated');
}
