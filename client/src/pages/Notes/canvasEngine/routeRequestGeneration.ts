export interface RouteRequestGeneration {
  generation: number;
  noteId: string | undefined;
}

export function advanceRouteRequestGeneration(
  current: RouteRequestGeneration,
  nextNoteId: string | undefined,
): RouteRequestGeneration {
  return current.noteId === nextNoteId
    ? current
    : { noteId: nextNoteId, generation: current.generation + 1 };
}

export function routeRequestGenerationMatches(
  current: RouteRequestGeneration,
  receipt: RouteRequestGeneration,
): boolean {
  return current.generation === receipt.generation && current.noteId === receipt.noteId;
}
