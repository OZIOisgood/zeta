import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, View } from 'react-native';
import { ZDialogPanel } from './z-dialog-panel';

// ZDialogPanel is a full-screen overlay, so each variant is its OWN story export
// (Storybook renders one at a time) — stacking several in a single canvas would
// overlap their backdrops and panels illegibly.
const meta = {
  title: 'UI/Dialog Panel',
  component: ZDialogPanel,
  args: {
    visible: true,
    closeLabel: 'Close',
    onClose: () => {},
    children: (
      <View className="gap-2">
        <Text className="text-base font-semibold text-z-text">Dialog title</Text>
        <Text className="text-sm text-z-muted">
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

export const ShortContent: Story = {
  args: {
    children: (
      <View className="gap-2">
        <Text className="text-base font-semibold text-z-text">Short dialog</Text>
        <Text className="text-sm text-z-muted">A minimal panel with a single line of body copy.</Text>
      </View>
    ),
  },
};

export const LongText: Story = {
  args: {
    children: (
      <View className="gap-2">
        <Text className="text-base font-semibold text-z-text">
          A considerably longer dialog title that wraps across multiple lines without truncating
        </Text>
        <Text className="text-sm text-z-muted">
          This body text is intentionally verbose to demonstrate how the panel grows and wraps long
          content while keeping a sensible maximum width on larger screens, ensuring the surface
          stays readable and never spills beyond its rounded border or the surrounding padding.
        </Text>
      </View>
    ),
  },
};

export const WithActions: Story = {
  args: {
    closeLabel: 'Dismiss',
    children: (
      <View className="gap-3">
        <Text className="text-base font-semibold text-z-text">Confirm action</Text>
        <Text className="text-sm text-z-muted">Body content with footer actions.</Text>
        <View className="flex-row justify-end gap-2">
          <View className="rounded-md border border-z-border px-3 py-2">
            <Text className="text-sm text-z-text">Cancel</Text>
          </View>
          <View className="rounded-md bg-z-primary px-3 py-2">
            <Text className="text-sm text-white">Save</Text>
          </View>
        </View>
      </View>
    ),
  },
};

export const CustomCloseLabel: Story = {
  args: {
    closeLabel: 'Tap outside to close',
    testID: 'example-dialog',
    children: (
      <View className="gap-2">
        <Text className="text-base font-semibold text-z-text">Custom close label</Text>
        <Text className="text-sm text-z-muted">
          The backdrop announces a custom accessibility label.
        </Text>
      </View>
    ),
  },
};

export const Hidden: Story = {
  args: {
    visible: false,
    children: <Text className="text-sm text-z-muted">This panel is not visible.</Text>,
  },
};
