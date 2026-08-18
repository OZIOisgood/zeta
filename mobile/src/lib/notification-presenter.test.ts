import { notificationHref, presentNotification } from './notification-presenter';
import type { NotificationItem } from '../api/queries/notifications';

function make(partial: Partial<NotificationItem>): NotificationItem {
  return {
    id: 'n',
    type: 'group_invitation_received',
    payload: {},
    read: false,
    created_at: '2026-06-13T10:00:00Z',
    ...partial,
  } as NotificationItem;
}

const formatWhen = (iso: string) => `formatted(${iso})`;

test('group_invitation_received with an inviter uses the actor key and /invite href', () => {
  const v = presentNotification(
    make({ type: 'group_invitation_received', payload: { inviter_name: 'Sam', group_name: 'Karate', code: 'aB3xZ9' } }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.groupInvitationReceived');
  expect(v.params).toEqual({ inviter: 'Sam', group: 'Karate' });
  expect(v.href).toEqual({ pathname: '/invite', params: { code: 'aB3xZ9' } });
  expect(v.icon).toBe('invite');
});

test('group_invitation_received without an inviter uses the no-actor key', () => {
  const v = presentNotification(
    make({ type: 'group_invitation_received', payload: { group_name: 'Karate' } }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.groupInvitationReceivedNoActor');
  expect(v.href).toEqual({ pathname: '/invite', params: {} });
});

test('group_member_joined links to the group detail when group_id present', () => {
  const v = presentNotification(
    make({ type: 'group_member_joined', payload: { member_name: 'Lee', group_name: 'Karate', group_id: 'g1' } }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.groupMemberJoined');
  expect(v.params).toEqual({ member: 'Lee', group: 'Karate' });
  expect(v.href).toEqual({ pathname: '/group/[id]', params: { id: 'g1' } });
  expect(v.icon).toBe('member');
});

test('group_member_joined without group_id falls back to /groups', () => {
  const v = presentNotification(
    make({ type: 'group_member_joined', payload: { member_name: 'Lee' } }),
    formatWhen,
  );
  expect(v.href).toEqual({ pathname: '/groups' });
});

test('video_reviewed links to the asset detail', () => {
  const v = presentNotification(
    make({ type: 'video_reviewed', payload: { video_title: 'Kata', reviewer_name: 'Coach', asset_id: 'a1' } }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.videoReviewed');
  expect(v.params).toEqual({ video: 'Kata', reviewer: 'Coach' });
  expect(v.href).toEqual({ pathname: '/asset/[id]', params: { id: 'a1' } });
  expect(v.icon).toBe('review');
});

test('video_uploaded with a group uses the group key, else the no-group key', () => {
  const withGroup = presentNotification(
    make({
      type: 'video_uploaded',
      payload: { uploader_name: 'Lee', group_name: 'Karate', video_title: 'Kata', asset_id: 'a1' },
    }),
    formatWhen,
  );
  expect(withGroup.messageKey).toBe('notifications.types.videoUploaded');
  const noGroup = presentNotification(
    make({ type: 'video_uploaded', payload: { uploader_name: 'Lee', video_title: 'Kata', asset_id: 'a1' } }),
    formatWhen,
  );
  expect(noGroup.messageKey).toBe('notifications.types.videoUploadedNoGroup');
  expect(noGroup.icon).toBe('upload');
});

test('coaching_booking_created shows the time and targets the upcoming tab', () => {
  const v = presentNotification(
    make({
      type: 'coaching_booking_created',
      payload: { student_name: 'Lena', session_name: 'Live coaching', scheduled_at: '2999-01-01T10:00:00Z' },
    }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.coachingBookingCreated');
  expect(v.params).toEqual({
    student: 'Lena',
    session: 'Live coaching',
    when: 'formatted(2999-01-01T10:00:00Z)',
  });
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'upcoming' } });
  expect(v.icon).toBe('booking');
});

test('coaching_booking_created for a past session targets the past tab', () => {
  const v = presentNotification(
    make({ type: 'coaching_booking_created', payload: { scheduled_at: '2020-01-01T10:00:00Z' } }),
    formatWhen,
  );
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'past' } });
});

test('coaching_booking_created falls back to the upcoming tab when scheduled_at is missing', () => {
  const v = presentNotification(
    make({ type: 'coaching_booking_created', payload: { student_name: 'Lena' } }),
    formatWhen,
  );
  expect(v.params).toEqual({ student: 'Lena', session: '', when: '' });
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'upcoming' } });
});

test('coaching_booking_created falls back to the upcoming tab when scheduled_at is unparseable', () => {
  const v = presentNotification(
    make({
      type: 'coaching_booking_created',
      payload: { student_name: 'Lena', scheduled_at: 'not-a-date' },
    }),
    formatWhen,
  );
  expect(v.params).toEqual({ student: 'Lena', session: '', when: 'formatted(not-a-date)' });
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'upcoming' } });
});

test('coaching_booking_cancelled names the actor and targets the cancelled tab', () => {
  const v = presentNotification(
    make({
      type: 'coaching_booking_cancelled',
      payload: { actor_name: 'Vanessa', session_name: 'Live coaching', scheduled_at: '2999-01-01T10:00:00Z' },
    }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.coachingBookingCancelled');
  expect(v.params).toEqual({
    actor: 'Vanessa',
    session: 'Live coaching',
    when: 'formatted(2999-01-01T10:00:00Z)',
  });
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'cancelled' } });
  expect(v.icon).toBe('booking');
});

test('coaching_booking_cancelled falls back to the no-session key when the session name is missing', () => {
  const v = presentNotification(
    make({
      type: 'coaching_booking_cancelled',
      payload: { actor_name: 'Vanessa', scheduled_at: '2999-01-01T10:00:00Z' },
    }),
    formatWhen,
  );
  expect(v.messageKey).toBe('notifications.types.coachingBookingCancelledNoSession');
  expect(v.params).toEqual({ actor: 'Vanessa', session: '', when: 'formatted(2999-01-01T10:00:00Z)' });
  expect(v.href).toEqual({ pathname: '/coaching', params: { tab: 'cancelled' } });
});

test('notificationHref returns the target without a formatter', () => {
  const href = notificationHref(make({ type: 'coaching_booking_cancelled', payload: {} }));
  expect(href).toEqual({ pathname: '/coaching', params: { tab: 'cancelled' } });
});

test('unknown type falls back to the generic key and home href', () => {
  const v = presentNotification(make({ type: 'something_new' }), formatWhen);
  expect(v.messageKey).toBe('notifications.types.generic');
  expect(v.href).toEqual({ pathname: '/' });
  expect(v.icon).toBe('invite');
});
