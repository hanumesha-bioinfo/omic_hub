import { JobApplication } from '../../types';
import { STORAGE_KEYS } from './keys';
import { readJson, writeJson } from './localStore';
import { notifySync } from './sync';

export function getApplications(): JobApplication[] {
  const stored = readJson<JobApplication[]>(STORAGE_KEYS.APPLICATIONS);
  if (stored.status !== 'ok' || !Array.isArray(stored.value)) return [];

  return stored.value.filter(
    (application) =>
      application != null &&
      typeof application === 'object' &&
      !['app_1', 'app_2', 'app_3', 'app_4', 'app_5', 'app_6'].includes(application.id)
  );
}

export function saveApplications(apps: JobApplication[]): void {
  if (writeJson(STORAGE_KEYS.APPLICATIONS, apps)) {
    notifySync(STORAGE_KEYS.APPLICATIONS, apps);
  }
}
