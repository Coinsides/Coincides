import { act, cleanup, fireEvent, render } from '@testing-library/react';
// @ts-expect-error Vitest runs in Node; this browser client intentionally has no @types/node dependency.
import { readFileSync } from 'node:fs';
// @ts-expect-error Use Node's file URL conversion without adding a dependency to the client.
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { applyCanvasLayoutsToBlocks } from '../canvasObjectRepository';
import { buildRuntimeBlockPlacement, readStoredLayout } from '../placementService';
import { createPageFrameTemplate } from '../pageFrameTemplateService';
import type { PageReadingGear } from '../pageReadingViewportService';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { BlockPlacementModel, PageFrameModel } from '../types';
import { NotePrintLayer, type NotePrintInput } from './NotePrintLayer';

// Vitest stubs CSS imports (including ?raw) by default; read the real stylesheet.
const printCss = readFileSync(fileURLToPath(import.meta.url).replace(/\.test\.tsx$/, '.css'), 'utf8');

const ROOT = '[data-note-print-root]';
const PAGE = '[data-note-print-page]';
const CANVAS = '[data-note-print-canvas]';

function frame(id: string, overrides: Partial<PageFrameModel> = {}): PageFrameModel {
  return {
    id, role: 'primary_page_frame', templateId: 'a4_portrait', pageSize: 'A4',
    exportable: true, x: 100, y: 200, width: 904, height: 1278,
    contentInset: { left: 72, right: 72, top: 0, bottom: 96 },
    ...overrides,
  };
}

function block(id: string, text: string, kind: 'paragraph' | 'code' | 'formula' = 'paragraph'): NoteBlock {
  return {
    id, placement_id: `placement-${id}`, display_overrides_json: {}, canvas_layout: null,
    block_type: kind === 'formula' ? 'formula' : 'paragraph', title: null,
    content_json: kind === 'formula'
      ? { field_values: { latex_input: 'x^2', formula_name: 'Synthetic formula', explanation: text } }
      : { body: text, ...(kind === 'code' ? { language: 'typescript' } : {}) },
    plain_text: text, metadata: {}, order_index: 0, source_references: [],
  };
}

function placement(blockId: string, overrides: Partial<BlockPlacementModel> = {}): BlockPlacementModel {
  return {
    blockId, placementId: `placement-${blockId}`, objectId: blockId, objectKind: 'note_block',
    canvasId: 'synthetic-canvas', x: 172, y: 230, width: 600, height: 80, rotation: 0,
    surface: 'formal_page', boundaryRole: 'inside', zIndex: 0, snapState: 'free', visibilityState: 'normal',
    ...overrides,
  };
}

function inputFor({
  frames = [frame('first')],
  blocks = [block('text', 'Synthetic print text')],
  placements = blocks.map((item) => placement(item.id)),
}: {
  frames?: PageFrameModel[];
  blocks?: NoteBlock[];
  placements?: BlockPlacementModel[];
} = {}): NotePrintInput {
  const stack = createPageStackFromFrame(frames[0], { id: 'synthetic-stack' });
  stack.frameIds = frames.map((item) => item.id);
  const documentTypographyProfile = createDefaultDocumentTypographyProfile({
    profileId: 'synthetic-user-override', fontSizePx: 19, lineHeightPx: 28, paragraphSpacingPx: 3,
  });
  return {
    noteId: 'synthetic-note', surfaceMode: 'page', visibleBlocks: blocks,
    blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, anchorsBySourceRef: {},
    documentTypographyProfile,
    noteCanvasRuntime: buildNoteCanvasRuntimeModel({
      mode: 'page', primaryPageFrame: frames[0], pageFrames: frames, pageStacks: [stack],
      viewport: { x: 0, y: 0, width: 1024, height: 768, zoom: 1 },
      blockPlacements: placements, documentTypography: documentTypographyProfile,
    }),
  };
}

function printEvent(name: 'beforeprint' | 'afterprint') {
  act(() => window.dispatchEvent(new Event(name)));
}

function pages(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(PAGE));
}

function pageBoxes() {
  return pages().map((page) => {
    const computed = getComputedStyle(page);
    const canvas = page.querySelector<HTMLElement>(CANVAS)!;
    return [computed.width, computed.height, computed.breakAfter, canvas.style.transform];
  });
}

let printMedia: MediaQueryList;
let mediaListeners: Set<EventListenerOrEventListenerObject>;
let sheet: HTMLStyleElement;

function changePrintMedia(matches: boolean) {
  Object.defineProperty(printMedia, 'matches', { configurable: true, value: matches });
  const event = new Event('change') as MediaQueryListEvent;
  Object.defineProperty(event, 'matches', { value: matches });
  act(() => mediaListeners.forEach((listener) => {
    if (typeof listener === 'function') listener(event);
    else listener.handleEvent(event);
  }));
}

beforeEach(() => {
  mediaListeners = new Set();
  printMedia = {
    matches: false, media: 'print', onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => mediaListeners.add(listener),
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => mediaListeners.delete(listener),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => printMedia));
  // Observe real render/measurement code while jsdom supplies no layout engine.
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  sheet = document.createElement('style');
  sheet.textContent = printCss;
  document.head.appendChild(sheet);
});

afterEach(() => {
  cleanup();
  sheet.remove();
  vi.unstubAllGlobals();
});

describe('NotePrintLayer lifecycle and frozen print snapshot', () => {
  it('mounts synchronously for beforeprint, stays absent from screen DOM, and removes a cancelled job', () => {
    const { container, unmount } = render(<NotePrintLayer {...inputFor()} />);
    expect(document.querySelector(ROOT)).toBeNull();
    expect(container.innerHTML).toBe('');
    printEvent('beforeprint');
    const root = document.querySelector<HTMLElement>(ROOT)!;
    expect(root.parentElement).toBe(document.body);
    expect(container.innerHTML).toBe('');
    expect(root.querySelector('article[data-note-block-shell]')).not.toBeNull();
    expect(root.querySelector('textarea')?.value).toBe('Synthetic print text');
    expect(getComputedStyle(root).visibility).toBe('hidden');
    expect(getComputedStyle(root).display).not.toBe('none');
    printEvent('beforeprint');
    expect(document.querySelectorAll(ROOT)).toHaveLength(1);
    printEvent('afterprint');
    expect(document.querySelector(ROOT)).toBeNull();
    printEvent('beforeprint');
    expect(document.querySelectorAll(ROOT)).toHaveLength(1);
    unmount();
    expect(document.querySelector(ROOT)).toBeNull();
    expect(mediaListeners.size).toBe(0);
    printEvent('beforeprint');
    expect(document.querySelector(ROOT)).toBeNull();
  });

  it('supports print media changes, repeated preview jobs, and initial print media', () => {
    const first = render(<NotePrintLayer {...inputFor()} />);
    changePrintMedia(true);
    expect(pages()).toHaveLength(1);
    printEvent('beforeprint');
    expect(document.querySelectorAll(ROOT)).toHaveLength(1);
    changePrintMedia(false);
    expect(document.querySelector(ROOT)).toBeNull();
    changePrintMedia(true);
    expect(pages()).toHaveLength(1);
    first.unmount();
    render(<NotePrintLayer {...inputFor()} />);
    expect(pages()).toHaveLength(1);
    changePrintMedia(false);
    expect(document.querySelector(ROOT)).toBeNull();
  });

  it('never mounts for canvas and clears a page job when leaving and returning to page mode', () => {
    const input = inputFor();
    const { rerender } = render(<NotePrintLayer {...input} surfaceMode="canvas" />);
    printEvent('beforeprint');
    changePrintMedia(true);
    expect(document.querySelector(ROOT)).toBeNull();
    changePrintMedia(false);
    rerender(<NotePrintLayer {...input} />);
    printEvent('beforeprint');
    expect(pages()).toHaveLength(1);
    rerender(<NotePrintLayer {...input} surfaceMode="canvas" />);
    expect(document.querySelector(ROOT)).toBeNull();
    rerender(<NotePrintLayer {...input} />);
    expect(document.querySelector(ROOT)).toBeNull();
    printEvent('beforeprint');
    expect(pages()).toHaveLength(1);
  });

  it('discards a job on note navigation so returning cannot resurrect another snapshot', () => {
    const input = inputFor();
    const { rerender } = render(<NotePrintLayer {...input} />);
    printEvent('beforeprint');
    rerender(<NotePrintLayer {...input} noteId="another-synthetic-note" />);
    expect(document.querySelector(ROOT)).toBeNull();
    rerender(<NotePrintLayer {...input} />);
    expect(document.querySelector(ROOT)).toBeNull();
  });

  it('freezes the current job and takes the latest content only for the next print', () => {
    const input = inputFor();
    const { rerender } = render(<NotePrintLayer {...input} />);
    printEvent('beforeprint');
    rerender(<NotePrintLayer {...input} blockTextDrafts={{ text: 'New synthetic draft' }} />);
    printEvent('beforeprint');
    expect(document.querySelector('textarea')?.value).toBe('Synthetic print text');
    printEvent('afterprint');
    printEvent('beforeprint');
    expect(document.querySelector('textarea')?.value).toBe('New synthetic draft');
  });
});

describe('NotePrintLayer physical pages and fragment projection', () => {
  it('uses independent A4/Letter millimetres, one fixed page per frame, and frozen internal widths', () => {
    const frames = [
      frame('a4'),
      frame('letter', { y: 1558, pageSize: 'Letter', templateId: 'letter_portrait', height: 1170 }),
      frame('grown-a4', { y: 2808, width: 1000, height: 6000 }),
    ];
    render(<NotePrintLayer {...inputFor({ frames })} />);
    printEvent('beforeprint');
    expect(pages()).toHaveLength(3);
    const expected = [
      { width: 793.7007874015749, height: 1122.5196850393702, scale: 0.8779875966831581 },
      { width: 816, height: 1056, scale: 0.9026548672566371 },
      { width: 793.7007874015749, height: 1122.5196850393702, scale: 0.7937007874015749 },
    ];
    pages().forEach((page, index) => {
      const style = getComputedStyle(page);
      expect(Math.abs(parseFloat(style.width) - expected[index].width)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(parseFloat(style.height) - expected[index].height)).toBeLessThanOrEqual(0.5);
      expect(style.overflow).toBe('hidden');
      expect(style.breakInside).toBe('avoid');
      expect(style.breakAfter).toBe(index === 2 ? 'auto' : 'page');
      const canvas = page.querySelector<HTMLElement>(CANVAS)!;
      expect(canvas.style.width).toBe(`${frames[index].width}px`);
      expect(canvas.style.height).toBe(`${frames[index].height}px`);
      expect(Number(page.dataset.printScale)).toBeCloseTo(expected[index].scale, 12);
      expect(canvas.style.transform).toBe(`scale(${expected[index].scale})`);
      expect(Math.abs(frames[index].width * Number(page.dataset.printScale) - expected[index].width)).toBeLessThanOrEqual(0.5);
      // The third sample deliberately has a grown screen height; only the two
      // standard paper presets promise matching internal and physical heights.
      if (index < 2) {
        expect(Math.abs(frames[index].height * Number(page.dataset.printScale) - expected[index].height)).toBeLessThanOrEqual(0.5);
      }
      expect(canvas.style.getPropertyValue('--document-font-size')).toBe('19px');
      expect(canvas.style.getPropertyValue('--document-line-height')).toBe('28px');
      expect(canvas.style.getPropertyValue('--document-paragraph-spacing')).toBe('3px');
    });
    expect(getComputedStyle(pages()[0]).getPropertyValue('page')).toBe('coincides-a4');
    expect(getComputedStyle(pages()[1]).getPropertyValue('page')).toBe('coincides-letter');
  });

  it.each([
    { templateId: 'screen_note' as const, pageSize: 'Letter' as const },
    { templateId: 'custom' as const, pageSize: 'Custom' as const },
  ])('fits $templateId / $pageSize to A4 width with no vertical expansion', ({ templateId, pageSize }) => {
    render(<NotePrintLayer {...inputFor({ frames: [frame('web', { templateId, pageSize, width: 1120, height: 7000 })] })} />);
    printEvent('beforeprint');
    const page = pages()[0];
    const style = getComputedStyle(page);
    expect(page.dataset.paperSize).toBe('A4');
    expect(parseFloat(style.width)).toBeCloseTo(793.7007874015749, 10);
    expect(parseFloat(style.height)).toBeCloseTo(1122.5196850393702, 10);
    expect(Number(page.dataset.printScale)).toBeCloseTo(0.7086614173228347, 12);
    expect(Math.abs(1120 * Number(page.dataset.printScale) - parseFloat(style.width))).toBeLessThanOrEqual(0.5);
    expect(page.querySelector<HTMLElement>(CANVAS)!.style.height).toBe('7000px');
    expect(style.overflow).toBe('hidden');
    expect(pages()).toHaveLength(1);
  });

  it('does not allow reading gear, step, viewport zoom or screen content height into print geometry', () => {
    const input = inputFor();
    const renderInput = (gear: PageReadingGear, stepFactor: number) => ({
      ...input, pageReadingViewState: { gear, stepFactor }, pageContentHeight: 8000 * stepFactor,
      noteCanvasRuntime: { ...input.noteCanvasRuntime, viewport: { ...input.noteCanvasRuntime.viewport, zoom: stepFactor } },
    });
    const { rerender } = render(<NotePrintLayer {...renderInput('fit_width', 0.5)} />);
    printEvent('beforeprint');
    const baseline = pageBoxes();
    for (const [gear, stepFactor] of [['fit_page', 1.5], ['physical', 2]] as const) {
      printEvent('afterprint');
      rerender(<NotePrintLayer {...renderInput(gear, stepFactor)} />);
      printEvent('beforeprint');
      expect(pageBoxes()).toEqual(baseline);
      expect(document.querySelector(`${ROOT} [data-page-reading-step]`)).toBeNull();
      expect(document.querySelector(`${ROOT} [data-page-display-scale]`)).toBeNull();
    }
  });

  it.each(['a4_portrait', 'letter_portrait', 'screen_note'] as const)(
    'prints hydrated v2 %s frame-local rows on their own pages without losing the leading characters',
    (templateId) => {
      const template = createPageFrameTemplate(templateId);
      const frames = [0, 1].map((index) => frame(`v2-frame-${index + 1}`, {
        ...template, role: index === 0 ? 'primary_page_frame' : 'secondary_page_frame',
        x: 100, y: 200 + index * (template.height + 80),
      }));
      const width = template.width - template.contentInset.left - template.contentInset.right;
      const blocks = [
        block('first-label', 'PAGE ONE — first character must remain P'),
        block('second-label', 'PAGE TWO — first character must remain P'),
        block('crossing-v2', 'CROSS FRAME — first character must remain C', 'code'),
      ];
      const localLayouts: BlockBoxLayout[] = blocks.map((_item, index) => ({
        x: 0, y: index === 2 ? template.height - template.contentInset.top - 260 : 40,
        width, height: index === 2 ? 680 : 120,
        coordinate_space: 'page_frame_local', frame_id: frames[index === 1 ? 1 : 0].id,
        surface: 'formal_page', boundary_role: 'inside',
      }));
      const storedBefore = JSON.stringify(localLayouts);
      const stack = createPageStackFromFrame(frames[0], { id: 'v2-print-stack' });
      stack.frameIds = frames.map((item) => item.id);
      const hydrated = applyCanvasLayoutsToBlocks(blocks, localLayouts.map((layout, index) => ({
        block_id: blocks[index].id, placement_id: blocks[index].placement_id!, layout: { ...layout },
      })), {
        coordinateContract: 'v2',
        pageFrameCollection: { pageFrames: frames, pageStacks: [stack], primaryFrameId: frames[0].id, primaryStackId: stack.id },
      });
      const placements = hydrated.map((item, index) => buildRuntimeBlockPlacement({
        block: item, canvasId: 'v2-print-canvas', layout: readStoredLayout(item) as BlockBoxLayout,
        pageOffsetX: 0, pageFrame: frames[0], pageFrames: frames, contract: 'v2', zIndex: index,
      }));
      placements.forEach((item, index) => {
        const owner = frames[index === 1 ? 1 : 0];
        expect(item.x).toBe(owner.x + owner.contentInset.left);
        expect(item.y).toBe(owner.y + owner.contentInset.top + localLayouts[index].y);
      });
      const input = inputFor({ frames, blocks: hydrated, placements });
      const fragments = input.noteCanvasRuntime.blockFragmentProjections;
      expect(fragments.filter((item) => item.blockId === 'first-label').map((item) => item.pageFrameId)).toEqual([frames[0].id]);
      expect(fragments.filter((item) => item.blockId === 'second-label').map((item) => item.pageFrameId)).toEqual([frames[1].id]);
      expect(fragments.filter((item) => item.blockId === 'crossing-v2').map((item) => item.pageFrameId)).toEqual(frames.map((item) => item.id));
      render(<NotePrintLayer {...input} />);
      printEvent('beforeprint');
      expect(pages()).toHaveLength(frames.length);
      pages().forEach((page, index) => {
        const labelId = index === 0 ? 'first-label' : 'second-label';
        const otherLabelId = index === 0 ? 'second-label' : 'first-label';
        const clip = page.querySelector<HTMLElement>(`[data-note-print-fragment][data-block-id="${labelId}"]`)!;
        const article = clip.querySelector<HTMLElement>('article[data-note-block-shell]')!;
        expect(page.dataset.pageFrameId).toBe(frames[index].id);
        expect(page.querySelector(`[data-note-print-fragment][data-block-id="${otherLabelId}"]`)).toBeNull();
        expect(clip.style.left).toBe(`${template.contentInset.left}px`);
        expect(clip.style.top).toBe(`${template.contentInset.top + 40}px`);
        expect(clip.style.width).toBe(`${width}px`);
        // jsdom cannot measure glyphs. These committed DOM values establish that
        // the complete text begins at the clip origin, rather than 72px outside.
        expect(article.style.left).toBe('0px');
        expect(article.style.top).toBe('0px');
        expect(article.querySelector('textarea')?.value).toBe(blocks[index].plain_text);
        const crossing = page.querySelector<HTMLElement>('[data-note-print-fragment][data-block-id="crossing-v2"]')!;
        const crossingArticle = crossing.querySelector<HTMLElement>('article[data-note-block-shell]')!;
        expect(crossing.style.left).toBe(`${template.contentInset.left}px`);
        expect(crossing.style.top).toBe(`${index === 0 ? template.height - 260 : template.contentInset.top}px`);
        expect(crossing.style.height).toBe(`${index === 0 ? 260 - template.contentInset.bottom : 340 - template.contentInset.top}px`);
        expect(crossingArticle.style.left).toBe('0px');
        expect(crossingArticle.style.top).toBe(`${index === 0 ? 0 : -(340 + template.contentInset.top)}px`);
        expect(crossingArticle.querySelector('textarea')?.value).toBe(blocks[2].plain_text);
      });
      expect(JSON.stringify(localLayouts)).toBe(storedBefore);
    },
  );

  it('repositions real world-space fragments independently and honors the supplied page-visible block set', () => {
    const crossing = block('crossing', 'Cross-page synthetic text');
    const excluded = block('not-page-visible', 'Must not print');
    const input = inputFor({
      frames: [frame('first'), frame('second', { y: 1558, role: 'secondary_page_frame' })],
      blocks: [crossing],
      placements: [placement(crossing.id, { x: 150, y: 1300, width: 820, height: 420 }), placement(excluded.id)],
    });
    expect(input.noteCanvasRuntime.blockFragmentProjections.filter((item) => item.blockId === crossing.id)).toHaveLength(2);
    expect(input.noteCanvasRuntime.blockFragmentProjections.some((item) => item.blockId === excluded.id)).toBe(true);
    render(<NotePrintLayer {...input} />);
    printEvent('beforeprint');
    const expected = [
      { left: '72px', top: '1100px', height: '82px', blockTop: '0px' },
      { left: '72px', top: '0px', height: '162px', blockTop: '-258px' },
    ];
    pages().forEach((page, index) => {
      const clip = page.querySelector<HTMLElement>('[data-note-print-fragment]')!;
      const article = clip.querySelector<HTMLElement>('article[data-note-block-shell]')!;
      expect(clip.dataset.blockId).toBe(crossing.id);
      expect(clip.style.left).toBe(expected[index].left);
      expect(clip.style.top).toBe(expected[index].top);
      expect(clip.style.width).toBe('760px');
      expect(clip.style.height).toBe(expected[index].height);
      expect(getComputedStyle(clip).overflow).toBe('hidden');
      expect(article.style.left).toBe('-22px');
      expect(article.style.top).toBe(expected[index].blockTop);
      expect(article.style.width).toBe('820px');
      expect(article.style.minHeight).toBe('420px');
    });
    expect(document.querySelectorAll('[data-note-print-fragment]')).toHaveLength(2);
    expect(document.querySelector('[data-block-id="not-page-visible"]')).toBeNull();
    expect(document.querySelector('[data-cross-page-continuation-marker]')).toBeNull();
  });

  it('reuses text, code and formula renderers read-only, preserves draft values, and never calls parent writers', () => {
    const text = block('text', 'Saved text');
    const code = block('code', 'const saved = true;', 'code');
    const formula = block('formula', 'Synthetic explanation', 'formula');
    const input = inputFor({
      blocks: [text, code, formula],
      placements: [placement(text.id), placement(code.id, { y: 400 }), placement(formula.id, { y: 600 })],
    });
    const callbacks = {
      onSaveBlock: vi.fn(), onBlockTextChange: vi.fn(), onBlockTextFlowChange: vi.fn(),
      onFieldDraftChange: vi.fn(), onMeasuredBlockHeight: vi.fn(), onTrashBlock: vi.fn(), onViewSource: vi.fn(),
    };
    const before = JSON.stringify(input);
    render(<NotePrintLayer {...input} {...callbacks} blockTextDrafts={{ text: 'Unsaved print text', code: 'const draft = true;' }} />);
    printEvent('beforeprint');
    const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>(`${ROOT} textarea`));
    expect(textareas.map((textarea) => textarea.value)).toEqual(['Unsaved print text', 'const draft = true;']);
    expect(textareas.every((textarea) => textarea.readOnly)).toBe(true);
    expect(document.querySelector(`${ROOT} .katex`)).not.toBeNull();
    expect(document.querySelector(ROOT)!.textContent).toContain('Synthetic explanation');
    textareas.forEach((textarea) => {
      fireEvent.focus(textarea);
      fireEvent.change(textarea, { target: { value: 'Attempted edit' } });
      fireEvent.blur(textarea);
    });
    printEvent('afterprint');
    expect(JSON.stringify(input)).toBe(before);
    Object.values(callbacks).forEach((callback) => expect(callback).not.toHaveBeenCalled());
  });

  it('declares print-only chrome isolation and named physical pages in the real stylesheet', () => {
    // jsdom does not apply print media or paginate. Inspect those CSSOM rules only;
    // real-browser print computed styles are covered by the separate smoke path.
    const media = Array.from(sheet.sheet!.cssRules).find((rule) => (
      rule.type === CSSRule.MEDIA_RULE && (rule as CSSMediaRule).conditionText === 'print'
    )) as CSSMediaRule;
    expect(media).toBeDefined();
    const rules = Array.from(media.cssRules);
    for (const [name, size] of [['coincides-a4', 'A4 portrait'], ['coincides-letter', 'Letter portrait']]) {
      const rule = rules.find((item) => item.cssText.startsWith(`@page ${name}`))!;
      expect(rule.cssText).toContain(`size: ${size};`);
      expect(rule.cssText).toContain('margin: 0;');
    }
    const chrome = rules.find((rule) => (rule as CSSStyleRule).selectorText === 'body:has(> [data-note-print-root]) > :not([data-note-print-root])') as CSSStyleRule;
    expect(chrome.style.display).not.toBe('none');
    expect(chrome.style.position).toBe('fixed');
    expect(chrome.style.visibility).toBe('hidden');
    expect(chrome.style.getPropertyPriority('position')).toBe('important');
    expect(chrome.style.getPropertyPriority('visibility')).toBe('important');
    const descendants = rules.find((rule) => (rule as CSSStyleRule).selectorText === 'body:has(> [data-note-print-root]) > :not([data-note-print-root]) *') as CSSStyleRule;
    expect(descendants.style.visibility).toBe('hidden');
    expect(descendants.style.getPropertyPriority('visibility')).toBe('important');
    const root = rules.find((rule) => (rule as CSSStyleRule).selectorText === ROOT) as CSSStyleRule;
    expect(root.style.visibility).toBe('visible');
    expect(root.style.position).toBe('static');
  });
});
