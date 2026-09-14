import { writeFileSync } from 'node:fs';
import { runScenario } from './harness.js';

const [path, output, mode] = process.argv.slice(2);
if (!path || !output || !['scripted', 'live'].includes(mode)) throw new Error('Invalid eval worker arguments');
const result = await runScenario(path, mode as 'scripted' | 'live');
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
process.exitCode = result.executionError || result.assertions.some(assertion => !assertion.passed) ? 1 : 0;
