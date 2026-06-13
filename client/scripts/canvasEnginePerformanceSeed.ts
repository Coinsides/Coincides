import {
  buildNoteCanvasRuntimeModel,
  createPrimaryPageFrame,
  createViewport,
  DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH,
} from '../src/pages/Notes/canvasEngine/engineModel';
import {
  applyMoveSnap,
  buildDefaultBlockLayouts,
  buildLayoutHistoryEntry,
  buildRelationEndpointReserveForPlacement,
  buildRuntimeBlockPlacement,
  reflowLayoutsAfterHeightChange,
  resolveStackedLayoutCollisions,
} from '../src/pages/Notes/canvasEngine/placementService';
import type { BlockBoxLayout } from '../src/pages/Notes/canvasEngine/runtimeLayout';
import type { NoteBlock } from '../src/pages/Notes/canvasEngine/runtimeDataTypes';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

interface PerformanceScenario {
  count: number;
  formulaEvery?: number;
  longEvery?: number;
  name: string;
  workspaceEvery?: number;
}

interface ScenarioResult {
  blockCount: number;
  elapsedMs: number;
  name: string;
  relationEndpointCount: number;
  visibleCount: number;
}

function createBlock(index: number, scenario: PerformanceScenario): NoteBlock {
  const isFormula = Boolean(scenario.formulaEvery && index % scenario.formulaEvery === 0);
  const isLong = Boolean(scenario.longEvery && index % scenario.longEvery === 0);
  const body = isFormula
    ? `\\int_{\\partial D_${index}} P\\,dx + Q\\,dy = \\iint_{D_${index}} \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right)\\,dA`
    : isLong
      ? Array.from({ length: 14 }, (_, line) => `Long paragraph ${index}.${line}: surplus, deadweight loss, relation hints, and source-aware note content stay readable after wrapping.`).join('\n')
      : `Block ${index}: compact paragraph content for runtime performance seed.`;

  return {
    id: `block-${index}`,
    placement_id: `placement-${index}`,
    display_overrides_json: {},
    block_type: isFormula ? 'formula' : 'paragraph',
    title: isFormula ? `Formula ${index}` : null,
    content_json: {
      body,
      field_values: isFormula ? { latex_input: body } : undefined,
    },
    plain_text: body,
    metadata: isFormula ? { template_key: 'formula.math' } : {},
    order_index: index,
    source_references: index % 17 === 0 ? [{ id: `source-ref-${index}` }] : [],
  };
}

function estimateSeedBlockHeight(block: NoteBlock, width: number): number {
  const body = typeof block.content_json.body === 'string' ? block.content_json.body : block.plain_text || '';
  const textWidth = Math.max(80, width - 18);
  const charsPerLine = Math.max(12, Math.floor(textWidth / 8.2));
  const wrappedRows = body
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  const titleRows = block.title ? 1 : 0;
  const formulaPreviewRows = block.block_type === 'formula' && body.trim().length > 0 ? 3 : 0;
  const sourceRows = block.source_references.length > 0 ? 1 : 0;
  return Math.max(42, 16 + (wrappedRows + titleRows + formulaPreviewRows + sourceRows) * 27);
}

function applyWorkspaceOffsets(
  layouts: Record<string, BlockBoxLayout>,
  scenario: PerformanceScenario,
): Record<string, BlockBoxLayout> {
  const workspaceEvery = scenario.workspaceEvery;
  if (!workspaceEvery) return layouts;

  const next = { ...layouts };
  Object.entries(next).forEach(([id, layout], index) => {
    if (index === 0 || index % workspaceEvery !== 0) return;
    next[id] = {
      ...layout,
      x: DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH + 120 + (index % 4) * 56,
      y: Math.max(0, layout.y - 120),
      width: Math.min(layout.width, 360),
    };
  });
  return next;
}

function assertNoInvalidLayouts(layouts: Record<string, BlockBoxLayout>): void {
  Object.entries(layouts).forEach(([id, layout]) => {
    assert(Number.isFinite(layout.x), `${id} has invalid x`);
    assert(Number.isFinite(layout.y), `${id} has invalid y`);
    assert(Number.isFinite(layout.width), `${id} has invalid width`);
    assert(Number.isFinite(layout.height), `${id} has invalid height`);
    assert(layout.width >= 36, `${id} width is below runtime minimum`);
    assert(layout.height >= 42, `${id} height is below runtime minimum`);
  });
}

function runScenario(scenario: PerformanceScenario): ScenarioResult {
  const startedAt = performance.now();
  const blocks = Array.from({ length: scenario.count }, (_, index) => createBlock(index, scenario));
  const orderedBlockIds = blocks.map((block) => block.id);
  const baseLayouts = buildDefaultBlockLayouts(blocks, DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH, estimateSeedBlockHeight);
  const mixedLayouts = applyWorkspaceOffsets(baseLayouts, scenario);
  const collisionResolvedLayouts = resolveStackedLayoutCollisions(mixedLayouts, orderedBlockIds);

  const measuredTargetId = orderedBlockIds[Math.max(1, Math.floor(scenario.count / 3))];
  const previousLayout = collisionResolvedLayouts[measuredTargetId];
  assert(previousLayout, 'measurement target layout must exist');
  const measuredLayout = {
    ...previousLayout,
    height: previousLayout.height + 144,
  };
  const reflowedLayouts = resolveStackedLayoutCollisions(
    reflowLayoutsAfterHeightChange(collisionResolvedLayouts, measuredTargetId, previousLayout, measuredLayout),
    orderedBlockIds,
  );

  const snapTargetId = orderedBlockIds[Math.max(2, Math.floor(scenario.count / 2))];
  const snapped = applyMoveSnap(
    {
      ...reflowedLayouts[snapTargetId],
      x: 6,
      y: Math.max(0, reflowedLayouts[snapTargetId].y + 7),
    },
    snapTargetId,
    reflowedLayouts,
    DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH,
  );
  const finalLayouts = {
    ...reflowedLayouts,
    [snapTargetId]: snapped.layout,
  };

  assertNoInvalidLayouts(finalLayouts);

  const pageFrame = createPrimaryPageFrame();
  const placements = blocks.map((block, index) => buildRuntimeBlockPlacement({
    block,
    canvasId: 'canvas-performance-seed',
    layout: finalLayouts[block.id],
    pageOffsetX: pageFrame.contentInset.left,
    pageFrame,
    zIndex: index,
  }));
  const relationEndpointReserve = placements.flatMap(buildRelationEndpointReserveForPlacement);
  const runtime = buildNoteCanvasRuntimeModel({
    mode: scenario.workspaceEvery ? 'canvas' : 'page',
    primaryPageFrame: pageFrame,
    viewport: createViewport({ width: 1440, height: 900 }),
    blockPlacements: placements,
    relationEndpointReserve,
  });
  const historyEntry = buildLayoutHistoryEntry(baseLayouts, finalLayouts);

  assert(placements.length === scenario.count, `${scenario.name} placement count mismatch`);
  assert(relationEndpointReserve.length === scenario.count * 2, `${scenario.name} relation endpoint reserve mismatch`);
  assert(runtime.visibleBlockIds.length > 0, `${scenario.name} should have visible blocks`);
  assert(historyEntry, `${scenario.name} should produce a layout history diff`);

  return {
    blockCount: scenario.count,
    elapsedMs: performance.now() - startedAt,
    name: scenario.name,
    relationEndpointCount: relationEndpointReserve.length,
    visibleCount: runtime.visibleBlockIds.length,
  };
}

const scenarios: PerformanceScenario[] = [
  { name: '50 blocks smoke', count: 50, formulaEvery: 7, longEvery: 11 },
  { name: '200 blocks smoke', count: 200, formulaEvery: 9, longEvery: 13 },
  { name: 'long paragraph block', count: 80, longEvery: 1 },
  { name: 'formula-heavy note', count: 120, formulaEvery: 1 },
  { name: 'page + workspace mixed note', count: 160, formulaEvery: 8, longEvery: 15, workspaceEvery: 10 },
];

const results = scenarios.map(runScenario);
const totalElapsed = results.reduce((total, result) => total + result.elapsedMs, 0);
const slowest = results.reduce((current, result) => (result.elapsedMs > current.elapsedMs ? result : current), results[0]);

assert(totalElapsed < 5000, `canvas engine performance seed exceeded 5000ms total: ${totalElapsed.toFixed(1)}ms`);
assert(slowest.elapsedMs < 2500, `slowest canvas engine scenario exceeded 2500ms: ${slowest.name} ${slowest.elapsedMs.toFixed(1)}ms`);

console.table(results.map((result) => ({
  scenario: result.name,
  blocks: result.blockCount,
  visible: result.visibleCount,
  endpoints: result.relationEndpointCount,
  ms: Number(result.elapsedMs.toFixed(2)),
})));
console.log(`Canvas engine performance seed passed in ${totalElapsed.toFixed(2)}ms.`);
