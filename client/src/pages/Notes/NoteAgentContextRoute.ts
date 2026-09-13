import { createContext } from 'react';

// The same runtime also lives in BoardNoteModal; only the note route owns note_view.
export const NoteAgentContextRoute = createContext(false);
