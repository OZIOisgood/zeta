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
// "upcoming" tab lands the recipient on an empty list.
export function sessionsTabFor(item: NotificationItem, now = Date.now()): SessionsTab {
  if (item.type === 'coaching_booking_cancelled') return 'cancelled';
  const scheduledAt = item.payload?.scheduled_at;
  if (!scheduledAt) return 'upcoming';
  const startsAt = new Date(scheduledAt).getTime();
  if (Number.isNaN(startsAt)) return 'upcoming';
  return startsAt > now ? 'upcoming' : 'past';
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
        link: '/sessions',
        queryParams: { tab: sessionsTabFor(item) },
        icon: 'booking',
      };
    case 'coaching_booking_cancelled':
      return {
        messageKey: 'notifications.types.coachingBookingCancelled',
        params: { actor: p.actor_name ?? '', session: p.session_name ?? '', when },
        link: '/sessions',
        queryParams: { tab: sessionsTabFor(item) },
        icon: 'booking',
      };
    default:
      return { messageKey: 'notifications.types.generic', params: {}, link: '/', icon: 'invite' };
  }
}
