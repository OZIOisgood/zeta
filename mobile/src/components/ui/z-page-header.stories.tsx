import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { LucidePlus } from 'lucide-react-native';
import { ZPageHeader } from './z-page-header';
import { ZButton } from './z-button';

const meta = {
  title: 'UI/Page Header',
  component: ZPageHeader,
  args: {
    title: 'Videos',
    subtitle: 'Review and share your latest uploads',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
  },
} satisfies Meta<typeof ZPageHeader>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* title + subtitle */}
      <ZPageHeader title="Videos" subtitle="Review and share your latest uploads" />

      {/* title only (no subtitle) */}
      <ZPageHeader title="Sessions" />

      {/* title + subtitle + trailing action */}
      <ZPageHeader
        title="Groups"
        subtitle="Coaching cohorts you belong to"
        action={
          <ZButton
            label="Create"
            variant="primary"
            icon={<LucidePlus size={16} color="#fff" />}
            onPress={() => {}}
          />
        }
      />

      {/* title only + trailing action */}
      <ZPageHeader
        title="Home"
        action={
          <ZButton
            label="New"
            variant="secondary"
            icon={<LucidePlus size={16} color="#000" />}
            onPress={() => {}}
          />
        }
      />

      {/* long-text overflow — long title and subtitle wrap/truncate against the action */}
      <ZPageHeader
        title="A remarkably long screen title that should wrap onto multiple lines"
        subtitle="An equally verbose one-line subtitle that demonstrates how the muted description behaves when the available width is constrained by a trailing action slot"
        action={
          <ZButton
            label="Action"
            variant="ghost"
            icon={<LucidePlus size={16} color="#000" />}
            onPress={() => {}}
          />
        }
      />
    </View>
  ),
};
