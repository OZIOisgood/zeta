import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { Group } from '../api/queries/groups';
import { GroupCard } from './group-card';
import { mockGroup, mockGroupLong } from './__stories__/fixtures';

const meta = {
  title: 'Components/Group Card',
  component: GroupCard,
  args: { group: mockGroup, onPress: () => {} },
} satisfies Meta<typeof GroupCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

// Edge case not in shared fixtures: no avatar (initials fallback) but a
// description present — to fully cover avatar × description independently.
const mockGroupNoAvatar: Group = {
  ...mockGroup,
  id: 'grp_01HZX0000000000000000000C',
  name: 'Wrestling Fundamentals',
  avatar: null,
  description: 'Stand-up takedowns and scrambles for white belts.',
};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Representative: avatar set + short name + description present */}
      <GroupCard group={mockGroup} onPress={() => {}} />
      {/* No avatar -> initials fallback, description present */}
      <GroupCard group={mockGroupNoAvatar} onPress={() => {}} />
      {/* Long name (truncates to 1 line) + empty description (i18n fallback copy) + no avatar */}
      <GroupCard group={mockGroupLong} onPress={() => {}} />
    </View>
  ),
};
