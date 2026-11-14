import { UserProfile } from '../../types';
import { DEFAULT_USER } from './defaults';
import { STORAGE_KEYS } from './keys';
import { readJson, readRaw, writeJson, writeRaw } from './localStore';
import { notifySync } from './sync';

function isUserProfile(value: unknown): value is UserProfile {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getUser(): UserProfile {
  const stored = readJson<UserProfile>(STORAGE_KEYS.USER);
  if (stored.status === 'ok' && isUserProfile(stored.value)) return stored.value;
  return DEFAULT_USER;
}

export function saveUser(user: UserProfile): void {
  if (writeJson(STORAGE_KEYS.USER, user)) {
    notifySync(STORAGE_KEYS.USER, user);
  }
}

export function isAuthenticated(): boolean {
  return readRaw(STORAGE_KEYS.AUTH_STATE) === 'true';
}

export function setAuthenticated(value: boolean): void {
  const serialized = value ? 'true' : 'false';

  if (writeRaw(STORAGE_KEYS.AUTH_STATE, serialized)) {
    notifySync(STORAGE_KEYS.AUTH_STATE, value);
  }
}
