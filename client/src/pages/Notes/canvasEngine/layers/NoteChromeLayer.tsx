import {
  ArrowLeft,
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
import type { ExportPreviewModel } from '../exportPreviewService';
import type {
  Note,
  SourceJumpTarget,
} from '../runtimeDataTypes';
import { ExportPreviewLayer } from './ExportPreviewLayer';
import styles from '../../NoteDetail.module.css';

interface SurfacePolicyView {
  label: string;
  nextModeLabel: string;
}

interface InsertTemplateOption {
  template_id: string;
  label: string;
}

interface InsertTemplateGroup {
  key: string;
  label: string;
  templates: InsertTemplateOption[];
}

interface NoteChromeLayerProps {
  chromeCollapsed: boolean;
  exportPreview: ExportPreviewModel;
  layoutMode: boolean;
  note: Note;
  showExportPreview: boolean;
  showMoreActions: boolean;
  showNoteInfo: boolean;
  showPreviewAIVisibility: boolean;
  showPreviewBlockTypes: boolean;
  showPreviewExportStatus: boolean;
  snapEnabled: boolean;
  sortedBlockCount: number;
  sourceReferenceCount: number;
  surfaceMode: 'page' | 'canvas';
  surfacePolicy: SurfacePolicyView;
  titleDraft: string;
  onAddFavorite: () => void;
  onBackProject: () => void;
  onCloseOverlay: () => void;
  onCollapseChrome: () => void;
  onExpandChrome: () => void;
  onSaveTitle: () => void | Promise<void>;
  onTitleDraftChange: (value: string) => void;
  onToggleExportPreview: () => void;
  onToggleLayoutMode: () => void;
  onToggleMoreActions: () => void;
  onToggleNoteInfo: () => void;
  onTogglePreviewAIVisibility: () => void;
  onTogglePreviewBlockTypes: () => void;
  onTogglePreviewExportStatus: () => void;
  onToggleSnapEnabled: () => void;
  onToggleSurfaceMode: () => void;
}

interface NoteFloatingPanelLayerProps {
  insertTemplateGroups: InsertTemplateGroup[];
  newBlockText: string;
  newTemplateId: string;
  showAdvancedInsert: boolean;
  sourceJumpTarget: SourceJumpTarget | null;
  onAddBlock: () => Promise<{ id: string } | null | undefined>;
  onCloseOverlay: () => void;
  onFocusBlock: (blockId: string) => void;
  onNewBlockTextChange: (value: string) => void;
  onNewTemplateChange: (templateId: string) => void;
  onToggleAdvancedInsert: () => void;
  onCloseSourceJump: () => void;
}

export function NoteChromeLayer({
  chromeCollapsed,
  exportPreview,
  layoutMode,
  note,
  showExportPreview,
  showMoreActions,
  showNoteInfo,
  showPreviewAIVisibility,
  showPreviewBlockTypes,
  showPreviewExportStatus,
  snapEnabled,
  sortedBlockCount,
  sourceReferenceCount,
  surfaceMode,
  surfacePolicy,
  titleDraft,
  onAddFavorite,
  onBackProject,
  onCloseOverlay,
  onCollapseChrome,
  onExpandChrome,
  onSaveTitle,
  onTitleDraftChange,
  onToggleExportPreview,
  onToggleLayoutMode,
  onToggleMoreActions,
  onToggleNoteInfo,
  onTogglePreviewAIVisibility,
  onTogglePreviewBlockTypes,
  onTogglePreviewExportStatus,
  onToggleSnapEnabled,
  onToggleSurfaceMode,
}: NoteChromeLayerProps) {
  return (
    <div className={styles.chromeWrap}>
      {chromeCollapsed ? (
        <div className={styles.chromeCollapsed}>
          <button className={styles.backBtn} onClick={onBackProject}>
            <ArrowLeft size={18} />
            Project
          </button>
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
            onChange={(event) => onTitleDraftChange(event.target.value)}
            onBlur={onSaveTitle}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              void onSaveTitle();
            }}
            aria-label="Note title"
          />

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
              onClick={onToggleLayoutMode}
              title="Toggle layout mode"
              aria-pressed={layoutMode}
            >
              <LayoutDashboard size={15} />
              Layout
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

          {showNoteInfo && (
            <div className={styles.infoPopover}>
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
                <button className={styles.iconBtn} onClick={onCloseOverlay} title="Close">
                  <X size={15} />
                </button>
              </div>
              <button
                className={styles.moreAction}
                onClick={onToggleSnapEnabled}
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
              onToggleBlockTypes={onTogglePreviewBlockTypes}
              onToggleAIVisibility={onTogglePreviewAIVisibility}
              onToggleExportStatus={onTogglePreviewExportStatus}
              onClose={onCloseOverlay}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function NoteFloatingPanelLayer({
  insertTemplateGroups,
  newBlockText,
  newTemplateId,
  showAdvancedInsert,
  sourceJumpTarget,
  onAddBlock,
  onCloseOverlay,
  onCloseSourceJump,
  onFocusBlock,
  onNewBlockTextChange,
  onNewTemplateChange,
  onToggleAdvancedInsert,
}: NoteFloatingPanelLayerProps) {
  return (
    <>
      <div className={styles.pageToolRail} aria-label="Page tools">
        <button
          className={styles.pageToolBtn}
          onClick={onToggleAdvancedInsert}
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
            <button className={styles.iconBtn} onClick={onCloseOverlay} title="Close">
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
              onChange={(event) => onNewTemplateChange(event.target.value)}
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
              onChange={(event) => onNewBlockTextChange(event.target.value)}
              placeholder="Write the block content here."
            />
            <button
              className={styles.addBlockBtn}
              onClick={async () => {
                const created = await onAddBlock();
                if (created) {
                  onFocusBlock(created.id);
                  onCloseOverlay();
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
              onClick={onCloseSourceJump}
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
    </>
  );
}
