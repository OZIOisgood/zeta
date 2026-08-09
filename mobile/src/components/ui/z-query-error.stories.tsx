import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ZQueryError } from './z-query-error';

const meta = {
  title: 'UI/Query Error',
  component: ZQueryError,
  args: {
    title: 'Could not load videos',
    onRetry: () => {},
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    retryLabel: { control: 'text' },
  },
} satisfies Meta<typeof ZQueryError>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Default: title only, falls back to the shared description + retry label */}
      <ZQueryError title="Could not load videos" onRetry={() => {}} />

      {/* Custom description override */}
      <ZQueryError
        title="Could not load sessions"
        description="Check your connection and try again."
        onRetry={() => {}}
      />

      {/* Custom retry label override */}
      <ZQueryError
        title="Could not load groups"
        retryLabel="Try again"
        onRetry={() => {}}
      />

      {/* All optional fields overridden + testID tagging the retry button */}
      <ZQueryError
        title="Something went wrong"
        description="We couldn't reach the server."
        retryLabel="Reload"
        testID="query-error-retry"
        onRetry={() => {}}
      />

      {/* Long-text overflow on title + description */}
      <ZQueryError
        title="We could not load this surface because the request to the server did not complete successfully"
        description="The connection timed out while fetching your data. Please verify that you are online and that the service is reachable, then retry the request."
        onRetry={() => {}}
      />
    </View>
  ),
};
