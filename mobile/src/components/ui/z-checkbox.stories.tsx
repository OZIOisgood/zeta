import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZCheckbox } from './z-checkbox';

const meta = {
  title: 'UI/Checkbox',
  component: ZCheckbox,
  args: { value: false, label: 'Remember me', disabled: false, onValueChange: () => {} },
  argTypes: {
    value: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
} satisfies Meta<typeof ZCheckbox>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      <ZCheckbox value={false} label="Unchecked" onValueChange={() => {}} />
      <ZCheckbox value label="Checked" onValueChange={() => {}} />
      <ZCheckbox value={false} label="Disabled unchecked" disabled onValueChange={() => {}} />
      <ZCheckbox value label="Disabled checked" disabled onValueChange={() => {}} />
      <ZCheckbox value={false} onValueChange={() => {}} />
      <ZCheckbox value onValueChange={() => {}} />
      <ZCheckbox
        value
        label="A very long label that should wrap onto multiple lines to verify overflow behaviour in the checkbox row"
        onValueChange={() => {}}
      />
    </View>
  ),
};
