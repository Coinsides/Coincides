// Offline analysis only. Nothing in the product imports this module.
export const INTERPRETATIONS = ['world', 'local', 'mixed'] as const;
export type Interpretation = typeof INTERPRETATIONS[number];
export type Unit = 'placement' | 'object' | 'mount';
export type Destination = 'original' | 'adopt' | 'tray_block' | 'tray_object' | 'tray_mount';
export interface Identity { note: string; id: string }
export interface Placement extends Identity {
  object: string;
  kind: string | null;
  status: string | null;
  surface: string | null;
  boundary: string | null;
}
export interface ObjectRow extends Identity {
  kind: string;
  status: string;
  placements: number;
  mounts: number;
  surfaces: number;
}
export interface MountRow extends Identity {
  object: string;
  object_kind: string | null;
  status: string | null;
  placements: number;
  surfaces: number;
  surface_state: string | null;
}
export interface PageScore {
  frame: string;
  stack: string | null;
  ratio: number;
  rect: string;
  center: string;
  horizontal: string;
}
export interface Geometry extends Identity {
  unit: 'placement' | 'legacy';
  interpretation: Interpretation;
  state: string;
  page_state: string;
  page_signature: string | null;
  page_scores: PageScore[];
  unknown_frames: number;
  primary_ratio: number | null;
  x: number | null;
  y: number | null;
  [field: string]: unknown;
}
export interface Denominator {
  note: string;
  placement: number;
  object: number;
  mount: number;
  legacy_rows: number;
  frame_placements: number;
  legacy_only: number;
  legacy_ambiguous: number;
  dual_any: number;
  dual_active: number;
  [field: string]: unknown;
}
export interface Census {
  denominators: Denominator[];
  placement_inventory: Placement[];
  object_inventory: ObjectRow[];
  mount_inventory: MountRow[];
  legacy_inventory: Array<Identity & { layout_type: string | null; [field: string]: unknown }>;
  note_matrix: Array<{ note: string; [field: string]: unknown }>;
  geometry: Geometry[];
  unscopable_legacy_note_rows: number;
  [field: string]: unknown;
}
export interface Route {
  destination: Destination;
  reason: string;
  reviewRequired: boolean;
}
export interface CoordinateDecision {
  status: 'settled' | 'ambiguous' | 'not_applicable';
  reason: string;
  // All intersecting pages survive; a settled result is not a choice of a writer/coordinate space.
  agreedPages: Array<{ frame: string; stack: string | null; rect: string }> | null;
  interpretations: Geometry[];
}
export interface PlannedRow extends Identity {
  unit: Unit;
  route: Route;
  coordinate?: CoordinateDecision;
  thresholdDiagnostics?: Partial<Record<Interpretation, boolean | null>>;
}
export const rowIdentity = (row: Identity): string => JSON.stringify([row.note, row.id]);
const route = (destination: Destination, reason: string, reviewRequired = false): Route =>
  ({ destination, reason, reviewRequired });

export function thresholdMet(ratio: number | null, threshold = 0.5): boolean | null {
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
    throw new Error('Invalid diagnostic adoption threshold');
  }
  return ratio === null || !Number.isFinite(ratio) ? null : ratio >= threshold;
}

export function classifyPlacement(p: Placement): Route {
  if (p.kind === 'page_frame') return route('original', 'structural_frame');
  if (!p.kind || p.status !== 'active') return route('original', 'identity_or_status_unresolved', true);
  if (p.surface === 'tray') return route('original', 'already_tray');
  if (p.kind === 'paragraph_block_projection' && p.boundary === 'inside') {
    return route('original', 'inside_unchanged');
  }
  if (p.surface === 'formal_page') return route('original', 'other_surface_unchanged');
  if (p.surface !== 'canvas_workspace') return route('original', 'surface_unresolved', true);
  if (p.kind !== 'paragraph_block_projection') return route('tray_object', 'wilderness_drawing');
  // Walkthrough 1 has not approved adoption. There is deliberately no activation switch.
  if (p.boundary === 'crossing') return route('tray_block', 'crossing_fallback');
  if (p.boundary === 'outside') return route('tray_block', 'outside_block');
  return route('original', 'boundary_unresolved', true);
}

function associatedRoute(placements: Placement[], destination: Destination): Route {
  if (!placements.length) return route('original', 'unplaced', true);
  const surfaces = new Set(placements.map(p => p.surface));
  if (surfaces.size !== 1) return route('original', 'mixed_surfaces', true);
  if (surfaces.has('canvas_workspace')) return route(destination, 'wilderness_only');
  if (surfaces.has('formal_page') || surfaces.has('tray')) return route('original', 'other_surface_unchanged');
  return route('original', 'surface_unresolved', true);
}

export function classifyObject(object: ObjectRow, placements: Placement[]): Route {
  if (object.kind === 'page_frame') return route('original', 'structural_frame');
  if (object.status !== 'active') return route('original', 'identity_or_status_unresolved', true);
  // A block's object identity remains in place; its placement carries the destination.
  if (object.kind === 'paragraph_block_projection') return placements.length
    ? route('original', 'block_identity_retained') : route('original', 'unplaced', true);
  return associatedRoute(placements, 'tray_object');
}

export function classifyMount(mount: MountRow, placements: Placement[]): Route {
  if (!mount.object_kind || mount.status !== 'active') return route('original', 'identity_or_status_unresolved', true);
  if (mount.object_kind === 'page_frame') return route('original', 'structural_frame_mount', true);
  return associatedRoute(placements, 'tray_mount');
}

function pages(g: Geometry) {
  return g.page_scores.filter(p => p.ratio > 0)
    .map(({ frame, stack, rect }) => ({ frame, stack, rect }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
}

export function evaluateCoordinates(interpretations: Geometry[], notApplicable?: string): CoordinateDecision {
  if (notApplicable) return { status: 'not_applicable', reason: notApplicable, agreedPages: null, interpretations };
  const complete = interpretations.length === 3 && INTERPRETATIONS.every(name =>
    interpretations.filter(g => g.interpretation === name).length === 1);
  const resolved = complete && interpretations.every(g => g.state === 'resolved' && g.unknown_frames === 0
    && ['one_frame', 'no_intersection', 'multiple_pages_one_stack', 'multiple_stacks'].includes(g.page_state));
  if (!resolved) return { status: 'ambiguous', reason: 'incomplete_evidence', agreedPages: null, interpretations };
  const signatures = interpretations.map(g => JSON.stringify(pages(g)));
  if (!signatures.every(s => s === signatures[0])) {
    return { status: 'ambiguous', reason: 'interpretation_disagreement', agreedPages: null, interpretations };
  }
  return { status: 'settled', reason: 'page_results_agree', agreedPages: pages(interpretations[0]), interpretations };
}

export interface Conservation {
  note: string;
  unit: Unit;
  before: number;
  after: number;
  original: number;
  adopt: number;
  tray: number;
  reviewRetained: number;
  ok: boolean;
  errors: string[];
}

// Identity equality catches a lost row replaced by a duplicate, even when counts happen to match.
export function validateConservation(note: string, unit: Unit, expectedCount: number,
  inventory: Identity[], planned: PlannedRow[]): Conservation {
  const before = inventory.filter(r => r.note === note);
  const after = planned.filter(r => r.note === note && r.unit === unit);
  const beforeIds = before.map(rowIdentity).sort();
  const afterIds = after.map(rowIdentity).sort();
  const errors: string[] = [];
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 0 || before.length !== expectedCount) errors.push('denominator_mismatch');
  if (new Set(beforeIds).size !== beforeIds.length) errors.push('duplicate_inventory_identity');
  if (new Set(afterIds).size !== afterIds.length) errors.push('duplicate_plan_identity');
  if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) errors.push('row_identity_mismatch');
  const original = after.filter(r => r.route.destination === 'original').length;
  const adopt = after.filter(r => r.route.destination === 'adopt').length;
  const tray = after.filter(r => ['tray_block', 'tray_object', 'tray_mount'].includes(r.route.destination)).length;
  if (expectedCount !== original + adopt + tray) errors.push('destination_sum_mismatch');
  if (adopt !== 0) errors.push('adoption_not_enabled');
  const allowed: Record<Unit, Destination[]> = {
    placement: ['original', 'tray_block', 'tray_object'], object: ['original', 'tray_object'], mount: ['original', 'tray_mount'],
  };
  if (after.some(r => !allowed[unit].includes(r.route.destination))) errors.push('invalid_destination_for_unit');
  return { note, unit, before: expectedCount, after: after.length, original, adopt, tray,
    reviewRetained: after.filter(r => r.route.reviewRequired).length, ok: errors.length === 0, errors };
}

export function buildShadowPlan(census: Census, adoptionThreshold = 0.5) {
  thresholdMet(null, adoptionThreshold);
  const geometry = new Map<string, Geometry[]>();
  for (const g of census.geometry) {
    const id = JSON.stringify([g.unit, g.note, g.id]);
    geometry.set(id, [...(geometry.get(id) ?? []), g]);
  }
  const byObject = new Map<string, Placement[]>();
  for (const p of census.placement_inventory) {
    const id = rowIdentity({ note: p.note, id: p.object });
    byObject.set(id, [...(byObject.get(id) ?? []), p]);
  }
  const rows: PlannedRow[] = census.placement_inventory.map(p => {
    const interpretations = geometry.get(JSON.stringify(['placement', p.note, p.id])) ?? [];
    return { unit: 'placement', note: p.note, id: p.id, route: classifyPlacement(p),
      coordinate: evaluateCoordinates(interpretations, p.kind === 'page_frame' ? 'structural_frame'
        : p.surface === 'tray' ? 'tray_no_geometry' : undefined),
      thresholdDiagnostics: Object.fromEntries(interpretations.map(g => [g.interpretation, thresholdMet(g.primary_ratio, adoptionThreshold)])) };
  });
  for (const o of census.object_inventory) rows.push({ unit: 'object', note: o.note, id: o.id,
    route: classifyObject(o, byObject.get(rowIdentity(o)) ?? []) });
  for (const m of census.mount_inventory) rows.push({ unit: 'mount', note: m.note, id: m.id,
    route: classifyMount(m, byObject.get(rowIdentity({ note: m.note, id: m.object })) ?? []) });
  const legacy = census.legacy_inventory.filter(l => l.layout_type === 'object').map(l => ({
    note: l.note, id: l.id, route: 'legacy_frozen' as const,
    coordinate: evaluateCoordinates(geometry.get(JSON.stringify(['legacy', l.note, l.id])) ?? []),
  }));
  const conservation: Conservation[] = [];
  const notes = new Set(census.denominators.map(d => d.note));
  if (notes.size !== census.denominators.length || rows.some(r => !notes.has(r.note))) {
    throw new Error('Census note inventory mismatch');
  }
  for (const d of census.denominators) {
    for (const unit of ['placement', 'object', 'mount'] as const) {
      conservation.push(validateConservation(d.note, unit, d[unit], census[`${unit}_inventory`], rows));
    }
  }
  return { policy: { crossing: 'tray_fallback' as const, adoptionEnabled: false as const, adoptionThreshold,
    thresholdPurpose: 'diagnostic_only', unknownDestination: 'retain_original_for_review', legacy: 'frozen' },
    rows, legacy, conservation, conservationOk: conservation.every(c => c.ok),
    ambiguousPlacements: rows.filter(r => r.coordinate?.status === 'ambiguous'),
    ambiguousLegacy: legacy.filter(r => r.coordinate.status === 'ambiguous'),
    destinationReviews: rows.filter(r => r.route.reviewRequired) };
}
export type ShadowPlan = ReturnType<typeof buildShadowPlan>;
