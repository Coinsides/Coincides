import { render, waitFor } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SKIN_PRESET_IDS, type SkinPresetId } from '../../../shared/types/skin';
import { SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from '../styles/skinPresets';
import { buildSkinComponentStyles } from '../styles/skinComponentStyles';
import { buildPaperSkinStyles, buildPaperMaterialStyles } from '../pages/Notes/canvasEngine/paperSkinStyles';
import { documentTypographyToCssVars } from '../pages/Notes/canvasEngine/typographyProfileService';
import { NoteTruthBindingProvider } from '../pages/Notes/canvasEngine/NoteTruthBindingContext';
import { NoteRefBlockProjection } from '../pages/Notes/canvasEngine/blocks/NoteRefBlockProjection';
import { NoteReadOnlyPageContent } from '../pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent';
import { NotePageThumbnail } from '../pages/Notes/canvasEngine/layers/NotePageThumbnail';
import { BlockEditorLayer } from '../pages/Notes/canvasEngine/layers/BlockEditorLayer';
import { textFromContent } from '../pages/Notes/canvasEngine/blockContentService';
import { createVisualRelationBlocks, createVisualRelationFixture } from './visualRelationsFixture';
import { PageFrameSlotsLayer } from '../pages/Notes/canvasEngine/layers/PageFrameSlotsLayer';
import { createBindingPageFrameSlots } from '../pages/Notes/canvasEngine/pageFrameSlotService';
import { NOTE_BINDING_SLOT_NAMES } from '../../../shared/types/noteBinding';
import { WRITING_ROLE_BY_COMMAND } from '../pages/Notes/canvasEngine/commandSurfaceService';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../pages/Notes/canvasEngine/textFlowService';
import { resolveDocumentPageFlowPlan } from '../pages/Notes/canvasEngine/documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFragmentProjections } from '../pages/Notes/canvasEngine/notePageFlowService';
import { contrastRatio, parseCssColor, readCss, scanTextContrast } from './visualRelationsContrast';
import { mountVisualRelationStyles } from './visualRelationsStyles';
import katexStyles from '../components/KaTeX/KaTeXRenderer.module.css';

vi.mock('../pages/Notes/canvasEngine/canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));
vi.mock('../services/itemSummaryReader', () => ({ loadItemSummaries: vi.fn(async () => new Map([
  ['relation-item', { id: 'relation-item', plain_text: 'Item reference relation sample', summary: 'Item sample', status: 'active' }],
])) }));
let removeStyles: () => void;
beforeEach(() => { removeStyles = mountVisualRelationStyles(); });
afterEach(() => removeStyles());

function skinStyles(preset: SkinPresetId): CSSProperties {
  return { ...buildPaperSkinStyles(SKIN_PRESETS[preset]), ...buildPaperMaterialStyles(SKIN_PRESETS[preset], preset),
    ...buildSkinComponentStyles(SKIN_PRESET_COMPONENTS[preset]),
    backgroundColor: 'var(--sk-paper)', backgroundImage: 'var(--paper-material-fill, none)' } as CSSProperties;
}

function EditableBlocks() {
  const noop = () => {};
  const callbacks = {
    onFocused: noop, onFocusReleased: noop, onAnnotationSelect: noop, onAnnotationContextMenu: noop,
    onAnnotationStackSelect: noop, onTextUnitSelection: noop, onTextUnitContextMenu: noop, onBlockContextMenu: noop,
    onTextChange: noop, onTextFlowChange: noop, onFieldDraftChange: noop, onTrash: noop, onSelect: noop,
    onBeginMove: noop, onBeginResize: noop, onToggleExportRole: noop, onToggleAIVisibility: noop,
    onAnnotateBlock: noop, onKeyDown: noop, onMeasuredHeight: noop, onViewSource: noop,
  };
  return <>{createVisualRelationBlocks().map((block) => <BlockEditorLayer key={block.id} {...callbacks}
    block={block} text={textFromContent(block)} layout={{ x: 0, y: 0, width: 760, height: 100, surface: 'formal_page' }}
    contentReadOnly={false} active autoFocus={false} saving={false} layoutMode={false} pageOffsetX={0}
    annotations={[]} selectedAnnotationIds={[]} blockControlAnchor={null} affiliationOutline={null}
    showBlockTypeBadge={false} showAIStatusBadge={false} showExportStatusBadge={false} showLabelOverlay={false}
    anchorsBySourceRef={{}} sourceJumpBusy={null} onSave={async () => ({ status: 'saved', block, recoveryReceipt: null, reconciliation: 'not_needed' })} />)}</>;
}

describe('permanent visual relations: actual paper text/background contrast', () => {
  it('preserves global KaTeX selectors while mapping the local CSS module owner', () => {
    const view = render(<div style={{ ...skinStyles('warm-paper'), color: '#f5f5f5' }}>
      <div className={katexStyles.katex}><span className="katex">x</span></div>
    </div>);
    expect(parseCssColor(readCss(view.container.querySelector('span')!, 'color'))).toEqual(parseCssColor(SKIN_PRESETS['warm-paper'].ink));
  });
  it.each(SKIN_PRESET_IDS)('cover title regression and normal/Overview same-source ink: %s', (preset) => {
    const fixture = createVisualRelationFixture('A4', true);
    const cover = fixture.frames.find((frame) => frame.id === 'relation-cover')!;
    const view = render(<div style={{ color: '#f5f5f5' }}><div style={{ ...skinStyles(preset), ...documentTypographyToCssVars(fixture.typography) }}>
      <NoteTruthBindingProvider value={{ title: '封面题名回归夹具', description: '可读述名', onChange: () => {} }}>
        <section data-normal-cover><NoteRefBlockProjection field="title" /><NoteRefBlockProjection field="description" /></section>
        <NotePageThumbnail input={{ noteId: 'relations', noteCanvasRuntime: { ...fixture.runtime, blockFragmentProjections: fixture.fragments },
          visibleBlocks: fixture.blocks, blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {},
          documentTypographyProfile: fixture.typography, anchorsBySourceRef: {}, selectedPageFrameId: cover.id }}
          frame={cover} pageNumber={0} width={180} height={255} scale={0.2} selected={false} renderContent onSelectPage={() => {}} />
      </NoteTruthBindingProvider>
    </div></div>);
    const normal = view.container.querySelector('[data-normal-cover]')!;
    const overview = view.container.querySelector('[data-note-overview-canvas]')!;
    const editor = normal.querySelector('[data-note-truth-field="title"]')!;
    const thumbnail = overview.querySelector('[data-note-truth-field="title"]')!;
    expect(editor.tagName).toBe('TEXTAREA'); expect(thumbnail).toBeTruthy();
    expect(parseCssColor(readCss(editor, 'color'))).toEqual(parseCssColor(SKIN_PRESETS[preset].ink));
    expect(parseCssColor(readCss(thumbnail, 'color'))).toEqual(parseCssColor(readCss(editor, 'color')));
    const scans = [scanTextContrast(normal), scanTextContrast(overview)];
    expect(scans.map((scan) => scan.failures).flat()).toEqual([]);
    expect(scans.every((scan) => scan.samples.some((sample) => sample.text === '封面题名回归夹具' && sample.threshold === 3))).toBe(true);
    console.log('T8_COVER', JSON.stringify({ preset, ratios: scans.map((scan) => scan.samples.map(({ text, ratio, threshold }) => ({ text, ratio, threshold }))) }));
  });

  it.each(SKIN_PRESET_IDS)('scans every current template and every populated binding slot: %s', async (preset) => {
    const fixture = createVisualRelationFixture('A4', true);
    const view = render(<div style={{ color: '#f5f5f5' }}><div style={{ ...skinStyles(preset), ...documentTypographyToCssVars(fixture.typography) }}>
      <NoteTruthBindingProvider value={{ title: '封面题名回归夹具', description: '可读述名' }}>
        {fixture.frames.map((frame) => <section key={frame.id} data-paper-frame={frame.id}>
          <NoteReadOnlyPageContent frame={frame} slots={fixture.runtime.pageFrameExtensions.find((entry) => entry.frameId === frame.id)?.slots}
            fragments={fixture.fragments} visibleBlocks={fixture.blocks} blockTextDrafts={{}} blockTextFlowDrafts={{}}
            blockFieldDrafts={{}} anchorsBySourceRef={{}} documentTypography={fixture.typography} />
        </section>)}
      </NoteTruthBindingProvider>
    </div></div>);
    await waitFor(() => expect(view.container.querySelector('[data-media-block-state="failed"]')).toBeTruthy());
    await waitFor(() => expect(view.container.textContent).toContain('Item reference relation sample'));
    // Include the expanded disclosure text too; closure is a view state, not a color waiver.
    for (const details of view.container.querySelectorAll('details')) details.open = true;
    const scan = scanTextContrast(view.container);
    expect(scan.samples.length).toBeGreaterThan(15);
    console.log('T8_CONTRAST', JSON.stringify({ preset, samples: scan.samples.length, failures: scan.failures,
      minimum: [...scan.samples].sort((a, b) => a.ratio - b.ratio)[0], exemptions: scan.exemptions }));
    expect(scan.failures).toEqual([]);
  });

  it.each(SKIN_PRESET_IDS)('normal editable citizens and the three existing slot ink choices: %s', async (preset) => {
    const fixture = createVisualRelationFixture('A4', false);
    const tokens = ['ink', 'ink-muted', 'accent'] as const;
    for (const [index, position] of NOTE_BINDING_SLOT_NAMES.entries()) fixture.binding.sections[0].slots[position].style.colorToken = tokens[index % tokens.length];
    const view = render(<div style={{ color: '#f5f5f5' }}><div style={{ ...skinStyles(preset), ...documentTypographyToCssVars(fixture.typography) }}>
      <EditableBlocks />
      <PageFrameSlotsLayer slots={createBindingPageFrameSlots({ pageFrame: fixture.frames[0], mechanicalPageNumber: 1, bindingSettings: fixture.binding })} />
    </div></div>);
    await waitFor(() => expect(view.container.textContent).toContain('Item reference relation sample'));
    const scan = scanTextContrast(view.container);
    console.log('T8_EDITABLE', JSON.stringify({ preset, samples: scan.samples.length, failures: scan.failures }));
    expect(scan.failures).toEqual([]);
    expect(scan.samples.some((sample) => sample.text === 'x=1')).toBe(true);
  });

  it.each(SKIN_PRESET_IDS)('paginated writing roles and markers inherit no shell ink: %s', (preset) => {
    const fixture = createVisualRelationFixture('A4', false);
    const flow = createTextBlockContentV1('Writing role sample');
    const roles = [...new Set(Object.values(WRITING_ROLE_BY_COMMAND))];
    flow.units = roles.map((role, index) => ({ ...flow.units[0], id: `role-${role}`, writing_role: role!,
      text: `${role} sample`, order_index: index }));
    const block = { ...fixture.blocks[0], content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
    const plan = resolveDocumentPageFlowPlan({ collection: fixture.plan.collection,
      blocks: noteBlocksToPageFlow([block], fixture.layouts, {}, {}), documentTypography: fixture.typography });
    const fragments = pageFlowFragmentProjections(plan);
    const view = render(<div style={{ color: '#f5f5f5' }}><div style={{ ...skinStyles(preset), ...documentTypographyToCssVars(fixture.typography) }}>
      {plan.collection.pageFrames.map((frame) => <NoteReadOnlyPageContent key={frame.id} frame={frame} fragments={fragments}
        visibleBlocks={[block]} blockTextDrafts={{}} blockTextFlowDrafts={{}} blockFieldDrafts={{}} anchorsBySourceRef={{}}
        documentTypography={fixture.typography} />)}
    </div></div>);
    const scan = scanTextContrast(view.container);
    expect(scan.samples.some((sample) => sample.text === '-')).toBe(true);
    expect(scan.samples.some((sample) => sample.text.includes('toggle_item sample'))).toBe(true);
    console.log('T8_ROLES', JSON.stringify({ preset, roles, samples: scan.samples.length, failures: scan.failures }));
    expect(scan.failures).toEqual([]);
  });

  it('detects the original pale-ink regression, a local backing and transparent paint', () => {
    const view = render(<div style={{ color: '#f5f5f5', backgroundColor: '#F7F3EA', fontSize: 36 }}>
      <textarea aria-label="regression" defaultValue="封面失色" style={{ color: 'inherit', background: 'transparent', fontSize: 36 }} />
      <span style={{ color: 'rgba(0,0,0,0.1)', backgroundColor: '#ffffff', fontSize: 15 }}>Alpha fade</span>
    </div>);
    const scan = scanTextContrast(view.container);
    expect(scan.failures).toHaveLength(2);
    expect(scan.samples[0].threshold).toBe(3);
    expect(scan.samples[1].threshold).toBe(4.5);
    expect(scan.samples[1].backgrounds[0]).toEqual(parseCssColor('#ffffff'));
    expect(contrastRatio(parseCssColor('black'), parseCssColor('white'))).toBe(21);
  });

  it('does not waive invisible text or a gradient crossing the ink luminance', () => {
    const view = render(<div style={{ backgroundColor: '#ffffff', fontSize: 15 }}>
      <span style={{ color: 'transparent' }}>Invisible title</span>
      <span style={{ color: '#777777', backgroundImage: 'linear-gradient(#000000, #ffffff)' }}>Gradient midpoint</span>
      <span style={{ color: '#767676', backgroundImage: 'linear-gradient(white, yellow, white)' }}>Named gradient stop</span>
      <section><textarea defaultValue="Hidden twin" style={{ color: 'transparent' }} /><span hidden style={{ color: '#000000' }}>Hidden twin</span></section>
      <span style={{ color: '#ffffff', backgroundColor: '#000000', opacity: 0.5 }}>Group compositing</span>
    </div>);
    const scan = scanTextContrast(view.container);
    expect(scan.failures).toHaveLength(5);
    expect(scan.samples.find((sample) => sample.text === 'Named gradient stop')?.ratio).toBeLessThan(4.5);
    expect(() => parseCssColor('rgb(from red r g b)')).toThrow();
    expect(() => parseCssColor('unrecognizedcolor')).toThrow();
  });
});
