import {
  Plus,
  X,
} from 'lucide-react';
import type { SourceJumpTarget } from '../runtimeDataTypes';
import { FloatingOverlayLayer } from './FloatingOverlayLayer';
import styles from '../../NoteDetail.module.css';

interface InsertTemplateOption {
  template_id: string;
  label: string;
}

interface InsertTemplateGroup {
  key: string;
  label: string;
  templates: InsertTemplateOption[];
}

export interface NoteFloatingPanelLayerProps {
  insertTemplateGroups: InsertTemplateGroup[];
  newBlockText: string;
  newTemplateId: string;
  showAdvancedInsert: boolean;
  sourceJumpTarget: SourceJumpTarget | null;
  surfaceMode: 'page' | 'canvas';
  onAddBlock: () => Promise<{ id: string } | null | undefined>;
  onCloseOverlay: () => void;
  onFocusBlock: (blockId: string) => void;
  onNewBlockTextChange: (value: string) => void;
  onNewTemplateChange: (templateId: string) => void;
  onToggleAdvancedInsert: () => void;
  onCloseSourceJump: () => void;
}

export function NoteFloatingPanelLayer({
  insertTemplateGroups,
  newBlockText,
  newTemplateId,
  showAdvancedInsert,
  sourceJumpTarget,
  surfaceMode,
  onAddBlock,
  onCloseOverlay,
  onCloseSourceJump,
  onFocusBlock,
  onNewBlockTextChange,
  onNewTemplateChange,
  onToggleAdvancedInsert,
}: NoteFloatingPanelLayerProps) {
  const canvasClass = surfaceMode === 'canvas'
    ? ` ${styles.pageToolRailCanvas}`
    : '';

  return (
    <>
      <FloatingOverlayLayer open placement="free">
        <div className={`${styles.pageToolRail}${canvasClass}`} aria-label="Page tools">
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
          <aside
            className={`${styles.insertPanel}${surfaceMode === 'canvas' ? ` ${styles.insertPanelCanvas}` : ''}`}
            aria-label="Advanced insert panel"
          >
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
      </FloatingOverlayLayer>

      <FloatingOverlayLayer open={Boolean(sourceJumpTarget)}>
        {sourceJumpTarget && (
          <div className={`${styles.sourceJumpPanel} ${styles.floatingPanelPopover}`}>
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
      </FloatingOverlayLayer>
    </>
  );
}
