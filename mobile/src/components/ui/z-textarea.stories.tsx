import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZTextarea } from './z-textarea';

const LONG_TEXT =
  'This is a long note that wraps across multiple lines to demonstrate how the textarea grows ' +
  'and how its content overflows past the default row height when the user keeps typing well ' +
  'beyond the visible area of the field.';

const meta = {
  title: 'UI/Textarea',
  component: ZTextarea,
  args: {
    value: '',
    accessibilityLabel: 'Session notes',
    placeholder: 'Write your notes…',
    rows: 4,
    invalid: false,
    disabled: false,
    onChangeText: () => {},
  },
  argTypes: {
    invalid: { control: 'boolean' },
    disabled: { control: 'boolean' },
    rows: { control: 'number' },
  },
} satisfies Meta<typeof ZTextarea>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      <ZTextarea
        value="Default with text"
        accessibilityLabel="Default"
        onChangeText={() => {}}
      />
      <ZTextarea
        value=""
        placeholder="Empty with placeholder…"
        accessibilityLabel="Empty"
        onChangeText={() => {}}
      />
      <ZTextarea
        value="Invalid entry"
        accessibilityLabel="Invalid"
        invalid
        onChangeText={() => {}}
      />
      <ZTextarea
        value="Disabled content"
        accessibilityLabel="Disabled"
        disabled
        onChangeText={() => {}}
      />
      <ZTextarea
        value=""
        placeholder="Disabled and empty…"
        accessibilityLabel="Disabled empty"
        disabled
        onChangeText={() => {}}
      />
      <ZTextarea
        value=""
        placeholder="Invalid and empty…"
        accessibilityLabel="Invalid empty"
        invalid
        onChangeText={() => {}}
      />
      <ZTextarea
        value={LONG_TEXT}
        accessibilityLabel="Long text overflow"
        rows={4}
        onChangeText={() => {}}
      />
      <ZTextarea
        value="Tall field with eight rows"
        accessibilityLabel="Tall"
        rows={8}
        onChangeText={() => {}}
      />
    </View>
  ),
};
