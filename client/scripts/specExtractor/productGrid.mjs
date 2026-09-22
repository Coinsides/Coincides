import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ENGINE = 'client/src/pages/Notes/canvasEngine/';
const NORMALIZED_PAPER_WIDTH = 900;

/** Read current factory defaults only. Never import app startup, touch a user DB,
 * or execute specimen scripts. Selected declarations come from trusted product
 * source; their small dependency set is supplied explicitly, without disk output.
 */
export async function loadProductGrid() {
  const sources = new Map();
  function read(path) {
    const bytes = readFileSync(resolve(ROOT, path));
    sources.set(path, { path, sha256: createHash('sha256').update(bytes).digest('hex') });
    return bytes.toString('utf8');
  }
  function declarations(path, bindings = {}, names) {
    const source = read(path);
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    const statements = ast.statements.filter((statement) => {
      if (!ts.isVariableStatement(statement) && !ts.isFunctionDeclaration(statement)) return false;
      if (!names) return true;
      const identifiers = ts.isFunctionDeclaration(statement)
        ? [statement.name?.text]
        : statement.declarationList.declarations.map((declaration) => declaration.name.getText(ast));
      return identifiers.some((name) => names.includes(name));
    });
    const selected = statements.map((statement) => statement.getText(ast)).join('\n');
    const compiled = ts.transpileModule(selected, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    }, fileName: path, reportDiagnostics: true });
    const errors = compiled.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error);
    if (errors?.length) throw new Error(`Cannot read product declarations: ${path}`);
    const exports = {};
    // This is not a general TS loader: imports and executable top-level statements
    // have been removed, and each selected file is fixed by this module.
    new Function('exports', ...Object.keys(bindings), compiled.outputText)(exports, ...Object.values(bindings));
    return exports;
  }
  function rule(path, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const matches = [...read(path).matchAll(new RegExp(`(?:^|})\\s*${escaped}\\s*\\{([^{}]*)}`, 'g'))];
    if (matches.length !== 1) throw new Error(`Expected one current CSS rule ${path} ${selector}; found ${matches.length}`);
    return Object.fromEntries(matches[0][1].split(';').filter((part) => part.includes(':')).map((part) => {
      const index = part.indexOf(':');
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()];
    }));
  }
  function number(value, unit = '', context = '') {
    const match = String(value).match(new RegExp(`^(-?(?:\\d+(?:\\.\\d*)?|\\.\\d+))${unit}$`));
    if (!match) throw new Error(`Unsupported current product value ${context}: ${value}`);
    return Number(match[1]);
  }
  function calcRatio(value, variable) {
    const match = value?.match(new RegExp(`^calc\\(var\\(${variable},\\s*[\\d.]+px\\)\\s*\\*\\s*([\\d.]+)\\)$`));
    if (!match) throw new Error(`Unsupported current table ratio: ${value}`);
    return Number(match[1]);
  }

  const typographyPath = `${ENGINE}typographyProfileService.ts`;
  const profile = declarations(typographyPath);
  const geometryPath = 'shared/types/pageGeometry.ts';
  const geometry = declarations(geometryPath);
  const printPath = `${ENGINE}pageFramePrintScaleService.ts`;
  const print = declarations(printPath, { ...geometry, ...profile });
  const paperProfilePath = `${ENGINE}pageFrameTypographyService.ts`;
  const paper = declarations(paperProfilePath, { ...print, ...profile });
  const headingPath = `${ENGINE}headingRoleService.ts`;
  const headings = declarations(headingPath, {}, ['headingLevelForRole']);
  const metricsPath = `${ENGINE}typographyMeasurementService.ts`;
  const metrics = declarations(metricsPath, { ...profile, ...headings });
  const skinPath = 'client/src/styles/skinPresets.ts';
  const skins = declarations(skinPath);
  const componentPath = 'client/src/styles/skinComponentStyles.ts';
  const components = declarations(componentPath);

  const paperPreset = print.createPageFramePrintProfile('A4');
  const paperWidthPx = paperPreset.width;
  if (!(paperWidthPx > 0)) throw new Error('Product paper width must be positive');
  const normalize = (value) => value / paperWidthPx * NORMALIZED_PAPER_WIDTH;
  const paperProfile = paper.createPageFrameDefaultTypographyProfile({ ...paperPreset, templateId: 'a4_portrait' });
  const grids = Object.fromEntries(['fontSizePx', 'lineHeightRatio', 'letterSpacingEm', 'fontWeight',
    'fontFamily', 'spacingPx', 'color', 'tableBodyRatio'].map((key) => [key, []]));
  const comparisons = [];
  function point(metric, id, value, source, extra = {}) {
    const rawValue = value;
    if (metric === 'fontSizePx' || metric === 'spacingPx') value = normalize(value);
    const item = { id, value, source, ...extra };
    if (metric === 'fontSizePx' || metric === 'spacingPx') Object.assign(item, { rawValue, rawUnit: 'product-layout-px' });
    grids[metric].push(item);
    return item;
  }
  function comparison(role, metric, rawValue, source, variant = 'default', extra = {}) {
    const id = `${role}.${variant}.${metric}`;
    const item = point(metric, id, rawValue, source, extra);
    comparisons.push({ ...item, value: rawValue, normalized: item.value, role, metric,
      unit: metric === 'fontSizePx' ? 'product-layout-px' : metric === 'fontFamily' ? 'stack'
        : metric === 'letterSpacingEm' ? 'em' : metric === 'fontWeight' ? 'weight' : 'ratio' });
  }
  const currentBody = metrics.typographyTextMetrics({ text: '', width: paperPreset.contentWidth, typography: paperProfile });
  const zeroSpacing = metrics.typographyTextCssProperties(currentBody).letterSpacing;
  if (zeroSpacing !== 'normal') throw new Error(`Unsupported product body letter spacing: ${zeroSpacing}`);
  const furniturePath = `${ENGINE}paragraphFurniture.ts`;
  const blockRendererPath = `${ENGINE}layers/BlockEditorLayer.tsx`;
  read(furniturePath);
  read(blockRendererPath);
  for (const [role, writingRole] of [['body', 'paragraph'], ['heading-1', 'heading_1'],
    ['heading-2', 'heading_2'], ['heading-3', 'heading_3'], ['quote', 'quote'], ['callout', 'paragraph']]) {
    const current = metrics.typographyTextMetrics({ text: '', width: paperPreset.contentWidth,
      typography: paperProfile, writingRole });
    for (const [metric, value] of Object.entries({ fontSizePx: current.fontSizePx,
      lineHeightRatio: current.lineHeightPx / current.fontSizePx,
      fontFamily: current.fontFamily, fontWeight: current.fontWeight, letterSpacingEm: 0 })) {
      const source = `${metricsPath}#typographyTextMetrics + ${paperProfilePath}#createPageFrameDefaultTypographyProfile`;
      comparison(role, metric, value, role === 'callout' ? `${source} + ${blockRendererPath}#TextProjection` : source,
        'default', role === 'callout' ? { note: 'Callout furniture decorates an unchanged paragraph; this is its paragraph body only, not its label. There is no callout TextUnitWritingRole.' }
          : role === 'quote' ? { note: 'Quote TextUnit body metrics; excludes furniture stamp and source attribution.' } : {});
    }
  }
  for (const option of profile.DOCUMENT_FONT_FAMILY_OPTIONS) {
    point('fontFamily', `document-family.${option.id}`, option.value, `${typographyPath}#DOCUMENT_FONT_FAMILY_OPTIONS`);
  }
  // Include the baseline and web factory as named alternatives, not the active A4 profile.
  for (const alternative of [profile.DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    paper.createPageFrameDefaultTypographyProfile({ templateId: 'screen_note', pageSize: 'Custom' })]) {
    point('fontSizePx', `${alternative.profileId}.fontSizePx`, alternative.fontSizePx, `${typographyPath} + ${paperProfilePath}`);
    point('lineHeightRatio', `${alternative.profileId}.lineHeightRatio`, alternative.lineHeightPx / alternative.fontSizePx,
      `${typographyPath} + ${paperProfilePath}`);
  }

  const tablePath = `${ENGINE}blocks/TableBlockProjection.module.css`;
  const table = rule(tablePath, '.viewport');
  const tableFontRatio = calcRatio(table['font-size'], '--document-font-size');
  const tableLineRatio = calcRatio(table['line-height'], '--document-line-height');
  const tableCaption = rule(tablePath, '.table caption');
  const tableHeader = rule(tablePath, '.table th');
  for (const [role, weight] of [['table-cell', currentBody.fontWeight],
    ['table-header', number(tableHeader['font-weight'])], ['table-caption', number(tableCaption['font-weight'])]]) {
    comparison(role, 'fontSizePx', paperProfile.fontSizePx * tableFontRatio, `${tablePath}#.viewport`);
    comparison(role, 'lineHeightRatio', paperProfile.lineHeightPx * tableLineRatio / (paperProfile.fontSizePx * tableFontRatio), `${tablePath}#.viewport`);
    comparison(role, 'fontFamily', paperProfile.fontFamily, `${tablePath}#.viewport`);
    comparison(role, 'fontWeight', weight, `${tablePath}#.table${role === 'table-header' ? ' th' : role === 'table-caption' ? ' caption' : ' td'}`);
    comparison(role, 'letterSpacingEm', 0, `${metricsPath}#typographyTextCssProperties (normal inheritance)`);
  }
  comparison('table-cell', 'tableBodyRatio', tableFontRatio, `${tablePath}#.viewport font-size`);

  const noteCssPath = 'client/src/pages/Notes/NoteDetail.module.css';
  const folio = rule(noteCssPath, '.pageFrameSlot');
  for (const role of ['folio-header', 'folio-footer']) {
    comparison(role, 'fontSizePx', number(folio['font-size'], 'px'), `${noteCssPath}#.pageFrameSlot`);
    comparison(role, 'lineHeightRatio', number(folio['line-height']), `${noteCssPath}#.pageFrameSlot`);
    comparison(role, 'fontFamily', paperProfile.fontFamily, `${ENGINE}layers/PageFrameSlotsLayer.tsx#families.skin`,
      'default', { note: 'Default skin label family falls through to document family; mono and per-slot overrides are separate choices.' });
    comparison(role, 'fontWeight', currentBody.fontWeight, `${noteCssPath}#.pageFrameSlot (normal inheritance)`,
      'default', { note: 'No per-slot override in the factory binding settings.' });
    comparison(role, 'letterSpacingEm', 0, `${noteCssPath}#.pageFramePageNumberSlot (0; header normal inheritance)`);
  }
  // Read the renderer too, so a future override/default change is visible in provenance.
  read(`${ENGINE}layers/PageFrameSlotsLayer.tsx`);
  const titlePath = `${ENGINE}layers/NotePaperHeader.module.css`;
  const coverTitlePath = `${ENGINE}blocks/NoteRefBlockProjection.module.css`;
  const globalPath = 'client/src/styles/global.css';
  const globalBody = rule(globalPath, 'body');
  if (!globalBody['font-family']) throw new Error('Current application body font family missing');
  read(`${ENGINE}layers/NoteWritingSurfaceLayer.tsx`);
  for (const [role, variantPrefix, cssPath] of [['title', 'cover', coverTitlePath], ['document-title', 'header-band', titlePath]]) {
    const title = rule(cssPath, '.title');
    for (const titleFont of ['sans', 'serif']) {
      const variant = `${variantPrefix}-${titleFont}`;
      const style = components.buildSkinComponentStyles({ ...skins.SKIN_PRESET_COMPONENTS.default, titleFont });
      const titleSource = `${componentPath}#buildSkinComponentStyles titleFont=${titleFont} + ${cssPath}#.title`;
      comparison(role, 'fontSizePx', number(style['--sk-paper-title-size'], 'px'), titleSource, variant);
      comparison(role, 'fontWeight', number(style['--sk-paper-title-weight']), titleSource, variant);
      // The cover title does not consume --sk-paper-title-spacing. Its ordinary
      // inherited spacing must not be replaced with the header-band token.
      const spacing = title['letter-spacing'] ? style['--sk-paper-title-spacing'] : 'normal';
      comparison(role, 'letterSpacingEm', spacing === 'normal' ? 0 : number(spacing, 'em'), titleSource, variant);
      comparison(role, 'lineHeightRatio', number(title['line-height']), `${cssPath}#.title`, variant);
      comparison(role, 'fontFamily', style['--sk-title-font'] === 'initial' ? globalBody['font-family']
        : style['--sk-title-font'], `${titleSource} + ${globalPath}#body`, variant,
      { note: 'Sans title inherits the actual application font family. Defining --document-font-family on blockList does not set font-family on its ancestors or children.' });
    }
  }
  for (const [skin, tokens] of Object.entries({ ...skins.SKIN_PRESETS, 'silk-light': skins.SILK_LIGHT_TOKENS })) {
    for (const [token, value] of Object.entries(tokens)) {
      point('color', `${skin}.--sk-${token}`, value, `${skinPath}#${skin === 'silk-light' ? 'SILK_LIGHT_TOKENS' : 'SKIN_PRESETS'}.${skin}`, { token, skin });
    }
  }
  const globalCss = read(globalPath);
  for (const match of globalCss.matchAll(/\.gap-([\d]+)\s*\{\s*gap:\s*([\d.]+)px\s*;?\s*}/g)) {
    point('spacingPx', `utility.gap-${match[1]}`, Number(match[2]), `${globalPath}#.gap-${match[1]}`,
      { note: 'Existing application gap utility; not a document rhythm token.' });
  }
  if (!grids.spacingPx.length) throw new Error('No current gap utility scale found');
  point('spacingPx', 'document.paragraph-spacing', paperProfile.paragraphSpacingPx,
    `${paperProfilePath}#createPageFrameDefaultTypographyProfile`);
  const paperHeader = rule(titlePath, '.header');
  const cells = rule(tablePath, '.table th, .table td');
  for (const [id, declaration, source] of [
    ['table.cell-padding', cells.padding, `${tablePath}#.table th,.table td padding`],
    ['table.caption-padding', tableCaption.padding, `${tablePath}#.table caption padding`],
    ['paper.header-padding-top', paperHeader['padding-top'], `${titlePath}#.header padding-top`],
    ['paper.header-padding-bottom', paperHeader['padding-bottom'], `${titlePath}#.header padding-bottom`],
  ]) {
    for (const [index, part] of declaration.split(/\s+/).entries()) {
      point('spacingPx', `${id}.${index}`, part === '0' ? 0 : number(part, 'px'), source,
        { note: 'Declared product role spacing, not an observed layout gap.' });
    }
  }
  return {
    sources: [...sources.values()].sort((a, b) => a.path.localeCompare(b.path)),
    paperWidthPx, normalizedPaperWidthPx: NORMALIZED_PAPER_WIDTH, grids, comparisons,
    profile: paperProfile,
    notes: [
      'Current product means source-derived A4 factory defaults, not a live user note or persisted profile override.',
      'fontSizePx and spacingPx grid values / comparison normalized values are product layout px / product paper width * 900; comparison value and grid rawValue retain product layout px.',
      'A4 physical print mapping and 0.1px profile quantization are executed through current product functions; pt is not treated as internal CSS px.',
      'table-caption comparison is the current table caption; a universal figure-caption product role was not found.',
      'title means NoteRef cover title; document-title means the separate NotePaperHeader band. Sans/serif are current component variants. Cover line-height is read separately from the header band, and cover does not consume the header letter-spacing token.',
      'Sans title inherits global.css body font-family, not the document-font-family custom property. Folio explicitly consumes the document-font-family fallback, while paragraph/heading/table body renderers explicitly consume the profile.',
      'Callout comparison covers decorated paragraph body only; quote covers TextUnit quote body. Furniture label, stamp, and source attribution are different roles, not included in these body comparisons.',
      'Baseline/web typography candidates are interpreted on this A4 reference canvas, not as a measured web-page width.',
      'No shared document spacing-token scale exists in the inspected sources; gap utilities are named application candidates, not invented document tokens.',
      'Normal letter spacing is represented as 0em. Inherited properties are identified in source references; geometry, glyph metrics and font loading are not measured.',
    ],
  };
}
