import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Inbox } from 'lucide-react';
import {
  NoteFloatingPanelLayer,
  type NoteFloatingPanelLayerProps,
} from './NoteFloatingPanelLayer';
import {
  NoteWritingSurfaceLayer,
  type NoteWritingSurfaceLayerProps,
} from './NoteWritingSurfaceLayer';
import type { BlockEditRecoveryReceipt } from '../draftBlockPersistence';
import type { NoteBlock } from '../runtimeDataTypes';
import { BlockEditRecoveryQueue } from './BlockEditRecoveryQueue';
import { NotePrintLayer } from './NotePrintLayer';
import { createPageGapPresentation } from '../pageFramePresentationService';
import { NoteOverviewLayer } from './NoteOverviewLayer';
import { useNoteOverviewController } from '../hooks/useNoteOverviewController';
import { useNoteNavigationController } from '../hooks/useNoteNavigationController';
import { useNoteAmbientAgentContextHint } from '../hooks/useNoteAmbientAgentContextHint';
import { NoteNavigationPane } from './NoteNavigationPane';
import { chapterNavigationAnchors, chapterProjectionForNavigation } from './NoteNavigationHeadings';
import { buildNoteNavigationResults, type NoteNavigationResult } from '../noteNavigationSearch';
import { NoteTraySidebar, type NoteTrayState } from './NoteTraySidebar';
import { NoteTruthBindingProvider } from '../NoteTruthBindingContext';
import { TocProjectionProvider } from '../TocProjectionContext';
import styles from '../../NoteDetail.module.css';

export interface NoteRuntimeDocumentLayerProps {
  tray?: NoteTrayState;
  blockEditRecoveryReceipts: BlockEditRecoveryReceipt[];
  blockEditRecoveryConflicts?: Record<string, boolean>;
  floatingPanelProps: NoteFloatingPanelLayerProps;
  onApplyBlockEditRecovery: (recoveryKey: string) => void | Promise<boolean>;
  onDismissBlockEditRecovery: (recoveryKey: string) => boolean;
  onInspectBlockEditRecovery?: (recoveryKey: string) => Promise<NoteBlock | null>;
  onReplayBlockEditRecovery?: (recoveryKey: string) => Promise<boolean>;
  onSurfacePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  surfaceMode: 'page' | 'canvas';
  templateWarning: string | null;
  writingSurfaceProps: NoteWritingSurfaceLayerProps;
}

export interface NoteRuntimeDocumentHandle {
  resumeEditingForExit: () => void;
}

/** Search can discover folded text using the full plan; jumps resolve the current reading plan. */
function readingSearchDestination(result: NoteNavigationResult, input: NoteWritingSurfaceLayerProps): NoteNavigationResult | null {
  if (result.target === 'header') return result;
  return buildNoteNavigationResults({ ...input,
    visibleBlocks: input.visibleBlocks.filter((block) => block.id === result.blockId),
  }, result.match).find((candidate) => candidate.id === result.id) ?? null;
}

export const NoteRuntimeDocumentLayer = forwardRef<NoteRuntimeDocumentHandle, NoteRuntimeDocumentLayerProps>(function NoteRuntimeDocumentLayer({
  tray,
  blockEditRecoveryReceipts,
  blockEditRecoveryConflicts,
  floatingPanelProps,
  onApplyBlockEditRecovery,
  onDismissBlockEditRecovery,
  onInspectBlockEditRecovery,
  onReplayBlockEditRecovery,
  onSurfacePointerDown,
  surfaceMode,
  templateWarning,
  writingSurfaceProps,
}, ref) {
  const header = writingSurfaceProps.paperHeader;
  const truth = {
    title: header?.titleDraft ?? '', description: header?.descriptionDraft ?? '',
    readOnly: writingSurfaceProps.contentReadOnly || header?.contentReadOnly,
    onChange: (field: 'title' | 'description', value: string) => {
      if (field === 'title') header?.onTitleDraftChange(value);
      else header?.onDescriptionDraftChange(value);
    },
    onSave: (field: 'title' | 'description') => field === 'title' ? header?.onSaveTitle() : header?.onSaveDescription(),
  };
  const [gapPreference, setGapPreference] = useState({ noteId: writingSurfaceProps.noteId, folded: false });
  const pageGapsFolded = gapPreference.noteId === writingSurfaceProps.noteId && gapPreference.folded;
  const pageGapPresentation = useMemo(() => createPageGapPresentation(writingSurfaceProps.noteCanvasRuntime.pageFrames,
    surfaceMode === 'page' && pageGapsFolded), [writingSurfaceProps.noteCanvasRuntime.pageFrames, surfaceMode, pageGapsFolded]);
  const chapterProjection = useMemo(() => chapterProjectionForNavigation(writingSurfaceProps),
    [writingSurfaceProps.chapterPresentation?.projection, writingSurfaceProps.visibleBlocks,
      writingSurfaceProps.blockTextFlowDrafts, writingSurfaceProps.noteCanvasRuntime.pageFrameExtensions]);
  const headingAnchors = useMemo(() => chapterNavigationAnchors(chapterProjection, writingSurfaceProps,
    pageGapPresentation.offsetByFrameId), [chapterProjection, writingSurfaceProps.noteCanvasRuntime,
    writingSurfaceProps.pageOffsetX, pageGapPresentation]);
  const [pendingChapter, setPendingChapter] = useState<{ noteId: string; id: string } | null>(null);
  const [pendingSearchResult, setPendingSearchResult] = useState<NoteNavigationResult | null>(null);
  const overview = useNoteOverviewController({
    noteId: writingSurfaceProps.noteId,
    surfaceMode,
    blockListRef: writingSurfaceProps.blockListRef,
    pageFrames: pageGapPresentation.pageFrames,
  });
  const navigation = useNoteNavigationController({
    noteId: writingSurfaceProps.noteId,
    enabled: surfaceMode === 'page' && !overview.open,
    blockListRef: writingSurfaceProps.blockListRef,
    pageFrames: pageGapPresentation.pageFrames,
    headingAnchors,
  });
  const presentation = writingSurfaceProps.chapterPresentation;
  const printSource = presentation?.searchSource;
  const chapterNeedsReveal = (id: string) => {
    let chapter = chapterProjection.chapters.find((candidate) => candidate.id === id);
    while (chapter) {
      if (presentation?.collapsedChapterIds.has(chapter.id)) return true;
      const parentId = chapter.parentId;
      chapter = chapterProjection.chapters.find((candidate) => candidate.id === parentId);
    }
    return false;
  };
  const selectChapter = (id: string) => {
    setPendingSearchResult(null);
    presentation?.onRevealChapter(id);
    if (chapterNeedsReveal(id)) {
      setPendingChapter({ noteId: writingSurfaceProps.noteId, id });
      return;
    }
    setPendingChapter(null);
    const anchor = headingAnchors.find((candidate) => candidate.chapterId === id);
    if (anchor) navigation.selectHeading(anchor);
  };
  useEffect(() => {
    if (!pendingChapter) return;
    if (pendingChapter.noteId !== writingSurfaceProps.noteId
      || !chapterProjection.chapters.some((chapter) => chapter.id === pendingChapter.id)) {
      setPendingChapter(null);
      return;
    }
    if (chapterNeedsReveal(pendingChapter.id)) return;
    const anchor = headingAnchors.find((candidate) => candidate.chapterId === pendingChapter.id);
    if (!anchor) return;
    navigation.selectHeading(anchor);
    setPendingChapter(null);
  }, [pendingChapter, writingSurfaceProps.noteId, presentation?.collapsedChapterIds, chapterProjection,
    headingAnchors, navigation.selectHeading]);
  const chapterForSearchResult = (result: NoteNavigationResult) => {
    for (let index = chapterProjection.chapters.length - 1; index >= 0; index -= 1) {
      const chapter = chapterProjection.chapters[index];
      if (result.blockId && chapter.blockIds.includes(result.blockId)) return chapter;
    }
    return null;
  };
  const jumpToSearchResult = (result: NoteNavigationResult) => navigation.selectResult(result.blockId, result.frameId, {
    ...result.rect, y: result.rect.y + (pageGapPresentation.offsetByFrameId.get(result.frameId) || 0),
  });
  const selectSearchResult = (result: NoteNavigationResult) => {
    if (result.noteId !== writingSurfaceProps.noteId) return;
    setPendingChapter(null);
    const chapter = chapterForSearchResult(result);
    if (chapter && chapterNeedsReveal(chapter.id)) {
      setPendingSearchResult(result);
      presentation?.onRevealChapter(chapter.id);
      return;
    }
    setPendingSearchResult(null);
    const destination = readingSearchDestination(result, writingSurfaceProps);
    if (destination) jumpToSearchResult(destination);
  };
  useEffect(() => {
    if (!pendingSearchResult) return;
    const blocks = presentation?.searchSource?.blocks ?? writingSurfaceProps.allBlocks ?? writingSurfaceProps.visibleBlocks;
    if (pendingSearchResult.noteId !== writingSurfaceProps.noteId
      || !blocks.some((block) => block.id === pendingSearchResult.blockId)) {
      setPendingSearchResult(null);
      return;
    }
    const chapter = chapterForSearchResult(pendingSearchResult);
    if (chapter && chapterNeedsReveal(chapter.id)) return;
    const destination = readingSearchDestination(pendingSearchResult, writingSurfaceProps);
    if (!destination) return;
    jumpToSearchResult(destination);
    setPendingSearchResult(null);
  }, [pendingSearchResult, writingSurfaceProps.noteId, writingSurfaceProps.visibleBlocks, writingSurfaceProps.allBlocks,
    writingSurfaceProps.blockTextDrafts, writingSurfaceProps.blockTextFlowDrafts, writingSurfaceProps.blockFieldDrafts,
    writingSurfaceProps.noteCanvasRuntime, writingSurfaceProps.pageOffsetX, presentation?.searchSource,
    presentation?.collapsedChapterIds, chapterProjection, pageGapPresentation, navigation.selectResult]);
  useNoteAmbientAgentContextHint({
    noteId: writingSurfaceProps.noteId,
    surfaceMode,
    blockListRef: writingSurfaceProps.blockListRef,
    pageFrames: writingSurfaceProps.noteCanvasRuntime.pageFrames,
    overviewOpen: overview.open,
    overviewFrameId: overview.currentFrameId,
  });
  useImperativeHandle(ref, () => ({ resumeEditingForExit: overview.resumeForExit }));
  const document = (
    <div
      className={styles.documentShell}
      data-note-overview-active={overview.open ? 'true' : 'false'}
      data-page-reading-target-frame={overview.targetFrameId || undefined}
      onMouseDown={overview.open ? undefined : onSurfacePointerDown}
    >
      {templateWarning && <div className={styles.templateWarning}>{templateWarning}</div>}
      <BlockEditRecoveryQueue receipts={blockEditRecoveryReceipts} conflicts={blockEditRecoveryConflicts}
        onApply={onApplyBlockEditRecovery} onDismiss={onDismissBlockEditRecovery}
        onInspect={onInspectBlockEditRecovery} onReplay={onReplayBlockEditRecovery} />

      <NoteFloatingPanelLayer {...floatingPanelProps} />
      {overview.open && <NoteOverviewLayer writingSurfaceProps={writingSurfaceProps}
        currentPageFrameId={overview.currentFrameId}
        onSelectPage={overview.selectPage} onClose={overview.close} />}
      <NoteWritingSurfaceLayer {...writingSurfaceProps} overviewOpen={overview.open} onToggleOverview={overview.toggle}
        pageGapsFolded={pageGapsFolded}
        onPageGapsFoldedChange={(folded) => setGapPreference({ noteId: writingSurfaceProps.noteId, folded })}
        navigationOpen={navigation.open} onToggleNavigation={navigation.toggle} />
      <NotePrintLayer {...writingSurfaceProps}
        visibleBlocks={printSource ? [...printSource.blocks] : writingSurfaceProps.visibleBlocks}
        noteCanvasRuntime={printSource ? { ...writingSurfaceProps.noteCanvasRuntime, ...printSource.runtime,
          pageFrameExtensions: printSource.runtime.pageFrameExtensions ?? writingSurfaceProps.noteCanvasRuntime.pageFrameExtensions,
          blockPlacements: printSource.runtime.blockPlacements ?? writingSurfaceProps.noteCanvasRuntime.blockPlacements,
        } : writingSurfaceProps.noteCanvasRuntime} />
    </div>
  );
  const navigableDocument = <TocProjectionProvider value={{ agenda: chapterProjection.agenda, onSelectChapter: selectChapter }}>
    {surfaceMode === 'page' ? <div className="noteNavigationDocumentRow" data-note-navigation-row="true"
    data-note-navigation-with-tray={tray ? 'true' : undefined}>
    {navigation.open && <NoteNavigationPane writingSurfaceProps={writingSurfaceProps}
      tab={navigation.tab} onTabChange={navigation.setTab} currentPageFrameId={navigation.currentFrameId}
      chapterProjection={chapterProjection} currentChapterId={navigation.currentChapterId} onSelectChapter={selectChapter}
      onSelectPage={navigation.selectPage}
      onSelectResult={selectSearchResult}
      onClose={() => navigation.setOpen(false)} />}
    {document}
  </div> : document}</TocProjectionProvider>;
  if (surfaceMode !== 'page' || !tray) return <NoteTruthBindingProvider value={truth}>{navigableDocument}</NoteTruthBindingProvider>;
  return <NoteTruthBindingProvider value={truth}><div className={styles.trayViewport}>
    <button type="button" className={`${styles.contentGroupLauncher} ${styles.trayToggle}`} aria-expanded={tray.open}
      data-note-tray-toggle="true" onClick={() => tray.setOpen(!tray.open)}>
      <Inbox size={16} aria-hidden="true" /><span>Staging ({tray.entries.length})</span>
    </button>
    <div className={styles.trayDocumentRow}>
      {navigableDocument}
      {tray.open && <NoteTraySidebar tray={tray} />}
    </div>
  </div></NoteTruthBindingProvider>;
});
