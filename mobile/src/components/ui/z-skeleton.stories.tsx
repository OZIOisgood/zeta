import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZSkeleton } from './z-skeleton';

const meta = {
  title: 'UI/Skeleton',
  component: ZSkeleton,
  args: { className: 'h-4 w-40' },
  argTypes: {
    className: { control: 'text' },
  },
} satisfies Meta<typeof ZSkeleton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Text lines: single short, single long, multi-line block */}
      <ZSkeleton className="h-4 w-24" />
      <ZSkeleton className="h-4 w-full" />
      <View className="gap-2">
        <ZSkeleton className="h-3 w-full" />
        <ZSkeleton className="h-3 w-full" />
        <ZSkeleton className="h-3 w-1/2" />
      </View>

      {/* Avatar (circular) */}
      <ZSkeleton className="h-12 w-12 rounded-full" />

      {/* List-row placeholder: avatar + two text lines */}
      <View className="flex-row items-center gap-3">
        <ZSkeleton className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-2">
          <ZSkeleton className="h-3 w-2/3" />
          <ZSkeleton className="h-3 w-1/3" />
        </View>
      </View>

      {/* Card / media block */}
      <ZSkeleton className="h-32 w-full" />

      {/* Pill / button placeholder */}
      <ZSkeleton className="h-8 w-28 rounded-full" />
    </View>
  ),
};
