#!/usr/bin/env node

import { createRequire } from 'node:module';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  TOOL_REGISTRY,
  type ToolRegistryEntry,
} from '../server/src/toolFace/registry.js';
import type {
  ToolFaceJsonSchema,
  ToolFaceManifest,
} from '../shared/types/toolFaceManifest.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUTPUT_PATH = resolve(REPO_ROOT, 'docs/generated/tool-face-manifest.json');
export const TOOL_FACE_MANIFEST_TEST_OUTPUT_PATH_ENV = 'TOOL_FACE_MANIFEST_TEST_OUTPUT_PATH';
const serverRequire = createRequire(resolve(REPO_ROOT, 'server/package.json'));
const { zodToJsonSchema } = serverRequire('zod-to-json-schema') as {
  zodToJsonSchema: (
    schema: ToolRegistryEntry['input_schema'],
    options: { target: 'jsonSchema2019-09'; $refStrategy: 'none' },
  ) => ToolFaceJsonSchema & { $schema?: string };
};

function schemaChildren(
  schema: Record<string, unknown>,
  key: string,
): Array<[string, unknown]> {
  const child = schema[key];
  if (!child || typeof child !== 'object') return [];

  if (['properties', 'patternProperties', '$defs', 'dependentSchemas'].includes(key)) {
    return Object.entries(child as Record<string, unknown>);
  }
  if (['allOf', 'anyOf', 'oneOf', 'prefixItems'].includes(key) && Array.isArray(child)) {
    return child.map((value, index) => [String(index), value]);
  }
  return [['', child]];
}

export function find202012SubsetViolations(value: unknown, path = '$'): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

  const schema = value as Record<string, unknown>;
  const violations: string[] = [];
  if ('$schema' in schema) violations.push(`${path}.$schema`);
  if ('definitions' in schema) violations.push(`${path}.definitions`);
  if ('dependencies' in schema) violations.push(`${path}.dependencies`);
  if ('additionalItems' in schema) violations.push(`${path}.additionalItems`);
  if ('$recursiveRef' in schema) violations.push(`${path}.$recursiveRef`);
  if ('$recursiveAnchor' in schema) violations.push(`${path}.$recursiveAnchor`);
  if (Array.isArray(schema.items)) violations.push(`${path}.items (tuple-form items)`);
  if (typeof schema.exclusiveMinimum === 'boolean') {
    violations.push(`${path}.exclusiveMinimum (boolean exclusive bound)`);
  }
  if (typeof schema.exclusiveMaximum === 'boolean') {
    violations.push(`${path}.exclusiveMaximum (boolean exclusive bound)`);
  }

  const singleSchemaKeys = [
    'additionalProperties',
    'contains',
    'contentSchema',
    'else',
    'if',
    'items',
    'not',
    'propertyNames',
    'then',
    'unevaluatedItems',
    'unevaluatedProperties',
  ];
  const schemaMapKeys = ['properties', 'patternProperties', '$defs', 'dependentSchemas'];
  const schemaArrayKeys = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
  for (const key of [...singleSchemaKeys, ...schemaMapKeys, ...schemaArrayKeys]) {
    for (const [suffix, child] of schemaChildren(schema, key)) {
      const childPath = suffix ? `${path}.${key}.${suffix}` : `${path}.${key}`;
      violations.push(...find202012SubsetViolations(child, childPath));
    }
  }
  return violations;
}

function serializeSchema(
  schema: ToolRegistryEntry['input_schema'],
): ToolFaceJsonSchema {
  const projected = zodToJsonSchema(schema, {
    target: 'jsonSchema2019-09',
    $refStrategy: 'none',
  });
  const { $schema: _dialectDeclaration, ...compatibleSubset } = projected;
  const violations = find202012SubsetViolations(compatibleSubset);
  if (violations.length > 0) {
    throw new Error(`Tool schema is not in the JSON Schema 2020-12 compatible subset: ${violations.join(', ')}`);
  }
  return compatibleSubset;
}

export function buildToolFaceManifest(
  entries: readonly ToolRegistryEntry[],
): ToolFaceManifest {
  const names = new Set<string>();
  return entries.map((entry) => {
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
      ...(entry.threshold && { threshold: entry.threshold }),
      human_entry: entry.human_entry,
      exposure: entry.exposure,
      scopes: entry.scopes,
    };
  });
}

export function renderManifest(
  entries: readonly ToolRegistryEntry[],
  projector: typeof buildToolFaceManifest = buildToolFaceManifest,
): string {
  return `${JSON.stringify(projector(entries), null, 2)}\n`;
}

function reportResult(
  verb: 'generated' | 'current',
  entries: readonly ToolRegistryEntry[],
): void {
  const publicCount = entries.filter((entry) => entry.exposure === 'public').length;
  if (publicCount === 0) {
    console.log(`0 条 public 条目；manifest ${verb === 'generated' ? '已生成' : '未过期'}，但未证明任何公开工具链。`);
    return;
  }
  console.log(`tool-face manifest ${verb === 'generated' ? '已生成' : '未过期'}：${entries.length} 条条目，其中 ${publicCount} 条 public。`);
}

function resolveOutputPath(): string {
  const testOutputPath = process.env[TOOL_FACE_MANIFEST_TEST_OUTPUT_PATH_ENV];
  return process.env.NODE_ENV === 'test' && testOutputPath
    ? resolve(testOutputPath)
    : DEFAULT_OUTPUT_PATH;
}

function runCli(): void {
  const outputPath = resolveOutputPath();
  const expected = renderManifest(TOOL_REGISTRY);
  const checkOnly = process.argv.includes('--check');

  if (checkOnly) {
    const actual = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
    if (actual !== expected) {
      const displayPath = outputPath === DEFAULT_OUTPUT_PATH
        ? 'docs/generated/tool-face-manifest.json'
        : outputPath;
      console.error(`过期: ${displayPath}`);
      console.error('请运行: npm run docs:tool-face-manifest');
      process.exitCode = 1;
    } else {
      reportResult('current', TOOL_REGISTRY);
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, expected, 'utf8');
    reportResult('generated', TOOL_REGISTRY);
  }
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (invokedUrl === import.meta.url) {
  runCli();
}
