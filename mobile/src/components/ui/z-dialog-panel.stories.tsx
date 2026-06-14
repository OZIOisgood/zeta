import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, View } from 'react-native';
import { ZDialogPanel } from './z-dialog-panel';

const meta = {
  title: 'UI/Dialog Panel',
  component: ZDialogPanel,
  args: {
    visible: true,
    closeLabel: 'Close',
    onClose: () => {},
    children: (
      <View className="gap-2">
        <Text className="text-base font-semibold text-z-foreground">Dialog title</Text>
        <Text className="text-sm text-z-muted-foreground">
          Tapping the dimmed backdrop closes the dialog; tapping the panel does not.
        </Text>
      </View>
    ),
  },
  argTypes: {
    visible: { control: 'boolean' },
    closeLabel: { control: 'text' },
  },
} satisfies Meta<typeof ZDialogPanel>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Visible with short content */}
      <ZDialogPanel visible onClose={() => {}}>
        <View className="gap-2">
          <Text className="text-base font-semibold text-z-foreground">Short dialog</Text>
          <Text className="text-sm text-z-muted-foreground">A minimal panel with a single line of body copy.</Text>
        </View>
      </ZDialogPanel>

      {/* Long-text overflow */}
      <ZDialogPanel visible onClose={() => {}}>
        <View className="gap-2">
          <Text className="text-base font-semibold text-z-foreground">
            A considerably longer dialog title that wraps across multiple lines without truncating
          </Text>
          <Text className="text-sm text-z-muted-foreground">
            This body text is intentionally verbose to demonstrate how the panel grows and wraps long content while
            keeping a sensible maximum width on larger screens, ensuring the surface stays readable and never spills
            beyond its rounded border or the surrounding padding.
          </Text>
        </View>
      </ZDialogPanel>

      {/* Form-style content with action buttons (keyboard-avoiding case) */}
      <ZDialogPanel visible onClose={() => {}} closeLabel="Dismiss">
        <View className="gap-3">
          <Text className="text-base font-semibold text-z-foreground">Confirm action</Text>
          <Text className="text-sm text-z-muted-foreground">Body content with footer actions.</Text>
          <View className="flex-row justify-end gap-2">
            <View className="rounded-md border border-z-border px-3 py-2">
              <Text className="text-sm text-z-foreground">Cancel</Text>
            </View>
            <View className="rounded-md bg-z-primary px-3 py-2">
              <Text className="text-sm text-z-primary-foreground">Save</Text>
            </View>
          </View>
        </View>
      </ZDialogPanel>

      {/* Custom testID + custom closeLabel */}
      <ZDialogPanel visible onClose={() => {}} closeLabel="Tap outside to close" testID="example-dialog">
        <View className="gap-2">
          <Text className="text-base font-semibold text-z-foreground">Custom close label</Text>
          <Text className="text-sm text-z-muted-foreground">
            The backdrop announces a custom accessibility label.
          </Text>
        </View>
      </ZDialogPanel>

      {/* Hidden — renders nothing while visible is false */}
      <ZDialogPanel visible={false} onClose={() => {}}>
        <Text className="text-sm text-z-muted-foreground">This panel is not visible.</Text>
      </ZDialogPanel>
    </View>
  ),
};
