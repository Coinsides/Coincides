import {
  useBlockPlacementInteractions,
  type UseBlockPlacementInteractionsOptions,
} from './useBlockPlacementInteractions';
import { estimateBlockHeightForText } from '../measurementService';
import type { NoteBlock } from '../runtimeDataTypes';

export interface UseRuntimePlacementInteractionControllerOptions
  extends Omit<UseBlockPlacementInteractionsOptions<NoteBlock>, 'estimateBlockHeightForText'> {}

export function useRuntimePlacementInteractionController(
  options: UseRuntimePlacementInteractionControllerOptions,
) {
  return useBlockPlacementInteractions({
    ...options,
    estimateBlockHeightForText,
  });
}
