import { createContext, type ReactNode } from 'react';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';
import type { StagingItemDrop } from '../../Boards/boardStagingDrag';

export interface NoteCanvasRuntimeContextValue {
  noteId?: string;
  hostMode?: 'page' | 'modal';
  onSendToStaging?: (selection: BoardTextRangeSelection) => Promise<boolean>;
  stagingItemDrop?: StagingItemDrop;
}

export const NoteCanvasRuntimeContext = createContext<NoteCanvasRuntimeContextValue | null>(null);

export function NoteCanvasRuntimeProvider({
  noteId,
  hostMode = 'page',
  onSendToStaging,
  stagingItemDrop,
  children,
}: {
  noteId?: string;
  hostMode?: 'page' | 'modal';
  onSendToStaging?: (selection: BoardTextRangeSelection) => Promise<boolean>;
  stagingItemDrop?: StagingItemDrop;
  children: ReactNode;
}) {
  return (
    <NoteCanvasRuntimeContext.Provider value={{ noteId, hostMode, onSendToStaging, stagingItemDrop }}>
      {children}
    </NoteCanvasRuntimeContext.Provider>
  );
}
