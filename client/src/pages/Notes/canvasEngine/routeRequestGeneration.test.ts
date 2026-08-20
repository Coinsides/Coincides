// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  advanceRouteRequestGeneration,
  routeRequestGenerationMatches,
} from './routeRequestGeneration';

describe('route request generation ABA guard', () => {
  it('rejects a stale A receipt after A to B to A returns to the same note id', () => {
    const firstA = { noteId: 'note-a', generation: 0 };
    const onB = advanceRouteRequestGeneration(firstA, 'note-b');
    const secondA = advanceRouteRequestGeneration(onB, 'note-a');

    expect(secondA).toEqual({ noteId: 'note-a', generation: 2 });
    expect(routeRequestGenerationMatches(secondA, firstA)).toBe(false);
    expect(routeRequestGenerationMatches(secondA, secondA)).toBe(true);
  });
});
