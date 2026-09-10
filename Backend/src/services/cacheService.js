const entries = new Map();

const get = (key) => {
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return null;
  }
  return entry.value;
};

const set = (key, value, ttlMs = 60_000) => {
  entries.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const removeByPrefix = (prefix) => {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
};

module.exports = { get, removeByPrefix, set };
