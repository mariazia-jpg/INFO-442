// Small helpers around Web Storage. Every read and write is wrapped in
// try/catch because storage can be unavailable (private browsing, blocked
// site data, full quota).

export const KEYS = {
  accounts: 'rewear:accounts',
  session: 'rewear:session',
  preferences: (userId) => `rewear:preferences:${userId}`,
  upload: 'rewear:upload',
};

function area(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/** Reads JSON; returns `fallback` when missing. Throws if the stored value is corrupt. */
export function readJson(key, fallback = null, kind = 'local') {
  const store = area(kind);
  if (!store) return fallback;
  const raw = store.getItem(key);
  if (raw === null) return fallback;
  return JSON.parse(raw);
}

/** Reads JSON and treats corrupt data as missing. */
export function readJsonSafe(key, fallback = null, kind = 'local') {
  try {
    return readJson(key, fallback, kind);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value, kind = 'local') {
  const store = area(kind);
  if (!store) throw new Error('Storage is unavailable');
  store.setItem(key, JSON.stringify(value));
}

export function remove(key, kind = 'local') {
  try {
    area(kind)?.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
