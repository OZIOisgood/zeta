import type { Href } from 'expo-router';
import type { NotificationItem } from '../api/queries/notifications';

export type NotificationIcon = 'invite' | 'member' | 'review' | 'upload' | 'booking';

export type NotificationPresentation = {
  messageKey: string;
  params: Record<string, string>;
  href: Href;
  icon: NotificationIcon;
};

export type SessionsTab = 'upcoming' | 'past' | 'cancelled';

// Mirrors the web presenter: link to the tab that actually holds the booking.
// Linking a cancelled or already-finished session to the default "upcoming"
// tab lands the recipient on an empty list.
export function sessionsTabFor(item: NotificationItem, now = Date.now()): SessionsTab {
  if (item.type === 'coaching_booking_cancelled') return 'cancelled';
  const scheduledAt = item.payload?.scheduled_at;
  if (!scheduledAt) return 'upcoming';
  const startsAt = new Date(scheduledAt).getTime();
  if (Number.isNaN(startsAt)) return 'upcoming';
  return startsAt > now ? 'upcoming' : 'past';
}

/** The deep-link target alone, for callers that only need to navigate (e.g. onOpen). */
export function notificationHref(item: NotificationItem): Href {
  return presentNotification(item, () => '').href;
}

/**
 * Maps a notification to its i18n key + interpolation params, expo-router
 * deep-link target, and icon name. Pure — unit-tested directly. Mobile port of
 * web/dashboard-next/src/app/features/notifications/notification-presenter.ts;
 * the only divergence is the deep-link, retargeted to the mobile routes
 * (invite screen instead of /groups?invite=, /group/[id], /asset/[id]).
 */
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
        href: { pathname: '/invite', params: p.code ? { code: p.code } : {} } as Href,
        icon: 'invite',
      };
    case 'group_member_joined':
      return {
        messageKey: 'notifications.types.groupMemberJoined',
        params: { member: p.member_name ?? '', group: p.group_name ?? '' },
        href: p.group_id
          ? ({ pathname: '/group/[id]', params: { id: p.group_id } } as Href)
          : ({ pathname: '/groups' } as Href),
        icon: 'member',
      };
    case 'video_reviewed':
      return {
        messageKey: 'notifications.types.videoReviewed',
        params: { video: p.video_title ?? '', reviewer: p.reviewer_name ?? '' },
        href: p.asset_id
          ? ({ pathname: '/asset/[id]', params: { id: p.asset_id } } as Href)
          : ({ pathname: '/videos' } as Href),
        icon: 'review',
      };
    case 'video_uploaded':
      return {
        messageKey: p.group_name
          ? 'notifications.types.videoUploaded'
          : 'notifications.types.videoUploadedNoGroup',
        params: { uploader: p.uploader_name ?? '', group: p.group_name ?? '', video: p.video_title ?? '' },
        href: p.asset_id
          ? ({ pathname: '/asset/[id]', params: { id: p.asset_id } } as Href)
          : ({ pathname: '/videos' } as Href),
        icon: 'upload',
      };
    case 'coaching_booking_created':
      return {
        messageKey: 'notifications.types.coachingBookingCreated',
        params: { student: p.student_name ?? '', session: p.session_name ?? '', when },
        href: { pathname: '/coaching', params: { tab: sessionsTabFor(item) } } as Href,
        icon: 'booking',
      };
    case 'coaching_booking_cancelled':
      return {
        messageKey: p.session_name
          ? 'notifications.types.coachingBookingCancelled'
          : 'notifications.types.coachingBookingCancelledNoSession',
        params: { actor: p.actor_name ?? '', session: p.session_name ?? '', when },
        href: { pathname: '/coaching', params: { tab: sessionsTabFor(item) } } as Href,
        icon: 'booking',
      };
    default:
      return {
        messageKey: 'notifications.types.generic',
        params: {},
        href: { pathname: '/' } as Href,
        icon: 'invite',
      };
  }
}

/** True only for actionable group-invitation rows (offer accept/decline). */
export function isInvite(item: NotificationItem): boolean {
  return item.type === 'group_invitation_received';
}

/**
 * Resolution state for an invitation row, preferring the server-reported status.
 * Mobile has no optimistic client `inviteState` (the web store's field) — after
 * accept/decline we invalidate and re-read, so `invite_status` is the source of truth.
 */
export function resolvedInvite(item: NotificationItem): 'accepted' | 'declined' | null {
  if (item.invite_status === 'accepted') return 'accepted';
  if (item.invite_status === 'declined') return 'declined';
  return null;
}

/** Offer accept/decline only while the invitation is still actionable. */
export function showInviteActions(item: NotificationItem): boolean {
  return isInvite(item) && !resolvedInvite(item) && item.invite_status !== 'expired';
}
