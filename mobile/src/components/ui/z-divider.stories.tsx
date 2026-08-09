import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, View } from 'react-native';
import { ZDivider } from './z-divider';

const meta = {
  title: 'UI/Divider',
  component: ZDivider,
  args: {
    vertical: false,
    inset: false,
  },
  argTypes: {
    vertical: { control: 'boolean' },
    inset: { control: 'boolean' },
  },
} satisfies Meta<typeof ZDivider>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <View className="w-64">
      <ZDivider {...args} />
    </View>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <View className="w-64 gap-3">
      <Text className="text-on-surface">Full bleed</Text>
      <ZDivider />
      <Text className="text-on-surface">Inset (16dp)</Text>
      <ZDivider inset />
    </View>
  ),
};

export const Vertical: Story = {
  render: () => (
    <View className="h-24 flex-row items-stretch gap-3">
      <Text className="text-on-surface">A</Text>
      <ZDivider vertical />
      <Text className="text-on-surface">B</Text>
      <ZDivider vertical inset />
      <Text className="text-on-surface">C</Text>
    </View>
  ),
};
