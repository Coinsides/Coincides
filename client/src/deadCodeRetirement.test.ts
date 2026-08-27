// @ts-expect-error -- Vitest runs this source-only contract in Node.
import { readFileSync, readdirSync } from 'node:fs';
// @ts-expect-error -- Vitest runs this source-only contract in Node.
import { extname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

declare const process: { cwd(): string };

interface DirectoryEntry {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

const repositoryRoot = resolve(process.cwd(), '..');
const sourceRoots = [
  resolve(repositoryRoot, 'client'),
  resolve(repositoryRoot, 'server'),
];
const sourceExtensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['coverage', 'dist', 'node_modules']);
const retiredStoreName = ['proposal', 'Store'].join('');
const retiredRelationLoaderName = ['load', 'Relation'].join('');

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(directory, { withFileTypes: true }) as DirectoryEntry[];

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) files.push(fullPath);
  }

  return files;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSourceMatches(pattern: RegExp): string[] {
  const matches: string[] = [];

  for (const file of sourceRoots.flatMap(collectSourceFiles)) {
    const source = readFileSync(file, 'utf8') as string;
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const before = source.slice(0, match.index);
      const line = (before.match(/\n/g)?.length || 0) + 1;
      const column = match.index - before.lastIndexOf('\n');
      const displayPath = relative(repositoryRoot, file).split('\\').join('/');
      matches.push(`${displayPath}:${line}:${column}`);
    }
  }

  return matches;
}

describe('dead-code retirement contracts', () => {
  it(`keeps ${retiredStoreName} absent from client and server code`, () => {
    const matches = findSourceMatches(new RegExp(escapeRegularExpression(retiredStoreName), 'g'));
    expect(matches, `${retiredStoreName} references must remain at zero`).toEqual([]);
  });

  it(`keeps singular ${retiredRelationLoaderName} absent from client and server code`, () => {
    const pattern = new RegExp(`\\b${escapeRegularExpression(retiredRelationLoaderName)}\\b`, 'g');
    const matches = findSourceMatches(pattern);
    expect(matches, `${retiredRelationLoaderName} references must remain at zero`).toEqual([]);
  });
});
