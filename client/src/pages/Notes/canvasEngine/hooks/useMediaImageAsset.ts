import { useCallback, useSyncExternalStore } from 'react';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';

type AssetRead = { status: 'loading' | 'failed' } | { status: 'loaded'; url: string };
type AssetEntry = { read: AssetRead; release?: () => void; listeners: Set<() => void> };
const loading: AssetRead = { status: 'loading' };
const failed: AssetRead = { status: 'failed' };
const assets = new Map<string, AssetEntry>();

/** All projections share one read. A mounted consumer owns the URL, never a print job. */
function subscribe(assetId: string, listener: () => void) {
  if (!assetId) return () => undefined;
  let entry = assets.get(assetId);
  if (!entry) {
    entry = { read: loading, listeners: new Set() };
    assets.set(assetId, entry);
    const pending = entry;
    void loadCanvasImageAssetBlobUrl(assetId).then(async (url) => {
      if (assets.get(assetId) !== pending) {
        URL.revokeObjectURL(url);
        return;
      }
      pending.release = URL.revokeObjectURL.bind(URL, url);
      // A blob URL is not yet a decoded image. Prepare that same resource once
      // for every projection, before a synchronous beforeprint snapshot uses it.
      const image = new Image();
      image.src = url;
      if (typeof image.decode === 'function') await image.decode();
      if (assets.get(assetId) !== pending) return;
      pending.read = { status: 'loaded', url };
      pending.listeners.forEach((notify) => notify());
    }).catch(() => {
      if (assets.get(assetId) !== pending) return;
      pending.read = failed;
      pending.listeners.forEach((notify) => notify());
    });
  }
  const retained = entry;
  retained.listeners.add(listener);
  return () => {
    retained.listeners.delete(listener);
    if (retained.listeners.size) return;
    // A print/screen handoff or StrictMode can resubscribe in the same commit.
    // Keep its resource until that handoff finishes, not beyond its last owner.
    queueMicrotask(() => {
      if (retained.listeners.size || assets.get(assetId) !== retained) return;
      assets.delete(assetId);
      retained.release?.();
    });
  };
}

export function useMediaImageAsset(assetId: string) {
  const listen = useCallback((notify: () => void) => subscribe(assetId, notify), [assetId]);
  const snapshot = useCallback(() => assetId ? assets.get(assetId)?.read ?? loading : failed, [assetId]);
  const read = useSyncExternalStore(listen, snapshot, snapshot);
  const onError = useCallback(() => {
    const entry = assets.get(assetId);
    if (!entry || entry.read === failed) return;
    entry.read = failed;
    entry.listeners.forEach((notify) => notify());
  }, [assetId]);
  return { read, onError };
}
