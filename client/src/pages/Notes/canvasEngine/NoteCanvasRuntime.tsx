import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CornerDownLeft,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import {
  buildNoteCanvasRuntimeModel,
} from './engineModel';
import {
  combinedDefinitionText,
  presentationKindForBlock,
  stringValue,
  textFromContent,
} from './blockContentService';
import { useCanvasContentWidth } from './hooks/useCanvasContentWidth';
import { useBlockPlacementInteractions } from './hooks/useBlockPlacementInteractions';
import { useBlockSelectionController } from './hooks/useBlockSelectionController';
import { useCanvasSurfacePointerController } from './hooks/useCanvasSurfacePointerController';
import { useDraftBlockController } from './hooks/useDraftBlockController';
import { useFloatingOverlayController } from './hooks/useFloatingOverlayController';
import { useLayoutDraftController } from './hooks/useLayoutDraftController';
import { useLayoutInteractionController } from './hooks/useLayoutInteractionController';
import { useNoteCanvasDataAdapter } from './hooks/useNoteCanvasDataAdapter';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import { usePlacementHistory } from './hooks/usePlacementHistory';
import { useRuntimeInteractionController } from './hooks/useRuntimeInteractionController';
import { useSlashCommandController } from './hooks/useSlashCommandController';
import { useSurfaceModeController } from './hooks/useSurfaceModeController';
import { BlockEditorLayer } from './layers/BlockEditorLayer';
import {
  NoteChromeLayer,
  NoteFloatingPanelLayer,
} from './layers/NoteChromeLayer';
import { SlashMenuLayer } from './layers/SlashMenuLayer';
import { estimateTextBlockHeight } from './measurementService';
import {
  getVisibleBlocksForSurface,
  shouldResolvePageCollisions,
} from './modePolicyService';
import {
  calculatePageFrameHeight,
  createDefaultDraftLayout,
  createRuntimePageFrame,
} from './pageFrameService';
import {
  applyMoveSnap,
  buildDefaultBlockLayouts,
  getBoundaryKind,
  layoutsEqual,
  normalizeBlockLayout,
} from './placementService';
import { buildExportPreviewModel } from './exportPreviewService';
import {
  LAYOUT_MEASURE_SUPPRESSION_MS,
  MIN_BLOCK_HEIGHT,
  type BlockBoxLayout,
} from './runtimeLayout';
import type { BlockPlacementModel } from './types';
import type {
  NoteBlock,
} from './runtimeDataTypes';
import {
  createRuntimeViewport,
  createRuntimeWorld,
} from './viewportService';
import styles from '../NoteDetail.module.css';

function isFormulaLikeBlock(block: NoteBlock): boolean {
  const templateKey = typeof block.metadata?.template_key === 'string' ? block.metadata.template_key : '';
  const templateId = typeof block.metadata?.template_id === 'string' ? block.metadata.template_id : '';
  const legacyTemplateId = typeof block.metadata?.legacy_template_id === 'string' ? block.metadata.legacy_template_id : '';
  return block.block_type === 'formula'
    || templateKey.includes('formula')
    || templateId.includes('formula')
    || legacyTemplateId.includes('formula');
}

function shouldShowPreview(block: NoteBlock, text: string): boolean {
  return isFormulaLikeBlock(block) && text.trim().length > 0;
}

function estimateBlockHeightForText(block: NoteBlock, text: string, width: number): number {
  return estimateTextBlockHeight({
    text,
    width,
    title: block.title,
    showPreview: shouldShowPreview(block, text),
    sourceReferenceCount: block.source_references?.length || 0,
  });
}

function estimateBlockHeight(block: NoteBlock, width: number): number {
  return estimateBlockHeightForText(block, textFromContent(block), width);
}

export default function NoteCanvasRuntime() {
  const { noteId } = useNoteCanvasRuntime();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const {
    interactionState,
    setInteractionState,
  } = useRuntimeInteractionController();
  const blockListRef = useRef<HTMLDivElement | null>(null);
  const movingBlockIdRef = useRef<string | null>(null);
  const suppressMeasuredReflowUntilRef = useRef(0);
  const {
    layoutMode,
    setLayoutMode,
    setSnapGuide,
    snapEnabled,
    snapGuide,
    toggleLayoutMode,
    toggleSnapEnabled,
  } = useLayoutInteractionController();
  const {
    applyMeasuredBlockHeightDraft,
    clearLayoutDraftForBlock,
    layoutDrafts,
    mergeLayoutDrafts,
    resetLayoutDrafts,
    setLayoutDraftForBlock,
    setLayoutDrafts,
  } = useLayoutDraftController();

  const {
    chromeCollapsed,
    closeOverlay,
    collapseChrome,
    expandChrome,
    showAdvancedInsert,
    showExportPreview,
    showMoreActions,
    showNoteInfo,
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    toggleAdvancedInsert,
    toggleExportPreview,
    toggleMoreActions,
    toggleNoteInfo,
    togglePreviewAIVisibility,
    togglePreviewBlockTypes,
    togglePreviewExportStatus,
  } = useFloatingOverlayController({ setInteractionState });

  const suppressMeasuredReflowForSelection = useCallback(() => {
    suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
  }, []);

  const {
    activeBlockId,
    clearBlockSelection,
    focusBlockId,
    markBlockFocused,
    markBlockSelected,
    selectedBlockId,
    setActiveBlockId,
    setFocusBlockId,
    setSelectedBlockId,
  } = useBlockSelectionController({
    onBeforeBlockFocus: suppressMeasuredReflowForSelection,
    onBeforeBlockSelect: suppressMeasuredReflowForSelection,
    setInteractionState,
  });

  const {
    pageOffsetX,
    surfaceMode,
    surfacePolicy,
    toggleSurfaceMode,
  } = useSurfaceModeController({
    clearBlockSelection,
    closeOverlay,
    setSnapGuide,
  });

  const handleNoteLoaded = useCallback(() => {
    resetLayoutDrafts();
    clearBlockSelection();
  }, [clearBlockSelection, resetLayoutDrafts]);

  const {
    note,
    blocks,
    sortedBlocks,
    loading,
    titleDraft,
    setTitleDraft,
    newTemplateId,
    setNewTemplateId,
    templateOptions,
    templateWarning,
    newBlockText,
    setNewBlockText,
    savingBlockId,
    anchorsBySourceRef,
    sourceJumpTarget,
    setSourceJumpTarget,
    sourceJumpBusy,
    blockTextDrafts,
    setBlockTextDrafts,
    blockFieldDrafts,
    setBlockFieldDrafts,
    defaultTextTemplate,
    insertTemplateGroups,
    insertTemplateOptions,
    saveTitle,
    createBlock,
    saveBlock,
    applyTemplateToBlock,
    persistBlockLayout,
    toggleBlockExportRole,
    toggleBlockAIVisibility,
    addBlock,
    trashBlock,
    moveBlock,
    handleViewSource,
  } = useNoteCanvasDataAdapter({
    noteId,
    onNoteLoaded: handleNoteLoaded,
    clearLayoutDraftForBlock,
    setLayoutDraftForBlock,
  });

  const sourceReferenceCount = useMemo(
    () => sortedBlocks.reduce((total, block) => total + block.source_references.length, 0),
    [sortedBlocks],
  );

  const contentWidth = useCanvasContentWidth({
    containerRef: blockListRef,
    pageOffsetX,
    surfaceMode,
  });

  const visibleBlocks = useMemo(
    () => getVisibleBlocksForSurface(sortedBlocks, surfacePolicy, contentWidth),
    [sortedBlocks, surfacePolicy, contentWidth],
  );

  const blockLayouts = useMemo(() => {
    const defaults = buildDefaultBlockLayouts(visibleBlocks, contentWidth, estimateBlockHeight);
    const resolvedLayouts = visibleBlocks.reduce<Record<string, BlockBoxLayout>>((acc, block) => {
      const draft = layoutDrafts[block.id];
      acc[block.id] = draft || normalizeBlockLayout({
        block,
        fallback: defaults[block.id],
        contentWidth,
        surfaceMode,
        estimateHeight: estimateBlockHeight,
      });
      return acc;
    }, {});
    return resolvedLayouts;
  }, [visibleBlocks, contentWidth, layoutDrafts, surfaceMode]);

  const defaultDraftLayout = useMemo(() => {
    return createDefaultDraftLayout(blockLayouts, contentWidth);
  }, [blockLayouts, contentWidth]);

  const {
    activateDraft,
    creatingDraft,
    discardDraft,
    draftActive,
    draftLayout,
    draftRef,
    draftText,
    draftTextRef,
    persistDraft,
    resizeDraftFromTextarea,
    setDraftText,
  } = useDraftBlockController({
    createBlock,
    defaultDraftLayout,
    defaultTextTemplate,
    note,
    saveBlock,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setSelectedBlockId,
  });

  const pageContentHeight = useMemo(() => {
    return calculatePageFrameHeight({
      blockLayouts,
      draftActive,
      draftLayout,
      defaultDraftLayout,
    });
  }, [blockLayouts, draftActive, draftLayout, defaultDraftLayout]);

  const primaryPageFrame = useMemo(
    () => createRuntimePageFrame({
      x: pageOffsetX,
      height: pageContentHeight,
    }),
    [pageContentHeight, pageOffsetX],
  );

  const canvasBlockPlacements = useMemo<BlockPlacementModel[]>(
    () => visibleBlocks.flatMap((block) => {
      const layout = blockLayouts[block.id];
      if (!layout) return [];
      const boundary = getBoundaryKind(layout);
      return [{
        blockId: block.id,
        x: layout.x + pageOffsetX,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        rotation: layout.rotation || 0,
        surface: boundary === 'inside' ? 'formal_page' : 'canvas_workspace',
      }];
    }),
    [blockLayouts, pageOffsetX, visibleBlocks],
  );

  const noteCanvasRuntime = useMemo(() => {
    const viewport = createRuntimeViewport(surfaceMode, pageContentHeight);

    return buildNoteCanvasRuntimeModel({
      mode: surfaceMode,
      world: createRuntimeWorld(surfaceMode, pageContentHeight),
      primaryPageFrame,
      viewport,
      blockPlacements: canvasBlockPlacements,
    });
  }, [canvasBlockPlacements, pageContentHeight, primaryPageFrame, surfaceMode]);

  const exportPreview = useMemo(() => {
    return buildExportPreviewModel(visibleBlocks, blockLayouts);
  }, [visibleBlocks, blockLayouts]);

  const persistChangedBlockLayouts = useCallback((nextLayouts: Record<string, BlockBoxLayout>) => {
    Object.entries(nextLayouts).forEach(([blockId, nextLayout]) => {
      const previousLayout = blockLayouts[blockId];
      if (previousLayout && layoutsEqual(previousLayout, nextLayout)) return;
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return;
      void persistBlockLayout(targetBlock, nextLayout);
    });
  }, [blocks, blockLayouts, persistBlockLayout]);

  const persistLayoutSnapshot = useCallback((layouts: Record<string, BlockBoxLayout>) => {
    Object.entries(layouts).forEach(([blockId, layout]) => {
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return;
      void persistBlockLayout(targetBlock, layout);
    });
  }, [blocks, persistBlockLayout]);

  const { pushLayoutHistory } = usePlacementHistory({
    applyLayoutDrafts: mergeLayoutDrafts,
    persistLayoutSnapshot,
  });

  const { beginMoveBlock, beginResizeBlock } = useBlockPlacementInteractions({
    blockLayouts,
    contentWidth,
    estimateBlockHeightForText,
    movingBlockIdRef,
    orderedBlocks: visibleBlocks,
    persistChangedBlockLayouts,
    pushLayoutHistory,
    setInteractionState,
    setLayoutDrafts,
    setLayoutMode,
    setSelectedBlockId,
    setSnapGuide,
    snapEnabled,
    suppressMeasuredReflowUntilRef,
    surfacePolicy,
  });

  const {
    clearSlashTarget,
    handleBlockKeyDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handleSelectSlashCommand,
    slashCommands,
    slashTarget,
  } = useSlashCommandController({
    addToast,
    applyTemplateToBlock,
    blockListRef,
    blocks,
    blockTextDrafts,
    draftText,
    draftTextRef,
    insertTemplateOptions,
    persistDraft,
    saveBlock,
    setBlockTextDrafts,
    setDraftText,
    setFocusBlockId,
    setInteractionState,
    templateOptions,
    activateDraft,
  });

  const {
    handleBlockListMouseDown,
    handlePageSpaceDoubleClick,
    handleSurfacePointerDown,
  } = useCanvasSurfacePointerController({
    activateDraft,
    clearBlockSelection,
    contentWidth,
    defaultDraftLayout,
    pageOffsetX,
    snapEnabled,
    surfacePolicy,
  });

  if (loading || !note) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <NoteChromeLayer
        chromeCollapsed={chromeCollapsed}
        exportPreview={exportPreview}
        layoutMode={layoutMode}
        note={note}
        showExportPreview={showExportPreview}
        showMoreActions={showMoreActions}
        showNoteInfo={showNoteInfo}
        showPreviewAIVisibility={showPreviewAIVisibility}
        showPreviewBlockTypes={showPreviewBlockTypes}
        showPreviewExportStatus={showPreviewExportStatus}
        snapEnabled={snapEnabled}
        sortedBlockCount={sortedBlocks.length}
        sourceReferenceCount={sourceReferenceCount}
        surfaceMode={surfaceMode}
        surfacePolicy={surfacePolicy}
        titleDraft={titleDraft}
        onAddFavorite={() => addToast('info', 'Favorites will become persistent in a later Better Notebook patch')}
        onBackProject={() => navigate(`/projects/${note.course_id}`)}
        onCloseOverlay={closeOverlay}
        onCollapseChrome={collapseChrome}
        onExpandChrome={expandChrome}
        onSaveTitle={saveTitle}
        onTitleDraftChange={setTitleDraft}
        onToggleExportPreview={toggleExportPreview}
        onToggleLayoutMode={toggleLayoutMode}
        onToggleMoreActions={toggleMoreActions}
        onToggleNoteInfo={toggleNoteInfo}
        onTogglePreviewAIVisibility={togglePreviewAIVisibility}
        onTogglePreviewBlockTypes={togglePreviewBlockTypes}
        onTogglePreviewExportStatus={togglePreviewExportStatus}
        onToggleSnapEnabled={toggleSnapEnabled}
        onToggleSurfaceMode={toggleSurfaceMode}
      />

      <div
        className={`${styles.documentShell} ${surfaceMode === 'canvas' ? styles.documentShellCanvas : ''}`}
        onMouseDown={handleSurfacePointerDown}
      >
        {templateWarning && <div className={styles.templateWarning}>{templateWarning}</div>}

        <NoteFloatingPanelLayer
          insertTemplateGroups={insertTemplateGroups}
          newBlockText={newBlockText}
          newTemplateId={newTemplateId}
          showAdvancedInsert={showAdvancedInsert}
          sourceJumpTarget={sourceJumpTarget}
          onAddBlock={addBlock}
          onCloseOverlay={closeOverlay}
          onCloseSourceJump={() => setSourceJumpTarget(null)}
          onFocusBlock={setFocusBlockId}
          onNewBlockTextChange={setNewBlockText}
          onNewTemplateChange={setNewTemplateId}
          onToggleAdvancedInsert={toggleAdvancedInsert}
        />

        <section className={`${styles.writingSurface} ${surfaceMode === 'canvas' ? styles.writingSurfaceCanvas : styles.writingSurfacePage}`}>
          <div
            ref={blockListRef}
            className={`${styles.blockList} ${surfaceMode === 'canvas' ? styles.blockListCanvas : styles.blockListPage} ${layoutMode ? styles.layoutMode : ''}`}
            data-canvas-engine-version={noteCanvasRuntime.version}
            data-canvas-engine-route={noteCanvasRuntime.route}
            data-canvas-visible-blocks={noteCanvasRuntime.visibleBlockIds.length}
            data-canvas-page-frame={noteCanvasRuntime.primaryPageFrame?.id || 'none'}
            data-canvas-surface-mode={surfacePolicy.mode}
            data-canvas-interaction-mode={interactionState.mode}
            data-canvas-interaction-target={interactionState.target}
            data-canvas-interaction-block={interactionState.blockId || ''}
            style={{
              minHeight: pageContentHeight,
              '--formal-page-offset-x': `${pageOffsetX}px`,
              '--formal-page-width': `${primaryPageFrame.width}px`,
              '--canvas-world-width': `${noteCanvasRuntime.world.width}px`,
            } as CSSProperties}
            onMouseDown={handleBlockListMouseDown}
            onDoubleClick={handlePageSpaceDoubleClick}
          >
            {surfaceMode === 'canvas' && (
              <>
                <div className={styles.formalPageBoundary} style={{ minHeight: pageContentHeight }} />
                <div className={styles.scratchWorkspaceLabel}>Scratch workspace</div>
              </>
            )}
            {snapGuide?.x !== undefined && (
              <div className={styles.snapGuideVertical} style={{ left: snapGuide.x + pageOffsetX }} />
            )}
            {snapGuide?.y !== undefined && (
              <div className={styles.snapGuideHorizontal} style={{ top: snapGuide.y }} />
            )}
            {visibleBlocks.map((block) => {
              const text = blockTextDrafts[block.id] ?? textFromContent(block);
              const isActive = activeBlockId === block.id || focusBlockId === block.id || selectedBlockId === block.id;
              const layout = blockLayouts[block.id];
              return (
                  <BlockEditorLayer
                  key={block.id}
                  block={block}
                  text={text}
                  layout={layout}
                  fieldDraft={blockFieldDrafts[block.id]}
                  layoutMode={layoutMode}
                  saving={savingBlockId === block.id}
                  active={isActive}
                  autoFocus={focusBlockId === block.id}
                  onFocused={() => markBlockFocused(block.id)}
                  onTextChange={(value, caret, anchorElement) => handleBlockTextChange(block.id, value, caret, anchorElement)}
                  onFieldDraftChange={(fieldValues) => {
                    setBlockFieldDrafts((current) => ({ ...current, [block.id]: fieldValues }));
                    const nextText = presentationKindForBlock(block) === 'definition'
                      ? combinedDefinitionText(stringValue(fieldValues.concept_name), stringValue(fieldValues.description))
                      : presentationKindForBlock(block) === 'formula'
                        ? stringValue(fieldValues.latex_input)
                        : text;
                    setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
                  }}
                  onSave={(silent, fieldValues) => saveBlock(block, text, { silent, fieldValues })}
                  onTrash={() => trashBlock(block.id)}
                  onSelect={() => markBlockSelected(block.id)}
                  onBeginMove={(event) => beginMoveBlock(event, block, layout)}
                  onBeginResize={(event) => beginResizeBlock(event, block, text, layout)}
                  onToggleExportRole={() => toggleBlockExportRole(block, layout)}
                  onToggleAIVisibility={() => toggleBlockAIVisibility(block, layout)}
                  showBlockTypeBadge={showPreviewBlockTypes}
                  showAIStatusBadge={showPreviewAIVisibility}
                  showExportStatusBadge={showPreviewExportStatus}
                  onKeyDown={(event) => handleBlockKeyDown(block, text, event)}
                  onMeasuredHeight={(height) => {
                    const allowActiveFormulaReflow = isActive && presentationKindForBlock(block) === 'formula';
                    if (movingBlockIdRef.current) return;
                    if (!allowActiveFormulaReflow && Date.now() < suppressMeasuredReflowUntilRef.current) return;
                    applyMeasuredBlockHeightDraft({
                      baseLayouts: blockLayouts,
                      blockId: block.id,
                      fallbackLayout: layout,
                      measuredHeight: height,
                      orderedBlockIds: visibleBlocks.map((item) => item.id),
                      resolveCollisions: shouldResolvePageCollisions(surfacePolicy),
                    });
                  }}
                  pageOffsetX={pageOffsetX}
                  anchorsBySourceRef={anchorsBySourceRef}
                  sourceJumpBusy={sourceJumpBusy}
                  onViewSource={handleViewSource}
                />
              );
            })}

            {draftActive && (
              <div
                className={`${styles.block} ${styles.blockBox} ${styles.draftBlock}`}
                style={{
                  left: (draftLayout || defaultDraftLayout).x + pageOffsetX,
                  top: (draftLayout || defaultDraftLayout).y,
                  width: (draftLayout || defaultDraftLayout).width,
                  height: (draftLayout || defaultDraftLayout).height,
                }}
              >
                <textarea
                  ref={draftRef}
                  className={styles.pageTextArea}
                  value={draftText}
                  onChange={(event) => {
                    resizeDraftFromTextarea(event.currentTarget);
                    handleDraftChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
                  }}
                  onBlur={() => {
                    if (slashTarget?.target === 'draft') return;
                    if (draftText.trim()) {
                      void persistDraft(draftText);
                    } else {
                      discardDraft();
                      clearSlashTarget();
                    }
                  }}
                  onKeyDown={handleDraftKeyDown}
                  placeholder={creatingDraft ? 'Saving block...' : 'Start writing, or type / for blocks'}
                  rows={1}
                />
                <div className={styles.draftHint}>
                  <CornerDownLeft size={13} />
                  Enter for a new line, Ctrl+Enter for the next block.
                </div>
              </div>
            )}

            {slashTarget && (
              <SlashMenuLayer
                commands={slashCommands}
                onSelect={handleSelectSlashCommand}
                anchor={slashTarget.anchor}
              />
            )}

            {!draftActive && sortedBlocks.length === 0 && (
              <button className={styles.emptyPagePrompt} onDoubleClick={() => activateDraft(defaultDraftLayout)}>
                Double-click to start writing
              </button>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
