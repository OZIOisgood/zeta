import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { GroupUser } from '../api/queries/groups';
import { MemberRow } from './member-row';
import { mockMember, mockMemberPending } from './__stories__/fixtures';

// Admin-role variant (no admin fixture in the shared file — defined inline so we
// can exercise the third branch of the component's ROLE_KEYS map).
const mockMemberAdmin: GroupUser = {
  id: 'usr_member_0003',
  email: 'jordan.fischer@example.com',
  first_name: 'Jordan',
  last_name: 'Fischer',
  avatar: undefined,
  role: 'admin',
};

// Long-name edge case to verify wrapping next to the role badge + remove action.
const mockMemberLongName: GroupUser = {
  id: 'usr_member_0004',
  email: 'maximiliana.von-und-zu-liechtenstein@example-academy.com',
  first_name: 'Maximiliana',
  last_name: 'von und zu Liechtenstein-Hohenzollern',
  avatar: undefined,
  role: 'student',
};

// Unknown role: falls through ROLE_KEYS to the raw role string.
const mockMemberUnknownRole: GroupUser = {
  id: 'usr_member_0005',
  email: 'guest@example.com',
  first_name: 'Guest',
  last_name: 'User',
  avatar: undefined,
  role: 'observer',
};

const meta = {
  title: 'Components/Member Row',
  component: MemberRow,
  args: { member: mockMember, onRemove: () => {} },
  argTypes: {
    onRemove: { control: false },
  },
} satisfies Meta<typeof MemberRow>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Expert role, avatar set, with remove action */}
      <MemberRow member={mockMember} onRemove={() => {}} />
      {/* Same member, read-only (no remove action) */}
      <MemberRow member={mockMember} />
      {/* Student role, no avatar → initials fallback, hyphenated surname */}
      <MemberRow member={mockMemberPending} onRemove={() => {}} />
      {/* Admin role, no avatar */}
      <MemberRow member={mockMemberAdmin} onRemove={() => {}} />
      {/* Unknown role → raw role string label */}
      <MemberRow member={mockMemberUnknownRole} onRemove={() => {}} />
      {/* Long name + long email → wrapping/overflow */}
      <MemberRow member={mockMemberLongName} onRemove={() => {}} />
    </View>
  ),
};
