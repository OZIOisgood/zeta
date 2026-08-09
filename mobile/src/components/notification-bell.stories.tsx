import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View, Text } from 'react-native';
import { NotificationBell } from './notification-bell';

const meta = {
  title: 'Components/Notification Bell',
  component: NotificationBell,
  args: { unreadCount: 3, onPress: () => {} },
  argTypes: {
    unreadCount: { control: { type: 'number', min: 0, step: 1 } },
  },
} satisfies Meta<typeof NotificationBell>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

// Composite coverage — every meaningful unread-count state:
// none (no badge), single digit, the 9 boundary, the '9+' overflow, and a large
// count that still collapses to '9+'.
const STATES: { caption: string; unreadCount: number }[] = [
  { caption: 'none (no badge)', unreadCount: 0 },
  { caption: 'single digit', unreadCount: 1 },
  { caption: 'boundary (9)', unreadCount: 9 },
  { caption: 'overflow (9+)', unreadCount: 10 },
  { caption: 'large count → 9+', unreadCount: 128 },
];

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {STATES.map(({ caption, unreadCount }) => (
        <View key={caption} className="flex-row items-center gap-3">
          <NotificationBell unreadCount={unreadCount} onPress={() => {}} />
          <Text className="text-z-muted">{caption}</Text>
        </View>
      ))}
    </View>
  ),
};
