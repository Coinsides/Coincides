/** A host can drain writes without changing the editor's existing save/error contract. */
export function createInFlightWriteRegistry() {
  let pending = 0;
  let sequence = 0;
  const failures = new Map<string, { sequence: number; error: unknown }>();
  const successfulWrites = new Map<string, number>();
  const waiters = new Set<{ resolve: () => void; reject: (error: unknown) => void }>();

  const notifyIdle = () => {
    if (pending !== 0) return;
    const failure = failures.values().next().value;
    for (const waiter of waiters) {
      if (failure) waiter.reject(failure.error);
      else waiter.resolve();
    }
    waiters.clear();
  };

  const fail = (key: string, error: unknown, attempt = ++sequence) => {
    if ((successfulWrites.get(key) ?? 0) > attempt) return;
    if ((failures.get(key)?.sequence ?? 0) > attempt) return;
    failures.set(key, { sequence: attempt, error: error ?? new Error('A note change could not be saved') });
  };

  const confirm = (key: string, attempt = ++sequence) => {
    successfulWrites.set(key, Math.max(successfulWrites.get(key) ?? 0, attempt));
    if ((failures.get(key)?.sequence ?? 0) <= attempt) failures.delete(key);
  };

  const observe = <T>(
    key: string,
    operation: () => Promise<T>,
    outcomeError?: (result: T) => unknown,
  ): Promise<T> => {
    const attempt = ++sequence;
    pending += 1;
    let result: Promise<T>;
    try {
      // Invoke immediately: blur must register the write before the host asks to drain.
      result = operation();
    } catch (error) {
      result = Promise.reject(error);
    }
    void result.then(
      (value) => {
        try {
          const error = outcomeError?.(value);
          if (error !== undefined) fail(key, error, attempt);
          else confirm(key, attempt);
        } catch (error) {
          fail(key, error, attempt);
        }
      },
      (error) => { fail(key, error, attempt); },
    ).then(() => {
      pending -= 1;
      notifyIdle();
    });
    return result;
  };

  const track = <T>(key: string, operation: () => Promise<T>): Promise<T> => observe(
    key,
    operation,
    (value) => value === false ? new Error('A note change could not be saved') : undefined,
  );

  /** Hold the entire adapter operation, including queued writes and reconciliation reads. */
  const hold = <Args extends unknown[], Result>(
    name: string | ((first: NoInfer<Args[0]>) => string),
    operation: (...args: Args) => Promise<Result>,
    outcomeError?: (result: Result) => unknown,
  ): ((...args: Args) => Promise<Result>) => (...args) => {
    const key = `operation:${typeof name === 'string' ? name : name(args[0])}`;
    // A caught API error can be represented by a structured outcome instead of rejection.
    // Observe it without changing the promise returned to the editor.
    return observe(key, () => operation(...args), outcomeError);
  };

  const whenIdle = (): Promise<void> => new Promise((resolve, reject) => {
    waiters.add({ resolve, reject });
    notifyIdle();
  });

  return { track, hold, fail, confirm, whenIdle };
}

export type TrackPendingWrite = ReturnType<typeof createInFlightWriteRegistry>['track'];
