import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { LucideVideo, LucideUsers, LucideCalendar } from 'lucide-react-native';
import { StatCard } from './stat-card';
import { ZBadge } from './ui/z-badge';
import { mockStat } from './__stories__/fixtures';

const meta = {
  title: 'Components/Stat Card',
  component: StatCard,
  args: {
    label: mockStat.label,
    count: mockStat.count,
    icon: <LucideVideo size={20} color="#64748b" />,
    interactive: true,
    onPress: () => {},
  },
  argTypes: {
    interactive: { control: 'boolean' },
  },
} satisfies Meta<typeof StatCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Interactive (default) — tappable KPI tile */}
      <StatCard
        label="Videos"
        count={12}
        icon={<LucideVideo size={20} color="#64748b" />}
        onPress={() => {}}
      />

      {/* Non-interactive — read-only KPI tile (reports screen) */}
      <StatCard
        label="Members"
        count={48}
        icon={<LucideUsers size={20} color="#64748b" />}
        interactive={false}
      />

      {/* With footer slot — trailing ZBadge under the count */}
      <StatCard
        label="Sessions"
        count={5}
        icon={<LucideCalendar size={20} color="#64748b" />}
        onPress={() => {}}
        footer={<ZBadge tone="primary" label="in 3 groups" />}
      />

      {/* Non-interactive with footer */}
      <StatCard
        label="Upcoming"
        count={2}
        icon={<LucideCalendar size={20} color="#64748b" />}
        interactive={false}
        footer={<ZBadge tone="success" label="next: 2h" />}
      />

      {/* Zero / empty count */}
      <StatCard
        label="Reviews"
        count={0}
        icon={<LucideVideo size={20} color="#64748b" />}
        onPress={() => {}}
      />

      {/* Large count */}
      <StatCard
        label="Total views"
        count={12480}
        icon={<LucideVideo size={20} color="#64748b" />}
        onPress={() => {}}
      />

      {/* Long-text label overflow (clamps to 2 lines) */}
      <StatCard
        label="Pending coaching session requests awaiting your review"
        count={7}
        icon={<LucideUsers size={20} color="#64748b" />}
        onPress={() => {}}
      />
    </View>
  ),
};
