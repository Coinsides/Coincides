import type { CoordinateContract } from '../placementContractService';
import { useNoteCanvasFrameModel } from './useNoteCanvasLayoutModel';
import type { Note, NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout, SurfaceMode } from '../runtimeLayout';
import type {
  CanvasObject,
  CanvasPlacement,
  CanvasViewport,
  ContentMount,
  DocumentTypographyProfile,
  ImageCanvasObject,
  PageFrameCollectionModel,
  StructuredCanvasObject,
  VisualConnector,
} from '../types';

export interface UseRuntimeFrameModelControllerOptions {
  note?: Pick<Note, 'page_format'> | null;
  coordinateContract?: CoordinateContract;
  blockLayouts: Record<string, BlockBoxLayout>;
  defaultDraftLayout: BlockBoxLayout;
  documentTypographyProfile: DocumentTypographyProfile;
  draftActive: boolean;
  draftLayout: BlockBoxLayout | null;
  pageFrameCollection: PageFrameCollectionModel | null;
  persistedCanvasObjects: CanvasObject[];
  persistedCanvasPlacements: CanvasPlacement[];
  persistedContentMounts: ContentMount[];
  persistedVisualConnectors: VisualConnector[];
  persistedImageObjects: ImageCanvasObject[];
  persistedStructuredObjects: StructuredCanvasObject[];
  contentLookupBlocks?: NoteBlock[];
  pageOffsetX: number;
  surfaceMode: SurfaceMode;
  viewportTransform: CanvasViewport;
  pageReadingViewport?: CanvasViewport;
  visibleBlocks: NoteBlock[];
}

export function useRuntimeFrameModelController({
  note,
  blockLayouts,
  coordinateContract,
  defaultDraftLayout,
  documentTypographyProfile,
  draftActive,
  draftLayout,
  pageFrameCollection,
  persistedCanvasObjects,
  persistedCanvasPlacements,
  persistedContentMounts,
  persistedVisualConnectors,
  persistedImageObjects,
  persistedStructuredObjects,
  contentLookupBlocks,
  pageOffsetX,
  surfaceMode,
  viewportTransform,
  pageReadingViewport,
  visibleBlocks,
}: UseRuntimeFrameModelControllerOptions) {
  return useNoteCanvasFrameModel({
    notePagePreset: note?.page_format,
    coordinateContract,
    blockLayouts,
    defaultDraftLayout,
    documentTypographyProfile,
    draftActive,
    draftLayout,
    pageFrameCollection,
    persistedCanvasObjects,
    persistedCanvasPlacements,
    persistedContentMounts,
    persistedVisualConnectors,
    persistedImageObjects,
    persistedStructuredObjects,
    contentLookupBlocks,
    pageOffsetX,
    surfaceMode,
    viewportTransform,
    pageReadingViewport,
    visibleBlocks,
  });
}
