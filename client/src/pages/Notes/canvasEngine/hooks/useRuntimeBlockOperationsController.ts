import { useUIStore } from '@/stores/uiStore';
import {
  useRuntimeBlockEditingController,
  type UseRuntimeBlockEditingControllerOptions,
} from './useRuntimeBlockEditingController';
import {
  useRuntimeBlockHistoryController,
  type UseRuntimeBlockHistoryControllerOptions,
} from './useRuntimeBlockHistoryController';
import {
  useRuntimeNaturalWritingController,
  type UseRuntimeNaturalWritingControllerOptions,
} from './useRuntimeNaturalWritingController';
import {
  useRuntimePlacementInteractionController,
  type UseRuntimePlacementInteractionControllerOptions,
} from './useRuntimePlacementInteractionController';

export type UseRuntimeBlockOperationsControllerOptions =
  UseRuntimeBlockHistoryControllerOptions &
  Omit<UseRuntimeNaturalWritingControllerOptions, 'addToast' | 'onDraftPersisted'> &
  UseRuntimeBlockEditingControllerOptions &
  Omit<UseRuntimePlacementInteractionControllerOptions, 'pushLayoutHistory'>;

export function useRuntimeBlockOperationsController(
  options: UseRuntimeBlockOperationsControllerOptions,
) {
  const addToast = useUIStore((s) => s.addToast);
  const {
    handleTrashBlock,
    pushCreatedBlockHistory,
    pushLayoutHistory,
  } = useRuntimeBlockHistoryController(options);

  const naturalWriting = useRuntimeNaturalWritingController({
    ...options,
    addToast,
    onDraftPersisted: pushCreatedBlockHistory,
  });

  const blockEditing = useRuntimeBlockEditingController(options);

  const placementInteraction = useRuntimePlacementInteractionController({
    ...options,
    pushLayoutHistory,
  });

  return {
    handleTrashBlock,
    ...naturalWriting,
    ...blockEditing,
    ...placementInteraction,
  };
}
