import { ActivityItem } from '../../types';
import { INITIAL_ACTIVITIES } from './defaults';
import { STORAGE_KEYS } from './keys';
import { readJson, writeJson } from './localStore';
import { notifySync } from './sync';

export function getActivities(): ActivityItem[] {
  const stored = readJson<ActivityItem[]>(STORAGE_KEYS.ACTIVITIES);
  return stored.status === 'ok' && Array.isArray(stored.value) ? stored.value : INITIAL_ACTIVITIES;
}

export function addActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>): ActivityItem[] {
  const list = getActivities();
  const newItem: ActivityItem = {
    ...item,
    id: `act_${Date.now()}`,
    timestamp: 'Just now',
  };
  const updated = [newItem, ...list.slice(0, 24)];

  if (writeJson(STORAGE_KEYS.ACTIVITIES, updated)) {
    notifySync(STORAGE_KEYS.ACTIVITIES, updated);
  }

  return updated;
}
