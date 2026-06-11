import { DEFAULT_CATEGORIES } from '@country-city/shared';

const BY_ID = new Map<string, { id: string; en: string; he: string }>(
  DEFAULT_CATEGORIES.map((c) => [c.id, c]),
);

/**
 * Resolve a category id to its display label in the room's language.
 * Custom categories (not in DEFAULT_CATEGORIES) fall back to their id/label.
 * Mirrors the server-side resolver in GameService.categoryLabel.
 */
export function categoryLabel(id: string, language: string): string {
  const def = BY_ID.get(id);
  if (def) return language === 'he' ? def.he : def.en;
  return id;
}
