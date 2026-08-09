import type { NotificationItem } from '../api/queries/notifications';

export type NotificationDaySection = {
  key: 'today' | 'earlier';
  titleKey: string;
  data: NotificationItem[];
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Buckets notifications into Today / Earlier day sections for the SectionList,
 * dropping empty buckets — the mobile counterpart of the web NotificationsStore
 * `grouped` computed. `now` is injectable for deterministic tests.
 */
export function groupByDay(
  items: NotificationItem[],
  now: Date = new Date(),
): NotificationDaySection[] {
  const today: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];
  for (const item of items) {
    (isSameDay(new Date(item.created_at), now) ? today : earlier).push(item);
  }
  return (
    [
      { key: 'today', titleKey: 'notifications.today', data: today },
      { key: 'earlier', titleKey: 'notifications.earlier', data: earlier },
    ] as NotificationDaySection[]
  ).filter((section) => section.data.length > 0);
}
