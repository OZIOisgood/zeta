import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZFieldLabel } from './z-field-label';

const meta = {
  title: 'UI/Field Label',
  component: ZFieldLabel,
  args: { label: 'Email address', required: false },
  argTypes: {
    required: { control: 'boolean' },
  },
} satisfies Meta<typeof ZFieldLabel>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="gap-3">
      <ZFieldLabel label="Optional field" />
      <ZFieldLabel label="Required field" required />
      <ZFieldLabel
        label="A very long field label that keeps going to verify how the label wraps across multiple lines without truncation"
        required
      />
    </View>
  ),
};
