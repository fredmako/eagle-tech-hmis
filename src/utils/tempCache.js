const TEMP_CACHE_PREFIX = 'egesa_temp_cache_';
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

const safeParse = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setTempCache = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  if (!key || typeof window === 'undefined') return;
  const payload = {
    value,
    expiresAt: Date.now() + ttlMs,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(`${TEMP_CACHE_PREFIX}${key}`, JSON.stringify(payload));
};

export const getTempCache = (key, fallback = null) => {
  if (!key || typeof window === 'undefined') return fallback;
  const stored = safeParse(localStorage.getItem(`${TEMP_CACHE_PREFIX}${key}`));
  if (!stored) return fallback;
  if (stored.expiresAt && Date.now() > stored.expiresAt) {
    localStorage.removeItem(`${TEMP_CACHE_PREFIX}${key}`);
    return fallback;
  }
  return stored.value ?? fallback;
};

export const removeTempCache = (key) => {
  if (!key || typeof window === 'undefined') return;
  localStorage.removeItem(`${TEMP_CACHE_PREFIX}${key}`);
};
