import { NotificationItem } from '../../core/http/notifications-api.service';

export type NotificationIcon = 'invite' | 'member' | 'review' | 'upload' | 'booking';

export type NotificationPresentation = {
  messageKey: string;
  params: Record<string, string>;
  link: string;
  queryParams?: Record<string, string>;
  icon: NotificationIcon;
};

// presentNotification maps a notification to its i18n key + interpolation params
// and the in-app deep-link target derived from the denormalized payload. Pure,
// so it is unit-tested directly and keeps the shell template declarative.
export function presentNotification(item: NotificationItem): NotificationPresentation {
  const p = item.payload ?? {};

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
        params: { student: p.student_name ?? '', session: p.session_name ?? '' },
        link: '/sessions',
        icon: 'booking',
      };
    default:
      return { messageKey: 'notifications.types.generic', params: {}, link: '/', icon: 'invite' };
  }
}
