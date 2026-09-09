import { describe, expect, it, vi } from 'vitest';
import { createInFlightWriteRegistry } from './inFlightWriteRegistry';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}

describe('in-flight note writes', () => {
  it('waits for concurrent operations and a body-to-range continuation without timers', async () => {
    const registry = createInFlightWriteRegistry();
    const body = deferred<void>();
    const ranges = deferred<void>();
    const placement = deferred<void>();
    const save = registry.hold('save', async () => {
      await registry.track('body', () => body.promise);
      await registry.track('ranges', () => ranges.promise);
    });
    const operation = save();
    registry.track('placement', () => placement.promise);
    const idle = vi.fn();
    const drain = registry.whenIdle().then(idle);
    body.resolve();
    placement.resolve();
    await body.promise;
    await placement.promise;
    expect(idle).not.toHaveBeenCalled();
    ranges.resolve();
    await operation;
    await drain;
    expect(idle).toHaveBeenCalledOnce();
  });

  it('retains caught failures until that target succeeds, independently of other writes', async () => {
    const registry = createInFlightWriteRegistry();
    const error = new Error('body failed');
    await registry.track('body', () => Promise.reject(error)).catch(() => undefined);
    await registry.track('placement', () => Promise.resolve());
    await expect(registry.whenIdle()).rejects.toBe(error);
    await expect(registry.whenIdle()).rejects.toBe(error);
    await registry.track('body', () => Promise.resolve());
    await expect(registry.whenIdle()).resolves.toBeUndefined();
  });

  it('does not revive an older failure after a newer retry succeeds', async () => {
    const registry = createInFlightWriteRegistry();
    const old = deferred<void>();
    const original = registry.track('body', () => old.promise).catch(() => undefined);
    await registry.track('body', () => Promise.resolve());
    old.reject(new Error('late old rejection'));
    await original;
    await expect(registry.whenIdle()).resolves.toBeUndefined();
  });

  it('registers an external mutation returning false without changing its result', async () => {
    const registry = createInFlightWriteRegistry();
    await expect(registry.track('tray:block-1', async () => false)).resolves.toBe(false);
    await expect(registry.whenIdle()).rejects.toThrow('A note change could not be saved');
    await registry.track('tray:block-1', async () => true);
    await expect(registry.whenIdle()).resolves.toBeUndefined();
  });

  it('holds queue work before its first request and observes caught structured failures', async () => {
    const registry = createInFlightWriteRegistry();
    const queue = deferred<void>();
    const error = new Error('unavailable receipt');
    const save = registry.hold('save', async () => {
      await queue.promise;
      return { error };
    }, (result) => result.error);
    const operation = save();
    const failed = vi.fn();
    const drain = registry.whenIdle().catch(failed);
    await Promise.resolve();
    expect(failed).not.toHaveBeenCalled();
    queue.resolve();
    await operation;
    await drain;
    expect(failed).toHaveBeenCalledWith(error);
  });
});
