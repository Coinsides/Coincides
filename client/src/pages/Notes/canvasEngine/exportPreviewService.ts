import { textFromContent } from './blockContentService';
import { sliceGraphemes } from '../../../../../shared/graphemes';
import {
  DEFAULT_PAGE_FRAME_CROSSING_EXPORT_POLICY,
  resolvePageFrameCrossingExportDecision,
} from './geometry';
import {
  derivePlacementPageFrameAffiliation,
} from './pageFrameAffiliationService';
import {
  getPageFrameContentRect,
} from './pageFrameService';
import {
  getBoundaryKind,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
} from './placementService';
import {
  estimatePageFrameLineCapacity,
} from './typographyMeasurementService';
import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  normalizeDocumentTypographyProfile,
} from './typographyProfileService';
import type {
  AIVisibility,
  BlockBoxLayout,
  BoundaryKind,
  ExportRole,
} from './runtimeLayout';
import type { NoteBlock } from './runtimeDataTypes';
import type {
  BlockPlacementModel,
  CanvasRect,
  DocumentTypographyProfile,
  PageFrameCrossingExportDecision,
  PageFrameCrossingExportPolicy,
  PageFrameModel,
  PageStackModel,
} from './types';

export interface ExportPreviewRow {
  block: NoteBlock;
  layout?: BlockBoxLayout;
  placement?: BlockPlacementModel;
  boundary: BoundaryKind;
  exportRole: ExportRole;
  aiVisibility: AIVisibility;
  pageFrameId?: string | null;
  pageFrameRole?: PageFrameModel['role'] | null;
  exportPolicy?: PageFrameCrossingExportDecision;
}

export interface ExportPreviewTypography {
  profileId: string;
  fontFamily: string;
  fontSizePx: number;
  lineHeightPx: number;
  paragraphSpacingPx: number;
  averageCharWidthPx: number;
}

export interface PageFrameExportPreview {
  pageFrameId: string;
  role: PageFrameModel['role'];
  pageSize?: PageFrameModel['pageSize'];
  exportable: boolean;
  contentRect: CanvasRect;
  documentTypography: ExportPreviewTypography;
  estimatedLineCapacity: number;
  rows: ExportPreviewRow[];
  includedRows: ExportPreviewRow[];
  excludedRows: ExportPreviewRow[];
  aiVisibleRows: ExportPreviewRow[];
  aiHiddenRows: ExportPreviewRow[];
}

export interface PageStackExportPreview {
  id: string;
  displayName: string;
  pageFrameIds: string[];
  pageCount: number;
  collapsedInCanvas: boolean;
}

export interface ExportPreviewModel {
  rows: ExportPreviewRow[];
  includedRows: ExportPreviewRow[];
  excludedRows: ExportPreviewRow[];
  aiVisibleRows: ExportPreviewRow[];
  aiHiddenRows: ExportPreviewRow[];
  pageFrames: PageFrameExportPreview[];
  pageStacks: PageStackExportPreview[];
  crossingExportPolicy: PageFrameCrossingExportPolicy;
  crossingObjects: ExportPreviewRow[];
  workspaceOnlyObjects: ExportPreviewRow[];
  included: number;
  excluded: number;
  scratch: number;
  aiVisible: number;
  aiHidden: number;
  crossing: number;
  outside: number;
}

export interface BuildExportPreviewModelOptions {
  pageFrames?: PageFrameModel[];
  pageStacks?: PageStackModel[];
  blockPlacements?: BlockPlacementModel[];
  primaryPageFrameId?: string | null;
  documentTypography?: DocumentTypographyProfile;
  crossingExportPolicy?: PageFrameCrossingExportPolicy;
}

function isRowIncludedInExport(row: ExportPreviewRow): boolean {
  if (row.exportPolicy) return row.exportPolicy.exportCandidate;
  return row.exportRole === 'included';
}

function createPageFrameExportPreview(
  pageFrame: PageFrameModel,
  rows: ExportPreviewRow[],
  primaryPageFrameId?: string | null,
  documentTypography: DocumentTypographyProfile = DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
): PageFrameExportPreview {
  const role = primaryPageFrameId === pageFrame.id
    ? 'primary_page_frame'
    : pageFrame.role;
  const includedRows = rows.filter(isRowIncludedInExport);
  const excludedRows = rows.filter((row) => !isRowIncludedInExport(row));
  const aiVisibleRows = rows.filter((row) => row.aiVisibility === 'visible');
  const aiHiddenRows = rows.filter((row) => row.aiVisibility === 'hidden');
  const normalizedTypography = normalizeDocumentTypographyProfile(documentTypography);
  const contentRect = getPageFrameContentRect(pageFrame);
  const estimatedLineCapacity = estimatePageFrameLineCapacity({
    contentHeight: contentRect.height,
    typography: normalizedTypography,
  });
  return {
    pageFrameId: pageFrame.id,
    role,
    pageSize: pageFrame.pageSize,
    exportable: pageFrame.exportable,
    contentRect,
    documentTypography: normalizedTypography,
    estimatedLineCapacity,
    rows,
    includedRows,
    excludedRows,
    aiVisibleRows,
    aiHiddenRows,
  };
}

function createPageStackExportPreview(stack: PageStackModel): PageStackExportPreview {
  return {
    id: stack.id,
    displayName: stack.displayName,
    pageFrameIds: stack.frameIds,
    pageCount: stack.frameIds.length,
    collapsedInCanvas: stack.collapsed,
  };
}

function exportBoundaryFromPlacement({
  placement,
  pageFrames,
}: {
  placement?: BlockPlacementModel;
  pageFrames: PageFrameModel[];
}): {
  boundary: BoundaryKind;
  pageFrameId: string | null;
  pageFrameRole: PageFrameModel['role'] | null;
  pageFrame: PageFrameModel | null;
} | null {
  if (!placement || pageFrames.length === 0) return null;
  const affiliation = derivePlacementPageFrameAffiliation({
    placement,
    pageFrames,
  });
  const pageFrame = affiliation.pageFrameId
    ? pageFrames.find((candidate) => candidate.id === affiliation.pageFrameId)
    : null;
  return {
    boundary: affiliation.kind === 'workspace_only' ? 'outside' : affiliation.kind,
    pageFrameId: affiliation.pageFrameId,
    pageFrameRole: pageFrame?.role || null,
    pageFrame: pageFrame || null,
  };
}

export function buildExportPreviewModel(
  blocks: NoteBlock[],
  blockLayouts: Record<string, BlockBoxLayout>,
  options: BuildExportPreviewModelOptions = {},
): ExportPreviewModel {
  const crossingExportPolicy = options.crossingExportPolicy || DEFAULT_PAGE_FRAME_CROSSING_EXPORT_POLICY;
  const documentTypography = normalizeDocumentTypographyProfile(
    options.documentTypography || DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  );
  const placementByBlockId = new Map(
    (options.blockPlacements || []).map((placement) => [placement.blockId, placement]),
  );
  const rows = blocks.map((block) => {
    const layout = blockLayouts[block.id];
    const placement = placementByBlockId.get(block.id);
    const derivedPageFrameBoundary = exportBoundaryFromPlacement({
      placement,
      pageFrames: options.pageFrames || [],
    });
    const boundary = derivedPageFrameBoundary?.boundary
      || placement?.boundaryRole
      || (layout ? getBoundaryKind(layout) : 'inside');
    const exportRole = layout ? getEffectiveExportRole(layout) : 'included';
    const aiVisibility = layout ? getEffectiveAIVisibility(layout) : 'visible';
    const exportPolicy = placement && (boundary === 'crossing' || boundary === 'outside')
      ? resolvePageFrameCrossingExportDecision({
        rect: placement,
        pageFrame: derivedPageFrameBoundary?.pageFrame || null,
        policy: crossingExportPolicy,
      })
      : undefined;
    return {
      block,
      layout,
      placement,
      boundary,
      exportRole,
      aiVisibility,
      pageFrameId: derivedPageFrameBoundary?.pageFrameId || placement?.frameId || null,
      pageFrameRole: derivedPageFrameBoundary?.pageFrameRole || null,
      exportPolicy,
    };
  });
  const includedRows = rows.filter(isRowIncludedInExport);
  const excludedRows = rows.filter((row) => !isRowIncludedInExport(row));
  const aiVisibleRows = rows.filter((row) => row.aiVisibility === 'visible');
  const aiHiddenRows = rows.filter((row) => row.aiVisibility === 'hidden');
  const crossingObjects = rows.filter((row) => row.boundary === 'crossing');
  const workspaceOnlyObjects = rows.filter((row) => row.boundary === 'outside');
  const pageFrames = (options.pageFrames || []).map((pageFrame) => createPageFrameExportPreview(
    pageFrame,
    rows.filter((row) => row.pageFrameId === pageFrame.id && row.boundary === 'inside'),
    options.primaryPageFrameId,
    documentTypography,
  ));
  const pageStacks = (options.pageStacks || []).map(createPageStackExportPreview);

  return {
    rows,
    includedRows,
    excludedRows,
    aiVisibleRows,
    aiHiddenRows,
    pageFrames,
    pageStacks,
    crossingExportPolicy,
    crossingObjects,
    workspaceOnlyObjects,
    included: includedRows.length,
    excluded: excludedRows.length,
    scratch: rows.filter((row) => row.exportRole === 'scratch').length,
    aiVisible: aiVisibleRows.length,
    aiHidden: aiHiddenRows.length,
    crossing: crossingObjects.length,
    outside: workspaceOnlyObjects.length,
  };
}

export function exportRoleLabel(role: ExportRole): string {
  if (role === 'included') return 'Export';
  if (role === 'excluded') return 'Excluded';
  return 'Scratch';
}

export function aiVisibilityLabel(visibility: AIVisibility): string {
  return visibility === 'visible' ? 'AI visible' : 'AI hidden';
}

export function exportPreviewRowLabel(row: ExportPreviewRow): string {
  return row.block.title || sliceGraphemes(textFromContent(row.block), 0, 72) || 'Untitled block';
}
