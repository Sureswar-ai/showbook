/**
 * Helpers for models whose array/JSON fields are stored as JSON strings
 * (SQLite demo build — Prisma SQLite doesn't support scalar lists).
 */

export function parseArr(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function parseJson<T = unknown>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
