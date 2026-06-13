import {
  useBlockFieldDraftController,
  type UseBlockFieldDraftControllerOptions,
} from './useBlockFieldDraftController';
import {
  useMeasuredBlockReflowController,
  type UseMeasuredBlockReflowControllerOptions,
} from './useMeasuredBlockReflowController';

export interface UseRuntimeBlockEditingControllerOptions
  extends UseBlockFieldDraftControllerOptions,
    UseMeasuredBlockReflowControllerOptions {}

export function useRuntimeBlockEditingController(options: UseRuntimeBlockEditingControllerOptions) {
  const { updateBlockFieldDraft } = useBlockFieldDraftController(options);
  const { handleMeasuredBlockHeight } = useMeasuredBlockReflowController(options);

  return {
    handleMeasuredBlockHeight,
    updateBlockFieldDraft,
  };
}
