import { createContext, type ReactNode } from 'react';

export interface NoteCanvasRuntimeContextValue {
  noteId?: string;
}

export const NoteCanvasRuntimeContext = createContext<NoteCanvasRuntimeContextValue | null>(null);

export function NoteCanvasRuntimeProvider({
  noteId,
  children,
}: {
  noteId?: string;
  children: ReactNode;
}) {
  return (
    <NoteCanvasRuntimeContext.Provider value={{ noteId }}>
      {children}
    </NoteCanvasRuntimeContext.Provider>
  );
}
