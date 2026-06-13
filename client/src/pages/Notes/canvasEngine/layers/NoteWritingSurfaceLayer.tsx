import {
  CornerDownLeft,
} from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import type { NoteSlashCommand } from '../../noteSlashCommands';
import {
  textFromContent,
  type FieldValueRecord,
} from '../blockContentService';
import type { RuntimeInteractionState } from '../interactionController';
import type { SlashTarget } from '../hooks/useSlashCommandController';
import type {
  SourceAnchor,
  NoteBlock,
} from '../runtimeDataTypes';
import type {
  BlockBoxLayout,
} from '../runtimeLayout';
import { BlockEditorLayer } from './BlockEditorLayer';
import { SlashMenuLayer } from './SlashMenuLayer';
import styles from '../../NoteDetail.module.css';

interface NoteWritingSurfaceLayerProps {
  activeBlockId: string | null;
  anchorsBySourceRef: Record<string, SourceAnchor>;
  blockFieldDrafts: Record<string, FieldValueRecord>;
  blockLayouts: Record<string, BlockBoxLayout>;
  blockListRef: RefObject<HTMLDivElement>;
  blockTextDrafts: Record<string, string>;
  creatingDraft: boolean;
  defaultDraftLayout: BlockBoxLayout;
  draftActive: boolean;
  draftLayout: BlockBoxLayout | null;
  draftRef: RefObject<HTMLTextAreaElement>;
  draftText: string;
  focusBlockId: string | null;
  interactionState: RuntimeInteractionState;
  layoutMode: boolean;
  noteCanvasRuntime: {
    version: string;
    route: string;
    visibleBlockIds: string[];
    primaryPageFrame: { id: string } | null;
    world: { width: number };
  };
  pageContentHeight: number;
  pageOffsetX: number;
  primaryPageFrameWidth: number;
  savingBlockId: string | null;
  selectedBlockId: string | null;
  showPreviewAIVisibility: boolean;
  showPreviewBlockTypes: boolean;
  showPreviewExportStatus: boolean;
  slashCommands: NoteSlashCommand[];
  slashTarget: SlashTarget | null;
  snapGuide: { x?: number; y?: number } | null;
  sortedBlockCount: number;
  sourceJumpBusy: string | null;
  surfaceMode: 'page' | 'canvas';
  surfacePolicyMode: string;
  visibleBlocks: NoteBlock[];
  onActivateDraft: (layout?: BlockBoxLayout) => void;
  onBeginMoveBlock: (event: ReactPointerEvent<HTMLElement>, block: NoteBlock, layout: BlockBoxLayout) => void;
  onBeginResizeBlock: (event: ReactPointerEvent<HTMLElement>, block: NoteBlock, text: string, layout: BlockBoxLayout) => void;
  onBlockKeyDown: (block: NoteBlock, text: string, event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlockListMouseDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBlockTextChange: (blockId: string, value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onClearSlashTarget: () => void;
  onDiscardDraft: () => void;
  onDraftChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onDraftKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onFieldDraftChange: (block: NoteBlock, text: string, fieldValues: FieldValueRecord) => void;
  onFocusBlock: (blockId: string) => void;
  onMeasuredBlockHeight: (block: NoteBlock, layout: BlockBoxLayout, isActive: boolean, height: number) => void;
  onPageSpaceDoubleClick: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPersistDraft: (text: string) => Promise<void>;
  onResizeDraftFromTextarea: (textarea: HTMLTextAreaElement) => void;
  onSaveBlock: (block: NoteBlock, text: string, options?: { silent?: boolean; fieldValues?: FieldValueRecord }) => Promise<NoteBlock | null>;
  onSelectBlock: (blockId: string) => void;
  onSelectSlashCommand: (command: NoteSlashCommand) => void;
  onToggleAIVisibility: (block: NoteBlock, layout: BlockBoxLayout) => void;
  onToggleExportRole: (block: NoteBlock, layout: BlockBoxLayout) => void;
  onTrashBlock: (blockId: string) => void;
  onViewSource: (anchorId: string) => void;
}

export function NoteWritingSurfaceLayer({
  activeBlockId,
  anchorsBySourceRef,
  blockFieldDrafts,
  blockLayouts,
  blockListRef,
  blockTextDrafts,
  creatingDraft,
  defaultDraftLayout,
  draftActive,
  draftLayout,
  draftRef,
  draftText,
  focusBlockId,
  interactionState,
  layoutMode,
  noteCanvasRuntime,
  pageContentHeight,
  pageOffsetX,
  primaryPageFrameWidth,
  savingBlockId,
  selectedBlockId,
  showPreviewAIVisibility,
  showPreviewBlockTypes,
  showPreviewExportStatus,
  slashCommands,
  slashTarget,
  snapGuide,
  sortedBlockCount,
  sourceJumpBusy,
  surfaceMode,
  surfacePolicyMode,
  visibleBlocks,
  onActivateDraft,
  onBeginMoveBlock,
  onBeginResizeBlock,
  onBlockKeyDown,
  onBlockListMouseDown,
  onBlockTextChange,
  onClearSlashTarget,
  onDiscardDraft,
  onDraftChange,
  onDraftKeyDown,
  onFieldDraftChange,
  onFocusBlock,
  onMeasuredBlockHeight,
  onPageSpaceDoubleClick,
  onPersistDraft,
  onResizeDraftFromTextarea,
  onSaveBlock,
  onSelectBlock,
  onSelectSlashCommand,
  onToggleAIVisibility,
  onToggleExportRole,
  onTrashBlock,
  onViewSource,
}: NoteWritingSurfaceLayerProps) {
  return (
    <section className={`${styles.writingSurface} ${surfaceMode === 'canvas' ? styles.writingSurfaceCanvas : styles.writingSurfacePage}`}>
      <div
        ref={blockListRef}
        className={`${styles.blockList} ${surfaceMode === 'canvas' ? styles.blockListCanvas : styles.blockListPage} ${layoutMode ? styles.layoutMode : ''}`}
        data-canvas-engine-version={noteCanvasRuntime.version}
        data-canvas-engine-route={noteCanvasRuntime.route}
        data-canvas-visible-blocks={noteCanvasRuntime.visibleBlockIds.length}
        data-canvas-page-frame={noteCanvasRuntime.primaryPageFrame?.id || 'none'}
        data-canvas-surface-mode={surfacePolicyMode}
        data-canvas-interaction-mode={interactionState.mode}
        data-canvas-interaction-target={interactionState.target}
        data-canvas-interaction-block={interactionState.blockId || ''}
        style={{
          minHeight: pageContentHeight,
          '--formal-page-offset-x': `${pageOffsetX}px`,
          '--formal-page-width': `${primaryPageFrameWidth}px`,
          '--canvas-world-width': `${noteCanvasRuntime.world.width}px`,
        } as CSSProperties}
        onMouseDown={onBlockListMouseDown}
        onDoubleClick={onPageSpaceDoubleClick}
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
              onFocused={() => onFocusBlock(block.id)}
              onTextChange={(value, caret, anchorElement) => onBlockTextChange(block.id, value, caret, anchorElement)}
              onFieldDraftChange={(fieldValues) => onFieldDraftChange(block, text, fieldValues)}
              onSave={(silent, fieldValues) => onSaveBlock(block, text, { silent, fieldValues })}
              onTrash={() => onTrashBlock(block.id)}
              onSelect={() => onSelectBlock(block.id)}
              onBeginMove={(event) => onBeginMoveBlock(event, block, layout)}
              onBeginResize={(event) => onBeginResizeBlock(event, block, text, layout)}
              onToggleExportRole={() => onToggleExportRole(block, layout)}
              onToggleAIVisibility={() => onToggleAIVisibility(block, layout)}
              showBlockTypeBadge={showPreviewBlockTypes}
              showAIStatusBadge={showPreviewAIVisibility}
              showExportStatusBadge={showPreviewExportStatus}
              onKeyDown={(event) => onBlockKeyDown(block, text, event)}
              onMeasuredHeight={(height) => onMeasuredBlockHeight(block, layout, isActive, height)}
              pageOffsetX={pageOffsetX}
              anchorsBySourceRef={anchorsBySourceRef}
              sourceJumpBusy={sourceJumpBusy}
              onViewSource={onViewSource}
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
                onResizeDraftFromTextarea(event.currentTarget);
                onDraftChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
              }}
              onBlur={() => {
                if (slashTarget?.target === 'draft') return;
                if (draftText.trim()) {
                  void onPersistDraft(draftText);
                } else {
                  onDiscardDraft();
                  onClearSlashTarget();
                }
              }}
              onKeyDown={onDraftKeyDown}
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
            onSelect={onSelectSlashCommand}
            anchor={slashTarget.anchor}
          />
        )}

        {!draftActive && sortedBlockCount === 0 && (
          <button className={styles.emptyPagePrompt} onDoubleClick={() => onActivateDraft(defaultDraftLayout)}>
            Double-click to start writing
          </button>
        )}
      </div>
    </section>
  );
}
