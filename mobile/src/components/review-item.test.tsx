import { render, screen, userEvent } from '@testing-library/react-native';
import { ReviewItem } from './review-item';
import type { Review } from '../api/queries/reviews';

const REVIEW: Review = {
  id: 'r1', content: 'Nice stance', timestamp_seconds: 75,
  author: { name: 'Coach Carter' }, created_at: '2026-06-12T10:00:00Z',
};

test('renders author, content and a seekable timestamp pill', async () => {
  const onSeek = jest.fn();
  const user = userEvent.setup();
  await render(<ReviewItem review={REVIEW} onSeek={onSeek} />);
  expect(screen.getByText('Coach Carter')).toBeOnTheScreen();
  expect(screen.getByText('Nice stance')).toBeOnTheScreen();
  expect(screen.getByTestId('review-seek')).toBeOnTheScreen();
  await user.press(screen.getByText('1:15'));
  expect(onSeek).toHaveBeenCalledWith(75);
});

test('untimed review renders no timestamp pill', async () => {
  await render(<ReviewItem review={{ ...REVIEW, timestamp_seconds: undefined }} onSeek={jest.fn()} />);
  expect(screen.queryByText('1:15')).toBeNull();
  expect(screen.queryByTestId('review-seek')).toBeNull();
});

test('reply affordance fires for top-level items and is absent on replies', async () => {
  const onReply = jest.fn();
  const user = userEvent.setup();

  await render(<ReviewItem review={REVIEW} onReply={onReply} />);
  await user.press(screen.getByTestId('review-reply'));
  expect(onReply).toHaveBeenCalledWith(REVIEW);

  await render(<ReviewItem review={{ ...REVIEW, id: 'r2', parent_id: 'r1' }} onReply={onReply} isReply />);
  expect(screen.queryByTestId('review-reply')).toBeNull();
});

test('missing author falls back to a neutral label', async () => {
  await render(<ReviewItem review={{ ...REVIEW, author: undefined }} />);
  expect(screen.getByTestId('review-author')).toBeOnTheScreen();
});

test('renders avatar fallback initials when no image is set', async () => {
  await render(<ReviewItem review={REVIEW} />);
  // "Coach Carter" → first letters of up to two words, uppercased.
  expect(screen.getByText('CC')).toBeOnTheScreen();
});
