import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { NotificationItem } from '../api/queries/notifications';
import { NotificationRow } from './notification-row';
import { mockNotificationRead, mockNotificationUnread } from './__stories__/fixtures';

// ── Inline fixtures ───────────────────────────────────────────────────────────
// The two committed notification fixtures cover the unread/actionable-invite and
// read/video-reviewed cases. The remaining type + invite-resolution variations
// are defined locally (fixtures.ts is owned by other agents in parallel).

/** Invite already accepted — renders the green resolved-state row. */
const mockInviteAccepted: NotificationItem = {
  id: '33333333-3333-4333-8333-333333333333',
  type: 'group_invitation_received',
  payload: {
    group_id: 'grp_01HZX0000000000000000000A',
    group_name: 'Brazilian Jiu-Jitsu',
    inviter_name: 'Marina Costa',
    code: 'INV-ACC123',
  },
  read: true,
  invite_status: 'accepted',
  created_at: '2026-06-12T11:00:00Z',
};

/** Invite declined — renders the muted resolved-state row. */
const mockInviteDeclined: NotificationItem = {
  id: '44444444-4444-4444-8444-444444444444',
  type: 'group_invitation_received',
  payload: {
    group_id: 'grp_01HZX0000000000000000000A',
    group_name: 'Brazilian Jiu-Jitsu',
    inviter_name: 'Marina Costa',
    code: 'INV-DEC123',
  },
  read: true,
  invite_status: 'declined',
  created_at: '2026-06-11T11:00:00Z',
};

/** Invite expired — renders the "expired" muted hint, no action buttons. */
const mockInviteExpired: NotificationItem = {
  id: '55555555-5555-4555-8555-555555555555',
  type: 'group_invitation_received',
  payload: {
    group_id: 'grp_01HZX0000000000000000000A',
    group_name: 'Brazilian Jiu-Jitsu',
    inviter_name: 'Marina Costa',
    code: 'INV-EXP123',
  },
  read: false,
  invite_status: 'expired',
  created_at: '2026-06-01T11:00:00Z',
};

/** Member joined — 'member' icon, success tone. */
const mockMemberJoined: NotificationItem = {
  id: '66666666-6666-4666-8666-666666666666',
  type: 'group_member_joined',
  payload: {
    group_id: 'grp_01HZX0000000000000000000A',
    group_name: 'Brazilian Jiu-Jitsu',
    member_name: 'Liam Becker',
  },
  read: false,
  created_at: '2026-06-13T08:30:00Z',
};

/** Video uploaded — 'upload' icon, neutral tone, with group. */
const mockVideoUploaded: NotificationItem = {
  id: '77777777-7777-4777-8777-777777777777',
  type: 'video_uploaded',
  payload: {
    asset_id: 'ast_01HZX0000000000000000000A',
    group_name: 'Brazilian Jiu-Jitsu',
    uploader_name: 'Liam Becker',
    video_title: 'Guard retention drill',
  },
  read: true,
  created_at: '2026-06-12T16:00:00Z',
};

/** Coaching booking created — 'booking' icon, warning tone. */
const mockBookingCreated: NotificationItem = {
  id: '88888888-8888-4888-8888-888888888888',
  type: 'coaching_booking_created',
  payload: {
    booking_id: 'bkg_01HZX0000000000000000000A',
    student_name: 'Liam Becker',
    session_name: 'Technique review',
    scheduled_at: '2026-07-02T15:00:00Z',
  },
  read: false,
  created_at: '2026-06-13T17:00:00Z',
};

/** Long-text overflow — actionable invite with a deliberately long group name. */
const mockInviteLong: NotificationItem = {
  id: '99999999-9999-4999-8999-999999999999',
  type: 'group_invitation_received',
  payload: {
    group_id: 'grp_01HZX0000000000000000000B',
    group_name:
      'Advanced Competition Preparation & Conditioning — Saturday Cohort (2026 Season)',
    inviter_name: 'Sofia Hartmann-Vasquez',
    code: 'INV-LONG123',
  },
  read: false,
  invite_status: 'pending',
  created_at: '2026-06-13T18:00:00Z',
};

const meta = {
  title: 'Components/Notification Row',
  component: NotificationRow,
  args: {
    item: mockNotificationUnread,
    onOpen: () => {},
    onAccept: () => {},
    onDecline: () => {},
  },
} satisfies Meta<typeof NotificationRow>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: (args) => (
    <View className="gap-3">
      {(
        [
          mockNotificationUnread, // unread, actionable invite (accept/decline)
          mockInviteAccepted, // invite resolved → accepted
          mockInviteDeclined, // invite resolved → declined
          mockInviteExpired, // invite expired (no actions)
          mockInviteLong, // long group name → wrapping/overflow
          mockMemberJoined, // member-joined type, success tone
          mockNotificationRead, // read, video-reviewed type
          mockVideoUploaded, // video-uploaded type, neutral tone
          mockBookingCreated, // booking type, warning tone
        ] as const
      ).map((item) => (
        <NotificationRow
          key={item.id}
          {...args}
          item={item}
        />
      ))}
    </View>
  ),
};
