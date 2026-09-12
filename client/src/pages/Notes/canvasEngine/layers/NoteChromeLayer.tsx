import {
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  FilePlus2,
  LayoutDashboard,
  LockKeyhole,
  MoreHorizontal,
  Palette,
  PanelTopClose,
  PanelTopOpen,
  RotateCcw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CANVAS_MODE_RETIRED } from '../canvasRetirementPolicy';
import type { ChangeEvent } from 'react';
import type { ExportPreviewModel } from '../exportPreviewService';
import type { Note, NoteBlock } from '../runtimeDataTypes';
import { sliceGraphemes } from '../../../../../../shared/graphemes';
import type {
  DocumentTypographyProfile,
  PageFrameCollectionModel,
  PageFrameModel,
} from '../types';
import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  DOCUMENT_FONT_FAMILY_OPTIONS,
  DOCUMENT_TYPOGRAPHY_LIMITS,
  patchDocumentTypographyProfile,
} from '../typographyProfileService';
import { ExportPreviewLayer } from './ExportPreviewLayer';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import styles from '../../NoteDetail.module.css';
import { usePaperSkin } from '../PaperSkinContext';
import { SkinEditor } from '@/components/Skin/SkinEditor';
import skinStyles from '@/components/Skin/SkinControls.module.css';
import { SKIN_PRESET_IDS } from '@shared/types';
import { SKIN_LABELS, SKIN_PRESETS } from '@/styles/skinPresets';
import appearanceStyles from './NoteAppearance.module.css';

export interface SurfacePolicyView {
  label: string;
  nextModeLabel: string;
}

export interface NoteChromeLayerProps {
  hostMode?: 'page' | 'modal';
  blockTrashLoadFailed: boolean;
  blockTrashLoading: boolean;
  contentReadOnly: boolean;
  exportPreview: ExportPreviewModel;
  layoutMode: boolean;
  layoutModeKind: 'off' | 'persistent' | 'temporary';
  note: Note;
  pageFrameCollection: PageFrameCollectionModel;
  pageFrames: PageFrameModel[];
  primaryPageFrameId: string | null;
  selectedPageFrameId: string | null;
  showBlockTrash: boolean;
  showExportPreview: boolean;
  showLayoutPanel: boolean;
  showAppearancePanel: boolean;
  showMoreActions: boolean;
  showPreviewAIVisibility: boolean;
  showPreviewBlockTypes: boolean;
  showPreviewExportStatus: boolean;
  showPreviewLabelOverlay: boolean;
  surfaceMode: 'page' | 'canvas';
  surfacePolicy: SurfacePolicyView;
  trashedBlocks: NoteBlock[];
  documentTypographyProfile: DocumentTypographyProfile;
  restoringBlockId: string | null;
  onAddFavorite: () => void;
  onTrashNote: () => Promise<void>;
  onCloseOverlay: () => void;
  onAddPageBelow: (frameId: string) => void;
  onCreatePageFrame: () => void;
  onCreatePageStack: () => void;
  onDetachPageFromStack: (frameId: string) => void;
  onSaveDocumentTypographyProfile: (profile: DocumentTypographyProfile) => void | Promise<void>;
  onToggleExportPreview: () => void;
  onToggleAppearancePanel: () => void;
  onToggleLayoutMode: () => void;
  onToggleMoreActions: () => void;
  onOpenLayoutPanel: () => void;
  onOpenBlockTrash: () => void;
  onDeletePageFrame: (frameId: string) => void;
  onDuplicatePageFrame: (frameId: string) => void;
  onInsertPageFrame: (afterFrameId: string) => void;
  onMergePageStackWithPrevious: (stackId: string) => void;
  onRestoreTrashedBlock: (block: NoteBlock) => void | Promise<NoteBlock | null | undefined>;
  onSelectPageFrame: (frameId: string) => void;
  onSetPrimaryPageFrame: (frameId: string) => void;
  onSplitPageStackAtFrame: (frameId: string) => void;
  onTogglePageStackCollapse: (frameId: string) => void;
  onTogglePreviewAIVisibility: () => void;
  onTogglePreviewBlockTypes: () => void;
  onTogglePreviewExportStatus: () => void;
  onTogglePreviewLabelOverlay: () => void;
  onToggleSurfaceMode: () => void;
}

export function NoteChromeLayer({
  hostMode = 'page',
  blockTrashLoadFailed,
  blockTrashLoading,
  contentReadOnly,
  exportPreview,
  layoutMode,
  layoutModeKind,
  note,
  pageFrameCollection,
  pageFrames,
  primaryPageFrameId,
  selectedPageFrameId,
  showBlockTrash,
  showExportPreview,
  showLayoutPanel,
  showAppearancePanel,
  showMoreActions,
  showPreviewAIVisibility,
  showPreviewBlockTypes,
  showPreviewExportStatus,
  showPreviewLabelOverlay,
  surfaceMode,
  surfacePolicy,
  trashedBlocks,
  documentTypographyProfile,
  restoringBlockId,
  onAddFavorite,
  onTrashNote,
  onCloseOverlay,
  onAddPageBelow,
  onCreatePageStack,
  onDetachPageFromStack,
  onSaveDocumentTypographyProfile,
  onToggleExportPreview,
  onToggleAppearancePanel,
  onToggleLayoutMode,
  onToggleMoreActions,
  onOpenBlockTrash,
  onOpenLayoutPanel,
  onDeletePageFrame,
  onDuplicatePageFrame,
  onMergePageStackWithPrevious,
  onRestoreTrashedBlock,
  onSelectPageFrame,
  onSetPrimaryPageFrame,
  onSplitPageStackAtFrame,
  onTogglePageStackCollapse,
  onTogglePreviewAIVisibility,
  onTogglePreviewBlockTypes,
  onTogglePreviewExportStatus,
  onTogglePreviewLabelOverlay,
  onToggleSurfaceMode,
}: NoteChromeLayerProps) {
  const skin = usePaperSkin();
  const continuousWeb = note.page_format === 'screen_note';
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [overlayAnchor, setOverlayAnchor] = useState({ right: 16, bottom: 64 });
  const overlayOpen = showLayoutPanel || showAppearancePanel || showMoreActions || showBlockTrash || showExportPreview;
  useEffect(() => {
    if (!overlayOpen) return;
    const toolbar = toolbarRef.current?.closest('[data-page-reading-control="true"]') || toolbarRef.current;
    const measure = () => {
      const rect = toolbar?.getBoundingClientRect();
      if (rect) setOverlayAnchor({ right: Math.max(12, window.innerWidth - rect.right), bottom: Math.max(12, window.innerHeight - rect.top + 8) });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (toolbar) observer?.observe(toolbar);
    const dialog = toolbarRef.current?.closest('[role="dialog"]');
    const moveObserver = dialog ? new MutationObserver(measure) : null;
    if (dialog) moveObserver?.observe(dialog, { attributes: true, attributeFilter: ['style'] });
    window.addEventListener('resize', measure);
    document.addEventListener('scroll', measure, true);
    return () => { observer?.disconnect(); moveObserver?.disconnect(); window.removeEventListener('resize', measure); document.removeEventListener('scroll', measure, true); };
  }, [overlayOpen]);
  const layoutHoverTimerRef = useRef<number | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteScopeRef = useRef({ active: true });

  useEffect(() => {
    const scope = { active: true };
    deleteScopeRef.current = scope;
    setConfirmingDelete(false);
    setDeletingNote(false);
    setDeleteError(null);
    return () => { scope.active = false; };
  }, [note.id]);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (confirmingDelete && dialog && !dialog.open) dialog.showModal();
    if (!confirmingDelete && dialog?.open) dialog.close();
  }, [confirmingDelete]);

  const handleTrashNote = async () => {
    if (hostMode === 'modal' || deletingNote) return;
    const scope = deleteScopeRef.current;
    setDeletingNote(true);
    setDeleteError(null);
    try {
      await onTrashNote();
      if (scope.active) setConfirmingDelete(false);
    } catch {
      if (scope.active) setDeleteError('Could not move the note to Trash. Please try again.');
    } finally {
      if (scope.active) setDeletingNote(false);
    }
  };

  const clearLayoutHoverTimer = useCallback(() => {
    if (layoutHoverTimerRef.current === null) return;
    window.clearTimeout(layoutHoverTimerRef.current);
    layoutHoverTimerRef.current = null;
  }, []);

  const handleLayoutHoverStart = useCallback(() => {
    if (contentReadOnly) return;
    clearLayoutHoverTimer();
    layoutHoverTimerRef.current = window.setTimeout(() => {
      onOpenLayoutPanel();
      layoutHoverTimerRef.current = null;
    }, 260);
  }, [clearLayoutHoverTimer, contentReadOnly, onOpenLayoutPanel]);

  const handleLayoutClick = useCallback(() => {
    if (contentReadOnly) return;
    clearLayoutHoverTimer();
    onToggleLayoutMode();
  }, [clearLayoutHoverTimer, contentReadOnly, onToggleLayoutMode]);

  const handleTypographyFontFamilyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const nextProfile = patchDocumentTypographyProfile(documentTypographyProfile, {
      fontFamily: event.target.value,
    });
    void onSaveDocumentTypographyProfile(nextProfile);
  }, [documentTypographyProfile, onSaveDocumentTypographyProfile]);

  const handleTypographyFontSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextProfile = patchDocumentTypographyProfile(documentTypographyProfile, {
      fontSizePx: Number(event.target.value),
    });
    void onSaveDocumentTypographyProfile(nextProfile);
  }, [documentTypographyProfile, onSaveDocumentTypographyProfile]);

  const handleTypographyLineHeightChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextProfile = patchDocumentTypographyProfile(documentTypographyProfile, {
      lineHeightPx: Number(event.target.value),
    });
    void onSaveDocumentTypographyProfile(nextProfile);
  }, [documentTypographyProfile, onSaveDocumentTypographyProfile]);

  const handleTypographyParagraphSpacingChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextProfile = patchDocumentTypographyProfile(documentTypographyProfile, {
      paragraphSpacingPx: Number(event.target.value),
    });
    void onSaveDocumentTypographyProfile(nextProfile);
  }, [documentTypographyProfile, onSaveDocumentTypographyProfile]);

  const handleResetTypographyProfile = useCallback(() => {
    void onSaveDocumentTypographyProfile(DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE);
  }, [onSaveDocumentTypographyProfile]);

  useEffect(() => clearLayoutHoverTimer, [clearLayoutHoverTimer]);

  const pageFrameById = new Map(pageFrames.map((pageFrame) => [pageFrame.id, pageFrame]));
  const minimumLineHeightPx = Math.max(
    documentTypographyProfile.fontSizePx + 2,
    DOCUMENT_TYPOGRAPHY_LIMITS.minLineHeightPx,
  );
  const pageStackRows = (pageFrameCollection.pageStacks || []).map((stack) => ({
    stack,
    frames: stack.frameIds
      .map((frameId) => pageFrameById.get(frameId))
      .filter((frame): frame is PageFrameModel => Boolean(frame)),
  }));

  const renderPageFramePanelRow = ({
    pageFrame,
    label,
    meta,
    canDetachToNewStack,
    canSplitFromHere,
  }: {
    pageFrame: PageFrameModel;
    label: string;
    meta: string;
    canDetachToNewStack: boolean;
    canSplitFromHere: boolean;
  }) => {
    const primary = pageFrame.id === primaryPageFrameId;
    return (
      <div
        key={pageFrame.id}
        className={`${styles.pageFramePanelRow} ${primary ? styles.pageFramePanelRowPrimary : ''}`}
        data-page-frame-row={pageFrame.id}
        onClick={contentReadOnly ? undefined : () => onSelectPageFrame(pageFrame.id)}
        onKeyDown={(event) => {
          if (contentReadOnly) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onSelectPageFrame(pageFrame.id);
        }}
        role={contentReadOnly ? undefined : 'button'}
        tabIndex={contentReadOnly ? -1 : 0}
      >
        <FileText size={15} />
        <span>{label}</span>
        <small>{meta}</small>
        <div className={styles.pageFramePanelActions}>
          {!continuousWeb && <button
            className={styles.iconBtn}
            onClick={(event) => {
              event.stopPropagation();
              onAddPageBelow(pageFrame.id);
            }}
            title="Add page below"
            aria-label={`Add page below ${label}`}
            disabled={contentReadOnly}
          >
            <FilePlus2 size={14} />
          </button>}
          <button
            className={styles.iconBtn}
            onClick={(event) => {
              event.stopPropagation();
              onSplitPageStackAtFrame(pageFrame.id);
            }}
            title="Split stack here"
            aria-label={`Split stack at ${label}`}
            disabled={contentReadOnly || !canSplitFromHere}
          >
            <PanelTopOpen size={14} />
          </button>
          {!continuousWeb && <button
            className={styles.iconBtn}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicatePageFrame(pageFrame.id);
            }}
            title="Duplicate to new stack"
            aria-label={`Duplicate ${label} to new stack`}
            disabled={contentReadOnly}
          >
            <Copy size={14} />
          </button>}
          <button
            className={styles.iconBtn}
            onClick={(event) => {
              event.stopPropagation();
              onSetPrimaryPageFrame(pageFrame.id);
            }}
            title="Set primary"
            aria-label={`Set ${label} as primary`}
            disabled={contentReadOnly || primary}
          >
            <CheckCircle2 size={14} />
          </button>
          <button
            className={styles.iconBtn}
            onClick={(event) => {
              event.stopPropagation();
              onDetachPageFromStack(pageFrame.id);
            }}
            title="Detach to new stack"
            aria-label={`Detach ${label} to new PageStack`}
            disabled={contentReadOnly || !canDetachToNewStack}
          >
            <X size={14} />
          </button>
          {!continuousWeb && <button
            className={styles.iconBtn}
            onClick={(event) => {
              event.stopPropagation();
              onDeletePageFrame(pageFrame.id);
            }}
            title="Delete page"
            aria-label={`Delete ${label}`}
            disabled={contentReadOnly}
          >
            <Trash2 size={14} />
          </button>}
        </div>
      </div>
    );
  };

  return (
    <div ref={toolbarRef} className={styles.noteToolbarActions} data-note-toolbar-actions="true">
          {contentReadOnly && <span className={styles.sourceProjectionLock} title="Source content locked; interpretation and organization remain editable">
            <LockKeyhole size={13} /> Source locked
          </span>}
            {/* V13.2: unmount the entry; retain its implementation for the 13.6 inventory. */}
            {!CANVAS_MODE_RETIRED && (
            <button
              className={`${styles.modePill} ${surfaceMode === 'canvas' ? styles.modePillActive : ''}`}
              onClick={onToggleSurfaceMode}
              title={surfacePolicy.nextModeLabel}
              aria-pressed={surfaceMode === 'canvas'}
            >
              <FileText size={15} />
              {surfacePolicy.label}
            </button>
            )}
            <button
              className={`${styles.modePill} ${showExportPreview ? styles.modePillActive : ''}`}
              onClick={onToggleExportPreview}
              title="Preview export boundary"
              aria-pressed={showExportPreview}
            >
              <Eye size={15} />
              Preview
            </button>
            <button
              className={`${styles.modePill} ${layoutMode ? styles.modePillActive : ''}`}
              onClick={handleLayoutClick}
              onMouseEnter={handleLayoutHoverStart}
              onMouseLeave={clearLayoutHoverTimer}
              onFocus={handleLayoutHoverStart}
              onBlur={clearLayoutHoverTimer}
              title="Toggle layout mode"
              aria-pressed={layoutMode}
              disabled={contentReadOnly}
            >
              <LayoutDashboard size={15} />
              Layout
            </button>
            <button
              type="button"
              className={`${styles.modePill} ${showAppearancePanel ? styles.modePillActive : ''}`}
              onClick={onToggleAppearancePanel}
              title="笔记外观"
              aria-label="笔记外观"
              aria-expanded={showAppearancePanel}
              aria-pressed={showAppearancePanel}
            >
              <Palette size={15} />
              外观
            </button>
            <button
              className={styles.iconBtn}
              onClick={onToggleMoreActions}
              title="More note actions"
              aria-label="More note actions"
            >
              <MoreHorizontal size={16} />
            </button>
          <FloatingOverlayLayer open={overlayOpen} placement="free">
            <div className={styles.noteToolbarPopover} data-note-toolbar-popover="true"
              style={{ ...overlayAnchor, maxHeight: Math.max(80, window.innerHeight - overlayAnchor.bottom - 12) }}>
            {showAppearancePanel && (
              <div className={`${styles.infoPopover} ${styles.actionsPopover} ${styles.floatingPanelPopover}`} data-note-overlay="appearance">
                <div className={styles.popoverHeader}>
                  <strong>笔记外观</strong>
                  <button type="button" className={styles.iconBtn} onClick={onCloseOverlay} title="关闭外观" aria-label="关闭外观">
                    <X size={15} />
                  </button>
                </div>
                {skin && <>
                  <div className={appearanceStyles.presets} role="group" aria-label="外观预设快选">
                    {SKIN_PRESET_IDS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={appearanceStyles.preset}
                        style={{ background: SKIN_PRESETS[preset].paper, borderColor: SKIN_PRESETS[preset].desk, color: SKIN_PRESETS[preset].ink }}
                        data-appearance-preset={preset}
                        aria-pressed={skin.preset === preset}
                        onClick={() => { void skin.save({ preset }).catch(() => undefined); }}
                      >
                        {SKIN_LABELS[preset]}
                      </button>
                    ))}
                  </div>
                  <details data-paper-appearance className={skinStyles.appearance}>
                    <summary>纸面外观</summary>
                    <SkinEditor key={note.id} value={skin.selection} inheritedValue={skin.inheritedSelection} save={skin.save} failed={skin.saveError} inheritLabel="继承项目／全局外观" advanced />
                  </details>
                </>}
              </div>
            )}
            {showLayoutPanel && (
              <div className={`${styles.infoPopover} ${styles.actionsPopover} ${styles.floatingPanelPopover}`} data-note-overlay="layout">
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Layout controls</div>
                    <strong>{layoutModeKind === 'persistent' ? 'Persistent layout' : 'Layout'}</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={onCloseOverlay} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <div className={styles.pageFramePanel} data-page-frame-panel="true">
                  {!continuousWeb && <button
                    type="button"
                    className={styles.moreAction}
                    data-page-stack-create-toolbar="true"
                    onClick={onCreatePageStack}
                    disabled={contentReadOnly}
                  >
                    <FilePlus2 size={15} />
                    <span>New PageStack</span>
                    <small>Create a continuous page unit with its own local numbering.</small>
                  </button>}
                  {!continuousWeb && selectedPageFrameId && (
                    <button
                      type="button"
                      className={styles.moreAction}
                      onClick={() => onAddPageBelow(selectedPageFrameId)}
                      disabled={contentReadOnly}
                    >
                      <FilePlus2 size={15} />
                      <span>Add page below selected</span>
                      <small>Adds a new page to the selected stack, or wraps the selected page first.</small>
                    </button>
                  )}
                  {pageStackRows.map(({ stack, frames }, stackIndex) => {
                    const pageCount = frames.length;
                    return (
                    <div key={stack.id} className={styles.pageFramePanelStackGroup}>
                      <div
                        className={styles.pageFramePanelStackRow}
                        data-page-stack-panel-row={stack.id}
                      >
                        <FileText size={15} />
                        <span>{stack.displayName}</span>
                        <small>{pageCount === 1 ? 'Single-page stack' : `${pageCount}-page stack`}</small>
                        <button
                          className={styles.iconBtn}
                          onClick={() => onMergePageStackWithPrevious(stack.id)}
                          title="Merge with previous PageStack"
                          aria-label="Merge with previous PageStack"
                          disabled={contentReadOnly || stackIndex === 0}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className={styles.iconBtn}
                          onClick={() => {
                            const frameId = stack.primaryFrameId || stack.frameIds[0];
                            if (frameId) onTogglePageStackCollapse(frameId);
                          }}
                          title={stack.collapsed ? 'Expand PageStack' : 'Collapse PageStack'}
                          aria-label={stack.collapsed ? 'Expand PageStack' : 'Collapse PageStack'}
                          disabled={contentReadOnly}
                        >
                          {stack.collapsed ? <PanelTopOpen size={14} /> : <PanelTopClose size={14} />}
                        </button>
                      </div>
                      {frames.map((pageFrame, index) => (
                        <div
                          key={`${stack.id}:${pageFrame.id}`}
                          className={styles.pageFramePanelChildRow}
                          data-page-stack-panel-frame={pageFrame.id}
                        >
                          {renderPageFramePanelRow({
                            pageFrame,
                            label: `Page ${index + stack.numbering.startAt}`,
                            meta: pageFrame.id === primaryPageFrameId
                              ? 'Primary'
                              : (pageCount === 1 ? 'Single-page stack' : 'Stack page'),
                            canDetachToNewStack: pageCount > 1,
                            canSplitFromHere: pageCount > 1 && index > 0,
                          })}
                        </div>
                      ))}
                    </div>
                    );
                  })}
                </div>
                <p className={styles.popoverNote}>
                  Persistent Layout stays on until you close it. Block move handles use temporary Layout for one operation.
                </p>
              </div>
            )}

            {showMoreActions && (
              <div className={`${styles.infoPopover} ${styles.actionsPopover} ${styles.floatingPanelPopover}`} data-note-overlay="more">
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note actions</div>
                    <strong>More</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={onCloseOverlay} title="Close">
                    <X size={15} />
                  </button>
                </div>
            {!continuousWeb && <button
              className={styles.moreAction}
              onClick={onCreatePageStack}
              title="New PageStack"
              aria-label="New PageStack"
              data-page-stack-create-toolbar="true"
              disabled={contentReadOnly}
            >
              <FilePlus2 size={16} /><span>New PageStack</span>
            </button>}
            <button
              className={styles.moreAction}
              onClick={onAddFavorite}
              title="Add to favorites"
              aria-label="Add to favorites"
            >
              <Star size={16} /><span>Add to favorites</span>
            </button>
                <button
                  type="button"
                  className={`${styles.moreAction} ${styles.noteDangerAction}`}
                  disabled={hostMode === 'modal' || contentReadOnly || note.status === 'trashed'}
                  title={hostMode === 'modal' ? 'Open full page to use this' : undefined}
                  aria-label="Delete note"
                  onClick={() => {
                    if (hostMode === 'modal') return;
                    setDeleteError(null);
                    setConfirmingDelete(true);
                  }}
                >
                  <Trash2 size={15} />
                  <span>Delete note</span>
                  <small>Move this note to Trash. Restore it from the Project Trash tab.</small>
                </button>
                <button
                  type="button"
                  className={styles.moreAction}
                  onClick={onOpenBlockTrash}
                  aria-label="Deleted blocks"
                >
                  <Trash2 size={15} />
                  <span>Deleted blocks</span>
                  <small>Review and restore blocks removed from this note.</small>
                </button>
                <div
                  className={styles.typographyControls}
                  data-typography-controls="document"
                >
                  <div className={styles.typographyControlHeader}>
                    <span>Typography</span>
                    <button
                      type="button"
                      className={styles.typographyResetButton}
                      onClick={handleResetTypographyProfile}
                      disabled={contentReadOnly}
                    >
                      Reset
                    </button>
                  </div>
                  <label className={styles.typographyControlRow}>
                    <span>Font</span>
                    <select
                      className={styles.typographySelect}
                      value={documentTypographyProfile.fontFamily}
                      onChange={handleTypographyFontFamilyChange}
                      disabled={contentReadOnly}
                      data-typography-font-family="true"
                    >
                      {DOCUMENT_FONT_FAMILY_OPTIONS.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.typographyControlRow}>
                    <span>Size</span>
                    <input
                      className={styles.typographyNumberInput}
                      type="number"
                      min={DOCUMENT_TYPOGRAPHY_LIMITS.minFontSizePx}
                      max={DOCUMENT_TYPOGRAPHY_LIMITS.maxFontSizePx}
                      step={1}
                      value={documentTypographyProfile.fontSizePx}
                      onChange={handleTypographyFontSizeChange}
                      disabled={contentReadOnly}
                      data-typography-font-size="true"
                    />
                  </label>
                  <label className={styles.typographyControlRow}>
                    <span>Line</span>
                    <input
                      className={styles.typographyNumberInput}
                      type="number"
                      min={minimumLineHeightPx}
                      max={DOCUMENT_TYPOGRAPHY_LIMITS.maxLineHeightPx}
                      step={1}
                      value={documentTypographyProfile.lineHeightPx}
                      onChange={handleTypographyLineHeightChange}
                      disabled={contentReadOnly}
                      data-typography-line-height="true"
                    />
                  </label>
                  <label className={styles.typographyControlRow}>
                    <span>Spacing</span>
                    <input
                      className={styles.typographyNumberInput}
                      type="number"
                      min={DOCUMENT_TYPOGRAPHY_LIMITS.minParagraphSpacingPx}
                      max={DOCUMENT_TYPOGRAPHY_LIMITS.maxParagraphSpacingPx}
                      step={1}
                      value={documentTypographyProfile.paragraphSpacingPx}
                      onChange={handleTypographyParagraphSpacingChange}
                      disabled={contentReadOnly}
                      data-typography-paragraph-spacing="true"
                    />
                  </label>
                </div>
                <p className={styles.popoverNote}>
                  Layout controls have moved into the Layout panel.
                </p>
              </div>
            )}

            {showBlockTrash && (
              <div className={`${styles.infoPopover} ${styles.actionsPopover} ${styles.floatingPanelPopover}`} data-note-overlay="block-trash">
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note actions</div>
                    <strong>Deleted blocks</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={onCloseOverlay} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <div className={styles.blockTrashList} data-block-trash-drawer="true">
                  {blockTrashLoading ? (
                    <p className={styles.blockTrashQuiet}>Loading deleted blocks…</p>
                  ) : blockTrashLoadFailed ? (
                    <p className={styles.blockTrashQuiet}>Deleted blocks could not be loaded.</p>
                  ) : trashedBlocks.length === 0 ? (
                    <p className={styles.blockTrashQuiet}>Nothing to restore.</p>
                  ) : (
                    trashedBlocks.map((block) => {
                      const blockLabel = block.title?.trim()
                        || sliceGraphemes(block.plain_text?.trim() ?? '', 0, 80)
                        || 'Untitled block';
                      return (
                        <div className={styles.blockTrashRow} key={block.id}>
                          <div className={styles.blockTrashIdentity}>
                            <strong>{blockLabel}</strong>
                            <small>{block.block_type}</small>
                          </div>
                          <button
                            type="button"
                            className={styles.blockTrashRestoreButton}
                            onClick={() => void onRestoreTrashedBlock(block)}
                            disabled={contentReadOnly || restoringBlockId !== null}
                            aria-label={`Restore ${blockLabel}`}
                          >
                            <RotateCcw size={14} />
                            {restoringBlockId === block.id ? 'Restoring…' : 'Restore'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                {contentReadOnly && (
                  <p className={styles.popoverNote}>Source-projection blocks can be reviewed here but not restored.</p>
                )}
              </div>
            )}

            {showExportPreview && (
              <ExportPreviewLayer
                preview={exportPreview}
                showBlockTypes={showPreviewBlockTypes}
                showAIVisibility={showPreviewAIVisibility}
                showExportStatus={showPreviewExportStatus}
                showLabelOverlay={showPreviewLabelOverlay}
                onToggleBlockTypes={onTogglePreviewBlockTypes}
                onToggleAIVisibility={onTogglePreviewAIVisibility}
                onToggleExportStatus={onTogglePreviewExportStatus}
                onToggleLabelOverlay={onTogglePreviewLabelOverlay}
                onClose={onCloseOverlay}
              />
            )}
            </div>
          </FloatingOverlayLayer>
      <dialog
        ref={deleteDialogRef}
        className={styles.noteDeleteDialog}
        data-note-overlay="delete"
        aria-labelledby="note-delete-title"
        aria-describedby="note-delete-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!deletingNote) setConfirmingDelete(false);
        }}
      >
        <h2 id="note-delete-title">Delete {note.title || 'Untitled note'}?</h2>
        <p id="note-delete-description">
          This note will move to Trash and can be restored from the Project Trash tab.
          Its board cards will remain visible as unavailable until you restore it.
        </p>
        {deleteError && <p className={styles.noteDeleteError} role="alert">{deleteError}</p>}
        <div className={styles.noteDeleteActions}>
          <button type="button" autoFocus disabled={deletingNote} onClick={() => setConfirmingDelete(false)}>
            Cancel
          </button>
          <button type="button" className={styles.dangerBtn} disabled={hostMode === 'modal' || deletingNote} onClick={() => void handleTrashNote()}>
            {deletingNote ? 'Moving to Trash…' : 'Move to Trash'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
