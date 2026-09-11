import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PaperInkSvg } from '../../../client/src/pages/Notes/canvasEngine/layers/PaperInkSvg';
import { hitTestPaperInk } from '../../../client/src/pages/Notes/canvasEngine/freehandService';
import type { CanvasObject, CanvasPlacement, PageFrameModel } from '../../../client/src/pages/Notes/canvasEngine/types';

const frame: PageFrameModel = { id: 'synthetic-e3-frame', x: 0, y: 0, width: 320, height: 240,
  contentInset: { left: 0, right: 0, top: 0, bottom: 0 }, role: 'primary_page_frame', exportable: true };
const shapes = [
  { name: 'thin-line', path: 'M 20 40 L 220 40', rotation: 0 },
  { name: 'path-only-curve', path: 'M 20 80 C 70 10 170 150 220 80', rotation: 0 },
  { name: 'rotated-line', path: 'M 20 80 L 220 80', rotation: 25 },
  { name: 'tap', path: 'M 100 100 l 0.01 0', rotation: 0 },
];
const cases = [0.5, 1, 2].flatMap(scale => shapes.map(shape => ({ ...shape, scale, id: `${shape.name}-${scale}` })));
function App() {
  const [results, setResults] = useState<unknown[]>([]);
  useEffect(() => { requestAnimationFrame(() => {
    setResults(cases.map(spec => {
      const host = document.getElementById(spec.id)!;
      const path = host.querySelector<SVGPathElement>('[data-paper-ink-hit]')!;
      const matrix = path.getScreenCTM()!;
      const length = path.getTotalLength();
      const local = path.getPointAtLength(length / 2);
      const a = path.getPointAtLength(Math.max(0, length / 2 - 0.005));
      const b = path.getPointAtLength(Math.min(length, length / 2 + 0.005));
      const start = new DOMPoint(a.x, a.y).matrixTransform(matrix);
      const end = new DOMPoint(b.x, b.y).matrixTransform(matrix);
      const center = new DOMPoint(local.x, local.y).matrixTransform(matrix);
      const lengthScreen = Math.hypot(end.x - start.x, end.y - start.y);
      const normal = { x: -(end.y - start.y) / lengthScreen, y: (end.x - start.x) / lengthScreen };
      const samples = [0, 7, 7.9, 8.1, 9, 12].map(offset => ({ offset,
        hit: hitTestPaperInk(host, { clientX: center.x + offset * normal.x, clientY: center.y + offset * normal.y }) === spec.id,
        expected: offset < 8,
      }));
      return { id: spec.id, scale: spec.scale, samples, pass: samples.every(s => s.hit === s.expected) };
    }));
  }); }, []);
  return <><h1>E3 native SVG hit tolerance</h1><pre id="results">{JSON.stringify(results, null, 2)}</pre>
    {cases.map(spec => {
      const object: CanvasObject = { objectId: spec.id, canvasId: 'fixture', kind: 'freehand', backing: 'none',
        objectClass: 'pure', status: 'active', metadata: { freehand: { path: spec.path, style: { width: 1 } } } };
      const placement: CanvasPlacement = { placementId: `${spec.id}-placement`, objectId: spec.id, canvasId: 'fixture',
        frameId: frame.id, surface: 'formal_page', boundaryRole: 'inside', x: 0, y: 0,
        width: 240, height: 160, rotation: spec.rotation, zIndex: 1 };
      return <div key={spec.id} style={{ height: frame.height * spec.scale + 24 }}><div id={spec.id}
        style={{ position: 'relative', width: frame.width, height: frame.height, transform: `scale(${spec.scale})`, transformOrigin: 'top left' }}>
        <PaperInkSvg frame={frame} objects={[object]} placements={[placement]} hitTest selectedObjectId={spec.id} />
      </div></div>;
    })}</>;
}
createRoot(document.getElementById('root')!).render(<App />);
