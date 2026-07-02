import { groupByDay } from './notification-groups';
import type { NotificationItem } from '../api/queries/notifications';

const NOW = new Date('2026-06-13T12:00:00Z');
function make(id: string, createdAt: string): NotificationItem {
  return {
    id,
    type: 'group_member_joined',
    payload: {},
    read: false,
    created_at: createdAt,
  } as NotificationItem;
}

test('buckets same-day items into today and older into earlier, in order', () => {
  const items = [
    make('a', '2026-06-13T09:00:00Z'), // today (same calendar day as NOW in any UTC±14 timezone)
    make('b', '2026-06-11T12:00:00Z'), // earlier (2 days before NOW — unambiguously different day in any timezone)
    make('c', '2026-06-13T11:00:00Z'), // today
  ];
  const groups = groupByDay(items, NOW);
  expect(groups.map((g) => g.key)).toEqual(['today', 'earlier']);
  expect(groups[0]).toEqual({ key: 'today', titleKey: 'notifications.today', data: [items[0], items[2]] });
  expect(groups[1]).toEqual({ key: 'earlier', titleKey: 'notifications.earlier', data: [items[1]] });
});

test('drops empty buckets (only earlier items, no today bucket)', () => {
  const groups = groupByDay([make('a', '2026-06-01T12:00:00Z')], NOW);
  expect(groups.map((g) => g.key)).toEqual(['earlier']);
});

test('returns no sections for an empty list', () => {
  expect(groupByDay([], NOW)).toEqual([]);
});
