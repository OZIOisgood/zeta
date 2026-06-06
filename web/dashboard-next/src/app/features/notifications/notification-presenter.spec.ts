import { NotificationItem } from '../../core/http/notifications-api.service';
import { presentNotification } from './notification-presenter';

function build(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    id: 'n1',
    type: 'group_member_joined',
    payload: {},
    read: false,
    created_at: '2026-06-05T10:00:00Z',
    ...overrides,
  };
}

describe('presentNotification', () => {
  it('maps a group invitation with an inviter and carries the code as a query param', () => {
    const view = presentNotification(
      build({
        type: 'group_invitation_received',
        payload: { inviter_name: 'Sofia', group_name: 'Academy', code: 'ZP-1' },
      }),
    );

    expect(view.messageKey).toBe('notifications.types.groupInvitationReceived');
    expect(view.params).toEqual({ inviter: 'Sofia', group: 'Academy' });
    expect(view.link).toBe('/groups');
    expect(view.queryParams).toEqual({ invite: 'ZP-1' });
    expect(view.icon).toBe('invite');
  });

  it('falls back to the actor-less invitation key and omits query params without a code', () => {
    const view = presentNotification(
      build({
        type: 'group_invitation_received',
        payload: { group_name: 'Academy' },
      }),
    );

    expect(view.messageKey).toBe('notifications.types.groupInvitationReceivedNoActor');
    expect(view.queryParams).toBeUndefined();
  });

  it('deep-links a joined member to the group when the id is known', () => {
    const view = presentNotification(
      build({
        type: 'group_member_joined',
        payload: { member_name: 'Max', group_name: 'Academy', group_id: 'g1' },
      }),
    );

    expect(view.messageKey).toBe('notifications.types.groupMemberJoined');
    expect(view.link).toBe('/groups/g1');
    expect(view.icon).toBe('member');
  });

  it('deep-links a reviewed video to the asset and uses the review icon', () => {
    const view = presentNotification(
      build({
        type: 'video_reviewed',
        payload: { video_title: 'Backhand', reviewer_name: 'Sofia', asset_id: 'a1' },
      }),
    );

    expect(view.messageKey).toBe('notifications.types.videoReviewed');
    expect(view.link).toBe('/asset/a1');
    expect(view.icon).toBe('review');
  });

  it('uses the no-group upload key when no group name is present', () => {
    const withGroup = presentNotification(
      build({
        type: 'video_uploaded',
        payload: {
          uploader_name: 'Max',
          group_name: 'Academy',
          video_title: 'Serve',
          asset_id: 'a2',
        },
      }),
    );
    const withoutGroup = presentNotification(
      build({
        type: 'video_uploaded',
        payload: { uploader_name: 'Max', video_title: 'Serve', asset_id: 'a2' },
      }),
    );

    expect(withGroup.messageKey).toBe('notifications.types.videoUploaded');
    expect(withoutGroup.messageKey).toBe('notifications.types.videoUploadedNoGroup');
    expect(withGroup.link).toBe('/asset/a2');
    expect(withGroup.icon).toBe('upload');
  });

  it('links a booking to the sessions page', () => {
    const view = presentNotification(
      build({
        type: 'coaching_booking_created',
        payload: { student_name: 'Lena', session_name: 'Live coaching' },
      }),
    );

    expect(view.messageKey).toBe('notifications.types.coachingBookingCreated');
    expect(view.link).toBe('/sessions');
    expect(view.icon).toBe('booking');
  });

  it('falls back gracefully for an unknown type', () => {
    const view = presentNotification(build({ type: 'unknown_type' as never, payload: {} }));

    expect(view.messageKey).toBe('notifications.types.generic');
    expect(view.link).toBe('/');
  });
});
