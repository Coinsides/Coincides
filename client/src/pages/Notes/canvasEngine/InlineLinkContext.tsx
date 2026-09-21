import { createContext, useContext } from 'react';
import type { ChapterProjection } from './chapterProjectionService';
import type { NoteBlock } from './runtimeDataTypes';
import type { InlineLinkTarget } from './inlineLinkService';

export interface InlineLinkNote { id: string; title: string; course_id: string; status?: string }
export interface InlineLinkHost {
  chapters: ChapterProjection;
  blocks: readonly NoteBlock[];
  notes: readonly InlineLinkNote[];
  notesState: 'loading' | 'ready' | 'error';
  refreshNotes: () => Promise<readonly InlineLinkNote[] | null>;
  resolve: (target: InlineLinkTarget) => boolean;
  navigate: (target: InlineLinkTarget) => void | Promise<void>;
}
export const InlineLinkContext = createContext<InlineLinkHost | null>(null);
export const useInlineLinks = () => useContext(InlineLinkContext);
