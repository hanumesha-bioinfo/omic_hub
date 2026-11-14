import { BioinformaticsNewsItem } from '../../types';
import { INITIAL_BIOINFORMATICS_NEWS } from './defaults';
import { STORAGE_KEYS } from './keys';
import { readJson, writeJson } from './localStore';
import { notifySync } from './sync';

export function getNews(): BioinformaticsNewsItem[] {
  const stored = readJson<BioinformaticsNewsItem[]>(STORAGE_KEYS.NEWS);
  return stored.status === 'ok' && Array.isArray(stored.value)
    ? stored.value
    : INITIAL_BIOINFORMATICS_NEWS;
}

export function saveNews(news: BioinformaticsNewsItem[]): void {
  if (writeJson(STORAGE_KEYS.NEWS, news)) {
    notifySync(STORAGE_KEYS.NEWS, news);
  }
}

export function getBookmarkedNewsIds(): string[] {
  const stored = readJson<string[]>(STORAGE_KEYS.BOOKMARKED_NEWS);
  return stored.status === 'ok' && Array.isArray(stored.value) ? stored.value : [];
}

export function toggleBookmarkNews(newsId: string): boolean {
  const current = getBookmarkedNewsIds();
  const exists = current.includes(newsId);
  const updated = exists ? current.filter((id) => id !== newsId) : [...current, newsId];

  if (writeJson(STORAGE_KEYS.BOOKMARKED_NEWS, updated)) {
    notifySync(STORAGE_KEYS.BOOKMARKED_NEWS, updated);
  }

  return !exists;
}
