import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZAvatar } from './z-avatar';

// 1x1 transparent PNG, used so the image branch renders without a network fetch.
const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAQDJ/etYAAAAAElFTkSuQmCC';

const meta = {
  title: 'UI/Avatar',
  component: ZAvatar,
  args: { fallback: 'AB', size: 36, shape: 'rounded', alt: 'Ada Byron' },
  argTypes: {
    shape: { control: 'radio', options: ['rounded', 'circle'] },
  },
} satisfies Meta<typeof ZAvatar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <View className="gap-3">
      {(['rounded', 'circle'] as const).map((shape) => (
        <View key={shape} className="flex-row flex-wrap items-center gap-3">
          {/* fallback initials */}
          <ZAvatar shape={shape} fallback="AB" alt={`${shape} initials`} />
          {/* with image */}
          <ZAvatar shape={shape} image={SAMPLE_IMAGE} fallback="AB" alt={`${shape} image`} />
          {/* empty fallback (no name, no image) */}
          <ZAvatar shape={shape} fallback="" alt={`${shape} empty`} />
          {/* long-text overflow */}
          <ZAvatar shape={shape} fallback="ABCDEFG" alt={`${shape} overflow`} />
          {/* small size */}
          <ZAvatar shape={shape} fallback="AB" size={24} alt={`${shape} small`} />
          {/* large size */}
          <ZAvatar shape={shape} fallback="AB" size={64} alt={`${shape} large`} />
        </View>
      ))}
    </View>
  ),
};
