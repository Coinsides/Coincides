import {
  buildNoteCanvasRuntimeModel,
  createViewport,
  DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH,
} from '../src/pages/Notes/canvasEngine/engineModel';
import {
  createRuntimeViewport,
  createRuntimeWorld,
} from '../src/pages/Notes/canvasEngine/viewportService';
import {
  calculatePageFrameHeight,
  createDefaultDraftLayout,
  createRuntimePageFrame,
} from '../src/pages/Notes/canvasEngine/pageFrameService';
import {
  buildLayoutPayload,
  buildRelationEndpointReserveForPlacement,
  buildRuntimeBlockPlacement,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
  normalizeBlockLayout,
  readStoredLayout,
  writeLayoutOverride,
} from '../src/pages/Notes/canvasEngine/placementService';
import {
  applyMeasuredBlockHeightToLayouts,
} from '../src/pages/Notes/canvasEngine/measurementService';
import {
  createBlankDraftLayout,
  createSurfaceModePolicy,
  createSurfaceModeTransitionPolicy,
  getVisibleBlocksForSurface,
  shouldResolvePageCollisions,
  shouldUseElasticAvoidance,
} from '../src/pages/Notes/canvasEngine/modePolicyService';
import {
  getRuntimeHistoryKeyboardIntent,
} from '../src/pages/Notes/canvasEngine/historyService';
import {
  DEFAULT_BLOCK_HEIGHT,
  DEFAULT_PAGE_CONTENT_WIDTH,
  DEFAULT_PAGE_FRAME_CONTENT_INSET,
  DEFAULT_PAGE_FRAME_HEIGHT,
  MIN_BLOCK_HEIGHT,
  NOTE_LAYOUT_KEY,
  PAGE_FRAME_BOTTOM_PADDING,
  type BlockBoxLayout,
} from '../src/pages/Notes/canvasEngine/runtimeLayout';
import type { NoteBlock } from '../src/pages/Notes/canvasEngine/runtimeDataTypes';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertAtLeast(actual: number, expected: number, message: string): void {
  assert(actual >= expected, `${message}: expected at least ${expected}, got ${actual}`);
}

function createBlock(id: string, layout?: Partial<BlockBoxLayout>, type = 'paragraph'): NoteBlock {
  return {
    id,
    placement_id: `placement-${id}`,
    display_overrides_json: layout
      ? {
        [NOTE_LAYOUT_KEY]: {
          ...layout,
          version: 'V2.BN.8',
        },
      }
      : {},
    block_type: type,
    title: null,
    content_json: { body: `Block ${id}` },
    plain_text: `Block ${id}`,
    metadata: type === 'formula' ? { template_key: 'formula.math' } : {},
    order_index: Number(id.replace(/\D/g, '')) || 0,
    source_references: [],
  };
}

// historyService is browser-aware. The model contract smoke runs in Node, so provide
// a minimal HTMLElement constructor before calling keyboard-intent helpers.
class RuntimeContractHTMLElement {
  closest(): null {
    return null;
  }
}

(globalThis as typeof globalThis & { HTMLElement: typeof HTMLElement }).HTMLElement =
  RuntimeContractHTMLElement as unknown as typeof HTMLElement;

function testViewportAndWorld(): void {
  const pageViewport = createRuntimeViewport('page', 920);
  const canvasViewport = createRuntimeViewport('canvas', 920);
  const pageWorld = createRuntimeWorld('page', 920);
  const canvasWorld = createRuntimeWorld('canvas', 920);

  assertEqual(pageViewport.zoom, 1, 'page viewport keeps seed zoom');
  assertEqual(canvasViewport.zoom, 1, 'canvas viewport keeps seed zoom');
  assertEqual(pageViewport.width, DEFAULT_PAGE_CONTENT_WIDTH, 'page viewport uses page content width');
  assert(canvasViewport.width > pageViewport.width, 'canvas viewport is wider than the formal page');
  assertEqual(pageWorld.height, 920, 'page world height follows PageFrame height');
  assert(canvasWorld.width > pageWorld.width, 'canvas world is wider than page world');
}

function testPageFrameAndWorkspacePolicy(): void {
  const pageBlock = createBlock('page-1', {
    x: 0,
    y: 0,
    width: 320,
    height: 88,
    surface: 'formal_page',
  });
  const workspaceBlock = createBlock('workspace-2', {
    x: DEFAULT_PAGE_CONTENT_WIDTH + 120,
    y: 40,
    width: 220,
    height: 80,
    surface: 'canvas_workspace',
  });

  const pagePolicy = createSurfaceModePolicy('page');
  const canvasPolicy = createSurfaceModePolicy('canvas');
  const pageVisible = getVisibleBlocksForSurface([pageBlock, workspaceBlock], pagePolicy, DEFAULT_PAGE_CONTENT_WIDTH);
  const canvasVisible = getVisibleBlocksForSurface([pageBlock, workspaceBlock], canvasPolicy, DEFAULT_PAGE_CONTENT_WIDTH);

  assertEqual(pagePolicy.showWorkspaceBlocks, false, 'page mode hides workspace blocks');
  assertEqual(pagePolicy.useGlobalPageScroll, true, 'page mode uses natural page scroll');
  assertEqual(canvasPolicy.showWorkspaceBlocks, true, 'canvas mode shows workspace blocks');
  assertEqual(canvasPolicy.useGlobalPageScroll, false, 'canvas mode disables global page scroll');
  assertEqual(pageVisible.length, 1, 'page mode filters workspace block');
  assertEqual(canvasVisible.length, 2, 'canvas mode preserves workspace block');

  const defaultDraft = createDefaultDraftLayout({
    [pageBlock.id]: { x: 0, y: 0, width: 320, height: 88 },
    [workspaceBlock.id]: { x: DEFAULT_PAGE_CONTENT_WIDTH + 120, y: 600, width: 220, height: 160 },
  }, DEFAULT_PAGE_CONTENT_WIDTH);
  assertEqual(defaultDraft.y, 88, 'default draft follows formal page content, not workspace content');

  const frameHeight = calculatePageFrameHeight({
    blockLayouts: {
      [pageBlock.id]: { x: 0, y: 640, width: 320, height: 120 },
      [workspaceBlock.id]: { x: DEFAULT_PAGE_CONTENT_WIDTH + 100, y: 1400, width: 220, height: 160 },
    },
    draftActive: false,
    draftLayout: null,
    defaultDraftLayout: defaultDraft,
  });
  assertEqual(frameHeight, 640 + 120 + PAGE_FRAME_BOTTOM_PADDING, 'PageFrame height follows formal page bottom');

  const frame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: frameHeight,
  });
  assertEqual(frame.x, 0, 'PageFrame boundary starts before content inset');
  assertEqual(frame.contentInset.left, DEFAULT_PAGE_FRAME_CONTENT_INSET.left, 'PageFrame keeps content inset');
  assertEqual(frame.exportable, true, 'primary PageFrame remains exportable');
}

function testPlacementAndRuntimeModel(): void {
  const pageFrame = createRuntimePageFrame({
    contentX: DEFAULT_PAGE_FRAME_CONTENT_INSET.left,
    height: DEFAULT_PAGE_FRAME_HEIGHT,
  });
  const pageBlock = createBlock('page-3');
  const workspaceBlock = createBlock('workspace-4');
  const pageLayout: BlockBoxLayout = { x: 0, y: 0, width: 320, height: 88, rotation: 5 };
  const workspaceLayout: BlockBoxLayout = {
    x: DEFAULT_PAGE_CONTENT_WIDTH + 64,
    y: 80,
    width: 220,
    height: 90,
    export_role: 'scratch',
  };

  const pagePlacement = buildRuntimeBlockPlacement({
    block: pageBlock,
    canvasId: 'contract-canvas',
    layout: pageLayout,
    pageOffsetX: pageFrame.contentInset.left,
    pageFrame,
    zIndex: 3,
  });
  const workspacePlacement = buildRuntimeBlockPlacement({
    block: workspaceBlock,
    canvasId: 'contract-canvas',
    layout: workspaceLayout,
    pageOffsetX: pageFrame.contentInset.left,
    pageFrame,
    zIndex: 4,
  });

  assertEqual(pagePlacement.surface, 'formal_page', 'inside placement belongs to formal page');
  assertEqual(pagePlacement.frameId, pageFrame.id, 'inside placement points to PageFrame');
  assertEqual(pagePlacement.rotation, 5, 'placement preserves rotation seed');
  assertEqual(workspacePlacement.surface, 'canvas_workspace', 'outside placement belongs to workspace');
  assertEqual(workspacePlacement.frameId, undefined, 'workspace placement has no PageFrame id');
  assertEqual(workspacePlacement.visibilityState, 'scratch', 'scratch export role drives visibility state');

  const endpoints = [
    ...buildRelationEndpointReserveForPlacement(pagePlacement),
    ...buildRelationEndpointReserveForPlacement(workspacePlacement),
  ];
  assertEqual(endpoints.length, 4, 'each placement reserves left and right relation endpoints');
  assert(endpoints.some((endpoint) => endpoint.normal?.x === -1), 'left endpoint reserve exists');
  assert(endpoints.some((endpoint) => endpoint.normal?.x === 1), 'right endpoint reserve exists');

  const payload = buildLayoutPayload(workspaceLayout);
  assertEqual(payload.surface, 'canvas_workspace', 'layout payload records workspace surface');
  assertEqual(payload.version, 'V2.BN.8', 'layout payload records version');

  const withOverride = {
    ...workspaceBlock,
    display_overrides_json: writeLayoutOverride(workspaceBlock, workspaceLayout),
  };
  const stored = readStoredLayout(withOverride);
  assert(stored, 'stored layout can be read back');
  assertEqual(stored.surface, 'canvas_workspace', 'stored layout preserves workspace surface');
  assertEqual(getEffectiveExportRole(workspaceLayout), 'scratch', 'effective export role keeps explicit scratch');
  assertEqual(getEffectiveAIVisibility(workspaceLayout), 'hidden', 'workspace scratch defaults to AI hidden');

  const normalizedInPage = normalizeBlockLayout({
    block: withOverride,
    fallback: { x: 0, y: 10, width: 300, height: 70 },
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    surfaceMode: 'page',
    estimateHeight: () => 72,
  });
  assertEqual(normalizedInPage.x, 0, 'page mode does not hard-clamp workspace stored x into PageFrame');
  assertEqual(normalizedInPage.width, 300, 'page mode uses fallback width for hidden workspace block');

  const runtime = buildNoteCanvasRuntimeModel({
    mode: 'canvas',
    primaryPageFrame: pageFrame,
    viewport: createViewport({ width: 1400, height: 900 }),
    blockPlacements: [pagePlacement, workspacePlacement],
    relationEndpointReserve: endpoints,
  });
  assertEqual(runtime.route, 'self_owned_minimal_hybrid', 'runtime model route remains self-owned hybrid');
  assertEqual(runtime.relationEndpointReserve.length, 4, 'runtime model carries endpoint reserves');
  assert(runtime.visibleBlockIds.length > 0, 'runtime model computes visible blocks');
}

function testMeasurementModeAndHistory(): void {
  const currentLayouts: Record<string, BlockBoxLayout> = {
    a: { x: 0, y: 0, width: 360, height: MIN_BLOCK_HEIGHT },
    b: { x: 0, y: MIN_BLOCK_HEIGHT, width: 360, height: DEFAULT_BLOCK_HEIGHT },
  };
  const reflowed = applyMeasuredBlockHeightToLayouts({
    currentLayouts,
    baseLayouts: currentLayouts,
    blockId: 'a',
    fallbackLayout: currentLayouts.a,
    measuredHeight: 120,
    orderedBlockIds: ['a', 'b'],
    resolveCollisions: true,
  });
  assertAtLeast(reflowed.b.y, 120, 'measured height reflow pushes lower block');

  const pagePolicy = createSurfaceModePolicy('page');
  const canvasPolicy = createSurfaceModePolicy('canvas');
  const defaultDraft: BlockBoxLayout = { x: 0, y: 120, width: 420, height: 72 };
  const snapDraft = createBlankDraftLayout({
    policy: pagePolicy,
    snapEnabled: true,
    rawX: 300,
    rawY: 300,
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    defaultDraftLayout: defaultDraft,
  });
  const freeDraft = createBlankDraftLayout({
    policy: pagePolicy,
    snapEnabled: false,
    rawX: 300,
    rawY: 300,
    contentWidth: DEFAULT_PAGE_CONTENT_WIDTH,
    defaultDraftLayout: defaultDraft,
  });

  assertEqual(snapDraft.y, defaultDraft.y, 'snap-on page draft follows natural writing flow');
  assertEqual(freeDraft.x, 300, 'snap-off page draft uses click x');
  assertEqual(freeDraft.y, 300, 'snap-off page draft uses click y');
  assertEqual(shouldResolvePageCollisions(pagePolicy), true, 'page mode resolves page collisions');
  assertEqual(shouldResolvePageCollisions(canvasPolicy), false, 'canvas mode does not force page collision resolution');
  assertEqual(shouldUseElasticAvoidance({ policy: pagePolicy, snapEnabled: false, deltaY: 12 }), true, 'elastic avoidance is page/snap-off only');
  assertEqual(shouldUseElasticAvoidance({ policy: pagePolicy, snapEnabled: true, deltaY: 12 }), false, 'snap-on disables elastic avoidance');
  assertEqual(shouldUseElasticAvoidance({ policy: canvasPolicy, snapEnabled: false, deltaY: 12 }), false, 'canvas mode disables page elastic avoidance');

  const transition = createSurfaceModeTransitionPolicy('page');
  assertEqual(transition.nextMode, 'canvas', 'page transition targets canvas');
  assertEqual(transition.closeOverlay, true, 'mode transition closes overlay');
  assertEqual(transition.clearBlockSelection, true, 'mode transition clears block selection');

  assertEqual(getRuntimeHistoryKeyboardIntent({
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    key: 'z',
    target: null,
  }), 'undo', 'Ctrl+Z maps to undo');
  assertEqual(getRuntimeHistoryKeyboardIntent({
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    key: 'y',
    target: null,
  }), 'redo', 'Ctrl+Y maps to redo');
  assertEqual(getRuntimeHistoryKeyboardIntent({
    ctrlKey: true,
    metaKey: false,
    shiftKey: true,
    key: 'z',
    target: null,
  }), 'redo', 'Ctrl+Shift+Z maps to redo');
}

const checks = [
  ['viewport and world seed', testViewportAndWorld],
  ['PageFrame and workspace policy', testPageFrameAndWorkspacePolicy],
  ['placement and runtime model', testPlacementAndRuntimeModel],
  ['measurement mode and history', testMeasurementModeAndHistory],
] as const;

checks.forEach(([, run]) => run());

console.table(checks.map(([check]) => ({ check, status: 'passed' })));
console.log(`Canvas engine model contract check passed (${checks.length} groups).`);
