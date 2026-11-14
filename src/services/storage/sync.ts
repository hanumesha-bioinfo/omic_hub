import { STORAGE_KEYS, SYNC_CHANNEL_NAME } from './keys';
import { readRaw, writeRaw } from './localStore';

export type StorageEventListener = (key: string, data: any) => void;

const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(SYNC_CHANNEL_NAME)
  : null;

const listeners: Set<StorageEventListener> = new Set();

if (typeof window !== 'undefined') {
  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      const { key, data } = event.data || {};
      listeners.forEach((listener) => listener(key, data));
    };
  }

  window.addEventListener('storage', (event) => {
    if (event.key && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        listeners.forEach((listener) => listener(event.key!, parsed));
      } catch {
        // ignore
      }
    }
  });
}

export function subscribe(listener: StorageEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLastSyncTime(): string {
  return readRaw(STORAGE_KEYS.LAST_SYNC) || new Date().toISOString();
}

export function notifySync(key: string, data: any): void {
  const now = new Date().toISOString();

  if (!writeRaw(STORAGE_KEYS.LAST_SYNC, now)) {
    console.error('Storage error: could not persist last sync time');
  }

  if (syncChannel) {
    try {
      syncChannel.postMessage({ key, data, timestamp: now });
    } catch {
      // ignore
    }
  }

  listeners.forEach((listener) => listener(key, data));
}
