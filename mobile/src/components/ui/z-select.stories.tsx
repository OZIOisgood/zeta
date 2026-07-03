import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZSelect, type ZSelectOption } from './z-select';

const options: ZSelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

const longOptions: ZSelectOption[] = [
  {
    value: 'long',
    label: 'A very long option label that should overflow the trigger width and ellipsize',
  },
  ...options,
];

const meta = {
  title: 'UI/Select',
  component: ZSelect,
  args: {
    value: 'en',
    options,
    placeholder: 'Select a language',
    invalid: false,
    disabled: false,
    onValueChange: () => {},
  },
  argTypes: {
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ZSelect>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="gap-3">
      <ZSelect value="en" options={options} onValueChange={() => {}} />
      <ZSelect
        value={undefined}
        placeholder="Empty — placeholder shown"
        options={options}
        onValueChange={() => {}}
      />
      <ZSelect value="en" options={options} invalid onValueChange={() => {}} />
      <ZSelect value="en" options={options} disabled onValueChange={() => {}} />
      <ZSelect
        value={undefined}
        placeholder="Empty + invalid"
        options={options}
        invalid
        onValueChange={() => {}}
      />
      <ZSelect
        value="long"
        options={longOptions}
        onValueChange={() => {}}
      />
      <ZSelect
        value={undefined}
        placeholder="No options"
        options={[]}
        onValueChange={() => {}}
      />
    </View>
  ),
};
