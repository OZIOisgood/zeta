import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { LucidePlus, TriangleAlert } from 'lucide-react-native';
import { ZEmptyState } from './z-empty-state';
import { ZButton } from './z-button';
import { colors } from '../../theme/colors';

const meta = {
  title: 'UI/Empty State',
  component: ZEmptyState,
  args: {
    title: 'No videos yet',
    description: 'Upload your first video to get feedback from your coach.',
  },
} satisfies Meta<typeof ZEmptyState>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Default — title + description, default Inbox icon, no action */}
      <ZEmptyState
        title="No videos yet"
        description="Upload your first video to get feedback from your coach."
      />

      {/* With an action slot (children) */}
      <ZEmptyState
        title="No groups yet"
        description="Create a group to start coaching your team."
      >
        <ZButton
          label="Create group"
          icon={<LucidePlus size={16} color="#fff" />}
          onPress={() => {}}
        />
      </ZEmptyState>

      {/* Custom icon (error variant) */}
      <ZEmptyState
        icon={<TriangleAlert size={24} color={colors.danger} />}
        title="Something went wrong"
        description="We couldn’t load your sessions. Pull to refresh and try again."
      >
        <ZButton label="Retry" variant="secondary" onPress={() => {}} />
      </ZEmptyState>

      {/* Long-text overflow — wraps and stays centered */}
      <ZEmptyState
        title="No upcoming sessions on your coaching schedule this week"
        description="Your booked live coaching sessions will appear here once a coach confirms a time. You can request a new session from the Sessions tab whenever you are ready to get started."
      />
    </View>
  ),
};
