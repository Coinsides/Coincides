import { MINERU_PARSER_KEY } from './sourceMineruParser.js';

// Parser time limits start inside task(), so waiting for a slot never spends them.
// Native parsers stop at three: past that they can crowd each other into the time
// limit, and a timeout is a non-retryable failure for a file that would parse alone.
const MINERU_PARSE_SLOTS = 1;
const NATIVE_PARSE_SLOTS = 3;

function createParseSlots(limit: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active < limit) active += 1;
    else await new Promise<void>((resolve) => { waiting.push(resolve); });
    try {
      return await task();
    } finally {
      // A waiter inherits the slot, so the count only drops once nobody is queued.
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    }
  };
}

const runMineruParse = createParseSlots(MINERU_PARSE_SLOTS);
const runNativeParse = createParseSlots(NATIVE_PARSE_SLOTS);

export async function runWithSourceMaterializationConcurrency<T>(
  parserKey: string,
  task: () => Promise<T>,
): Promise<T> {
  return parserKey === MINERU_PARSER_KEY ? runMineruParse(task) : runNativeParse(task);
}
