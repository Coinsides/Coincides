import { boardRepository } from './boardRepository';
import type {
  BoardDetail, BoardEdge, BoardGeometry, BoardMember, BoardVisual, BoardSticky, BoardEdgeEndpoint,
  CreateBoardEdgeInput, CreateBoardVisualInput, PatchBoardEdgeInput,
  PatchBoardMemberInput, PatchBoardVisualInput, CreateBoardStickyInput, PatchBoardStickyInput,
} from './boardTypes';

type Kind = 'member' | 'edge' | 'visual' | 'sticky';
type Entity = BoardMember | BoardEdge | BoardVisual | BoardSticky;
type Snapshot = Entity | CreateBoardEdgeInput | CreateBoardVisualInput | CreateBoardStickyInput;
type Patch = PatchBoardMemberInput | PatchBoardEdgeInput | PatchBoardVisualInput | PatchBoardStickyInput;
type Direction = 'before' | 'after';
interface Operation {
  kind: Kind;
  key: string;
  before: Snapshot | null;
  after: Snapshot | null;
  fields?: string[];
}
type Command = Operation[];
export interface BoardGeometryChange {
  kind: 'member' | 'visual' | 'sticky';
  id: string;
  input: Partial<BoardGeometry>;
}
export interface BoardRemovalSelection {
  memberIds: string[];
  edgeIds: string[];
  visualIds: string[];
  stickyIds?: string[];
}
export type BoardLayerSelection = Pick<BoardRemovalSelection, 'memberIds' | 'visualIds' | 'stickyIds'>;

const geometryFields = ['x', 'y', 'w', 'h', 'scale', 'z_index', 'pinned'];
const visualFields = [...geometryFields, 'layer_id', 'visual_kind', 'rotation', 'data', 'metadata'];
const stickyFields = ['text', 'x', 'y', 'w', 'h', 'z_index', 'pinned', 'layer_id', 'color_index', 'weight'];
const edgeFields = ['from_member_id', 'to_member_id', 'from', 'to', 'style', 'label', 'bend', 'dash', 'weight',
  'cap_start', 'cap_end', 'color_index', 'label_position', 'visual_version'];
const newEdgeFields = ['from', 'to', 'from_member_id', 'to_member_id', 'bend', 'dash', 'weight', 'cap_start', 'cap_end', 'color_index'];
const otherDirection = (direction: Direction): Direction => direction === 'before' ? 'after' : 'before';
function pick(value: Snapshot, fields: string[]): Record<string, unknown> {
  const record = value as unknown as Record<string, unknown>;
  return Object.fromEntries(fields.filter((field) => record[field] !== undefined).map((field) => [field, record[field]]));
}

/** One instance per mounted board scope; every method is called inside useBoard's queue. */
export class BoardCommandHistory {
  detail: BoardDetail | null = null;
  private past: Command[] = [];
  private future: Command[] = [];
  private live = new Map<string, string>();
  private aliases = new Map<string, string>();
  private sequence = 0;

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }

  reset(detail: BoardDetail) {
    this.detail = detail;
    this.past = [];
    this.future = [];
    this.live.clear();
    this.aliases.clear();
  }

  newEdit() { this.future = []; }

  private key(kind: Kind, id: string) {
    const alias = `${kind}:${id}`;
    const key = this.aliases.get(alias) ?? alias;
    if (!this.live.has(key)) this.live.set(key, id);
    this.aliases.set(alias, key);
    return key;
  }

  resolve(kind: Kind, id: string) { return this.live.get(this.key(kind, id))!; }

  private entity(kind: Kind, id: string): Entity {
    const liveId = this.resolve(kind, id);
    const items = kind === 'member' ? this.detail?.members : kind === 'edge' ? this.detail?.edges
      : kind === 'sticky' ? this.detail?.stickies : this.detail?.visuals;
    const entity = items?.find((item) => item.id === liveId);
    if (!entity) throw new Error('Board object is no longer present');
    return entity;
  }

  private replace(kind: Kind, oldId: string | undefined, entity: Entity | null) {
    if (!this.detail) return;
    const update = <T extends Entity>(items: T[]): T[] => {
      const next = items.filter((item) => item.id !== oldId && item.id !== entity?.id);
      if (entity) {
        const index = items.findIndex((item) => item.id === oldId || item.id === entity.id);
        next.splice(index < 0 ? next.length : index, 0, entity as T);
      }
      return next;
    };
    this.detail = kind === 'member' ? { ...this.detail, members: update(this.detail.members) }
      : kind === 'edge' ? { ...this.detail, edges: update(this.detail.edges) }
        : kind === 'sticky' ? { ...this.detail, stickies: update(this.detail.stickies ?? []) }
        : { ...this.detail, visuals: update(this.detail.visuals) };
  }

  private resolveEdgeInput(input: Record<string, unknown>) {
    for (const side of ['from', 'to'] as const) {
      const endpoint = input[side] as BoardEdgeEndpoint | undefined;
      if (endpoint && endpoint.kind !== 'point') {
        input[side] = { ...endpoint, id: this.resolve(endpoint.kind, endpoint.id) };
        // Canonical endpoints take precedence over legacy aliases.
        delete input[`${side}_member_id`];
      } else if (endpoint?.kind === 'point') delete input[`${side}_member_id`];
      else if (typeof input[`${side}_member_id`] === 'string') {
        input[`${side}_member_id`] = this.resolve('member', input[`${side}_member_id`] as string);
      }
    }
    return input;
  }

  private async step(boardId: string, operation: Operation, direction: Direction) {
    const target = operation[direction];
    const origin = operation[otherDirection(direction)];
    const id = this.live.get(operation.key);
    let saved: Entity | null = null;
    if (target === null) {
      if (!id) throw new Error('Board history has no live object');
      if (operation.kind === 'visual') await boardRepository.deleteVisual(boardId, id);
      else if (operation.kind === 'sticky') await boardRepository.deleteSticky(boardId, id);
      else if (operation.kind === 'edge') await boardRepository.deleteEdge(boardId, id);
      else throw new Error('Member mounting is outside board history');
    } else if (origin === null) {
      if (operation.kind === 'visual') {
        saved = await boardRepository.createVisual(boardId, pick(target, visualFields) as unknown as CreateBoardVisualInput);
      } else if (operation.kind === 'sticky') {
        saved = await boardRepository.createSticky(boardId, pick(target, stickyFields) as CreateBoardStickyInput);
      } else if (operation.kind === 'edge') {
        const input = this.resolveEdgeInput(pick(target, edgeFields)) as CreateBoardEdgeInput;
        // A pre-v1 snapshot has no visual version or bend. Recreating it must
        // not acquire the server's new-edge routing or style defaults.
        if ('id' in target && !('visual_version' in target)) {
          input.visual_version = 0;
          input.bend = 0;
        }
        saved = await boardRepository.createEdge(boardId, input);
      } else throw new Error('Member mounting is outside board history');
    } else {
      if (!id) throw new Error('Board history has no live object');
      const input = pick(target, operation.fields!);
      if (operation.kind === 'member') saved = await boardRepository.updateMember(boardId, id, input);
      else if (operation.kind === 'visual') saved = await boardRepository.updateVisual(boardId, id, input);
      else if (operation.kind === 'sticky') saved = await boardRepository.updateSticky(boardId, id, input);
      else {
        saved = await boardRepository.updateEdge(boardId, id, this.resolveEdgeInput(input));
      }
    }
    if (saved) {
      this.live.set(operation.key, saved.id);
      this.aliases.set(`${operation.kind}:${saved.id}`, operation.key);
      // Preserve the server's confirmed geometry/content for the next replay.
      operation[direction] = saved;
    }
    this.replace(operation.kind, id, saved);
  }

  private async run(boardId: string, command: Command, direction: Direction) {
    const completed: Operation[] = [];
    const ordered = direction === 'before' ? [...command].reverse() : command;
    try {
      for (const operation of ordered) {
        await this.step(boardId, operation, direction);
        completed.push(operation);
      }
    } catch (error) {
      // The HTTP API is per object. Compensate completed reversible writes before
      // returning failure; only a fully completed gesture may advance history.
      for (const operation of completed.reverse()) await this.step(boardId, operation, otherDirection(direction));
      throw error;
    }
  }

  private async commit(boardId: string, command: Command) {
    if (command.length === 0) return;
    await this.run(boardId, command, 'after');
    this.past = [...this.past, command].slice(-80);
    this.future = [];
  }

  async undo(boardId: string) {
    const command = this.past[this.past.length - 1];
    if (!command) return;
    await this.run(boardId, command, 'before');
    this.past.pop();
    this.future.push(command);
  }

  async redo(boardId: string) {
    const command = this.future[this.future.length - 1];
    if (!command) return;
    await this.run(boardId, command, 'after');
    this.future.pop();
    this.past.push(command);
  }

  private patchOperation(kind: Kind, id: string, input: Patch): Operation | null {
    const entity = this.entity(kind, id);
    // Legacy DTOs omit layer_id. Undo must explicitly PATCH null to restore Base.
    const before = kind === 'edge' ? {
      bend: 0, dash: 'solid', weight: 1, cap_start: 'none', cap_end: 'none', color_index: null,
      label_position: 0.5, visual_version: 0, ...entity,
      from: (entity as BoardEdge).from ?? { kind: 'member', id: (entity as BoardEdge).from_member_id, anchor: 'auto' },
      to: (entity as BoardEdge).to ?? { kind: 'member', id: (entity as BoardEdge).to_member_id, anchor: 'auto' },
    } as BoardEdge : { ...entity, layer_id: (entity as BoardMember | BoardVisual | BoardSticky).layer_id ?? null };
    const fields = Object.keys(input).filter((field) => field !== 'placed' && !(kind === 'sticky' && field === 'scale')
      && JSON.stringify((before as unknown as Record<string, unknown>)[field]) !== JSON.stringify((input as Record<string, unknown>)[field]));
    const promote = kind === 'edge' && fields.some((field) => newEdgeFields.includes(field)) && !('visual_version' in input);
    if (promote && !fields.includes('visual_version')) fields.push('visual_version');
    return fields.length ? { kind, key: this.key(kind, id), before,
      after: { ...before, ...input, ...(promote ? { visual_version: 1 } : {}) }, fields } : null;
  }

  async patch(boardId: string, kind: Kind, id: string, input: Patch) {
    const operation = this.patchOperation(kind, id, input);
    // Staging placement is a membership action, not an undoable geometry field.
    if (kind === 'member' && 'placed' in input) {
      const saved = await boardRepository.updateMember(boardId, this.resolve(kind, id), input as PatchBoardMemberInput);
      this.replace(kind, saved.id, saved);
      this.newEdit();
      if (operation) {
        operation.after = saved;
        this.past = [...this.past, [operation]].slice(-80);
      }
    } else await this.commit(boardId, operation ? [operation] : []);
  }

  async updateGeometryBatch(boardId: string, changes: BoardGeometryChange[]) {
    const command: Command = [];
    for (const change of changes) {
      const current = this.entity(change.kind, change.id) as BoardMember | BoardVisual | BoardSticky;
      if (current.pinned) continue;
      const operation = this.patchOperation(change.kind, change.id, change.input);
      if (operation) command.push(operation);
    }
    await this.commit(boardId, command);
  }

  async moveSelectionToLayer(boardId: string, selection: BoardLayerSelection, layerId: string | null) {
    const command: Command = [];
    for (const kind of ['member', 'visual', 'sticky'] as const) {
      const ids = kind === 'member' ? selection.memberIds : kind === 'sticky' ? selection.stickyIds ?? [] : selection.visualIds;
      for (const id of new Set(ids)) {
        // Pinning restricts geometry gestures, not an object's layer membership.
        const operation = this.patchOperation(kind, id, { layer_id: layerId });
        if (operation) command.push(operation);
      }
    }
    await this.commit(boardId, command);
  }

  /** Layer deletion is outside undo. Old object snapshots must not revive its FK. */
  rehomeDeletedLayer(layerId: string) {
    const rehome = <T extends Snapshot>(value: T): T => (
      'layer_id' in value && value.layer_id === layerId ? { ...value, layer_id: null } : value
    );
    for (const command of [...this.past, ...this.future]) {
      for (const operation of command) {
        if (operation.before) operation.before = rehome(operation.before);
        if (operation.after) operation.after = rehome(operation.after);
      }
    }
    if (this.detail) this.detail = {
      ...this.detail,
      layers: (this.detail.layers ?? []).filter((layer) => layer.id !== layerId),
      members: this.detail.members.map(rehome),
      visuals: this.detail.visuals.map(rehome),
      stickies: this.detail.stickies?.map(rehome),
    };
  }

  async create(boardId: string, kind: 'edge' | 'visual' | 'sticky', input: CreateBoardEdgeInput | CreateBoardVisualInput | CreateBoardStickyInput) {
    const key = `${kind}:new:${++this.sequence}`;
    await this.commit(boardId, [{ kind, key, before: null, after: input }]);
    return this.entity(kind, this.live.get(key)!);
  }

  async rerouteEdge(boardId: string, edgeId: string) {
    const before = this.entity('edge', edgeId) as BoardEdge;
    const saved = await boardRepository.rerouteEdge(boardId, before.id);
    this.replace('edge', before.id, saved);
    this.past = [...this.past, [{ kind: 'edge' as const, key: this.key('edge', before.id),
      before: { ...before, bend: before.bend ?? 0, visual_version: before.visual_version ?? 0,
        cap_start: before.cap_start ?? 'none', cap_end: before.cap_end ?? 'none' }, after: saved,
      fields: ['bend', 'visual_version', 'cap_start', 'cap_end'] }]].slice(-80);
    this.future = [];
  }

  /** Irreversible removals trim only affected operations, retaining unrelated parts of a gesture. */
  invalidate(kind: Kind, ids: string[]) {
    const keys = new Set(ids.map((id) => this.key(kind, id)));
    const memberIds = new Set(kind === 'member' ? ids.map((id) => this.resolve(kind, id)) : []);
    const keep = (operation: Operation) => !keys.has(operation.key) && ![operation.before, operation.after].some((value) =>
      value && 'from_member_id' in value && (
        (value.from_member_id != null && memberIds.has(value.from_member_id))
        || (value.to_member_id != null && memberIds.has(value.to_member_id))));
    this.past = this.past.map((command) => command.filter(keep)).filter((command) => command.length > 0);
    this.future = this.future.map((command) => command.filter(keep)).filter((command) => command.length > 0);
  }

  async removeSelection(boardId: string, selection: BoardRemovalSelection) {
    const members = [...new Set(selection.memberIds.map((id) => this.resolve('member', id)))];
    const memberSet = new Set(members);
    const edges = [...new Set(selection.edgeIds.map((id) => this.resolve('edge', id)))];
    const visuals = [...new Set(selection.visualIds.map((id) => this.resolve('visual', id)))];
    const stickies = [...new Set((selection.stickyIds ?? []).map((id) => this.resolve('sticky', id)))];
    const stickySet = new Set(stickies);
    const onMember = (edge: BoardEdge) => (edge.from_member_id !== null && memberSet.has(edge.from_member_id))
      || (edge.to_member_id !== null && memberSet.has(edge.to_member_id));
    const onSticky = (edge: BoardEdge) => [edge.from, edge.to].some((endpoint) =>
      endpoint?.kind === 'sticky' && stickySet.has(this.resolve('sticky', endpoint.id)));
    // Delete all sticky incident edges before their cards; undo recreates cards first.
    for (const edge of this.detail?.edges ?? []) if (onSticky(edge) && !edges.includes(edge.id)) edges.push(edge.id);
    const command: Command = [];
    for (const id of edges) {
      const before = this.entity('edge', id) as BoardEdge;
      if (!onMember(before)) {
        command.push({ kind: 'edge', key: this.key('edge', id), before, after: null });
      }
    }
    for (const id of visuals) command.push({ kind: 'visual', key: this.key('visual', id), before: this.entity('visual', id), after: null });
    for (const id of stickies) command.push({ kind: 'sticky', key: this.key('sticky', id), before: this.entity('sticky', id), after: null });
    // Each successful unmount remains irreversible even if a later request fails.
    // Its incident edges (including unselected ones) disappear through the same
    // existing cascade as single-member deletion and never enter the command.
    for (const id of members) {
      await boardRepository.unmount(boardId, id);
      this.invalidate('member', [id]);
      this.newEdit();
      if (this.detail) this.detail = {
        ...this.detail,
        members: this.detail.members.filter((member) => member.id !== id),
        edges: this.detail.edges.filter((edge) => edge.from_member_id !== id && edge.to_member_id !== id),
      };
    }
    await this.commit(boardId, command);
  }
}
