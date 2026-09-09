import { createContext, type ReactNode } from 'react';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';

export interface NoteCanvasRuntimeContextValue {
  noteId?: string;
  hostMode?: 'page' | 'modal';
  onSendToStaging?: (selection: BoardTextRangeSelection) => Promise<boolean>;
}

export const NoteCanvasRuntimeContext = createContext<NoteCanvasRuntimeContextValue | null>(null);

export function NoteCanvasRuntimeProvider({
  noteId,
  hostMode = 'page',
  onSendToStaging,
  children,
}: {
  noteId?: string;
  hostMode?: 'page' | 'modal';
  onSendToStaging?: (selection: BoardTextRangeSelection) => Promise<boolean>;
  children: ReactNode;
}) {
  return (
    <NoteCanvasRuntimeContext.Provider value={{ noteId, hostMode, onSendToStaging }}>
      {children}
    </NoteCanvasRuntimeContext.Provider>
  );
}
