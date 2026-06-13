import { render, screen, userEvent } from '@testing-library/react-native';
import { ReviewComposer } from './review-composer';

test('submits content with the captured timestamp', async () => {
  const onSubmit = jest.fn(async () => undefined);
  const user = userEvent.setup();
  await render(<ReviewComposer onSubmit={onSubmit} getCurrentTime={() => 33} />);
  await user.type(screen.getByTestId('review-input'), 'Great kick');
  await user.press(screen.getByTestId('review-at-time')); // toggle "at 0:33"
  await user.press(screen.getByTestId('review-send'));
  expect(onSubmit).toHaveBeenCalledWith({ content: 'Great kick', timestampSeconds: 33 });
});

test('submits without timestamp when the chip is not toggled', async () => {
  const onSubmit = jest.fn(async () => undefined);
  const user = userEvent.setup();
  await render(<ReviewComposer onSubmit={onSubmit} getCurrentTime={() => 33} />);
  await user.type(screen.getByTestId('review-input'), 'Great kick');
  await user.press(screen.getByTestId('review-send'));
  expect(onSubmit).toHaveBeenCalledWith({ content: 'Great kick' });
});

test('send is disabled while the input is empty', async () => {
  const onSubmit = jest.fn();
  const user = userEvent.setup();
  await render(<ReviewComposer onSubmit={onSubmit} />);
  await user.press(screen.getByTestId('review-send'));
  expect(onSubmit).not.toHaveBeenCalled();
});

test('reply mode passes the parent id and can be cancelled', async () => {
  const onSubmit = jest.fn(async () => undefined);
  const onCancelReply = jest.fn();
  const user = userEvent.setup();
  const replyingTo = {
    id: 'r1', content: 'Nice stance', author: { name: 'Coach Carter' },
    created_at: '2026-06-12T10:00:00Z',
  };
  await render(
    <ReviewComposer onSubmit={onSubmit} replyingTo={replyingTo} onCancelReply={onCancelReply} />,
  );
  await user.type(screen.getByTestId('review-input'), 'Thanks!');
  await user.press(screen.getByTestId('review-send'));
  expect(onSubmit).toHaveBeenCalledWith({ content: 'Thanks!', parentId: 'r1' });
  await user.press(screen.getByTestId('review-cancel-reply'));
  expect(onCancelReply).toHaveBeenCalled();
});
