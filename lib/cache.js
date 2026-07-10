// In-memory TTL cache. Vercel serverless functions reuse warm containers between
// invocations, so this cache is best-effort (cold starts reset it) — that's fine
// per spec section 8, which only asks for a short-lived cache, not durable storage.

const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function invalidate(key) {
  store.delete(key);
}

module.exports = { get, set, invalidate };
