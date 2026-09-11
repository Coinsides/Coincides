import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TextBlockProjection } from '../../../client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection';
import { createTextBlockContentV1 } from '../../../client/src/pages/Notes/canvasEngine/textFlowService';
import type { AnnotationTruthV1 } from '../../../client/src/pages/Notes/canvasEngine/runtimeDataTypes';
import '../../../client/src/styles/global.css';

const noOp = () => {};
const annotationSnapshots = new Map<AnnotationTruthV1, string>();
const specs = [
  { id: 'above', top: 55, text: 'Alpha highlighted words and plain body text.', start: 6, end: 23 },
  { id: 'paper-top', top: -16, text: 'Highlighted at the paper top.', start: 0, end: 11 },
  { id: 'multiple', top: 55, text: 'Three overlapping ranges with separate stamps.', start: 6, end: 24, multi: true },
  { id: 'adjacent', top: 55, text: 'Adjacent block ranges share one page.', start: 0, end: 21, adjacent: true },
  { id: 'wrapped', top: 55, text: 'A multiline highlighted passage wraps across several visual lines, and every line must remain readable.', start: 2, end: 82, narrow: true },
  { id: 'scaled', top: 55, text: 'Scaled paper keeps labels clear of every glyph.', start: 0, end: 24, scale: 0.65 },
];
function Editor({ spec, suffix = '', top }: { spec: typeof specs[number]; suffix?: string; top?: number }) {
  const id = spec.id + suffix;
  const flow = React.useMemo(() => createTextBlockContentV1(spec.text), []);
  const marks = React.useMemo(() => Array.from({ length: spec.multi ? 3 : 1 }, (_, index): AnnotationTruthV1 => ({
    id: id + index, note_id: 'synthetic', canvas_id: 'synthetic', raw_label: `${id} label ${index + 1}`,
    ranges: [{ id: 'range-' + id + index, target_kind: 'text_span', block_id: id, text_unit_id: flow.units[0].id,
      start_offset: spec.start, end_offset: spec.end }], parent_annotation_id: index === 2 ? id + '0' : null,
    child_annotation_ids: index === 0 && spec.multi ? [id + '2'] : [],
    visual_style: { color_token: 'yellow', marker_kind: 'highlight' }, created_by: 'user', status: 'active',
    created_at: '2026-09-11T00:00:00Z', updated_at: '2026-09-11T00:00:00Z',
  })), []);
  useEffect(() => { marks.forEach(mark => annotationSnapshots.set(mark, JSON.stringify(mark))); }, []);
  return <div style={{ position: 'absolute', left: suffix ? 240 : 42, top: top ?? spec.top, width: spec.narrow ? 220 : spec.adjacent ? 210 : 390 }}>
    <TextBlockProjection blockId={id} text={spec.text} textFlow={flow} annotations={marks}
      presentationKind="paragraph" readOnly={false} selectedAnnotationIds={[]} showLabelOverlay
      textareaRef={null} onFocused={noOp} onAnnotationSelect={noOp} onAnnotationContextMenu={noOp}
      onTextUnitSelection={noOp} onTextUnitContextMenu={noOp} onTextChange={noOp} onTextFlowChange={noOp}
      onSave={async () => ({ status: 'saved' } as never)} onKeyDown={noOp} />
  </div>;
}

function inspect() {
  const overlap = (a: DOMRect, b: {left:number;top:number;width:number;height:number}) =>
    a.left < b.left + b.width - 0.01 && a.right > b.left + 0.01 && a.top < b.top + b.height - 0.01 && a.bottom > b.top + 0.01;
  return specs.map((spec) => {
    const scope = document.querySelector<HTMLElement>(`[data-case="${spec.id}"]`)!;
    const stamps = [...scope.querySelectorAll<HTMLElement>('[data-annotation-stamp]')];
    // Independent oracle: every UTF-16 character of the painted body layer,
    // measured with native DOM Range, without the production obstacle collector.
    const texts: DOMRect[] = [];
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('[data-annotation-stamp],textarea')) continue;
      for (let index = 0; index < (node.textContent?.length || 0); index++) {
        range.setStart(node,index); range.setEnd(node,index+1);
        texts.push(...range.getClientRects());
      }
    }
    const frame = scope.querySelector('[data-paper-ink-layer]')!.getBoundingClientRect();
    const rects = stamps.map((stamp) => stamp.getBoundingClientRect());
    const hidden = stamps.filter((stamp) => getComputedStyle(stamp).visibility === 'hidden').length;
    const textOverlaps = rects.flatMap((rect) => texts.filter((text) => overlap(rect, text))).length;
    const stampOverlaps = rects.flatMap((rect, index) => rects.slice(index + 1).filter((other) => overlap(rect, other))).length;
    const outOfFrame = rects.filter((rect) => rect.left < frame.left || rect.top < frame.top || rect.right > frame.right || rect.bottom > frame.bottom).length;
    const annotationDataUnchanged = [...annotationSnapshots].every(([mark, snapshot]) => JSON.stringify(mark) === snapshot);
    const expectedSide = spec.id === 'above' ? 'top' : spec.id === 'paper-top' ? 'bottom' : null;
    const sides = stamps.map((stamp) => stamp.dataset.stampSide);
    return { scenario: spec.id, stamps: stamps.length, bodyRects: texts.length, textComparisons: stamps.length * texts.length, peerComparisons: stamps.length * (stamps.length - 1) / 2, annotationDataUnchanged, hidden, textOverlaps, stampOverlaps, outOfFrame, sides,
      pass: annotationDataUnchanged && !hidden && !textOverlaps && !stampOverlaps && !outOfFrame && (!expectedSide || sides[0] === expectedSide) };
  });
}
function Fixture() {
  const [report, setReport] = useState<unknown>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => { const timer = setTimeout(() => setReport(inspect()), 700); return () => clearTimeout(timer); }, [zoom]);
  return <main style={{ padding: 24, fontFamily: 'Arial', background: '#eee', color: '#202020', '--text-primary': '#202020', '--text-secondary': '#404040', '--text-muted': '#777', '--bg-primary': '#fff', '--document-font-size': '15px' } as React.CSSProperties}>
    <h1>E2: real renderer, synthetic content</h1>
    <button onClick={() => setReport(inspect())}>Recheck DOM</button>
    <button onClick={() => setZoom(zoom === 1 ? 0.8 : 1)}>Change scale</button>
    <details><summary>DOM assertion report</summary><pre id="e2-report">{JSON.stringify(report, null, 2)}</pre></details>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 520px)', gap: 24 }}>
      {specs.map((spec) => <article key={spec.id}><h2>{spec.id}</h2>
        <div data-page-display-scale={(spec.scale || 1) * zoom} style={{ transform: `scale(${(spec.scale || 1) * zoom})`, transformOrigin: '0 0' }}>
          <section data-annotation-stamp-scope data-case={spec.id} style={{ position: 'relative', width: 500, height: 245, background: 'white', outline: '1px solid #bbb' }}>
            <div data-paper-ink-layer={spec.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
            <Editor spec={spec} />
            {spec.adjacent && <Editor spec={spec} suffix="-neighbor" top={55} />}
          </section>
        </div>
      </article>)}
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
