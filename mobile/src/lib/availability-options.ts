import type { ZSelectOption } from '../components/ui/z-select';
import { formatDate, localDateKey } from './datetime';

/**
 * Shared option builders for the availability formSheet routes
 * (availability-session-type / availability-slot / availability-blocked).
 */

// Duration VALUES only; the `label` is built at render time via
// t('common.labels.minutesShort', { count }) so it shares the reports minutes
// key — do NOT hardcode `${m} min`.
export const DURATION_VALUES: number[] = Array.from(
  { length: (120 - 15) / 5 + 1 },
  (_, i) => 15 + i * 5,
);

function buildTimeOptions(): ZSelectOption[] {
  const out: ZSelectOption[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      out.push({ value: v, label: v });
    }
  }
  return out;
}
// Locale-neutral (HH:mm) — safe to precompute at module scope.
export const TIME_OPTIONS = buildTimeOptions();

// NOT precomputed at module scope: formatDate() reads the app language at
// call time, and at import time the profile language (applied on login) is
// not loaded yet — the labels froze in the boot locale (showed 7/3/2026 in
// the German app). "today" would also go stale across midnight. Callers
// memoize per language instead: useMemo(() => dateOptions(), [i18n.language]).
export function dateOptions(): ZSelectOption[] {
  const out: ZSelectOption[] = [];
  const today = new Date();
  for (let i = 0; i < 90; i += 1) {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() + i);
    // LOCAL date key, not toISOString(): the UTC date is off by one every
    // evening west of UTC — the picker labelled/blocked the wrong day.
    const value = localDateKey(d); // YYYY-MM-DD (the API value)
    // Label via the shared datetime helper — no per-screen formatter.
    out.push({ value, label: formatDate(value) });
  }
  return out;
}
