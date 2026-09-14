import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Scenario } from './types.js';

export const scenarioDirectory = fileURLToPath(new URL('./scenarios/', import.meta.url));
export function discoverScenarios(directory = scenarioDirectory): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  if (entries.some(entry => entry.isSymbolicLink())) throw new Error('Linked scenarios are not supported');
  const paths = entries.filter(entry => entry.isFile() && entry.name.endsWith('.ts')).map(entry => join(directory, entry.name)).sort();
  if (!paths.length) throw new Error('No scenarios discovered');
  return paths;
}
export async function loadScenario(path: string): Promise<Scenario> {
  const scenario = (await import(pathToFileURL(path).href)).default as Scenario;
  if (!scenario || typeof scenario.name !== 'string' || !scenario.name.trim()
    || !Array.isArray(scenario.dimensions) || !scenario.dimensions.length
    || typeof scenario.setup !== 'function' || typeof scenario.assertions !== 'function'
    || !Array.isArray(scenario.turns) || !scenario.turns.length
    || scenario.turns.some(turn => !turn || !['string', 'function'].includes(typeof turn.user) || typeof turn.script !== 'function')) {
    throw new Error(`Invalid scenario module: ${path}`);
  }
  return scenario;
}
