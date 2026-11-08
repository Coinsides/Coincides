import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgentUiStore, userOwnsInput } from '@/stores/agentUiStore';
import { useMediaImageAsset } from '../hooks/useMediaImageAsset';
import type { SourcePageViewController } from '../hooks/useSourcePageViewController';
import { overviewPageIsVisible } from '../overviewLayout';
import { SourceViewToggle } from './SourceViewToggle';
import { SOURCE_PAGE_GAP, SOURCE_PAGE_PADDING, sourcePageAtScroll, sourcePageLayout, type SourcePageSlot } from '../sourcePageLayout';
import './NoteOverviewLayer.css';
import './NoteSourcePagesLayer.css';

const HIGHLIGHT_MS = 2200;

function SourcePageImage({ slot }: { slot: SourcePageSlot & { page: NonNullable<SourcePageSlot['page']> } }) {
  const { t } = useTranslation();
  const { read, onError } = useMediaImageAsset(slot.page.asset_id);
  if (read.status === 'failed') return <p className="noteSourcePageNotice" role="alert">{t('sourcePages.imageFailed')}</p>;
  if (read.status !== 'loaded') return null;
  return <img src={read.url} alt={t('sourcePages.pageLabel', { page: slot.pageNumber })} draggable={false} onError={onError} />;
}

export function NoteSourcePagesLayer({ view }: { view: SourcePageViewController }) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [highlight, setHighlight] = useState<number | null>(null);
  const { register, noteId, jump, jumpToPage, clearJump } = view;
  const layout = useMemo(() => sourcePageLayout(register, size.width - SOURCE_PAGE_PADDING * 2), [register, size.width]);
  const target = useRef<number | null>(view.initialPage());
  const rememberRef = useRef(view.rememberPage);
  rememberRef.current = view.rememberPage;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const root = rootRef.current;
    if (!viewport || !root) return;
    const appMain = root.closest<HTMLElement>('[data-app-main-scroll="true"]');
    const measure = () => {
      const hostBottom = appMain?.getBoundingClientRect().bottom || window.innerHeight;
      const top = Math.max(0, root.getBoundingClientRect().top);
      root.style.height = `${Math.max(240, Math.min(window.innerHeight, hostBottom) - top - 12)}px`;
      const next = { width: viewport.clientWidth || root.clientWidth || window.innerWidth, height: viewport.clientHeight || 600 };
      setSize((previous) => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    if (appMain) observer?.observe(appMain);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useLayoutEffect(() => {
    if (!jump) return;
    target.current = jump.page;
    clearJump();
  }, [jump, clearJump]);

  // The register can arrive after the request: hold the target until its page exists.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || size.width === 0 || target.current === null) return;
    if (!layout.slots.length) return;
    // A page past the end (an Agent's index, a Source that shrank) lands on the
    // last page; waiting for it would stop the reading position being remembered.
    const requested = target.current;
    const slot = layout.slots[Math.min(requested, layout.slots.length) - 1];
    target.current = null;
    viewport.scrollTop = slot.top + SOURCE_PAGE_PADDING;
    setScrollTop(viewport.scrollTop);
    if (slot.pageNumber !== requested) rememberRef.current(slot.pageNumber);
  }, [layout, jump, size.width]);

  const current = sourcePageAtScroll(layout.slots, scrollTop);
  useEffect(() => {
    if (layout.slots.length && target.current === null) rememberRef.current(current);
  }, [current, layout.slots.length]);

  // Runs before the writing surface's own handler in the same commit, so an
  // original page request is answered here and never reaches the hidden text.
  const command = useAgentUiStore((state) => state.focusCommand);
  useEffect(() => {
    if (command?.kind !== 'focus_object' || command.target.type !== 'note_page' || command.target.note_id !== noteId) return;
    if (userOwnsInput()) { useAgentUiStore.setState({ pending: command, focusCommand: null }); return; }
    useAgentUiStore.setState({ focusCommand: null });
    const page = command.target.page_index + 1;
    jumpToPage(page);
    setHighlight(page);
  }, [command, noteId, jumpToPage]);
  useEffect(() => {
    if (highlight === null) return;
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlight]);

  const inProgress = register?.status === 'pending' || register?.status === 'partial';
  const failedCount = register?.failed_pages.length ?? 0;
  const generateFailure = view.generateFailed && <p role="alert">{t('sourcePages.generateFailed')}</p>;
  const generateAction = <button type="button" className="noteSourcePagesAction" disabled={view.generating}
    data-source-pages-generate="true" onClick={view.generate}>
    {view.generating ? t('sourcePages.generating') : register?.status === 'failed' ? t('sourcePages.retry') : t('sourcePages.generate')}
  </button>;
  const empty = !register ? <div className="noteSourcePagesEmpty">
      {view.loadFailed ? <>
        <p role="alert">{t('sourcePages.loadFailed')}</p>
        <button type="button" className="noteSourcePagesAction" data-source-pages-reload="true" onClick={view.reload}>{t('sourcePages.retryLoad')}</button>
      </> : <p>{t('sourcePages.loading')}</p>}
    </div> : register.status === 'none' ? <div className="noteSourcePagesEmpty" data-source-pages-none="true">
      <h3>{t('sourcePages.noneTitle')}</h3>
      <p>{t('sourcePages.noneBody')}</p>
      {generateAction}
      {generateFailure}
    </div> : register.expected === 0 ? <div className="noteSourcePagesEmpty">
      {register.status === 'failed' ? <>
        <p role="alert">{t('sourcePages.failedTitle')}</p>
        {generateAction}
        {generateFailure}
      </> : <p>{t('sourcePages.preparing')}</p>}
    </div> : null;

  return <section ref={rootRef} className="noteOverview noteSourcePages" data-note-source-pages="true"
    data-note-id={noteId} aria-label={t('sourcePages.title')}>
    <header className="noteOverviewHeader">
      <h2>{t('sourcePages.title')} {register && register.expected > 0 && <span>{register.expected}</span>}</h2>
      <div className="noteSourcePagesStatus">
        {inProgress && register.expected > 0 && <span role="status" data-source-pages-progress="true">
          {t('sourcePages.progress', { completed: register.completed, expected: register.expected })}</span>}
        {register?.status === 'failed' && register.expected > 0 && <>
          <span role="alert">{failedCount > 0 ? t('sourcePages.failedSummary', { count: failedCount }) : t('sourcePages.failedTitle')}</span>
          {generateAction}
          {generateFailure}
        </>}
        {register && view.loadFailed && <>
          <span role="alert">{t('sourcePages.loadFailed')}</span>
          <button type="button" className="noteSourcePagesAction" data-source-pages-reload="true" onClick={view.reload}>{t('sourcePages.retryLoad')}</button>
        </>}
        <SourceViewToggle view={view} />
      </div>
    </header>
    <div ref={viewportRef} className="noteOverviewViewport" data-note-source-pages-viewport="true"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      {empty ?? <div className="noteSourcePagesList" style={{ '--source-page-width': `${layout.pageWidth}px`,
        '--source-page-gap': `${SOURCE_PAGE_GAP}px` } as CSSProperties}>
        {layout.slots.map((slot) => {
          const visible = size.width > 0 && overviewPageIsVisible(slot.top + SOURCE_PAGE_PADDING, slot.height, scrollTop, size.height);
          return <article key={slot.pageNumber} className="noteSourcePage" style={{ width: slot.width, height: slot.height }}
            data-source-page-number={slot.pageNumber} data-source-page-ready={slot.page ? 'true' : 'false'}
            data-agent-ui-highlight={highlight === slot.pageNumber ? 'true' : undefined}
            aria-label={t('sourcePages.pageLabel', { page: slot.pageNumber })}>
            {slot.page
              ? visible && <SourcePageImage slot={{ ...slot, page: slot.page }} />
              : <p className="noteSourcePageNotice">{t(slot.failed ? 'sourcePages.pageFailed' : 'sourcePages.pageGenerating')}</p>}
            <span className="noteSourcePageNumber">{slot.pageNumber}</span>
          </article>;
        })}
      </div>}
    </div>
  </section>;
}
