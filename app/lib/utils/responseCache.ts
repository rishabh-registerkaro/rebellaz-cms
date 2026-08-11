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
 * each instance. The TTL is short so a publish appears quickly even if
 * tag-based revalidation is missed.
 */

type Entry = { at: number; body: unknown };

const DEFAULT_TTL_MS = 30_000;
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
export function cacheGet(namespace: string, key: string, ttlMs = DEFAULT_TTL_MS): unknown | null {
  const store = storeFor(namespace);
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) {
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
