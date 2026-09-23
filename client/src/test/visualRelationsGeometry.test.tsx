// @ts-expect-error -- Optional audit output runs in Vitest's Node host.
import { writeFileSync, mkdirSync } from 'node:fs';
// @ts-expect-error -- Optional audit output runs in Vitest's Node host.
import { resolve } from 'node:path';
import { render, cleanup } from '@testing-library/react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { listNoteBlockTemplates } from '../../../shared/types';
import { NOTE_BINDING_SLOT_NAMES } from '../../../shared/types/noteBinding';
import { NoteReadOnlyPageContent } from '../pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent';
import { NoteTruthBindingProvider } from '../pages/Notes/canvasEngine/NoteTruthBindingContext';
import { getPageFrameContentRect } from '../pages/Notes/canvasEngine/pageFrameService';
import { derivePageReadingViewport, type PageReadingGear } from '../pages/Notes/canvasEngine/pageReadingViewportService';
import { getPageFramePhysicalMapping } from '../pages/Notes/canvasEngine/pageFramePrintScaleService';
import { createBindingPageFrameSlots, listPageFrameSlots } from '../pages/Notes/canvasEngine/pageFrameSlotService';
import { createVisualRelationFixture } from './visualRelationsFixture';
import { collectProjectedPage, scanGeometryRelations, type GeometryRelationPage } from './visualRelationsGeometry';

vi.mock('@/services/itemSummaryReader', () => ({ loadItemSummaries: vi.fn(async () => new Map()) }));

const audit: unknown[] = [];
declare const process: { env: Record<string, string | undefined> };
afterEach(cleanup);
afterAll(() => {
  if (!process.env.T8_GEOMETRY_REPORT) return;
  const file = resolve(process.env.T8_GEOMETRY_REPORT);
  mkdirSync(resolve(file, '..'), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ measurement: 'production projected CSS pixel rectangles, not browser layout', scenarios: audit }, null, 2)}\n`);
});

describe('T8 permanent paper geometry relations', () => {
  it.each(['A4', 'Letter'] as const)('%s: every registered citizen against all six binding slots, with and without cover at multiple reading scales', (pageSize) => {
    const failures: unknown[] = [];
    for (const withCover of [false, true]) {
      const data = createVisualRelationFixture(pageSize, withCover);
      const extensions = new Map(data.runtime.pageFrameExtensions.map((entry) => [entry.frameId, entry]));
      const view = render(<NoteTruthBindingProvider value={{ title: 'Relation regression title', description: 'Relation regression description', readOnly: true }}>
        {data.frames.map((frame) => <section key={frame.id} data-relation-page={frame.id}>
          <NoteReadOnlyPageContent frame={frame} slots={extensions.get(frame.id)?.slots} fragments={data.fragments}
            visibleBlocks={data.blocks} blockTextDrafts={{}} blockTextFlowDrafts={{}} blockFieldDrafts={{}}
            anchorsBySourceRef={{}} documentTypography={data.typography} />
        </section>)}
      </NoteTruthBindingProvider>);
      const projectedIds = Array.from(view.container.querySelectorAll<HTMLElement>('[data-note-readonly-fragment]')).map((node) => node.dataset.blockId);
      for (const template of listNoteBlockTemplates()) expect(projectedIds).toContain(`relation-${template.template_id}`);
      for (const gear of ['fit_width', 'fit_page', 'physical'] as PageReadingGear[]) {
        for (const stepFactor of [0.5, 1, 1.5, 2]) {
          const first = data.frames.find((frame) => frame.id === 'relation-body')!;
          const { displayScale } = derivePageReadingViewport({ viewState: { gear, stepFactor },
            availableWidth: 904, availableHeight: 800, paperWidth: first.width, paperHeight: first.height,
            physicalScale: getPageFramePhysicalMapping(pageSize, first.width, first.templateId).physicalScale });
          const pages = data.frames.map((frame) => {
            const content = getPageFrameContentRect(frame);
            return collectProjectedPage(view.container.querySelector<HTMLElement>(`[data-relation-page="${frame.id}"]`)!, frame.id,
              { ...content, x: content.x - frame.x, y: content.y - frame.y }, displayScale);
          });
          const result = scanGeometryRelations(pages);
          for (const page of pages.filter((page) => page.id !== 'relation-cover')) {
            expect(page.slots.map((slot) => slot.id)).toEqual(NOTE_BINDING_SLOT_NAMES);
          }
          if (withCover) expect(pages.find((page) => page.id === 'relation-cover')!.slots).toHaveLength(0);
          audit.push({ pageSize, withCover, gear, stepFactor, displayScale,
            topInset: first.contentInset.top, registeredTemplates: listNoteBlockTemplates().map((item) => item.template_id), ...result });
          if (result.violations.length) failures.push({ withCover, gear, stepFactor, ...result });
        }
      }
      view.unmount();
    }
    expect(failures, JSON.stringify(failures.slice(0, 1), null, 2)).toEqual([]);
  });

  it('reports the citizen and slot for overlap, and both horizontal walls without kind-specific knowledge', () => {
    const page: GeometryRelationPage = { id: 'probe', content: { x: 20, y: 50, width: 100, height: 200 },
      blocks: [{ id: 'future-kind', rect: { x: 10, y: 40, width: 120, height: 20 } }],
      slots: [{ id: 'header-center', rect: { x: 20, y: 20, width: 100, height: 30 } }] };
    expect(scanGeometryRelations([page]).violations).toEqual([
      { relation: 'horizontal-overflow', pageId: 'probe', blockId: 'future-kind', leftOverflow: 10, rightOverflow: 10 },
      { relation: 'intersection', pageId: 'probe', blockId: 'future-kind', slotId: 'header-center', overlapX: 100, overlapY: 10 },
    ]);
    page.blocks[0].rect = { x: 20, y: 50, width: 100, height: 20 };
    expect(scanGeometryRelations([page]).violations).toEqual([]);
  });

  it.each([0, 24])('reserves headers at existing/user-authored top inset %s without rewriting stored walls', (top) => {
    const data = createVisualRelationFixture('A4', false, { persistedTopInset: top });
    const first = data.frames[0];
    expect(first.contentInset.top).toBe(top);
    const projected = data.fragments.filter((fragment) => fragment.pageFrameId === first.id);
    const result = scanGeometryRelations([{ id: first.id, content: getPageFrameContentRect(first),
      blocks: projected.map((fragment) => ({ id: fragment.blockId, rect: fragment.blockRect })),
      slots: listPageFrameSlots(createBindingPageFrameSlots({ pageFrame: first, mechanicalPageNumber: 1, bindingSettings: data.binding }))
        .map((slot) => ({ id: slot.position!, rect: slot.rect })) }]);
    expect(result.violations).toEqual([]);
    expect(projected[0].blockRect.y).toBe(first.y + 48);
  });

  it('reports an authored binding offset that pushes a header into otherwise valid body space', () => {
    const data = createVisualRelationFixture('A4', false);
    const frame = data.frames[0];
    data.binding.sections[0].slots['header-center'].offsetY = frame.contentInset.top;
    const result = scanGeometryRelations([{ id: frame.id, content: getPageFrameContentRect(frame),
      blocks: data.fragments.filter((fragment) => fragment.pageFrameId === frame.id)
        .map((fragment) => ({ id: fragment.blockId, rect: fragment.blockRect })),
      slots: listPageFrameSlots(createBindingPageFrameSlots({ pageFrame: frame, mechanicalPageNumber: 1, bindingSettings: data.binding }))
        .map((slot) => ({ id: slot.position!, rect: slot.rect })) }]);
    expect(result.violations.some((entry) => entry.relation === 'intersection' && entry.slotId === 'header-center')).toBe(true);
  });

  it('does not let a clipped read-only projection conceal a manual block crossing both content walls', () => {
    const view = render(<section><div data-note-readonly-fragment="true" data-block-id="manual"
      style={{ position: 'absolute', left: 20, top: 50, width: 100, height: 20, overflow: 'hidden' }}>
      <div data-note-block-shell="true" style={{ position: 'absolute', left: -10, top: 0, width: 120, minHeight: 20 }} />
    </div></section>);
    const result = scanGeometryRelations([collectProjectedPage(view.container, 'page', { x: 20, y: 50, width: 100, height: 200 })]);
    expect(result.violations).toEqual([{ relation: 'horizontal-overflow', pageId: 'page', blockId: 'manual', leftOverflow: 10, rightOverflow: 10 }]);
  });
});
