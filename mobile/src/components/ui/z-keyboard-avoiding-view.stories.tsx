import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, TextInput, View } from 'react-native';
import { ZKeyboardAvoidingView } from './z-keyboard-avoiding-view';

const meta = {
  title: 'UI/Keyboard Avoiding View',
  component: ZKeyboardAvoidingView,
  // `children` is a required prop with no scalar default, so it must be present
  // in `args` or every Story would require its own `args`. The `render` below
  // overrides it with real JSX; this default just satisfies the type.
  args: { className: '', children: null },
  argTypes: {
    className: { control: 'text' },
  },
  render: (args) => (
    <ZKeyboardAvoidingView {...args}>
      <View className="gap-3 p-4">
        <Text>Tap the field — the view shifts so the keyboard never covers it.</Text>
        <TextInput
          placeholder="Type here"
          className="rounded-md border border-z-border px-3 py-2"
        />
      </View>
    </ZKeyboardAvoidingView>
  ),
} satisfies Meta<typeof ZKeyboardAvoidingView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Default — no optional className */}
      <ZKeyboardAvoidingView>
        <View className="gap-3 p-4">
          <Text>Default wrapper</Text>
          <TextInput
            placeholder="Email"
            className="rounded-md border border-z-border px-3 py-2"
          />
        </View>
      </ZKeyboardAvoidingView>

      {/* With optional className */}
      <ZKeyboardAvoidingView className="bg-z-muted">
        <View className="gap-3 p-4">
          <Text>With className (bg-z-muted)</Text>
          <TextInput
            placeholder="Password"
            className="rounded-md border border-z-border px-3 py-2"
          />
        </View>
      </ZKeyboardAvoidingView>

      {/* Long-text overflow content */}
      <ZKeyboardAvoidingView>
        <View className="gap-3 p-4">
          <Text>
            A very long block of content that overflows and demonstrates the wrapper
            still fills its parent while the keyboard avoidance behavior keeps the
            input field visible above the on-screen keyboard on iOS.
          </Text>
          <TextInput
            placeholder="Notes"
            multiline
            className="rounded-md border border-z-border px-3 py-2"
          />
        </View>
      </ZKeyboardAvoidingView>

      {/* Empty — no children content beyond an empty container */}
      <ZKeyboardAvoidingView>
        <View className="p-4" />
      </ZKeyboardAvoidingView>
    </View>
  ),
};
