// One explicitly registered image shared by synthetic UI transports. Unknown
// asset ids fall through to each fixture's existing strict request ledger.
export const MEDIA_FIXTURE_ASSET_ID = '13060000-0000-4000-8000-000000000001';
export const MEDIA_FIXTURE_BLOB_PATH = `/canvas-assets/${MEDIA_FIXTURE_ASSET_ID}/blob`;
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export function readCanvasAssetFixture(url: string): { data: Blob } | undefined {
  if (url !== MEDIA_FIXTURE_BLOB_PATH) return undefined;
  const bytes = Uint8Array.from(atob(PNG), (character) => character.charCodeAt(0));
  return { data: new Blob([bytes], { type: 'image/png' }) };
}
