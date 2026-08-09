import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZTextInput } from './z-text-input';

const meta = {
  title: 'UI/Text Input',
  component: ZTextInput,
  args: {
    value: '',
    placeholder: 'Enter your name',
    accessibilityLabel: 'Name',
    invalid: false,
    disabled: false,
    onChangeText: () => {},
  },
  argTypes: {
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    autoCapitalize: {
      control: 'radio',
      options: ['none', 'sentences', 'words', 'characters'],
    },
  },
} satisfies Meta<typeof ZTextInput>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      <ZTextInput
        value="Jane Cooper"
        accessibilityLabel="Filled"
        onChangeText={() => {}}
      />
      <ZTextInput
        value=""
        placeholder="Empty with placeholder"
        accessibilityLabel="Empty"
        onChangeText={() => {}}
      />
      <ZTextInput
        value="not-an-email"
        accessibilityLabel="Invalid"
        invalid
        onChangeText={() => {}}
      />
      <ZTextInput
        value="Disabled value"
        accessibilityLabel="Disabled"
        disabled
        onChangeText={() => {}}
      />
      <ZTextInput
        value=""
        placeholder="Disabled empty"
        accessibilityLabel="Disabled empty"
        disabled
        onChangeText={() => {}}
      />
      <ZTextInput
        value="A very long single line value that should overflow the available width of the input field and clip"
        accessibilityLabel="Long text overflow"
        onChangeText={() => {}}
      />
    </View>
  ),
};
