import { MINERU_PARSER_KEY } from './sourceMineruParser.js';

let mineruQueueTail: Promise<void> = Promise.resolve();

export async function runWithSourceMaterializationConcurrency<T>(
  parserKey: string,
  task: () => Promise<T>,
): Promise<T> {
  if (parserKey !== MINERU_PARSER_KEY) return await task();

  const previous = mineruQueueTail;
  let release!: () => void;
  mineruQueueTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await task();
  } finally {
    release();
  }
}
