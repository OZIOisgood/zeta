import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from '../../i18n';
import { ReviewItem } from '../review-item';

beforeAll(() => initI18n('en'));

const REVIEW = {
  id: 'r1',
  content: 'Solid kick',
  author: { name: 'Coach' },
  created_at: '2026-06-12T10:00:00Z',
};

test('the seek pill carries the localized "jump to" accessibility label and seeks on press', async () => {
  const onSeek = jest.fn();
  await render(
    <ReviewItem review={{ ...REVIEW, timestamp_seconds: 12 } as never} onSeek={onSeek} />,
  );
  // en.json: "seekTo": "Jump to {{time}}"
  const pill = screen.getByLabelText('Jump to 0:12');
  expect(pill).toBeOnTheScreen();
  expect(screen.getByTestId('review-seek')).toBeOnTheScreen();
  fireEvent.press(pill);
  expect(onSeek).toHaveBeenCalledWith(12);
});

test('shows edit + delete actions only when handlers are provided', async () => {
  await render(<ReviewItem review={REVIEW as never} />);
  expect(screen.queryByTestId('review-edit')).toBeNull();
  expect(screen.queryByTestId('review-delete')).toBeNull();
});

test('opens the inline edit form and saves the trimmed content', async () => {
  const onEdit = jest.fn(async () => undefined);
  await render(<ReviewItem review={REVIEW as never} onEdit={onEdit} />);
  await act(async () => { fireEvent.press(screen.getByTestId('review-edit')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('review-edit-input'), '  Reworked note  '); });
  await act(async () => { fireEvent.press(screen.getByTestId('review-edit-save')); });
  await waitFor(() => expect(onEdit).toHaveBeenCalledWith(REVIEW, 'Reworked note'));
});

test('delete action invokes onDelete with the review', async () => {
  const onDelete = jest.fn();
  await render(<ReviewItem review={REVIEW as never} onDelete={onDelete} />);
  fireEvent.press(screen.getByTestId('review-delete'));
  expect(onDelete).toHaveBeenCalledWith(REVIEW);
});

test('enhance swaps the draft with the enhanced text', async () => {
  const onEdit = jest.fn(async () => undefined);
  const onEnhance = jest.fn(async () => 'Polished note');
  await render(<ReviewItem review={REVIEW as never} onEdit={onEdit} onEnhance={onEnhance} />);
  await act(async () => { fireEvent.press(screen.getByTestId('review-edit')); });
  await act(async () => { fireEvent.press(screen.getByTestId('review-edit-enhance')); });
  await waitFor(() => expect(onEnhance).toHaveBeenCalled());
  // After enhance, draft is 'Polished note'; save should pass it to onEdit
  await act(async () => { fireEvent.press(screen.getByTestId('review-edit-save')); });
  await waitFor(() => expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }), 'Polished note'));
});
