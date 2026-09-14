import type { Mode } from './types.js';

export function parseOptions(args: string[]) {
  let mode: Mode = 'scripted';
  let dryRun = false;
  let list = false;
  const selected: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--live') mode = 'live';
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--list') list = true;
    else if (args[i] === '--scenario' && args[i + 1] && !args[i + 1].startsWith('-')) selected.push(args[++i]);
    else throw new Error(`Unknown or incomplete option: ${args[i]}`);
  }
  return { mode, dryRun, list, selected };
}
