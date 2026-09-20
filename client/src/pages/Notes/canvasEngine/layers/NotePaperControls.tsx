import { PaperSizeControls } from '@/components/Skin/PaperSizeControls';
import { getNotebookPaperDefault, getPagePaperDimensions, isWebPaperCollection, PAPER_SIZE_PRESETS } from '../paperSizeService';
import type { usePaperSize } from '../hooks/usePaperSize';
import type { PageFrameCollectionModel, PageFrameTemplateId } from '../types';

export function NotePaperControls({ paper, collection, layoutMode, disabled = false }: {
  paper: ReturnType<typeof usePaperSize>;
  collection: PageFrameCollectionModel;
  layoutMode: boolean;
  disabled?: boolean;
}) {
  disabled = disabled || !paper.enabled;
  const current = paper.collection || collection;
  const frame = current.pageFrames.find((entry) => entry.id === paper.selectedFrameId)
    || current.pageFrames.find((entry) => entry.id === current.selectedFrameId)
    || current.pageFrames.find((entry) => entry.id === current.primaryFrameId) || current.pageFrames[0];
  if (!frame) return null;
  const defaults = getNotebookPaperDefault(current);
  const defaultSize = getPagePaperDimensions({ ...frame, ...defaults, paperSizeReferenceWidth: undefined, paperSizeOverride: undefined });
  const size = getPagePaperDimensions(frame);
  const web = isWebPaperCollection(current);
  return <>
    {layoutMode && !web && <label>调节页面
      <select aria-label="调节页面" value={frame.id} disabled={disabled || paper.busy}
        onChange={(event) => paper.selectFrame(event.currentTarget.value)}>
        {current.pageFrames.map((page, index) => <option key={page.id} value={page.id}>第 {index + 1} 页</option>)}
      </select>
    </label>}
    <PaperSizeControls presets={PAPER_SIZE_PRESETS.map((preset) => ({ value: preset.templateId, label: preset.label }))}
      selectedPreset={defaults.templateId} widthMm={defaultSize.width} heightMm={defaultSize.height}
      layoutMode={layoutMode} isWebLongPage={web} disabled={disabled || paper.busy}
      page={{ id: frame.id, label: `第 ${current.pageFrames.indexOf(frame) + 1} 页`, widthMm: size.width, heightMm: size.height, isOverride: Boolean(frame.paperSizeOverride) }}
      onPresetChange={async (value) => { if (!await paper.setPreset(value as PageFrameTemplateId)) throw new Error('Paper preset not saved'); }}
      onResize={async (width, height) => { if (!await paper.resize(frame.id, width, height)) throw new Error('Paper size not saved'); }}
      onRestore={async () => { if (!await paper.restore(frame.id)) throw new Error('Paper size not restored'); }} />
    {paper.error && <p role="alert">{paper.error}</p>}
  </>;
}
