import type { TFunction } from 'i18next';

/**
 * The single relative/absolute time helper for the mobile app. Consolidates the
 * formatter that used to live privately in `review-item.tsx`, the notifications
 * relative-time, and the inline reports/availability date formatting. ALL
 * relative/absolute time display goes through this module — no per-screen
 * formatters. Web uses a RelativeTimePipe; this is the lightweight mobile port,
 * now localized via `common.time.*`.
 */
export function formatRelativeTime(iso: string, t: TFunction): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return t('common.time.justNow');
  if (diffSec < 3600) return t('common.time.minutesAgo', { count: Math.floor(diffSec / 60) });
  if (diffSec < 86400) return t('common.time.hoursAgo', { count: Math.floor(diffSec / 3600) });
  if (diffSec < 604800) return t('common.time.daysAgo', { count: Math.floor(diffSec / 86400) });
  return formatDate(iso);
}

/** Locale-aware absolute date (day/slot/absolute display). Empty on invalid input. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}
