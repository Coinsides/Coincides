import { createContext, useRef, type MutableRefObject, type ReactNode } from 'react';
import type { NoteInsertAction } from '../noteSlashCommands';

export interface NoteInsertCommandHost {
  disabledReason: (action: NoteInsertAction, blockId?: string | null) => string | undefined;
  run: (action: NoteInsertAction, blockId?: string | null) => void;
}

/** Session UI wiring only. Both entry points invoke the mounted writing surface. */
export const NoteInsertCommandsContext = createContext<MutableRefObject<NoteInsertCommandHost | null> | null>(null);

export function NoteInsertCommandsProvider({ children }: { children: ReactNode }) {
  const host = useRef<NoteInsertCommandHost | null>(null);
  return <NoteInsertCommandsContext.Provider value={host}>{children}</NoteInsertCommandsContext.Provider>;
}
