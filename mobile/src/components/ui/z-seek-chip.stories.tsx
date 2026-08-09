import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZSeekChip } from './z-seek-chip';

const meta = {
  title: 'UI/SeekChip',
  component: ZSeekChip,
  args: { label: '0:12', accessibilityLabel: 'Jump to 0:12' },
} satisfies Meta<typeof ZSeekChip>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="flex-row flex-wrap items-center gap-3">
      {['0:05', '0:12', '1:15', '12:34'].map((time) => (
        <ZSeekChip key={time} label={time} accessibilityLabel={`Jump to ${time}`} />
      ))}
    </View>
  ),
};
