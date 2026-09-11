import { useMemo, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { NoteOverviewLayer, type NoteOverviewLayerProps } from './src/pages/Notes/canvasEngine/layers/NoteOverviewLayer';
import { NoteReadOnlyPageContent } from './src/pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent';
import { createPageFrameTemplate } from './src/pages/Notes/canvasEngine/pageFrameTemplateService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, documentTypographyToCssVars } from './src/pages/Notes/canvasEngine/typographyProfileService';
import type { NoteBlock } from './src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { NoteCanvasRuntimeModel, PageFrameModel, PageStackBlockFragmentProjection } from './src/pages/Notes/canvasEngine/types';
import './src/i18n';
import './src/styles/global.css';

// Local, in-memory fixture only. It never imports the API or writes note rows.
// Overview and readback both use the production print fragment renderer.
type OverviewInput = NoteOverviewLayerProps['writingSurfaceProps'];
function createSpecimen(pageCount: number, longPage: boolean) {
  const template = createPageFrameTemplate('a4_portrait');
  const height = longPage ? template.width * 3 : template.height;
  const frames: PageFrameModel[] = Array.from({ length: pageCount }, (_, index) => ({
    ...template, id: `e4-frame-${index + 1}`, role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
    x: 0, y: index * (height + 32), height,
    contentInset: { ...template.contentInset }, background: { ...template.background },
  }));
  const blocks: NoteBlock[] = [];
  const fragments: PageStackBlockFragmentProjection[] = [];
  const inset = template.contentInset;
  const width = template.width - inset.left - inset.right;
  const topics = ['Opportunity cost', 'The production frontier', 'Trade and specialization', 'Demand and supply', 'Price elasticity', 'Market equilibrium'];
  const paragraphs = [
    'Every decision has an opportunity cost: the value of the next best alternative that is forgone. A useful comparison considers the full set of feasible choices, including time, effort, and resources. The shape of the production frontier reveals how these trade-offs change as an economy reallocates scarce inputs.',
    'An outward shift of the production frontier represents an increase in productive capacity. Better technology or additional resources can make combinations available that were previously unattainable. Moving along the frontier instead represents a change in the allocation of the existing resources.',
    'A market reaches equilibrium when the quantity supplied equals the quantity demanded. A price above equilibrium creates a surplus; a price below equilibrium creates a shortage. The resulting adjustment provides information about the relative scarcity of goods and the choices open to participants.',
  ];
  frames.forEach((frame, index) => {
    const n = index + 1;
    const append = (suffix: string, text: string, y: number, blockHeight: number, kind: 'text' | 'code' | 'formula' = 'text') => {
      const id = `e4-page-${n}-${suffix}`;
      const block: NoteBlock = {
        id, placement_id: `${id}-placement`, display_overrides_json: {},
        block_type: kind === 'formula' ? 'formula' : 'text', title: null,
        content_json: kind === 'formula' ? { body: text, field_values: { latex_input: text, formula_name: 'Marginal opportunity cost', explanation: 'The slope measures the trade-off at a particular allocation.' } }
          : { body: text, ...(kind === 'code' ? { language: 'python' } : {}) },
        plain_text: text, metadata: { template_id: kind === 'formula' ? 'formula.math' : kind === 'code' ? 'code.snippet' : 'text.paragraph' },
        order_index: blocks.length, source_references: [],
        canvas_layout: { x: 0, y: y - inset.top, width, height: blockHeight, coordinate_space: 'page_frame_local', frame_id: frame.id, surface: 'formal_page', boundary_role: 'inside' },
      };
      const rect = { x: inset.left, y: frame.y + y, width, height: blockHeight };
      blocks.push(block);
      fragments.push({
        blockId: id, pageStackId: 'e4-stack', pageFrameId: frame.id, pageIndex: index, pageTotal: pageCount,
        fragmentIndex: 0, fragmentTotal: 1, role: 'single', blockRect: rect, visibleRect: rect,
        clippedTop: false, clippedBottom: false,
        pageContentRect: { x: inset.left, y: frame.y + inset.top, width, height: height - inset.top - inset.bottom },
      });
    };
    append('heading', `${String(n).padStart(2, '0')}   ${topics[index % topics.length]}\nECONOMICS · STUDY NOTES`, inset.top + 10, 80);
    append('body-a', paragraphs[index % paragraphs.length], inset.top + 112, 180);
    if (index % 2 === 0) append('formula', String.raw`\mathrm{MOC}_{x}=\left|\frac{\Delta y}{\Delta x}\right|\qquad Q_d=Q_s`, inset.top + 315, 155, 'formula');
    else append('code', `# Page ${n}: compare feasible allocations\nfrontier = [(0, 100), (20, 92), (40, 76)]\nfor x, y in frontier:\n    print(f"allocation: {x}, {y}")\n\n# Keep units consistent in every comparison.`, inset.top + 315, 175, 'code');
    append('body-b', `Worked observation ${n}\n${paragraphs[(index + 1) % paragraphs.length]}\n\nCheck the assumptions before interpreting a movement as a shift.`, inset.top + 530, 220);
    append('end', `END OF PAGE ${n} — the complete page remains visible.`, height - inset.bottom - 64, 60);
  });
  const runtime = {
    pageFrames: frames, blockFragmentProjections: fragments, canvasObjects: [], canvasPlacements: [],
  } as unknown as NoteCanvasRuntimeModel;
  return { frames, blocks, fragments, runtime };
}

export function E4OverviewSmokeFixture() {
  const query = new URLSearchParams(window.location.search);
  const initialPages = Number(query.get('pages'));
  const [pageCount, setPageCount] = useState([1, 12, 240].includes(initialPages) ? initialPages : 12);
  const [longPage, setLongPage] = useState(query.get('long') === 'true');
  const [open, setOpen] = useState(true);
  const [selectedId, setSelectedId] = useState(`e4-frame-${query.get('selected') || '2'}`);
  const specimen = useMemo(() => createSpecimen(pageCount, longPage), [pageCount, longPage]);
  const effectiveId = specimen.frames.some((frame) => frame.id === selectedId) ? selectedId : specimen.frames[0].id;
  const input: OverviewInput = {
    noteId: `e4-synthetic-${pageCount}-${longPage}`, noteCanvasRuntime: specimen.runtime,
    visibleBlocks: specimen.blocks, blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {},
    documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, anchorsBySourceRef: {}, selectedPageFrameId: effectiveId,
  };
  const selectedFrame = specimen.frames.find((frame) => frame.id === effectiveId)!;
  return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <header style={{ display: 'flex', flex: '0 0 42px', alignItems: 'center', gap: 8, padding: '0 14px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-primary)', fontSize: 12 }}>
      <strong style={{ marginRight: 'auto' }}>E4 · Synthetic note</strong>
      <select aria-label="Synthetic page count" value={pageCount} onChange={(event) => { setPageCount(Number(event.target.value)); setSelectedId('e4-frame-1'); setOpen(true); }}>
        <option value={1}>1 page</option><option value={12}>12 pages</option><option value={240}>240 pages</option>
      </select>
      <label style={{ display: 'flex', gap: 4 }}><input type="checkbox" checked={longPage} onChange={(event) => { setLongPage(event.target.checked); setOpen(true); }} />Long</label>
      <button onClick={() => setOpen(true)}>Open overview</button>
    </header>
    <main data-app-main-scroll="true" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {open ? <NoteOverviewLayer writingSurfaceProps={input} onClose={() => setOpen(false)} onSelectPage={(frameId) => { setSelectedId(frameId); setOpen(false); }} />
        : <section data-e4-readback-frame={effectiveId} style={{ padding: 24 }}>
          <p>Reading page {specimen.frames.indexOf(selectedFrame) + 1} · {effectiveId}</p>
          <div style={{ ...documentTypographyToCssVars(input.documentTypographyProfile), position: 'relative', width: selectedFrame.width, height: selectedFrame.height, margin: '20px auto', background: 'var(--bg-primary)', outline: '1px solid var(--border-default)' } as CSSProperties}>
            <NoteReadOnlyPageContent frame={selectedFrame} fragments={specimen.fragments} visibleBlocks={specimen.blocks} blockTextDrafts={{}} blockTextFlowDrafts={{}} blockFieldDrafts={{}} anchorsBySourceRef={{}} />
          </div>
        </section>}
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<E4OverviewSmokeFixture />);
