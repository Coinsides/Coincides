import { textFromContent } from './blockContentService';
import {
  getBoundaryKind,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
} from './placementService';
import type {
  AIVisibility,
  BlockBoxLayout,
  BoundaryKind,
  ExportRole,
} from './runtimeLayout';
import type { NoteBlock } from './runtimeDataTypes';

export interface ExportPreviewRow {
  block: NoteBlock;
  layout?: BlockBoxLayout;
  boundary: BoundaryKind;
  exportRole: ExportRole;
  aiVisibility: AIVisibility;
}

export interface ExportPreviewModel {
  rows: ExportPreviewRow[];
  includedRows: ExportPreviewRow[];
  excludedRows: ExportPreviewRow[];
  aiVisibleRows: ExportPreviewRow[];
  aiHiddenRows: ExportPreviewRow[];
  included: number;
  excluded: number;
  scratch: number;
  aiVisible: number;
  aiHidden: number;
  crossing: number;
  outside: number;
}

export function buildExportPreviewModel(
  blocks: NoteBlock[],
  blockLayouts: Record<string, BlockBoxLayout>,
): ExportPreviewModel {
  const rows = blocks.map((block) => {
    const layout = blockLayouts[block.id];
    const boundary = layout ? getBoundaryKind(layout) : 'inside';
    const exportRole = layout ? getEffectiveExportRole(layout) : 'included';
    const aiVisibility = layout ? getEffectiveAIVisibility(layout) : 'visible';
    return { block, layout, boundary, exportRole, aiVisibility };
  });
  const includedRows = rows.filter((row) => row.exportRole === 'included');
  const excludedRows = rows.filter((row) => row.exportRole !== 'included');
  const aiVisibleRows = rows.filter((row) => row.aiVisibility === 'visible');
  const aiHiddenRows = rows.filter((row) => row.aiVisibility === 'hidden');

  return {
    rows,
    includedRows,
    excludedRows,
    aiVisibleRows,
    aiHiddenRows,
    included: includedRows.length,
    excluded: excludedRows.length,
    scratch: rows.filter((row) => row.exportRole === 'scratch').length,
    aiVisible: aiVisibleRows.length,
    aiHidden: aiHiddenRows.length,
    crossing: rows.filter((row) => row.boundary === 'crossing').length,
    outside: rows.filter((row) => row.boundary === 'outside').length,
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
  return row.block.title || textFromContent(row.block).slice(0, 72) || 'Untitled block';
}
