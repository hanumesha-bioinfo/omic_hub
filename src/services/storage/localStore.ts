let cachedStorage: Storage | null | undefined;

function resolveStorage(): Storage | null {
  if (cachedStorage !== undefined) return cachedStorage;

  try {
    cachedStorage = typeof window !== 'undefined' ? window.localStorage : null;
  } catch (error) {
    console.warn('[storage] localStorage is unavailable.', error);
    cachedStorage = null;
  }

  return cachedStorage;
}

export function getStorage(): Storage | null {
  return resolveStorage();
}

export function readRaw(key: string): string | null {
  const storage = resolveStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch (error) {
    console.warn(`[storage] Could not read "${key}".`, error);
    return null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  const storage = resolveStorage();
  if (!storage) {
    console.warn(`[storage] Cannot persist "${key}" because localStorage is unavailable.`);
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[storage] Could not write "${key}".`, error);
    return false;
  }
}

export function removeKey(key: string): boolean {
  const storage = resolveStorage();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[storage] Could not remove "${key}".`, error);
    return false;
  }
}

export function clearStorage(): boolean {
  const storage = resolveStorage();
  if (!storage) return false;

  try {
    storage.clear();
    return true;
  } catch (error) {
    console.warn('[storage] Could not clear localStorage.', error);
    return false;
  }
}

export type StoredJson<T> =
  | { status: 'missing' }
  | { status: 'invalid'; raw: string; error: unknown }
  | { status: 'ok'; value: T };

export function readJson<T>(key: string): StoredJson<T> {
  const raw = readRaw(key);
  if (raw === null) return { status: 'missing' };

  try {
    return { status: 'ok', value: JSON.parse(raw) as T };
  } catch (error) {
    console.warn(
      `[storage] Ignoring malformed JSON in "${key}"; the stored value was left untouched.`,
      error
    );
    return { status: 'invalid', raw, error };
  }
}

export function readJsonOr<T>(key: string, fallback: T): T {
  const result = readJson<T>(key);
  return result.status === 'ok' ? result.value : fallback;
}

export function writeJson(key: string, value: unknown): boolean {
  let serialized: string | undefined;

  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    console.warn(`[storage] Could not serialize "${key}".`, error);
    return false;
  }

  if (serialized === undefined) {
    console.warn(`[storage] Refusing to persist undefined value for "${key}".`);
    return false;
  }

  return writeRaw(key, serialized);
}

export function getStorageUsageBytes(): number {
  const storage = resolveStorage();
  if (!storage) return 0;

  let total = 0;

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;

      const value = storage.getItem(key) || '';
      total += (value.length + key.length) * 2;
    }
  } catch (error) {
    console.warn('[storage] Could not calculate storage usage.', error);
    return 0;
  }

  return total;
}
