import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { Review } from '../api/queries/reviews';
import { ReviewComposer } from './review-composer';
import { mockReview } from './__stories__/fixtures';

// Edge case: a reply target with a very long author name to verify the
// reply-banner truncation (numberOfLines={1}).
const mockReplyTargetLong: Pick<Review, 'id' | 'content' | 'author' | 'created_at'> = {
  id: 'rev_01HZX0000000000000000000B',
  content:
    'Detailed breakdown of the entire passing sequence with multiple follow-up suggestions to try next time.',
  author: { name: 'Sofia Hartmann-Vasquez de la Fuente', avatar: undefined },
  created_at: '2026-06-12T08:05:00Z',
};

const meta = {
  title: 'Components/Review Composer',
  component: ReviewComposer,
  args: {
    onSubmit: () => {},
    getCurrentTime: () => 75,
    onEnhance: async () => 'Enhanced draft text.',
  },
} satisfies Meta<typeof ReviewComposer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-6">
      {/* Default: timestamp chip + enhance + send */}
      <ReviewComposer
        getCurrentTime={() => 75}
        onSubmit={() => {}}
        onEnhance={async () => 'Enhanced draft text.'}
      />

      {/* No enhancer: timestamp chip + send only */}
      <ReviewComposer getCurrentTime={() => 132} onSubmit={() => {}} />

      {/* Minimal: no player time, no enhancer — input + send only */}
      <ReviewComposer onSubmit={() => {}} />

      {/* Reply mode: reply banner, no timestamp chip, no enhance */}
      <ReviewComposer
        replyingTo={mockReview}
        onCancelReply={() => {}}
        onSubmit={() => {}}
        getCurrentTime={() => 90}
        onEnhance={async () => 'Enhanced draft text.'}
      />

      {/* Reply mode with long author name: banner truncation */}
      <ReviewComposer
        replyingTo={mockReplyTargetLong}
        onCancelReply={() => {}}
        onSubmit={() => {}}
      />
    </View>
  ),
};
