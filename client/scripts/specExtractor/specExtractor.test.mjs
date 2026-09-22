import { describe, it, expect } from 'vitest';
import { extractSpec } from './extract.mjs';
import { renderReport } from './report.mjs';

describe('spec extractor declaration contract', () => {
  it('extracts a small fixture with cascade, inheritance, scale, snapping and honest unmeasured values', () => {
    const html = `<style>
      :root { --body: 16px; --ink: #123456; }
      body { font-family: "Example Serif", serif; font-size: 16px; line-height: 1.8; color: var(--ink); }
      .page { width: 450px; padding: 12px; --local-gap: 20px; gap: var(--local-gap); }
      .page p { font-size: var(--body); line-height: 2; letter-spacing: .1em; }
      p { font-size: 10px; }
      h1 { font-size: 2em; font-weight: 700; line-height: 1.25; }
      .page-head, .page-foot { font-size: 10px; line-height: normal; }
      table { font-size: .8em; } td { line-height: 150%; padding: 4px 8px; }
      .forced { font-size: 18px !important; }
      @media (max-width: 720px) { .page { width: 300px; } }
    </style><style media="print">.page{width:250px}</style><main class="page"><div class="page-head">Header</div>
      <h1>Title</h1><p>Body <span>inherited</span></p><p>Second body</p>
      <p class="forced" style="font-size:20px">Important wins</p>
      <table><caption>Caption</caption><tbody><tr><th>Key</th><td>Value</td></tr></tbody></table>
      <blockquote>Quote</blockquote><aside><p>Callout</p></aside><div class="page-foot"></div>
    </main>`;
    const point = (id, value) => ({ id, value, source: 'synthetic grid' });
    const product = { paperWidthPx: 900, sources: [], grids: {
      fontSizePx: [point('type.body', 30), point('type.title', 64)],
      lineHeightRatio: [point('line.body', 1.8)],
      letterSpacingEm: [point('tracking', .1)], fontWeight: [point('regular', 400), point('bold', 700)],
      fontFamily: [point('bodyFont', '"Example Serif", serif')],
      spacingPx: [point('space.20', 20)], color: [point('ink', '#123456')],
      tableBodyRatio: [point('table', .85)],
    }, comparisons: [{ id: 'body.font', role: 'body', metric: 'fontSizePx', value: 30, normalized: 30 }] };
    const report = extractSpec(html, { product });
    const metric = (role, name) => report.roles.find(item => item.role === role).metrics[name];
    expect(report.schemaVersion).toBe('spec-extractor.v1');
    expect(report.normalization).toMatchObject({ specimenWidthPx: 450, factor: 2, targetWidthPx: 900 });
    expect(metric('body', 'fontSizePx')[0]).toMatchObject({ resolved: 16, normalized: 32, nearest: { id: 'type.body' }, distance: 2, rootFrequency: 2 });
    expect(metric('body', 'fontSizePx').find(item => item.resolved === 18)).toBeDefined();
    expect(metric('body', 'lineHeightRatio')[0].normalized).toBe(2);
    expect(metric('heading-1', 'fontSizePx')[0].normalized).toBe(64);
    expect(metric('body', 'fontFamily')[0].distance).toBe(0);
    expect(metric('folio-footer', 'lineHeightRatio')[0]).toMatchObject({ normalized: null, nearest: null, distance: null });
    expect(metric('table-cell', 'fontSizePx')[0].resolved).toBe(12.8);
    expect(metric('table-cell', 'lineHeightRatio')[0].normalized).toBe(1.5);
    expect(report.tableBodyRatios.find(item => item.role === 'table-cell')).toMatchObject({ normalized: .8, distance: .05 });
    expect(report.palette.find(item => item.raw === 'rgb(18, 52, 86)')).toMatchObject({ nearest: { id: 'ink' }, distance: 0 });
    expect(report.spacing.find(item => item.raw === '12px')).toMatchObject({ normalized: 24, distance: 4 });
    expect(report.spacing.find(item => item.raw === 'var(--local-gap)')).toMatchObject({ normalized: null, distance: null });
    expect(report.comparisons[0]).toMatchObject({ specimenValue: 32, delta: 2 });
    expect(report.roles.find(item => item.role === 'callout').count).toBeGreaterThan(0);
    expect(report.layoutUnmeasured.length).toBeGreaterThan(0);
    expect(report.environment.scriptsExecuted).toBe(false);
    expect(report.declarations.excludedRules.some(item => item.reason === 'inactive scenario')).toBe(true);
    expect(report.diagnostics).toEqual([]);
    const markdown = renderReport(report);
    expect(markdown).toContain('级联量');
    expect(markdown).toContain('布局量');
    expect(markdown).toContain('body.font');
    const unresolved = extractSpec('<style>main{width:1000px}.page{width:500px;font-size:calc(10px + 1vw)}</style><main><div class="page"><p>Text <em>inline</em></p></div></main>', { product });
    expect(unresolved.normalization.specimenWidthPx).toBe(500);
    expect(unresolved.roles.find(item => item.role === 'body').metrics.fontSizePx[0]).toMatchObject({ normalized: null, distance: null });
    const shorthand = extractSpec('<style>.page{width:450px}p{font-size:18px;line-height:2;font:12px/1.5 serif}</style><div class="page"><p>Text</p></div>', { product });
    expect(shorthand.roles.find(item => item.role === 'body').metrics.lineHeightRatio[0]).toMatchObject({ raw: '12px/1.5 serif', normalized: 1.5 });
    const invalid = extractSpec('<style>.page{width:450px;font-size:20px}.page p{font-size:var(--missing)}p{font-size:30px}</style><div class="page"><p>Text</p></div>', { product });
    expect(invalid.roles.find(item => item.role === 'body').metrics.fontSizePx[0].resolved).toBe(20);
  });
});
