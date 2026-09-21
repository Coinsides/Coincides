import { createContext, useContext } from 'react';
import type { ChapterAgendaEntry } from './chapterProjectionService';

interface TocProjection {
  agenda: readonly ChapterAgendaEntry[];
  pageNumbers?: ReadonlyMap<string, number>;
  onSelectChapter?: (chapterId: string) => void;
}

const TocContext = createContext<TocProjection>({ agenda: [] });
export const TocProjectionProvider = TocContext.Provider;
export const useTocProjection = () => useContext(TocContext);
