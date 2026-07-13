export type ContentGroupSurfaceId = 'rail' | 'gallery' | 'editor';

export type ContentGroupSurfaceVerb = 'collect' | 'organize' | 'refine';

export interface ContentGroupSurfaceRoleDefinition {
  surface: ContentGroupSurfaceId;
  label: string;
  verb: ContentGroupSurfaceVerb;
  title: string;
  description: string;
  boundary: string;
}

const SURFACE_ORDER: ContentGroupSurfaceId[] = ['rail', 'gallery', 'editor'];

export const CONTENT_GROUP_SURFACE_ROLES: Record<ContentGroupSurfaceId, ContentGroupSurfaceRoleDefinition> = {
  rail: {
    surface: 'rail',
    label: 'Collect',
    verb: 'collect',
    title: 'Groups Rail',
    description: 'Quickly collect current-note ranges, labels, and blocks into ContentGroups.',
    boundary: 'Keep deep refinement in Single Editor and broad organization in Gallery.',
  },
  gallery: {
    surface: 'gallery',
    label: 'Organize',
    verb: 'organize',
    title: 'Group Gallery',
    description: 'Browse, search, and organize ContentGroups through folders and derived views.',
    boundary: 'Organizing groups must not move source truth or rewrite source text.',
  },
  editor: {
    surface: 'editor',
    label: 'Refine',
    verb: 'refine',
    title: 'Single ContentGroup Editor',
    description: 'Refine one ContentGroup through members, identity, summary, and source state.',
    boundary: 'Refinement edits group-local structure unless the user explicitly applies an action back to source.',
  },
};

export function contentGroupSurfaceRoleList(): ContentGroupSurfaceRoleDefinition[] {
  return SURFACE_ORDER.map((surface) => CONTENT_GROUP_SURFACE_ROLES[surface]);
}

export function contentGroupSurfaceRoleLabel(surface: ContentGroupSurfaceId): string {
  return CONTENT_GROUP_SURFACE_ROLES[surface].label;
}
