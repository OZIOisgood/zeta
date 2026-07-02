import i18next from 'i18next';
import type { TFunction } from 'i18next';

/**
 * The APP language (user preference), not the device locale — absolute dates
 * must not render "7/2/2026" inside a German UI when the device is set to
 * en-US. Falls back to the device locale before i18n has initialised.
 */
function appLocale(): string | undefined {
  return i18next.language || undefined;
}

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
  // Date-only keys (YYYY-MM-DD) parse as UTC midnight per the ECMA spec — west
  // of UTC that DISPLAYS the previous day. Re-build them from local parts.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(appLocale());
}

/**
 * YYYY-MM-DD from LOCAL date parts — the availability API's date key.
 * `toISOString().slice(0, 10)` is the UTC date: off by one every evening west
 * of UTC, and after midnight east of it (experts blocked the wrong day).
 */
export function localDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Locale-aware month + year label — e.g. "March 2026" (month: long, year: numeric).
 * Used by the reports period selector for the month granularity.
 * Empty on invalid input.
 */
export function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(appLocale(), { month: 'long', year: 'numeric' });
}
