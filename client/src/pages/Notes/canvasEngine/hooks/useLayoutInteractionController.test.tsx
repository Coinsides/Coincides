import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLayoutInteractionController } from './useLayoutInteractionController';

describe('useLayoutInteractionController organize mode', () => {
  it('derives snapping from persistent Layout mode without changing temporary guide mode', () => {
    const subject = renderHook(() => useLayoutInteractionController());

    expect(subject.result.current.layoutModeKind).toBe('off');
    expect(subject.result.current.snapEnabled).toBe(false);

    act(() => subject.result.current.beginTemporaryLayoutMode());
    expect(subject.result.current.layoutModeKind).toBe('temporary');
    expect(subject.result.current.layoutMode).toBe(true);
    expect(subject.result.current.snapEnabled).toBe(false);

    act(() => subject.result.current.clearTemporaryLayoutMode());
    act(() => subject.result.current.enablePersistentLayoutMode());
    expect(subject.result.current.layoutModeKind).toBe('persistent');
    expect(subject.result.current.snapEnabled).toBe(true);
  });
});
