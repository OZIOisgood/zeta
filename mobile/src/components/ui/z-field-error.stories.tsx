import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZFieldError } from './z-field-error';

const meta = {
  title: 'UI/Field Error',
  component: ZFieldError,
  args: { message: 'This field is required.' },
} satisfies Meta<typeof ZFieldError>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      <ZFieldError message="This field is required." />
      <ZFieldError message="Enter a valid email address." />
      <ZFieldError message="Password must be at least 12 characters long and include an uppercase letter, a number, and a special character to keep your account secure." />
    </View>
  ),
};
