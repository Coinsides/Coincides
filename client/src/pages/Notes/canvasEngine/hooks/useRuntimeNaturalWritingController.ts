import {
  useCanvasSurfacePointerController,
  type UseCanvasSurfacePointerControllerOptions,
} from './useCanvasSurfacePointerController';
import {
  useDraftBlockController,
  type UseDraftBlockControllerOptions,
} from './useDraftBlockController';
import {
  useSlashCommandController,
  type UseSlashCommandControllerOptions,
} from './useSlashCommandController';

export interface UseRuntimeNaturalWritingControllerOptions
  extends UseDraftBlockControllerOptions,
    Omit<
      UseSlashCommandControllerOptions,
      | 'activateDraft'
      | 'draftText'
      | 'draftTextRef'
      | 'persistDraft'
      | 'setDraftText'
    >,
    Omit<
      UseCanvasSurfacePointerControllerOptions,
      | 'activateDraft'
      | 'defaultDraftLayout'
    > {}

export function useRuntimeNaturalWritingController(options: UseRuntimeNaturalWritingControllerOptions) {
  const {
    activateDraft,
    creatingDraft,
    discardDraft,
    draftActive,
    draftLayout,
    draftRef,
    draftText,
    draftTextRef,
    persistDraft,
    resizeDraftFromTextarea,
    setDraftText,
  } = useDraftBlockController(options);

  const {
    activeSlashCommandId,
    clearSlashTarget,
    handleBlockKeyDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handleSelectSlashCommand,
    slashCommands,
    slashTarget,
  } = useSlashCommandController({
    ...options,
    activateDraft,
    draftText,
    draftTextRef,
    persistDraft,
    setDraftText,
  });

  const {
    handleBlockListMouseDown,
    handlePageSpaceDoubleClick,
    handleSurfacePointerDown,
  } = useCanvasSurfacePointerController({
    ...options,
    activateDraft,
    defaultDraftLayout: options.defaultDraftLayout,
  });

  return {
    activateDraft,
    clearSlashTarget,
    creatingDraft,
    discardDraft,
    draftActive,
    draftLayout,
    draftRef,
    draftText,
    handleBlockKeyDown,
    handleBlockListMouseDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handlePageSpaceDoubleClick,
    handleSelectSlashCommand,
    handleSurfacePointerDown,
    persistDraft,
    resizeDraftFromTextarea,
    slashCommands,
    slashTarget,
    activeSlashCommandId,
  };
}
