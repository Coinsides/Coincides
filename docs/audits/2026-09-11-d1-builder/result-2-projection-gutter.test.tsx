import React, { createRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import styles from '../../../client/src/pages/Notes/NoteDetail.module.css';
import { normalizePageFramePrintBaseline } from '../../../client/src/pages/Notes/canvasEngine/pageFramePrintScaleService';
import { projectPageFrameToReadingSurface } from '../../../client/src/pages/Notes/canvasEngine/pageFramePresentationService';
import { buildNoteCanvasRuntimeModel } from '../../../client/src/pages/Notes/canvasEngine/engineModel';
import { createSurfaceModePolicy } from '../../../client/src/pages/Notes/canvasEngine/modePolicyService';
import type { PageReadingGear } from '../../../client/src/pages/Notes/canvasEngine/pageReadingViewportService';
import { createPageStackFromFrame } from '../../../client/src/pages/Notes/canvasEngine/pageStackCollectionService';
import { buildRuntimeBlockPlacement } from '../../../client/src/pages/Notes/canvasEngine/placementService';
import type { NoteBlock } from '../../../client/src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from '../../../client/src/pages/Notes/canvasEngine/runtimeLayout';
import { MIN_BLOCK_WIDTH } from '../../../client/src/pages/Notes/canvasEngine/runtimeLayout';
import { createDefaultDocumentTypographyProfile } from '../../../client/src/pages/Notes/canvasEngine/typographyProfileService';
import type { PageFrameModel } from '../../../client/src/pages/Notes/canvasEngine/types';
import { NoteWritingSurfaceLayer, type NoteWritingSurfaceLayerProps } from '../../../client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer';
import { NoteOverviewLayer } from '../../../client/src/pages/Notes/canvasEngine/layers/NoteOverviewLayer';
import { NotePrintLayer } from '../../../client/src/pages/Notes/canvasEngine/layers/NotePrintLayer';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../../../client/src/pages/Notes/canvasEngine/textFlowService';
import { resolveScreenRect } from '../../../client/src/pages/Notes/canvasEngine/placementContractService';
import { useNoteCanvasResolvedLayoutModel } from '../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel';
import { useNoteCanvasLayerProps, type UseNoteCanvasLayerPropsInput } from '../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayerProps';

vi.mock('@/services/api', () => ({ default: {
  get: vi.fn().mockRejectedValue(new Error('No HTTP in synthetic alignment fixture')),
  post: vi.fn().mockRejectedValue(new Error('No HTTP in synthetic alignment fixture')),
  put: vi.fn().mockRejectedValue(new Error('No HTTP in synthetic alignment fixture')),
} }));

let availableWidth = 680;
beforeEach(() => {
  availableWidth = 680;
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  // Supply available layout space, which jsdom itself cannot measure. The
  // production reading hook computes the resulting scale and writes it to DOM.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => availableWidth);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function frame(x: number): PageFrameModel {
  return {
    id: 'synthetic-alignment-frame', role: 'primary_page_frame', exportable: true,
    x, y: 0, width: 904, height: 1278, pageSize: 'A4', templateId: 'a4_portrait',
    contentInset: { left: 72, right: 72, top: 0, bottom: 96 },
  };
}

function propsFor(pageFrame: PageFrameModel, surfaceMode: SurfaceMode): NoteWritingSurfaceLayerProps {
  const layout: BlockBoxLayout = {
    x: 0, y: 0, width: pageFrame.width - pageFrame.contentInset.left - pageFrame.contentInset.right,
    height: 120, coordinate_space: 'page_frame_local',
    frame_id: pageFrame.id, surface: 'formal_page', width_mode: 'manual',
  };
  const block: NoteBlock = {
    id: 'synthetic-alignment-block', placement_id: 'synthetic-alignment-placement',
    display_overrides_json: {}, canvas_layout: { ...layout }, block_type: 'paragraph',
    title: null, content_json: { body: 'Synthetic alignment content' },
    plain_text: 'Synthetic alignment content', metadata: {}, order_index: 0, source_references: [],
  };
  const noOp = vi.fn();
  const typography = createDefaultDocumentTypographyProfile();
  const viewport = { x: 0, y: 0, width: 1024, height: 768, zoom: 1 };
  return {
    activeBlockId: null, contentReadOnly: true, activeSlashCommandId: null,
    allBlocks: [block], anchorsBySourceRef: {}, annotationTruths: [], contentGroups: [],
    groupFolders: [], purposeFrames: [], blockFieldDrafts: {}, blockLayouts: { [block.id]: layout },
    blockListRef: createRef<HTMLDivElement>(), blockTextDrafts: {}, blockTextFlowDrafts: {},
    creatingDraft: false, defaultDraftLayout: { ...layout, y: 144 },
    defaultTextTemplate: {} as never, documentTypographyProfile: typography, draftActive: false,
    draftFocusReceipt: { blockId: 'draft-block', textFlowId: 'draft-flow', textUnitId: 'draft-unit' },
    draftLayout: null, draftOwnerReconciliation: null, draftPhase: 'idle' as never,
    draftRef: createRef<HTMLTextAreaElement>(), draftText: '', focusBlockId: null,
    focusedTextOwner: null, interactionState: { mode: 'idle', target: 'surface' }, layoutMode: true,
    noteCanvasRuntime: { ...buildNoteCanvasRuntimeModel({
      mode: surfaceMode, primaryPageFrame: pageFrame, pageFrames: [pageFrame],
      pageStacks: [createPageStackFromFrame(pageFrame)],
      viewport, blockPlacements: [buildRuntimeBlockPlacement({
        block, canvasId: 'synthetic-alignment-canvas', layout,
        pageOffsetX: createSurfaceModePolicy(surfaceMode).pageOffsetX,
        pageFrame, pageFrames: [pageFrame], contract: 'v2', zIndex: 0,
      })], documentTypography: typography,
    }), coordinateContract: 'v2' },
    noteId: 'synthetic-alignment-note', projectId: 'synthetic-alignment-project',
    pageContentHeight: 1278, pageOffsetX: createSurfaceModePolicy(surfaceMode).pageOffsetX,
    placementPending: false, primaryPageFrameX: pageFrame.x, primaryPageFrameWidth: pageFrame.width,
    savingBlockId: null, selectedBlockId: null, selectedPageFrameId: null,
    showPreviewAIVisibility: false, showPreviewBlockTypes: false, showPreviewExportStatus: false,
    showPreviewLabelOverlay: false, slashCommands: [], slashTarget: null, snapGuide: null,
    sortedBlockCount: 1, sourceJumpBusy: null, surfaceMode, surfacePolicyMode: surfaceMode,
    viewportTransform: viewport, visibleBlocks: [block],
    onCreateBlock: vi.fn(async () => null), onPersistCanvasObject: vi.fn(async () => true),
    onPushStructuredMutationHistory: noOp, onDeleteCanvasObject: vi.fn(async () => true),
    onSaveAnnotationTruths: vi.fn(async () => undefined), onSaveContentGroups: vi.fn(async () => true),
    onSaveDocumentTypographyProfile: noOp, onSaveGroupFolders: vi.fn(async () => undefined),
    onActivateDraft: noOp, onBeginMoveBlock: noOp, onBeginResizeBlock: noOp,
    onBlockKeyDown: noOp, onBlockListMouseDown: noOp, onBlockTextChange: noOp,
    onBlockTextFlowChange: noOp, onApplyBlockTextFlowEdit: vi.fn(async () => undefined),
    onClearSlashTarget: noOp, onAddPageBelow: noOp, onCreatePageFrame: noOp, onCreatePageStack: noOp,
    onDeletePageFrame: noOp, onDetachPageFromStack: noOp, onDuplicatePageFrame: noOp,
    onMovePageFrame: noOp, onDiscardDraft: noOp, onDraftChange: noOp,
    onDraftFocusReceipt: noOp, onDraftKeyDown: noOp, onFieldDraftChange: noOp,
    onFocusBlock: noOp, onReleaseTextFocus: noOp, onRequestFocusBlock: noOp,
    onMeasuredBlockHeight: noOp, onPageSpaceDoubleClick: noOp, onPanViewportBy: noOp,
    onPersistDraft: vi.fn(async () => undefined), onResizeDraftFromTextarea: noOp,
    onResetViewport: noOp, onSaveBlock: vi.fn(), onScrollViewportBy: noOp, onSelectBlock: noOp,
    onSelectPageFrame: noOp, onSelectSlashCommand: noOp, onResizePageFrame: noOp,
    onSetPrimaryPageFrame: noOp, onTogglePageStackCollapse: noOp, onToggleAIVisibility: noOp,
    onToggleExportRole: noOp, onTrashBlock: noOp, onForgetBlockLocally: noOp,
    onRestoreBlockById: vi.fn(async () => null), onViewportSizeChange: noOp, onViewSource: noOp,
    onZoomViewportAt: noOp,
  };
}

const evidence: Record<string, unknown> = {
  scope: 'Synthetic data only, real React surface + DOM/CSS inputs; no application API or database',
  limits: 'jsdom cannot perform browser hit-testing or physical pixel measurements. Screen positions below are sums of actual production DOM style inputs.',
};
afterAll(() => writeFileSync(resolve(process.cwd(), '../docs/audits/2026-09-11-d1-builder/result-2-projection-gutter.json'), JSON.stringify(evidence, null, 2)));

it('records the existing always-visible gutter through the actual writing surface in idle, hover and selected states', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/pages/Notes/NoteDetail.module.css'), 'utf8');
  const gutterRule = css.match(/\.textUnitGutter\s*\{([^}]*)\}/)![1];
  const buttonRules = [...css.matchAll(/^\s*\.textUnitGutterButton\s*\{([^}]*)\}/gm)].map((match) => match[1]).join('\n');
  const rowRule = css.match(/\.textUnitRow\s*\{([^}]*)\}/)![1];
  // Only existing rules are injected, with the same module class names as the
  // real DOM. This audits visibility without inventing a replacement style.
  const sheet = document.createElement('style');
  sheet.textContent = `.${styles.textUnitGutter} {${gutterRule}} .${styles.textUnitGutterButton} {${buttonRules}} .${styles.textUnitRow} {${rowRule}}`;
  document.head.append(sheet);
  const props = propsFor(frame(0), 'page');
  const flow = createTextBlockContentV1('Synthetic D1 gutter state probe');
  flow.units[0].id = 'result-2-unit';
  const source = { ...props.visibleBlocks[0], content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
  const renderSurface = (selected: boolean) => <NoteWritingSurfaceLayer {...props} allBlocks={[source]} visibleBlocks={[source]}
    contentReadOnly={false} layoutMode={false} selectedBlockId={selected ? source.id : null} />;
  const view = render(renderSurface(false));
  const capture = (state: string) => {
    const handle = view.container.querySelector<HTMLButtonElement>('[data-text-unit-handle="result-2-unit"]')!;
    const gutter = handle.parentElement!;
    const shell = handle.closest<HTMLElement>('[data-note-block-shell]')!;
    const ancestors = [];
    for (let element: HTMLElement | null = gutter; element && element !== view.container; element = element.parentElement) {
      const style = getComputedStyle(element);
      ancestors.push({ tag: element.tagName, className: element.className, hidden: element.hidden,
        opacity: style.opacity || '1 (CSS initial)', display: style.display, visibility: style.visibility });
      expect(element.hidden).toBe(false);
      expect(style.display).not.toBe('none');
      expect(style.visibility).not.toBe('hidden');
      expect(style.opacity).not.toBe('0');
    }
    const gutterStyle = getComputedStyle(gutter);
    expect(gutterStyle.opacity).toBe('1');
    expect(handle.disabled).toBe(false);
    return { state, present: true, gutterOpacity: gutterStyle.opacity, gutterRight: gutterStyle.right,
      buttonWidth: getComputedStyle(handle).width, buttonHeight: getComputedStyle(handle).height,
      blockClass: shell.className, ancestors };
  };
  const states = [capture('idle/unselected')];
  fireEvent.mouseEnter(view.container.querySelector('[data-text-unit-row]')!);
  states.push(capture('mouseEnter delivered to row'));
  view.rerender(renderSurface(true));
  states.push(capture('selected block'));
  expect(css).not.toMatch(/\.textUnitRow[^{}]*:hover[^{}]*\.textUnitGutter\s*\{/);
  evidence.gutter = { conclusion: 'Current implementation is always visible, including idle/unselected. No ancestor hides the editing gutter. This contradicts the order describing quiet/hover/selected as the existing gutter behavior.',
    gutterRule, buttonRules, states,
    readonlyException: 'NoteReadOnlyPageContent injects a fragment-scoped display:none rule for print/overview only; it does not govern editing gutters.' };
  view.unmount();
  sheet.remove();
});

it('moves a manual block with the live outer inset without changing its stored coordinates or adding a second inset', () => {
  const initial = frame(0);
  const initialProps = propsFor(initial, 'page');
  const layout = { ...initialProps.blockLayouts[initialProps.visibleBlocks[0].id], x: 260, width: 500, width_mode: 'manual' as const };
  const source = { ...initialProps.visibleBlocks[0], canvas_layout: { ...layout } };
  const before = JSON.stringify(source.canvas_layout);
  const getProps = (left: number) => {
    const currentFrame = { ...initial, contentInset: { ...initial.contentInset, left } };
    const props = propsFor(currentFrame, 'page');
    return { ...props, visibleBlocks: [source], allBlocks: [source], blockLayouts: { [source.id]: layout } };
  };
  const view = render(<NoteWritingSurfaceLayer {...getProps(72)} />);
  const capture = (left: number) => {
    const shell = view.container.querySelector<HTMLElement>('[data-note-block-shell]')!;
    const paper = shell.closest<HTMLElement>('[data-page-display-scale]')!;
    const currentFrame = { ...initial, contentInset: { ...initial.contentInset, left } };
    const projectedFrame = projectPageFrameToReadingSurface(currentFrame, 'v2', 0);
    const guide = view.container.querySelector<HTMLElement>('[data-page-frame-guide="top-ruler"]')!;
    return { left, contentOrigin: Number.parseFloat(paper.style.paddingLeft), blockLocalScreenX: Number.parseFloat(shell.style.left),
      blockOnPaperX: Number.parseFloat(paper.style.paddingLeft) + Number.parseFloat(shell.style.left),
      guideContentOriginOnPaperX: Number.parseFloat(paper.style.paddingLeft) + Number.parseFloat(guide.style.left),
      projectedFrameX: projectedFrame.x,
      projectedFrameOnPaperX: Number.parseFloat(paper.style.paddingLeft) + projectedFrame.x,
      stored: { ...source.canvas_layout } };
  };
  const normal = capture(72);
  view.rerender(<NoteWritingSurfaceLayer {...getProps(24)} />);
  const expanded = capture(24);
  expect(expanded.blockOnPaperX - normal.blockOnPaperX).toBe(-48);
  expect(expanded.blockLocalScreenX).toBe(normal.blockLocalScreenX);
  expect(expanded.guideContentOriginOnPaperX - normal.guideContentOriginOnPaperX).toBe(-48);
  expect(expanded.projectedFrameOnPaperX).toBe(normal.projectedFrameOnPaperX);
  expect(JSON.stringify(source.canvas_layout)).toBe(before);
  evidence.projection = { conclusion: 'D is already carried by live paper.paddingLeft from usePageReadingPresentation. resolveScreenRect stays relative to that content container; adding inset there would double-count.', normal, expanded };
});

it('records the authorized C repair point without modifying the baseline', () => {
  const legacy = { ...frame(0), pageSize: undefined, contentInset: { left: 24, right: 200, top: 0, bottom: 96 } };
  const before = JSON.stringify(legacy);
  const normalized = normalizePageFramePrintBaseline(legacy);
  expect(normalized.contentInset).not.toEqual(legacy.contentInset);
  expect(normalized.contentInset).toEqual({ left: 72, right: 72, top: 0, bottom: 96 });
  expect(JSON.stringify(legacy)).toBe(before);
  evidence.legacyPrint = { conclusion: 'The current legacy normalization replaces existing inset with preset; C explicitly authorizes repairing this after the new conflict is resolved.', before: legacy, after: normalized };
});
