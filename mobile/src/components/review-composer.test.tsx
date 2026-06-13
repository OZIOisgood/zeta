import i18next from 'i18next';
import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '../i18n';
import { ReviewComposer } from './review-composer';

beforeAll(() => initI18n('en'));
afterAll(() => i18next.changeLanguage('en'));

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

// ── i18n fixes ──────────────────────────────────────────────────────────────
// These tests use the German locale to verify the labels come from the
// translation system rather than hardcoded English literals.

test('reply banner renders translated "Replying to" text (German locale)', async () => {
  await i18next.changeLanguage('de');
  const replyingTo = {
    id: 'r1', content: 'Nice stance', author: { name: 'Coach Carter' },
    created_at: '2026-06-12T10:00:00Z',
  };
  await render(<ReviewComposer replyingTo={replyingTo} onCancelReply={jest.fn()} />);
  // German: "Antwort an Coach Carter"
  expect(screen.getByText(/Antwort an Coach Carter/)).toBeOnTheScreen();
  // Cancel button uses German label "Antwort abbrechen"
  const cancelBtn = screen.getByTestId('review-cancel-reply');
  expect(cancelBtn.props.accessibilityLabel).toBe('Antwort abbrechen');
});

test('send button uses translated accessibility label (German locale)', async () => {
  // i18next is still 'de' from previous test; reset in afterAll
  await render(<ReviewComposer />);
  const sendBtn = screen.getByTestId('review-send');
  // German: "Senden"
  expect(sendBtn.props.accessibilityLabel).toBe('Senden');
});

test('timestamp chip label uses translated "at <time>" interpolation (German locale)', async () => {
  // i18next is still 'de'
  await render(<ReviewComposer getCurrentTime={() => 0} />);
  // German atTime key: "bei {{time}}" → "bei 0:00"
  const chip = screen.getByTestId('review-at-time');
  expect(chip.props.accessibilityLabel).toBe('bei 0:00');
});
