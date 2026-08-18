import { NotificationItem } from '../../core/http/notifications-api.service';

export type NotificationIcon = 'invite' | 'member' | 'review' | 'upload' | 'booking';

export type NotificationPresentation = {
  messageKey: string;
  params: Record<string, string>;
  link: string;
  queryParams?: Record<string, string>;
  icon: NotificationIcon;
};

export type SessionsTab = 'upcoming' | 'past' | 'cancelled';

// The booking notifications deep-link to the tab that actually holds the
// booking. Linking a cancelled or already-finished session to the default
// "upcoming" tab lands the recipient on an empty list. The tab is a route path
// segment (`sessions/:tab`), never a query param — `/sessions?tab=` matches the
// `sessions` -> `sessions/upcoming` redirect and loses the tab entirely.
//
// A session counts as upcoming until it actually ends, so a live one links to
// "upcoming" rather than "past". This mirrors SessionsOverviewStore, where
// upcoming = in progress || starts later and completed = endsAt <= now.
export function sessionsTabFor(item: NotificationItem, now = Date.now()): SessionsTab {
  if (item.type === 'coaching_booking_cancelled') return 'cancelled';
  const scheduledAt = item.payload?.scheduled_at;
  if (!scheduledAt) return 'upcoming';
  const startsAt = new Date(scheduledAt).getTime();
  if (Number.isNaN(startsAt)) return 'upcoming';
  // A missing, zero or nonsensical duration degrades to a zero-length session,
  // i.e. the start time alone. Those are legacy rows recorded before
  // duration_minutes existed, so they are old enough that the session has
  // ended — better than inventing a length.
  const durationMinutes = item.payload?.duration_minutes;
  const minutes =
    typeof durationMinutes === 'number' && Number.isFinite(durationMinutes) && durationMinutes > 0
      ? durationMinutes
      : 0;
  const endsAt = startsAt + minutes * 60 * 1000;
  return now < endsAt ? 'upcoming' : 'past';
}

export function notificationLink(item: NotificationItem): {
  link: string;
  queryParams?: Record<string, string>;
} {
  const view = presentNotification(item, () => '');
  return { link: view.link, queryParams: view.queryParams };
}

// presentNotification maps a notification to its i18n key + interpolation params
// and the in-app deep-link target derived from the denormalized payload. Pure,
// so it is unit-tested directly and keeps the shell template declarative.
export function presentNotification(
  item: NotificationItem,
  formatWhen: (iso: string) => string,
): NotificationPresentation {
  const p = item.payload ?? {};
  const when = p.scheduled_at ? formatWhen(p.scheduled_at) : '';

  switch (item.type) {
    case 'group_invitation_received':
      return {
        messageKey: p.inviter_name
          ? 'notifications.types.groupInvitationReceived'
          : 'notifications.types.groupInvitationReceivedNoActor',
        params: { inviter: p.inviter_name ?? '', group: p.group_name ?? '' },
        link: '/groups',
        queryParams: p.code ? { invite: p.code } : undefined,
        icon: 'invite',
      };
    case 'group_member_joined':
      return {
        messageKey: 'notifications.types.groupMemberJoined',
        params: { member: p.member_name ?? '', group: p.group_name ?? '' },
        link: p.group_id ? `/groups/${p.group_id}` : '/groups',
        icon: 'member',
      };
    case 'video_reviewed':
      return {
        messageKey: 'notifications.types.videoReviewed',
        params: { video: p.video_title ?? '', reviewer: p.reviewer_name ?? '' },
        link: p.asset_id ? `/asset/${p.asset_id}` : '/videos',
        icon: 'review',
      };
    case 'video_uploaded':
      return {
        messageKey: p.group_name
          ? 'notifications.types.videoUploaded'
          : 'notifications.types.videoUploadedNoGroup',
        params: {
          uploader: p.uploader_name ?? '',
          group: p.group_name ?? '',
          video: p.video_title ?? '',
        },
        link: p.asset_id ? `/asset/${p.asset_id}` : '/videos',
        icon: 'upload',
      };
    case 'coaching_booking_created':
      return {
        messageKey: 'notifications.types.coachingBookingCreated',
        params: { student: p.student_name ?? '', session: p.session_name ?? '', when },
        link: `/sessions/${sessionsTabFor(item)}`,
        icon: 'booking',
      };
    case 'coaching_booking_cancelled':
      return {
        messageKey: p.session_name
          ? 'notifications.types.coachingBookingCancelled'
          : 'notifications.types.coachingBookingCancelledNoSession',
        params: { actor: p.actor_name ?? '', session: p.session_name ?? '', when },
        link: `/sessions/${sessionsTabFor(item)}`,
        icon: 'booking',
      };
    default:
      return { messageKey: 'notifications.types.generic', params: {}, link: '/', icon: 'invite' };
  }
}
