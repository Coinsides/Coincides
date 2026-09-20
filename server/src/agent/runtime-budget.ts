export const AGENT_REQUEST_TIMEOUT_MS = 300_000;
export const AGENT_ROUND_TIMEOUT_MS = 300_000;
export const AGENT_TOOL_TIMEOUT_MS = 60_000;

/** C3: estimates, not model-tokenizer counts; original messages are never trimmed. */
export const AGENT_EPISODE_BUDGET = Object.freeze({
  triggerTokens: 24_000,
  keepRecentTurns: 4,
  maxTurnsPerEpisode: 8,
  recentEpisodes: 3,
  episodeTokens: 2_048,
  summaryTokens: 768,
  summaryTimeoutMs: 15_000,
});

export interface AgentRunOptions {
  signal?: AbortSignal;
  /** Absolute request deadline (epoch milliseconds), shared with the SSE route. */
  deadline?: number;
}

export function agentStopError(deadline: number, signal?: AbortSignal): Error | undefined {
  if (signal?.aborted) {
    return signal.reason instanceof Error ? signal.reason : new Error('Request interrupted');
  }
  if (Date.now() >= deadline) return new Error('Request timed out after 300s');
}

/** Bound each pending iterator.next(), including providers that never yield again. */
export function createStreamBudget(deadline: number, parentSignal?: AbortSignal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener('abort', onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error('Request timed out after 300s')),
    Math.max(0, deadline - Date.now()));
  let rejectInterrupted!: (reason: unknown) => void;
  const interrupted = new Promise<never>((_resolve, reject) => { rejectInterrupted = reject; });
  const onInterrupted = () => rejectInterrupted(controller.signal.reason);
  controller.signal.addEventListener('abort', onInterrupted, { once: true });
  // dispose() may abort after the last next() has already settled.
  void interrupted.catch(() => {});
  const stopped = agentStopError(deadline, parentSignal);
  if (stopped) controller.abort(stopped);

  return {
    signal: controller.signal,
    async next<T>(operation: () => Promise<T>): Promise<T> {
      const stoppedBefore = agentStopError(deadline, parentSignal);
      if (stoppedBefore) controller.abort(stoppedBefore);
      controller.signal.throwIfAborted();
      const result = await Promise.race([operation(), interrupted]);
      const stoppedAfter = agentStopError(deadline, parentSignal);
      if (stoppedAfter) controller.abort(stoppedAfter);
      controller.signal.throwIfAborted();
      return result;
    },
    dispose() {
      clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', onAbort);
      controller.abort();
      controller.signal.removeEventListener('abort', onInterrupted);
    },
  };
}

/** Stop waiting, never cancel accepted work: its write door still commits receipts. */
export async function runToolWithinBudget<T>(operation: () => Promise<T>, deadline: number): Promise<T> {
  const remaining = Math.max(0, Math.min(AGENT_TOOL_TIMEOUT_MS, deadline - Date.now()));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(
      remaining < AGENT_TOOL_TIMEOUT_MS
        ? 'Request deadline reached while waiting for tool; execution may still complete. Check receipts before retrying.'
        : 'Tool timed out after 60s; execution may still complete. Check receipts before retrying.',
    )), remaining);
  });
  try {
    return await Promise.race([operation(), expired]);
  } finally {
    clearTimeout(timeout);
  }
}
