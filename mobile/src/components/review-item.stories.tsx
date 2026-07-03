import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import type { Review } from '../api/queries/reviews';
import { ReviewItem } from './review-item';
import { mockReview } from './__stories__/fixtures';

// ── Local edge-case reviews (fixtures.ts only ships the representative one) ────

/** Untimed comment (no timestamp chip) + author without avatar (initials fallback). */
const mockReviewUntimed: Review = {
  id: 'rev_01HZX0000000000000000000B',
  content: 'Solid session overall — your base felt much steadier than last week.',
  author: { name: 'Liam Becker' },
  created_at: '2026-06-10T11:05:00Z',
};

/** Long content + missing author (falls back to the unknownAuthor label). */
const mockReviewLong: Review = {
  id: 'rev_01HZX0000000000000000000C',
  content:
    'Watch the timing on the recovery: as soon as you break the grip you want to immediately re-pummel for underhooks instead of resetting your stance, otherwise you give up the angle and end up chasing the position for the rest of the exchange.',
  timestamp_seconds: 132,
  created_at: '2026-06-09T08:40:00Z',
};

const meta = {
  title: 'Components/Review Item',
  component: ReviewItem,
  args: {
    review: mockReview,
    isReply: false,
    deleting: false,
    onSeek: () => {},
    onReply: () => {},
    onEdit: () => {},
    onDelete: () => {},
    onEnhance: async () => null,
  },
  argTypes: {
    isReply: { control: 'boolean' },
    deleting: { control: 'boolean' },
  },
} satisfies Meta<typeof ReviewItem>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <View className="gap-3">
      {/* Timestamped, author with avatar, all actions available */}
      <ReviewItem
        review={mockReview}
        onSeek={() => {}}
        onReply={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onEnhance={async () => null}
      />

      {/* Untimed comment + author initials fallback (no avatar) */}
      <ReviewItem
        review={mockReviewUntimed}
        onSeek={() => {}}
        onReply={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />

      {/* Long-text overflow + missing author (unknownAuthor) */}
      <ReviewItem
        review={mockReviewLong}
        onSeek={() => {}}
        onReply={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />

      {/* Reply: smaller avatar, no reply button */}
      <ReviewItem review={mockReview} isReply onReply={() => {}} onEdit={() => {}} onDelete={() => {}} />

      {/* Deleting: edit/delete actions disabled */}
      <ReviewItem review={mockReview} onReply={() => {}} onEdit={() => {}} onDelete={() => {}} deleting />

      {/* Read-only: no edit/delete/reply callbacks → only timestamp chip + relative time */}
      <ReviewItem review={mockReview} onSeek={() => {}} />
    </View>
  ),
};
