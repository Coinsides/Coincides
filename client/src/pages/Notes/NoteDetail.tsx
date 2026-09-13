import { useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import NoteCanvasRuntime, { type NoteCanvasRuntimeHandle } from './canvasEngine/NoteCanvasRuntime';
import { NoteCanvasRuntimeProvider } from './canvasEngine/NoteCanvasRuntimeProvider';
import { NoteRouteSaveBoundary } from './canvasEngine/hooks/useNoteRouteSaveBoundary';
import { NoteAgentContextRoute } from './NoteAgentContextRoute';

export default function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const runtime = useRef<NoteCanvasRuntimeHandle | null>(null);
  const retainRuntime = useCallback((handle: NoteCanvasRuntimeHandle | null) => {
    // Retain the last live handle for the best-effort forced-unmount drain.
    // Ordinary router departure drains before the runtime is detached.
    if (handle) runtime.current = handle;
  }, []);

  return (
    <NoteAgentContextRoute.Provider value={true}>
      <NoteCanvasRuntimeProvider noteId={noteId}>
        <NoteCanvasRuntime ref={retainRuntime} />
        <NoteRouteSaveBoundary noteId={noteId} runtimeRef={runtime} />
      </NoteCanvasRuntimeProvider>
    </NoteAgentContextRoute.Provider>
  );
}
