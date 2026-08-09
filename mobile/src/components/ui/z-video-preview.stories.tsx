import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZVideoPreview } from './z-video-preview';

const SAMPLE_THUMBNAIL = 'https://image.mux.com/sample/thumbnail.jpg';

const meta = {
  title: 'UI/Video Preview',
  component: ZVideoPreview,
  args: { thumbnail: SAMPLE_THUMBNAIL, alt: 'Coaching session preview' },
  argTypes: {
    thumbnail: { control: 'text' },
    alt: { control: 'text' },
  },
} satisfies Meta<typeof ZVideoPreview>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      <ZVideoPreview thumbnail={SAMPLE_THUMBNAIL} alt="With thumbnail" />
      <ZVideoPreview alt="Without thumbnail (fallback icon)" />
      <ZVideoPreview />
      <ZVideoPreview
        thumbnail={SAMPLE_THUMBNAIL}
        alt="A very long alternative text description that overflows the available space to verify the preview handles lengthy accessibility labels gracefully"
      />
    </View>
  ),
};
