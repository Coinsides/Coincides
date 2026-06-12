import { useContext } from 'react';
import { NoteCanvasRuntimeContext } from '../NoteCanvasRuntimeProvider';

export function useNoteCanvasRuntime() {
  const context = useContext(NoteCanvasRuntimeContext);
  if (!context) {
    throw new Error('useNoteCanvasRuntime must be used inside NoteCanvasRuntimeProvider');
  }
  return context;
}
