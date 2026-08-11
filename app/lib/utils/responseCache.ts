/**
 * Tiny in-process cache for public, read-only API responses.
 *
 * The database is remote Hostinger shared MySQL — a single round trip measures
 * 200ms–2.5s and is highly variable. These endpoints serve identical bytes to
 * every visitor, so caching them is the cheapest available win and keeps the
 * public site fast even when the database is slow.
 *
 * Deliberately process-local rather than a shared store: it needs no
 * infrastructure, cannot go stale across a deploy, and simply warms again on
 * each instance. Freshness comes from cacheClear() on every write, not from
 * the TTLs below — see TTL_BY_NAMESPACE.
 */

type Entry = { at: number; body: unknown };

/**
 * How long each namespace may serve a cached body.
 *
 * Every mutation calls cacheClear(), so within a single instance a TTL is only
 * a backstop, not the freshness mechanism — which is why these are generous.
 * They matter in one case: on a multi-instance deploy, cacheClear() only clears
 * the instance that handled the write, so another instance can serve stale
 * content for up to its TTL. Page copy changes rarely and is tuned longest;
 * the roles list is shortest because the board pages through it from the
 * browser and is the most visible if it lags.
 */
const TTL_BY_NAMESPACE: Record<string, number> = {
  "careers-page": 600_000, // 10 min — page copy
  "contact-page": 600_000, // 10 min — page copy
  "career-detail": 300_000, // 5 min
  "careers-list": 120_000, // 2 min
};

const DEFAULT_TTL_MS = 120_000;

const ttlFor = (namespace: string) => TTL_BY_NAMESPACE[namespace] ?? DEFAULT_TTL_MS;
/** Bounded so a crawler walking ?page=1..1000 cannot grow this without limit. */
const MAX_ENTRIES = 200;

const stores = new Map<string, Map<string, Entry>>();

function storeFor(namespace: string): Map<string, Entry> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map();
    stores.set(namespace, store);
  }
  return store;
}

/** Cached body for this key, or null when absent or expired. */
export function cacheGet(namespace: string, key: string, ttlMs?: number): unknown | null {
  const store = storeFor(namespace);
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > (ttlMs ?? ttlFor(namespace))) {
    store.delete(key);
    return null;
  }
  return hit.body;
}

export function cacheSet(namespace: string, key: string, body: unknown): void {
  const store = storeFor(namespace);
  if (store.size > MAX_ENTRIES) store.clear();
  store.set(key, { at: Date.now(), body });
}

/**
 * Drop a namespace after a write.
 *
 * Without this an editor would publish a role and still be served the previous
 * response for up to the TTL — which reads as "my change didn't save".
 */
export function cacheClear(namespace: string): void {
  stores.get(namespace)?.clear();
}
