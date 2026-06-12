import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CornerDownLeft,
  Eye,
  FileText,
  Info,
  LayoutDashboard,
  MoreHorizontal,
  PanelTopClose,
  PanelTopOpen,
  Plus,
  Star,
  X,
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
import { useNoteCanvasDataAdapter } from './hooks/useNoteCanvasDataAdapter';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import { usePlacementHistory } from './hooks/usePlacementHistory';
import { useSlashCommandController } from './hooks/useSlashCommandController';
import { useSurfaceModeController } from './hooks/useSurfaceModeController';
import { BlockEditorLayer } from './layers/BlockEditorLayer';
import { ExportPreviewLayer } from './layers/ExportPreviewLayer';
import { SlashMenuLayer } from './layers/SlashMenuLayer';
import {
  idleInteraction,
} from './interactionController';
import {
  applyMeasuredBlockHeightToLayouts,
  estimateTextBlockHeight,
} from './measurementService';
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
  type SnapGuide,
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
  const [layoutMode, setLayoutMode] = useState(false);
  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, BlockBoxLayout>>({});
  const [snapGuide, setSnapGuide] = useState<SnapGuide | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [interactionState, setInteractionState] = useState(idleInteraction());
  const blockListRef = useRef<HTMLDivElement | null>(null);
  const movingBlockIdRef = useRef<string | null>(null);
  const suppressMeasuredReflowUntilRef = useRef(0);

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
    setLayoutDrafts({});
    clearBlockSelection();
  }, [clearBlockSelection]);

  const clearLayoutDraftForBlock = useCallback((blockId: string) => {
    setLayoutDrafts((current) => {
      const next = { ...current };
      delete next[blockId];
      return next;
    });
  }, []);

  const setLayoutDraftForBlock = useCallback((blockId: string, layout: BlockBoxLayout) => {
    setLayoutDrafts((current) => ({ ...current, [blockId]: layout }));
  }, []);

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

  const applyLayoutHistoryDrafts = useCallback((layouts: Record<string, BlockBoxLayout>) => {
    setLayoutDrafts((current) => ({ ...current, ...layouts }));
  }, []);

  const { pushLayoutHistory } = usePlacementHistory({
    applyLayoutDrafts: applyLayoutHistoryDrafts,
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
      <div className={styles.chromeWrap}>
        {chromeCollapsed ? (
          <div className={styles.chromeCollapsed}>
            <button className={styles.backBtn} onClick={() => navigate(`/projects/${note.course_id}`)}>
              <ArrowLeft size={18} />
              Project
            </button>
            <button
              className={styles.iconBtn}
              onClick={expandChrome}
              title="Show note tools"
              aria-label="Show note tools"
            >
              <PanelTopOpen size={16} />
            </button>
          </div>
        ) : (
          <div className={styles.noteChrome}>
            <button className={styles.backBtn} onClick={() => navigate(`/projects/${note.course_id}`)}>
              <ArrowLeft size={18} />
              Project
            </button>

            <input
              className={styles.titleInput}
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                void saveTitle();
              }}
              aria-label="Note title"
            />

            <div className={styles.chromeActions}>
              <button
                className={`${styles.modePill} ${surfaceMode === 'canvas' ? styles.modePillActive : ''}`}
                onClick={toggleSurfaceMode}
                title={surfacePolicy.nextModeLabel}
                aria-pressed={surfaceMode === 'canvas'}
              >
                <FileText size={15} />
                {surfacePolicy.label}
              </button>
              <button
                className={`${styles.modePill} ${showExportPreview ? styles.modePillActive : ''}`}
                onClick={toggleExportPreview}
                title="Preview export boundary"
                aria-pressed={showExportPreview}
              >
                <Eye size={15} />
                Preview
              </button>
              <button
                className={`${styles.modePill} ${layoutMode ? styles.modePillActive : ''}`}
                onClick={() => {
                  setSnapGuide(null);
                  setLayoutMode((value) => !value);
                }}
                title="Toggle layout mode"
                aria-pressed={layoutMode}
              >
                <LayoutDashboard size={15} />
                Layout
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => addToast('info', 'Favorites will become persistent in a later Better Notebook patch')}
                title="Add to favorites"
                aria-label="Add to favorites"
              >
                <Star size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={toggleNoteInfo}
                title="View info"
                aria-label="View info"
              >
                <Info size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={toggleMoreActions}
                title="More note actions"
                aria-label="More note actions"
              >
                <MoreHorizontal size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={collapseChrome}
                title="Hide note tools"
                aria-label="Hide note tools"
              >
                <PanelTopClose size={16} />
              </button>
            </div>

            {showNoteInfo && (
              <div className={styles.infoPopover}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note info</div>
                    <strong>{note.title || 'Untitled note'}</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={closeOverlay} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <dl className={styles.infoGrid}>
                  <div>
                    <dt>Mode</dt>
                    <dd>{surfaceMode === 'page' ? 'Page' : 'Canvas'}</dd>
                  </div>
                  <div>
                    <dt>Blocks</dt>
                    <dd>{sortedBlocks.length}</dd>
                  </div>
                  <div>
                    <dt>Sources</dt>
                    <dd>{sourceReferenceCount}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{note.status}</dd>
                  </div>
                </dl>
                <p className={styles.popoverNote}>
                  Full source, relation, export, and history details will move into the Better Notebook inspector.
                </p>
              </div>
            )}

            {showMoreActions && (
              <div className={`${styles.infoPopover} ${styles.actionsPopover}`}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note actions</div>
                    <strong>More</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={closeOverlay} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <button
                  className={styles.moreAction}
                  onClick={() => {
                    setSnapGuide(null);
                    setSnapEnabled((value) => !value);
                  }}
                >
                  <LayoutDashboard size={15} />
                  <span>Snap alignment</span>
                  <small>
                    {snapEnabled
                      ? 'On: moving and resizing can align to page and neighbor edges.'
                      : 'Off: moving and resizing use free placement.'}
                  </small>
                  <span className={`${styles.togglePill} ${snapEnabled ? styles.togglePillOn : styles.togglePillOff}`}>
                    {snapEnabled ? 'On' : 'Off'}
                  </span>
                </button>
                <p className={styles.popoverNote}>
                  Page settings, history, export, and inspector actions will live here as they become real.
                </p>
              </div>
            )}

            {showExportPreview && (
              <ExportPreviewLayer
                preview={exportPreview}
                showBlockTypes={showPreviewBlockTypes}
                showAIVisibility={showPreviewAIVisibility}
                showExportStatus={showPreviewExportStatus}
                onToggleBlockTypes={togglePreviewBlockTypes}
                onToggleAIVisibility={togglePreviewAIVisibility}
                onToggleExportStatus={togglePreviewExportStatus}
                onClose={closeOverlay}
              />
            )}

          </div>
        )}
      </div>

      <div
        className={`${styles.documentShell} ${surfaceMode === 'canvas' ? styles.documentShellCanvas : ''}`}
        onMouseDown={handleSurfacePointerDown}
      >
        {templateWarning && <div className={styles.templateWarning}>{templateWarning}</div>}

        <div className={styles.pageToolRail} aria-label="Page tools">
          <button
            className={styles.pageToolBtn}
            onClick={toggleAdvancedInsert}
            title="Insert block"
            aria-label="Insert block"
          >
            <Plus size={16} />
            Insert
          </button>
        </div>

        {showAdvancedInsert && (
          <aside className={styles.insertPanel} aria-label="Advanced insert panel">
            <div className={styles.popoverHeader}>
              <div>
                <div className={styles.popoverEyebrow}>Block insert</div>
                <strong>Advanced insert</strong>
              </div>
              <button className={styles.iconBtn} onClick={closeOverlay} title="Close">
                <X size={15} />
              </button>
            </div>
            <p className={styles.popoverNote}>
              Use this when you want to pick a precise block type. The natural path is still clicking the page or typing /.
            </p>
            <div className={styles.addBlock}>
              <select
                className={styles.typeSelect}
                value={newTemplateId}
                onChange={(event) => setNewTemplateId(event.target.value)}
              >
                {insertTemplateGroups.map((group) => (
                  <optgroup key={group.key} label={group.label}>
                    {group.templates.map((template) => (
                      <option key={`${group.key}-${template.template_id}`} value={template.template_id}>
                        {template.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <textarea
                className={styles.newBlockText}
                value={newBlockText}
                onChange={(event) => setNewBlockText(event.target.value)}
                placeholder="Write the block content here."
              />
              <button
                className={styles.addBlockBtn}
                onClick={async () => {
                  const created = await addBlock();
                  if (created) {
                    setFocusBlockId(created.id);
                    closeOverlay();
                  }
                }}
              >
                <Plus size={16} />
                Add block
              </button>
            </div>
          </aside>
        )}

        {sourceJumpTarget && (
          <div className={styles.sourceJumpPanel}>
            <div className={styles.sourceJumpHeader}>
              <div>
                <div className={styles.sourceJumpEyebrow}>Source snapshot</div>
                <div className={styles.sourceJumpTitle}>{sourceJumpTarget.snapshot.title}</div>
                <div className={styles.sourceJumpMeta}>
                  {sourceJumpTarget.snapshot.source_filename} - {sourceJumpTarget.page.page_label || `p.${sourceJumpTarget.page.page_number}`}
                </div>
              </div>
              <button
                className={styles.iconBtn}
                onClick={() => setSourceJumpTarget(null)}
                title="Close source"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.sourceJumpPage}>
              <div className={styles.sourceJumpPageLabel}>
                Focused source page
                {sourceJumpTarget.focus.page_start ? ` ${sourceJumpTarget.focus.page_start}` : ''}
                {sourceJumpTarget.focus.page_end && sourceJumpTarget.focus.page_end !== sourceJumpTarget.focus.page_start ? `-${sourceJumpTarget.focus.page_end}` : ''}
              </div>
              <p>{sourceJumpTarget.page.text_content}</p>
            </div>
          </div>
        )}

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
                    setLayoutDrafts((current) => {
                      return applyMeasuredBlockHeightToLayouts({
                        currentLayouts: current,
                        baseLayouts: blockLayouts,
                        blockId: block.id,
                        fallbackLayout: layout,
                        measuredHeight: height,
                        orderedBlockIds: visibleBlocks.map((item) => item.id),
                        resolveCollisions: shouldResolvePageCollisions(surfacePolicy),
                      });
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
