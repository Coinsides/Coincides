import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  FilePlus2,
  Info,
  LayoutDashboard,
  LockKeyhole,
  MoreHorizontal,
  PanelTopClose,
  PanelTopOpen,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ExportPreviewModel } from '../exportPreviewService';
import type { Note } from '../runtimeDataTypes';
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

export interface SurfacePolicyView {
  label: string;
  nextModeLabel: string;
}

export interface NoteChromeLayerProps {
  chromeCollapsed: boolean;
  contentReadOnly: boolean;
  exportPreview: ExportPreviewModel;
  layoutMode: boolean;
  layoutModeKind: 'off' | 'persistent' | 'temporary';
  note: Note;
  pageFrameCollection: PageFrameCollectionModel;
  pageFrames: PageFrameModel[];
  primaryPageFrameId: string | null;
  selectedPageFrameId: string | null;
  showExportPreview: boolean;
  showLayoutPanel: boolean;
  showMoreActions: boolean;
  showNoteInfo: boolean;
  showPreviewAIVisibility: boolean;
  showPreviewBlockTypes: boolean;
  showPreviewExportStatus: boolean;
  showPreviewLabelOverlay: boolean;
  snapEnabled: boolean;
  sortedBlockCount: number;
  sourceReferenceCount: number;
  surfaceMode: 'page' | 'canvas';
  surfacePolicy: SurfacePolicyView;
  titleDraft: string;
  documentTypographyProfile: DocumentTypographyProfile;
  onAddFavorite: () => void;
  onBackProject: () => void;
  onCloseOverlay: () => void;
  onCollapseChrome: () => void;
  onAddPageBelow: (frameId: string) => void;
  onCreatePageFrame: () => void;
  onCreatePageStack: () => void;
  onDetachPageFromStack: (frameId: string) => void;
  onExpandChrome: () => void;
  onSaveTitle: () => void | Promise<void>;
  onSaveDocumentTypographyProfile: (profile: DocumentTypographyProfile) => void | Promise<void>;
  onTitleDraftChange: (value: string) => void;
  onToggleExportPreview: () => void;
  onToggleLayoutMode: () => void;
  onToggleMoreActions: () => void;
  onToggleNoteInfo: () => void;
  onOpenLayoutPanel: () => void;
  onDeletePageFrame: (frameId: string) => void;
  onDuplicatePageFrame: (frameId: string) => void;
  onInsertPageFrame: (afterFrameId: string) => void;
  onMergePageStackWithPrevious: (stackId: string) => void;
  onSelectPageFrame: (frameId: string) => void;
  onSetPrimaryPageFrame: (frameId: string) => void;
  onSplitPageStackAtFrame: (frameId: string) => void;
  onTogglePageStackCollapse: (frameId: string) => void;
  onTogglePreviewAIVisibility: () => void;
  onTogglePreviewBlockTypes: () => void;
  onTogglePreviewExportStatus: () => void;
  onTogglePreviewLabelOverlay: () => void;
  onToggleSnapEnabled: () => void;
  onToggleSurfaceMode: () => void;
}

export function NoteChromeLayer({
  chromeCollapsed,
  contentReadOnly,
  exportPreview,
  layoutMode,
  layoutModeKind,
  note,
  pageFrameCollection,
  pageFrames,
  primaryPageFrameId,
  selectedPageFrameId,
  showExportPreview,
  showLayoutPanel,
  showMoreActions,
  showNoteInfo,
  showPreviewAIVisibility,
  showPreviewBlockTypes,
  showPreviewExportStatus,
  showPreviewLabelOverlay,
  snapEnabled,
  sortedBlockCount,
  sourceReferenceCount,
  surfaceMode,
  surfacePolicy,
  titleDraft,
  documentTypographyProfile,
  onAddFavorite,
  onBackProject,
  onCloseOverlay,
  onCollapseChrome,
  onAddPageBelow,
  onCreatePageStack,
  onDetachPageFromStack,
  onExpandChrome,
  onSaveTitle,
  onSaveDocumentTypographyProfile,
  onTitleDraftChange,
  onToggleExportPreview,
  onToggleLayoutMode,
  onToggleMoreActions,
  onToggleNoteInfo,
  onOpenLayoutPanel,
  onDeletePageFrame,
  onDuplicatePageFrame,
  onMergePageStackWithPrevious,
  onSelectPageFrame,
  onSetPrimaryPageFrame,
  onSplitPageStackAtFrame,
  onTogglePageStackCollapse,
  onTogglePreviewAIVisibility,
  onTogglePreviewBlockTypes,
  onTogglePreviewExportStatus,
  onTogglePreviewLabelOverlay,
  onToggleSnapEnabled,
  onToggleSurfaceMode,
}: NoteChromeLayerProps) {
  const layoutHoverTimerRef = useRef<number | null>(null);

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
          <button
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
          </button>
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
          <button
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
          </button>
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
          <button
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
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.chromeWrap} data-note-chrome="true">
      {chromeCollapsed ? (
        <div className={styles.chromeCollapsed}>
          <button className={styles.backBtn} onClick={onBackProject}>
            <ArrowLeft size={18} />
            Project
          </button>
          {contentReadOnly && (
            <span className={styles.sourceProjectionLock} title="Source content locked; interpretation and organization remain editable">
              <LockKeyhole size={13} />
              Source locked
            </span>
          )}
          <button
            className={styles.iconBtn}
            onClick={onExpandChrome}
            title="Show note tools"
            aria-label="Show note tools"
          >
            <PanelTopOpen size={16} />
          </button>
        </div>
      ) : (
        <div className={styles.noteChrome}>
          <button className={styles.backBtn} onClick={onBackProject}>
            <ArrowLeft size={18} />
            Project
          </button>

          <input
            className={styles.titleInput}
            value={titleDraft}
            readOnly={contentReadOnly}
            data-source-content-read-only={contentReadOnly ? 'true' : 'false'}
            onChange={(event) => onTitleDraftChange(event.target.value)}
            onBlur={contentReadOnly ? undefined : onSaveTitle}
            onKeyDown={(event) => {
              if (contentReadOnly) return;
              if (event.key !== 'Enter') return;
              event.preventDefault();
              void onSaveTitle();
            }}
            aria-label="Note title"
          />

          {contentReadOnly && (
            <span className={styles.sourceProjectionLock} title="Source content locked; interpretation and organization remain editable">
              <LockKeyhole size={13} />
              Source locked
            </span>
          )}

          <div className={styles.chromeActions}>
            <button
              className={`${styles.modePill} ${surfaceMode === 'canvas' ? styles.modePillActive : ''}`}
              onClick={onToggleSurfaceMode}
              title={surfacePolicy.nextModeLabel}
              aria-pressed={surfaceMode === 'canvas'}
            >
              <FileText size={15} />
              {surfacePolicy.label}
            </button>
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
              className={styles.iconBtn}
              onClick={onCreatePageStack}
              title="New PageStack"
              aria-label="New PageStack"
              data-page-stack-create-toolbar="true"
              disabled={contentReadOnly}
            >
              <FilePlus2 size={16} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={onAddFavorite}
              title="Add to favorites"
              aria-label="Add to favorites"
            >
              <Star size={16} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={onToggleNoteInfo}
              title="View info"
              aria-label="View info"
            >
              <Info size={16} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={onToggleMoreActions}
              title="More note actions"
              aria-label="More note actions"
            >
              <MoreHorizontal size={16} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={onCollapseChrome}
              title="Hide note tools"
              aria-label="Hide note tools"
            >
              <PanelTopClose size={16} />
            </button>
          </div>

          <FloatingOverlayLayer open={showNoteInfo || showLayoutPanel || showMoreActions || showExportPreview}>
            {showNoteInfo && (
              <div className={`${styles.infoPopover} ${styles.floatingPanelPopover}`}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note info</div>
                    <strong>{note.title || 'Untitled note'}</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={onCloseOverlay} title="Close">
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
                    <dd>{sortedBlockCount}</dd>
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
                  Note info is a summary. Export and AI overlays live in Preview; layout controls live in Layout.
                </p>
              </div>
            )}

            {showLayoutPanel && (
              <div className={`${styles.infoPopover} ${styles.actionsPopover} ${styles.floatingPanelPopover}`}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Layout controls</div>
                    <strong>{layoutModeKind === 'persistent' ? 'Persistent layout' : 'Layout'}</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={onCloseOverlay} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <button
                  className={styles.moreAction}
                  onClick={onToggleSnapEnabled}
                  disabled={contentReadOnly}
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
                <div className={styles.pageFramePanel} data-page-frame-panel="true">
                  <button
                    type="button"
                    className={styles.moreAction}
                    data-page-stack-create-toolbar="true"
                    onClick={onCreatePageStack}
                    disabled={contentReadOnly}
                  >
                    <FilePlus2 size={15} />
                    <span>New PageStack</span>
                    <small>Create a continuous page unit with its own local numbering.</small>
                  </button>
                  {selectedPageFrameId && (
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
              <div className={`${styles.infoPopover} ${styles.actionsPopover} ${styles.floatingPanelPopover}`}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note actions</div>
                    <strong>More</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={onCloseOverlay} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <div className={styles.moreAction} aria-disabled="true">
                  <MoreHorizontal size={15} />
                  <span>Note-level actions</span>
                  <small>History, duplicate, archive, import, export, and delete controls will live here.</small>
                </div>
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
          </FloatingOverlayLayer>
        </div>
      )}
    </div>
  );
}
