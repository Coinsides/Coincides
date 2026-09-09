import { createContext, type ReactNode } from 'react';

export interface NoteCanvasRuntimeContextValue {
  noteId?: string;
  hostMode?: 'page' | 'modal';
}

export const NoteCanvasRuntimeContext = createContext<NoteCanvasRuntimeContextValue | null>(null);

export function NoteCanvasRuntimeProvider({
  noteId,
  hostMode = 'page',
  children,
}: {
  noteId?: string;
  hostMode?: 'page' | 'modal';
  children: ReactNode;
}) {
  return (
    <NoteCanvasRuntimeContext.Provider value={{ noteId, hostMode }}>
      {children}
    </NoteCanvasRuntimeContext.Provider>
  );
}
