import React, { createRef, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import api from '@/services/api';
import '../../../client/src/styles/global.css';
import { MemoryRouter } from 'react-router-dom';
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
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../../../client/src/pages/Notes/canvasEngine/textFlowService';
import { resolveScreenRect } from '../../../client/src/pages/Notes/canvasEngine/placementContractService';
import { usePageFrameWalls } from '../../../client/src/pages/Notes/canvasEngine/hooks/usePageFrameWalls';
import { usePlacementHistory } from '../../../client/src/pages/Notes/canvasEngine/hooks/usePlacementHistory';
import { useNoteCanvasResolvedLayoutModel } from '../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel';
import type { TextFlowHistoryHost } from '../../../client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory';
import type { PageFrameWallSnapshot } from '../../../client/src/pages/Notes/canvasEngine/pageFrameWallService';


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
  const noOp = (() => {});
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
    onCreateBlock: (async () => null), onPersistCanvasObject: (async () => true),
    onPushStructuredMutationHistory: noOp, onDeleteCanvasObject: (async () => true),
    onSaveAnnotationTruths: (async () => undefined), onSaveContentGroups: (async () => true),
    onSaveDocumentTypographyProfile: noOp, onSaveGroupFolders: (async () => undefined),
    onActivateDraft: noOp, onBeginMoveBlock: noOp, onBeginResizeBlock: noOp,
    onBlockKeyDown: noOp, onBlockListMouseDown: noOp, onBlockTextChange: noOp,
    onBlockTextFlowChange: noOp, onApplyBlockTextFlowEdit: (async () => undefined),
    onClearSlashTarget: noOp, onAddPageBelow: noOp, onCreatePageFrame: noOp, onCreatePageStack: noOp,
    onDeletePageFrame: noOp, onDetachPageFromStack: noOp, onDuplicatePageFrame: noOp,
    onMovePageFrame: noOp, onDiscardDraft: noOp, onDraftChange: noOp,
    onDraftFocusReceipt: noOp, onDraftKeyDown: noOp, onFieldDraftChange: noOp,
    onFocusBlock: noOp, onReleaseTextFocus: noOp, onRequestFocusBlock: noOp,
    onMeasuredBlockHeight: noOp, onPageSpaceDoubleClick: noOp, onPanViewportBy: noOp,
    onPersistDraft: (async () => undefined), onResizeDraftFromTextarea: noOp,
    onResetViewport: noOp, onSaveBlock: (() => {}), onScrollViewportBy: noOp, onSelectBlock: noOp,
    onSelectPageFrame: noOp, onSelectSlashCommand: noOp, onResizePageFrame: noOp,
    onSetPrimaryPageFrame: noOp, onTogglePageStackCollapse: noOp, onToggleAIVisibility: noOp,
    onToggleExportRole: noOp, onTrashBlock: noOp, onForgetBlockLocally: noOp,
    onRestoreBlockById: (async () => null), onViewportSizeChange: noOp, onViewSource: noOp,
    onZoomViewportAt: noOp,
  };
}

// This entry point never mounts App or a data-loading controller.
// Refuse every transport request; synthetic callbacks remain in memory.
api.interceptors.request.use(() => { throw new Error('Synthetic D1 fixture: application transport is disabled'); });
const reports: unknown[] = [];
function Fixture() {
  const [inset, setInset] = useState(24);
  const [selected, setSelected] = useState(false);
  const [active, setActive] = useState<{frameId:string; side:'left'|'right'} | null>(null);
  const original = frame(420);
  const pageFrame = { ...original, contentInset: { ...original.contentInset, left: inset } };
  const props = propsFor(pageFrame, 'page');
  const flow = createTextBlockContentV1('Normal paragraph');
  flow.units = [0, 1, 2].map((indent, index) => ({ ...flow.units[0], id: `geometry-unit-${index}`, order_index: index,
    indent_level: indent, text: ['Normal paragraph', 'Indented paragraph', 'Twice indented paragraph'][index] }));
  const source = { ...props.allBlocks[0], content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
  const shifted = { ...source, id: 'shifted-block', placement_id: 'shifted-placement',
    content_json: { [TEXT_FLOW_CONTENT_KEY]: { ...flow, id: 'shifted-flow',
      units: flow.units.map(unit => ({...unit, id:`shifted-${unit.id}`})) } } };
  const blockLayouts = { [source.id]: { ...props.blockLayouts[source.id], y: 36, width: 450 },
    [shifted.id]: { ...props.blockLayouts[source.id], x: 88, y: 210, width: 360 } };
  const capture = () => {
    const surface = document.querySelector('[data-page-display-scale]') as HTMLElement;
    const scale = Number(surface.dataset.pageDisplayScale);
    const paper = surface.getBoundingClientRect();
    const wall = document.querySelector('[data-page-frame-wall="left"]')!.getBoundingClientRect();
    const wallX = wall.left + wall.width / 2;
    const handles = [...document.querySelectorAll<HTMLButtonElement>('[data-text-unit-handle]')].map(handle => {
      const rect = handle.getBoundingClientRect();
      const block = handle.closest('[data-note-block-shell]')!.getBoundingClientRect();
      const css = getComputedStyle(handle), gutter = getComputedStyle(handle.parentElement!);
      const point = {x:rect.left+rect.width/2, y:rect.top+rect.height/2};
      return { id: handle.dataset.textUnitHandle, width: rect.width/scale, height:rect.height/scale,
        blockGap:(block.left-rect.right)/scale, laneGap:(wallX-rect.right)/scale,
        paperInset:(rect.left-paper.left)/scale, opacity:gutter.opacity, transform:css.transform,
        declaredWidth:css.width, declaredHeight:css.height,
        pointerHit:document.elementFromPoint(point.x,point.y)===handle,
        valid: Math.abs(rect.width/scale-11.2)<0.02 && Math.abs(rect.height/scale-16)<0.02
          && rect.right<block.left && rect.left>paper.left && Math.abs((wallX-rect.right)/scale-7)<0.02 };
    });
    const walls = [...document.querySelectorAll<HTMLElement>('[data-page-frame-wall]')].map(wall => ({
      side:wall.dataset.pageFrameWall, active:wall.dataset.pageFrameWallActive,
      lineOpacity:getComputedStyle(wall.firstElementChild!).opacity, hitWidth:wall.getBoundingClientRect().width/scale
    }));
    const report = {inset, selected, scale, handles, walls, pass: handles.every(handle=>handle.valid&&handle.pointerHit)};
    reports.push(report);
    document.getElementById('evidence')!.textContent = JSON.stringify(reports,null,2);
  };
  return <><div style={{padding:16, background:'#eee',color:'#222',display:'flex',gap:12}}>
    <strong>D1 synthetic geometry: real writing surface, no API</strong>
    <button onClick={()=>setInset(inset===24?72:24)}>Toggle inset</button>
    <button onClick={()=>setSelected(!selected)}>Toggle selection</button>
    <button onClick={capture}>Capture geometry</button>
  </div><div style={{width:904,margin:'0 32px'}}>
    <NoteWritingSurfaceLayer {...props} allBlocks={[source,shifted]} visibleBlocks={[source,shifted]}
      blockLayouts={blockLayouts} contentReadOnly={false} layoutMode={false}
      selectedBlockId={selected?source.id:null} activePageFrameWall={active}
      onPageFrameWallPointerDown={(event,frameId,side)=>{event.preventDefault();event.stopPropagation();setActive({frameId,side});
        window.addEventListener('pointerup',()=>setActive(null),{once:true});}} />
  </div><pre id="evidence" style={{color:'#222',background:'#fff',padding:16,whiteSpace:'pre-wrap'}} />
  </>;
}
function WallFixture() {
  const initial = frame(420);
  const base = propsFor(initial, 'page');
  const [collection, setCollection] = useState(() => ({ primaryFrameId: initial.id, pageFrames: [initial,
    { ...initial, id: 'second-frame', role: 'secondary_page_frame' as const, y: 1278 }] }));
  const [blocks, setBlocks] = useState(() => [
    { ...base.allBlocks[0], id: 'auto', placement_id: 'auto-placement', plain_text: 'Auto fills to the wall.',
      content_json: { body: 'Auto fills to the wall. '.repeat(15) },
      canvas_layout: { ...base.blockLayouts[base.allBlocks[0].id], y: 36, width_mode: 'auto' as const } },
    { ...base.allBlocks[0], id: 'manual', placement_id: 'manual-placement', plain_text: 'Manual right edge',
      content_json: { body: 'Manual right edge' },
      canvas_layout: { ...base.blockLayouts[base.allBlocks[0].id], x: 440, y: 170, width: 320 } },
    { ...base.allBlocks[0], id: 'wide-manual', placement_id: 'wide-manual-placement', plain_text: 'Manual wide box',
      content_json: { body: 'Manual wide box' },
      canvas_layout: { ...base.blockLayouts[base.allBlocks[0].id], x: 0, y: 270, width: 700 } },
  ]);
  const [step, setStep] = useState(1);
  const [zoom, setZoom] = useState(1);
  const host = useRef<TextFlowHistoryHost | null>(null);
  const calls = useRef<PageFrameWallSnapshot[]>([]);
  const captures = useRef<unknown[]>([]);
  const lastCapture = useRef('');
  const history = usePlacementHistory({ noteId: 'd1-browser-flow', coordinateContract: 'v2',
    applyLayoutDrafts: () => {}, persistLayoutSnapshot: async () => true });
  host.current = history;
  const wall = usePageFrameWalls({ noteId: 'd1-browser-flow', enabled: true, coordinateContract: 'v2',
    collection, blocks, layoutDrafts: {}, objects: [], placements: [], zoom, history: host, boundary: () => true,
    save: async snapshot => {
      calls.current.push(structuredClone(snapshot));
      setCollection(snapshot.collection as typeof collection);
      setBlocks(current => current.map(block => {
        const layout = snapshot.layoutUpdates.find(update => update.block.id === block.id)?.layout;
        return layout ? { ...block, canvas_layout: { ...layout } } : block;
      }));
      return true;
    } });
  const current = wall.collection!;
  const primary = current.pageFrames[0];
  const layouts = useNoteCanvasResolvedLayoutModel({ coordinateContract: 'v2', contentWidth: 904,
    documentTypographyProfile: base.documentTypographyProfile, layoutDrafts: {}, pageFrames: current.pageFrames,
    sortedBlocks: blocks, surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page') });
  const runtime = { ...buildNoteCanvasRuntimeModel({ mode: 'page', primaryPageFrame: primary,
    pageFrames: current.pageFrames, viewport: base.viewportTransform,
    blockPlacements: layouts.visibleBlocks.map((block,index) => buildRuntimeBlockPlacement({ block,
      canvasId: 'synthetic-flow-canvas', layout: layouts.blockLayouts[block.id], pageOffsetX: 0,
      pageFrame: primary, pageFrames: current.pageFrames, contract: 'v2', zIndex: index })),
    documentTypography: base.documentTypographyProfile }), coordinateContract: 'v2' as const };
  useLayoutEffect(() => {
    const paper = document.querySelector<HTMLElement>('[data-page-display-scale]');
    if (!paper) return;
    const scale = Number(paper.dataset.pageDisplayScale);
    if (scale !== zoom) setZoom(scale);
    const capture = { active: wall.activeWall, saving: wall.saving, calls: calls.current.length,
      insets: current.pageFrames.map(f=>({id:f.id,...f.contentInset})), scale,
      stored: blocks.map(block=>({id:block.id,...block.canvas_layout})),
      resolved: layouts.blockLayouts,
      dom: [...document.querySelectorAll<HTMLElement>('[data-note-block-shell]')].map(block=>({
        id:block.dataset.blockId, x:block.getBoundingClientRect().left, width:block.getBoundingClientRect().width/scale })),
      walls: [...document.querySelectorAll<HTMLElement>('[data-page-frame-wall]')].map(wall=>({
        side:wall.dataset.pageFrameWall, active:wall.dataset.pageFrameWallActive,
        lineOpacity:getComputedStyle(wall.firstElementChild!).opacity,
        x:wall.getBoundingClientRect().left+wall.getBoundingClientRect().width/2 })),
    };
    const signature = JSON.stringify(capture);
    if (signature !== lastCapture.current) { lastCapture.current=signature; captures.current.push(capture); }
    document.getElementById('flow-evidence')!.textContent = JSON.stringify({captures:captures.current,calls:calls.current},null,2);
  });
  return <><div style={{padding:16,background:'#eee',color:'#222',display:'flex',gap:12}}>
    <strong>D1 real wall/history hooks; save is in-memory</strong>
    <button onClick={()=>void history.undoRuntimeHistory()}>Undo wall</button>
    <button onClick={()=>void history.redoRuntimeHistory()}>Redo wall</button>
    <button onClick={()=>setStep(step===1?0.5:1)}>Toggle half scale</button>
  </div><div style={{width:904,margin:'0 32px'}}>
    <NoteWritingSurfaceLayer {...base} allBlocks={blocks} visibleBlocks={layouts.visibleBlocks}
      blockLayouts={layouts.blockLayouts} defaultDraftLayout={layouts.defaultDraftLayout}
      noteCanvasRuntime={runtime} contentReadOnly={false} layoutMode={false}
      primaryPageFrameX={primary.x} primaryPageFrameWidth={primary.width}
      pageReadingViewState={{gear:'fit_width',stepFactor:step}}
      activePageFrameWall={wall.activeWall} onPageFrameWallPointerDown={wall.begin} />
  </div><pre id="flow-evidence" style={{color:'#222',background:'#fff',padding:16,whiteSpace:'pre-wrap'}} /></>;
}
function Audit() {
  const [mode,setMode] = useState('geometry');
  return <><button style={{padding:12,background:'#fff',color:'#111'}} onClick={()=>setMode(mode==='geometry'?'wall':'geometry')}>Switch audit mode</button>
    {mode==='geometry'?<Fixture/>:<WallFixture/>}</>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><Audit/></MemoryRouter>);
