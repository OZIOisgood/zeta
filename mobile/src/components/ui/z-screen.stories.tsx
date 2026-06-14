import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, View } from 'react-native';
import { ZScreen } from './z-screen';

const meta = {
  title: 'UI/Screen',
  component: ZScreen,
  args: {
    edges: ['top', 'bottom'],
    className: '',
    children: (
      <View className="flex-1 items-center justify-center gap-2 p-4">
        <Text className="text-z-fg text-lg font-semibold">Screen content</Text>
        <Text className="text-z-fg-muted">Safe-area insets are applied around this area.</Text>
      </View>
    ),
  },
  argTypes: {
    edges: {
      control: 'select',
      options: [['top', 'bottom'], ['top'], ['bottom'], []],
    },
  },
} satisfies Meta<typeof ZScreen>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {([
        ['top', 'bottom'],
        ['top'],
        ['bottom'],
        [],
      ] as const).map((edges) => (
        <ZScreen key={edges.join('-') || 'none'} edges={edges} className="rounded-md border border-z-border">
          <View className="items-center justify-center gap-2 p-4">
            <Text className="text-z-fg font-semibold">edges: [{edges.join(', ')}]</Text>
            <Text className="text-z-fg-muted">
              {edges.length === 0 ? 'No top/bottom inset, horizontal insets only' : `Applies ${edges.join(' + ')} inset`}
            </Text>
          </View>
        </ZScreen>
      ))}
      <ZScreen className="rounded-md border border-z-border">
        <View className="items-center justify-center p-4">
          <Text className="text-z-fg-muted text-center">
            Long-text overflow: this screen wraps a generous amount of copy to confirm that nested content flows and wraps
            correctly inside the safe-area padded container without clipping or pushing the insets out of place.
          </Text>
        </View>
      </ZScreen>
    </View>
  ),
};
