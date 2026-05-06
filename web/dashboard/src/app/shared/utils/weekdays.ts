export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const DEFAULT_FIRST_DAY_OF_WEEK = 0;
const MONDAY_FIRST_TIME_ZONE_PREFIXES = ['Europe/', 'Australia/'];
const MONDAY_FIRST_TIME_ZONES = new Set([
  'Antarctica/McMurdo',
  'Antarctica/South_Pole',
  'Pacific/Auckland',
  'Pacific/Chatham',
]);

interface IntlLocaleConstructor {
  new (tag: string): {
    weekInfo?: {
      firstDay?: number;
    };
  };
}

export function orderedWeekdayValues(firstDayOfWeek: number): number[] {
  const firstDay = normalizeWeekday(firstDayOfWeek);

  return Array.from({ length: WEEKDAY_NAMES.length }, (_, offset) => (firstDay + offset) % 7);
}

export function resolveFirstDayOfWeek(timeZone?: string | null, language?: string | null): number {
  return (
    firstDayFromTimeZone(timeZone) ??
    (timeZone ? null : firstDayFromBrowserTimeZone()) ??
    firstDayFromLocale(language) ??
    firstDayFromBrowserLocales() ??
    DEFAULT_FIRST_DAY_OF_WEEK
  );
}

function firstDayFromTimeZone(timeZone?: string | null): number | null {
  if (!timeZone) {
    return null;
  }

  if (MONDAY_FIRST_TIME_ZONE_PREFIXES.some((prefix) => timeZone.startsWith(prefix))) {
    return 1;
  }

  if (MONDAY_FIRST_TIME_ZONES.has(timeZone)) {
    return 1;
  }

  return null;
}

function firstDayFromBrowserTimeZone(): number | null {
  try {
    return firstDayFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

function firstDayFromBrowserLocales(): number | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const language of languages) {
    const firstDay = firstDayFromLocale(language);
    if (firstDay !== null) {
      return firstDay;
    }
  }

  return null;
}

function firstDayFromLocale(language?: string | null): number | null {
  if (!language) {
    return null;
  }

  const LocaleConstructor = (Intl as unknown as { Locale?: IntlLocaleConstructor }).Locale;
  if (!LocaleConstructor) {
    return null;
  }

  try {
    const firstDay = new LocaleConstructor(language).weekInfo?.firstDay;
    return typeof firstDay === 'number' ? normalizeIntlWeekday(firstDay) : null;
  } catch {
    return null;
  }
}

function normalizeIntlWeekday(firstDay: number): number {
  return firstDay === 7 ? 0 : normalizeWeekday(firstDay);
}

function normalizeWeekday(day: number): number {
  return ((day % 7) + 7) % 7;
}
