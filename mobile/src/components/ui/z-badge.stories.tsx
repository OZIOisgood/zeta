import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZBadge } from './z-badge';

const meta = {
  title: 'UI/Badge',
  component: ZBadge,
  args: { label: 'Active', tone: 'neutral' },
  argTypes: {
    tone: { control: 'radio', options: ['neutral', 'primary', 'success', 'warning', 'danger'] },
  },
} satisfies Meta<typeof ZBadge>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="flex-row flex-wrap items-center gap-3">
      {(['neutral', 'primary', 'success', 'warning', 'danger'] as const).map((tone) => (
        <ZBadge key={tone} label={tone} tone={tone} />
      ))}
    </View>
  ),
};
