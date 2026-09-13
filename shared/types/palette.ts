/** Named colors are grouped by the slash prefix in their name, with no group entity. */
export interface PaletteColor {
  id: string;
  user_id: string;
  name: string;
  value: string;
  sort: number;
  origin: 'factory' | 'user';
  created_at: string;
}

export interface CreatePaletteColorInput {
  name: string;
  value: string;
  sort?: number;
}

export type UpdatePaletteColorInput = Partial<CreatePaletteColorInput>;

/** The authoritative value retained by consumers when the reference is detached. */
export interface PaletteColorDeleteResult {
  id: string;
  value: string;
}
