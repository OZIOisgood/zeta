import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { LucidePlus } from 'lucide-react-native';
import { ZBackHeader } from './z-back-header';
import { ZIconButton } from './z-icon-button';

const meta = {
  title: 'UI/Back Header',
  component: ZBackHeader,
  args: {
    title: 'Group preferences',
    subtitle: 'Advanced calculus · 24 members',
    onBack: () => {},
  },
} satisfies Meta<typeof ZBackHeader>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      <ZBackHeader title="Title only" onBack={() => {}} />
      <ZBackHeader title="With subtitle" subtitle="One-line supporting text" onBack={() => {}} />
      <ZBackHeader
        title="With trailing action"
        subtitle="Optional action slot"
        action={
          <ZIconButton label="Add" onPress={() => {}}>
            <LucidePlus size={20} color="#fff" />
          </ZIconButton>
        }
        onBack={() => {}}
      />
      <ZBackHeader
        title="A very long title that should truncate to a single line instead of wrapping onto another row"
        subtitle="A very long subtitle that should also truncate to a single line instead of wrapping onto another row"
        action={
          <ZIconButton label="Add" onPress={() => {}}>
            <LucidePlus size={20} color="#fff" />
          </ZIconButton>
        }
        onBack={() => {}}
      />
    </View>
  ),
};
