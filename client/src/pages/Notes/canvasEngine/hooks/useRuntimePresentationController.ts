import {
  useNoteCanvasLayerProps,
  type UseNoteCanvasLayerPropsInput,
} from './useNoteCanvasLayerProps';
import {
  useRuntimeFrameModelController,
  type UseRuntimeFrameModelControllerOptions,
} from './useRuntimeFrameModelController';

export type UseRuntimePresentationControllerOptions =
  UseRuntimeFrameModelControllerOptions &
  Omit<
    UseNoteCanvasLayerPropsInput,
    | 'exportPreview'
    | 'noteCanvasRuntime'
    | 'pageContentHeight'
    | 'primaryPageFrameX'
    | 'primaryPageFrameWidth'
  >;

export function useRuntimePresentationController(
  options: UseRuntimePresentationControllerOptions,
) {
  const {
    exportPreview,
    noteCanvasRuntime,
    pageContentHeight,
    primaryPageFrame,
  } = useRuntimeFrameModelController(options);

  const layerProps = useNoteCanvasLayerProps({
    ...options,
    exportPreview,
    noteCanvasRuntime,
    pageContentHeight,
    primaryPageFrameX: primaryPageFrame.x,
    primaryPageFrameWidth: primaryPageFrame.width,
  });

  return {
    layerProps,
  };
}
