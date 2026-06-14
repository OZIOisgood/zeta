import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Text, View } from 'react-native';
import { ZCard } from './z-card';

const meta = {
  title: 'UI/Card',
  component: ZCard,
  args: {
    children: <Text className="text-z-text">Section card content</Text>,
  },
} satisfies Meta<typeof ZCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Single text child */}
      <ZCard>
        <Text className="text-z-text">Single line of content</Text>
      </ZCard>

      {/* With a title + body (multiple children) */}
      <ZCard>
        <Text className="mb-1 text-base font-semibold text-z-text">Card title</Text>
        <Text className="text-z-muted">
          Supporting body copy that sits beneath the card title.
        </Text>
      </ZCard>

      {/* Long-text overflow */}
      <ZCard>
        <Text className="text-z-text">
          A very long stretch of content that keeps going and going to verify the card grows
          vertically and wraps its text instead of overflowing its rounded bordered surface.
        </Text>
      </ZCard>

      {/* Empty (no inner copy, just the surface) */}
      <ZCard>
        <View className="h-12" />
      </ZCard>

      {/* className override (extra spacing) */}
      <ZCard className="gap-2 p-6">
        <Text className="text-z-text">Card with a className padding override</Text>
      </ZCard>

      {/* Nested rows of content */}
      <ZCard>
        <View className="flex-row items-center justify-between">
          <Text className="text-z-text">Label</Text>
          <Text className="text-z-muted">Value</Text>
        </View>
      </ZCard>
    </View>
  ),
};
