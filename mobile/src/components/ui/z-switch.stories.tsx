import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZSwitch } from './z-switch';

const meta = {
  title: 'UI/Switch',
  component: ZSwitch,
  args: {
    checked: false,
    disabled: false,
    accessibilityLabel: 'Enable notifications',
    onChange: () => {},
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ZSwitch>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      <ZSwitch checked={false} accessibilityLabel="Off" onChange={() => {}} />
      <ZSwitch checked accessibilityLabel="On" onChange={() => {}} />
      <ZSwitch checked={false} accessibilityLabel="Disabled off" disabled onChange={() => {}} />
      <ZSwitch checked accessibilityLabel="Disabled on" disabled onChange={() => {}} />
    </View>
  ),
};
