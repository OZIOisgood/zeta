import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZCombobox, type ZComboboxOption } from './z-combobox';

const options: ZComboboxOption[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const longOptions: ZComboboxOption[] = [
  {
    value: 'long',
    label: 'A very long option label that should overflow and truncate gracefully inside the trigger',
  },
];

const meta = {
  title: 'UI/Combobox',
  component: ZCombobox,
  args: {
    options,
    value: 'intermediate',
    placeholder: 'Select a level',
    searchPlaceholder: 'Search levels',
    closeLabel: 'Close',
    invalid: false,
    disabled: false,
    onValueChange: () => {},
  },
  argTypes: {
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ZCombobox>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* data: selected value */}
      <ZCombobox
        options={options}
        value="advanced"
        placeholder="Select a level"
        onValueChange={() => {}}
      />
      {/* empty: no value, placeholder shown */}
      <ZCombobox
        options={options}
        placeholder="Select a level"
        onValueChange={() => {}}
      />
      {/* invalid / error */}
      <ZCombobox
        options={options}
        placeholder="Select a level"
        invalid
        onValueChange={() => {}}
      />
      {/* disabled */}
      <ZCombobox
        options={options}
        value="beginner"
        placeholder="Select a level"
        disabled
        onValueChange={() => {}}
      />
      {/* disabled + empty */}
      <ZCombobox
        options={options}
        placeholder="Select a level"
        disabled
        onValueChange={() => {}}
      />
      {/* no options (empty list) */}
      <ZCombobox
        options={[]}
        placeholder="No levels available"
        onValueChange={() => {}}
      />
      {/* long-text overflow */}
      <ZCombobox
        options={longOptions}
        value="long"
        placeholder="Select a level"
        onValueChange={() => {}}
      />
    </View>
  ),
};
