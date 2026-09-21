import { ChevronRight } from 'lucide-react';
import { NOTE_PRESETS, createManualBindingPreset } from '../../../../shared/types/notePresets';
import { createDefaultNoteBindingSettings } from '../../../../shared/types/noteBinding';
import { useAuthStore } from '@/stores/authStore';
import { resolveSkin } from '@/styles/skinPresets';
import { buildSkinComponentStyles } from '@/styles/skinComponentStyles';
import { buildPaperMaterialStyles, buildPaperSkinStyles } from '../Notes/canvasEngine/paperSkinStyles';
import { buildNoteCanvasRuntimeModel, createPrimaryPageFrame } from '../Notes/canvasEngine/engineModel';
import { coverPresetPlacements } from '../Notes/canvasEngine/noteCoverPresets';
import { createPageStackFromFrame } from '../Notes/canvasEngine/pageStackCollectionService';
import { NoteTruthBindingProvider } from '../Notes/canvasEngine/NoteTruthBindingContext';
import { NoteReadOnlyPageContent } from '../Notes/canvasEngine/layers/NoteReadOnlyPageContent';
import { createDefaultDocumentTypographyProfile, documentTypographyToCssVars } from '../Notes/canvasEngine/typographyProfileService';
import type { NoteBlock } from '../Notes/canvasEngine/runtimeDataTypes';
import styles from './SuiteDrawer.module.css';

type Preset = typeof NOTE_PRESETS[number];
const truth = { title: '笔记题名', description: '笔记述名', readOnly: true };

/** Inventory preview uses the same recipe, live reference renderer and binding projection as paper. */
export function TemplatePreview({ preset }: { preset: Preset }) {
  const theme = useAuthStore((state) => state.user?.settings.theme ?? 'dark');
  const skin = resolveSkin(null, null, null, {}, {}, theme);
  const frame = createPrimaryPageFrame({ id: 'preset-preview', x: 0, y: 0 });
  const typography = createDefaultDocumentTypographyProfile();
  const settings = preset.kind === 'cover' ? createDefaultNoteBindingSettings()
    : createManualBindingPreset(null, truth.title);
  if (preset.kind === 'cover') settings.coverPage.frameId = frame.id;
  const layouts = preset.kind === 'cover' ? coverPresetPlacements(preset.id, frame) : null;
  const blocks: NoteBlock[] = layouts ? (['title', 'description'] as const).map((field, index) => ({
    id: field, placement_id: `preview-${field}`, block_type: 'note_ref', content_json: { field },
    title: null, plain_text: null, metadata: {}, display_overrides_json: {}, order_index: index,
    source_references: [], canvas_layout: { ...layouts[field] },
  })) : [];
  const runtime = buildNoteCanvasRuntimeModel({ mode: 'page', primaryPageFrame: frame, pageFrames: [frame],
    pageStacks: [createPageStackFromFrame(frame)],
    bindingSettings: settings, viewport: { x: 0, y: 0, width: frame.width, height: frame.height, zoom: 1 },
    blockPlacements: blocks.map((block) => {
      const layout = layouts![block.content_json.field as 'title' | 'description'];
      return { ...layout, x: frame.contentInset.left + layout.x, y: frame.contentInset.top + layout.y,
        placementId: block.placement_id, blockId: block.id, objectId: block.id, objectKind: 'note_block',
        canvasId: 'preset-preview', frameId: frame.id, surface: 'formal_page', boundaryRole: 'inside', rotation: 0, zIndex: 1 };
    }),
  });
  return <svg aria-hidden="true" data-template-preview={preset.id} width="100%" viewBox={`0 0 ${frame.width} ${frame.height}`}>
    <foreignObject width={frame.width} height={frame.height}>
      <div style={{ ...buildPaperSkinStyles(skin.tokens), ...buildPaperMaterialStyles(skin.tokens, skin.materialPreset),
        ...buildSkinComponentStyles(skin.components), ...documentTypographyToCssVars(typography),
        position: 'relative', width: frame.width, height: frame.height, overflow: 'hidden',
        backgroundColor: 'var(--sk-paper)', color: 'var(--sk-ink)', pointerEvents: 'none' }}>
        <NoteTruthBindingProvider value={truth}>
          <NoteReadOnlyPageContent frame={frame} slots={runtime.pageFrameExtensions[0]?.slots}
            documentTypography={typography} fragments={runtime.blockFragmentProjections} visibleBlocks={blocks}
            blockTextDrafts={{}} blockTextFlowDrafts={{}} blockFieldDrafts={{}} anchorsBySourceRef={{}} />
        </NoteTruthBindingProvider>
      </div>
    </foreignObject>
  </svg>;
}

export default function TemplateDrawer({ search }: { search: string }) {
  const query = search.trim().toLocaleLowerCase();
  const presets = NOTE_PRESETS.filter((preset) => preset.name.toLocaleLowerCase().includes(query));
  return <div className={styles.drawer}>
    <p className={styles.message}>在笔记的装订设置中套用，套用后可继续编辑。</p>
    <details open className={styles.group}>
      <summary><ChevronRight size={15} aria-hidden /><span>出厂模板</span><span className={styles.count}>{presets.length}</span></summary>
      <ul className={styles.grid} aria-label="出厂模板">{presets.map((preset) => <li className={styles.card} key={preset.id} data-template-card={preset.id}>
        <figure className={styles.select}>
          <div className={styles.preview}><TemplatePreview preset={preset} /></div>
          <figcaption><span className={styles.name}>{preset.name}</span><span className={styles.lineage}>
            {preset.kind === 'binding' ? '眉中题名 · 脚中页码' : preset.id === 'manual' ? '封面 · 居中竖列与述名' : '封面 · 横排题名与述名'}
          </span></figcaption>
        </figure>
      </li>)}</ul>
      {!presets.length && <p className={styles.empty}>没有匹配的模板。</p>}
    </details>
  </div>;
}
