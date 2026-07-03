import { formatDate, formatMonthYear, formatRelativeTime } from './datetime';

// Minimal i18next-style t: returns "<key>:<count?>" so we can assert the bucket
// chosen and the count passed, without booting i18n.
const t = ((key: string, opts?: { count?: number }) =>
  opts && typeof opts.count === 'number' ? `${key}:${opts.count}` : key) as never;

const NOW = new Date('2026-06-13T12:00:00.000Z').getTime();

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterAll(() => {
  jest.restoreAllMocks();
});

const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

test('under a minute → just now', () => {
  expect(formatRelativeTime(ago(30), t)).toBe('common.time.justNow');
});

test('minutes bucket → minutesAgo with count', () => {
  expect(formatRelativeTime(ago(5 * 60), t)).toBe('common.time.minutesAgo:5');
});

test('hours bucket → hoursAgo with count', () => {
  expect(formatRelativeTime(ago(3 * 3600), t)).toBe('common.time.hoursAgo:3');
});

test('days bucket → daysAgo with count', () => {
  expect(formatRelativeTime(ago(2 * 86400), t)).toBe('common.time.daysAgo:2');
});

test('over a week → absolute locale date (not a relative key)', () => {
  const out = formatRelativeTime(ago(10 * 86400), t);
  expect(out).not.toContain('common.time.');
  expect(out).toBe(formatDate(ago(10 * 86400)));
});

test('invalid / empty ISO → empty string', () => {
  expect(formatRelativeTime('', t)).toBe('');
  expect(formatRelativeTime('not-a-date', t)).toBe('');
});

test('formatDate returns a non-empty locale string for a valid ISO', () => {
  expect(formatDate('2026-06-13T12:00:00.000Z')).not.toBe('');
});

test('formatDate returns empty string for invalid ISO', () => {
  expect(formatDate('')).toBe('');
  expect(formatDate('nope')).toBe('');
});

// formatMonthYear — "March 2026" style (month: long, year: numeric)
test('formatMonthYear returns long month + year for a valid ISO date', () => {
  // 2026-03-01 should produce something like "March 2026" (locale-specific long month)
  const result = formatMonthYear('2026-03-01T00:00:00.000Z');
  expect(result).not.toBe('');
  // Must contain the 4-digit year
  expect(result).toContain('2026');
  // Must NOT be a raw numeric date like "3/1/2026"
  expect(result).not.toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
});

test('formatMonthYear returns empty string for invalid ISO', () => {
  expect(formatMonthYear('')).toBe('');
  expect(formatMonthYear('not-a-date')).toBe('');
});
