import { useEffect, useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { buildNoteNavigationResults, type NoteNavigationResult } from '../noteNavigationSearch';
import type { NoteNavigationTab } from '../hooks/useNoteNavigationController';
import { NoteNavigationPages } from './NoteNavigationPages';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';
import './NoteNavigationPane.css';

const TABS = [['headings', 'Headings'], ['pages', 'Pages'], ['results', 'Results']] as const;
export const NOTE_NAVIGATION_SEARCH_DELAY = 180;

export interface NoteNavigationPaneProps {
  writingSurfaceProps: NoteWritingSurfaceLayerProps;
  tab: NoteNavigationTab;
  onTabChange: (tab: NoteNavigationTab) => void;
  currentPageFrameId: string | null;
  onSelectPage: (frameId: string) => void;
  onSelectResult: (result: NoteNavigationResult) => void;
  onClose: () => void;
}

function NoteNavigationContents({ writingSurfaceProps: input, tab, onTabChange,
  currentPageFrameId, onSelectPage, onSelectResult, onClose }: NoteNavigationPaneProps) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const trimmedQuery = query.trim();
  useEffect(() => {
    const timeout = window.setTimeout(() => setSettledQuery(trimmedQuery), NOTE_NAVIGATION_SEARCH_DELAY);
    return () => window.clearTimeout(timeout);
  }, [trimmedQuery]);
  const results = useMemo(() => buildNoteNavigationResults(input, settledQuery),
    [settledQuery, input.noteId, input.visibleBlocks, input.blockTextDrafts, input.blockTextFlowDrafts,
      input.blockFieldDrafts, input.noteCanvasRuntime, input.pageOffsetX,
      input.paperHeader?.titleDraft, input.paperHeader?.descriptionDraft]);
  const pending = trimmedQuery !== settledQuery;
  const visibleResults = trimmedQuery && !pending ? results : [];

  return <aside className="noteNavigationDock" data-note-navigation="true" aria-label="Note navigation"
    onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <div className="noteNavigationPane">
      <header className="noteNavigationHeader">
        <h2>Navigation</h2>
        <button type="button" className="noteNavigationClose" aria-label="Close navigation pane"
          onMouseDown={(event) => event.preventDefault()} onClick={(event) => {
            const toggle = event.currentTarget.closest('[data-note-navigation-row]')
              ?.querySelector<HTMLButtonElement>('[data-note-navigation-toggle]');
            onClose();
            toggle?.focus({ preventScroll: true });
          }}><X size={16} aria-hidden="true" /></button>
      </header>
      <div className="noteNavigationTabs" role="tablist" aria-label="Note navigation views">
        {TABS.map(([key, label], index) => <button type="button" key={key} role="tab"
          id={`${id}-${key}`} aria-controls={`${id}-panel`} aria-selected={tab === key}
          tabIndex={tab === key ? 0 : -1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onTabChange(key)}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1
              : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
            onTabChange(TABS[next][0]);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
          }}>{label}</button>)}
      </div>
      <div className="noteNavigationPanel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`}>
        {tab === 'headings' && <p className="noteNavigationEmpty">The heading tree will arrive with chapter heading blocks.</p>}
        {tab === 'pages' && <NoteNavigationPages writingSurfaceProps={input}
          currentPageFrameId={currentPageFrameId} onSelectPage={onSelectPage} />}
        {tab === 'results' && <>
          <div className="noteNavigationSearch">
            <label htmlFor={`${id}-search`}>Search this note</label>
            <input id={`${id}-search`} type="search" autoComplete="off" value={query}
              onChange={(event) => setQuery(event.target.value)} />
          </div>
          <p className="noteNavigationCount" role="status" aria-live="polite">
            {!trimmedQuery ? 'Search the loaded text in this note.' : pending ? 'Searching…'
              : results.length ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'No results in this note.'}
          </p>
          <ol className="noteNavigationResults" aria-label="Search results" aria-busy={pending}>
            {visibleResults.map((result) => <li key={result.id}>
              <button type="button" className="noteNavigationResult" onClick={() => onSelectResult(result)}
                onMouseDown={(event) => event.preventDefault()}>
                <small>{result.pageNumbers.length === 1 ? 'Page' : 'Pages'} {result.pageNumbers.join(', ')}</small>
                <span>{result.before}<mark>{result.match}</mark>{result.after}</span>
              </button>
            </li>)}
          </ol>
        </>}
      </div>
    </div>
  </aside>;
}

export function NoteNavigationPane(props: NoteNavigationPaneProps) {
  return <NoteNavigationContents key={props.writingSurfaceProps.noteId} {...props} />;
}
