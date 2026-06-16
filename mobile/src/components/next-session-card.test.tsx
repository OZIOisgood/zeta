import { render, screen, userEvent } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from '../i18n';
import { NextSessionCard } from './next-session-card';

beforeAll(() => initI18n('en'));

const booking = {
  id: 'b1', student_id: 'me', expert_id: 'x', expert_name: 'Coach Lee', student_name: 'Me',
  session_type_name: 'Video Review', status: 'pending',
  scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(), duration_minutes: 30,
} as never;

test('renders the next booking with a Join action when canJoin is true', async () => {
  const onJoin = jest.fn();
  await render(<NextSessionCard booking={booking} currentUserId="me" canBook canJoin onJoin={onJoin} onDetails={() => {}} onBook={() => {}} />);
  expect(screen.getByText('Next session')).toBeOnTheScreen();
  expect(screen.getByText(/Coach Lee/)).toBeOnTheScreen();
  expect(screen.getByTestId('next-session-details')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByTestId('next-session-join'));
  expect(onJoin).toHaveBeenCalled();
});

test('hides the Join action but keeps Details when canJoin is false', async () => {
  await render(<NextSessionCard booking={booking} currentUserId="me" canBook canJoin={false} onJoin={() => {}} onDetails={() => {}} onBook={() => {}} />);
  expect(screen.getByText(/Coach Lee/)).toBeOnTheScreen();
  expect(screen.queryByTestId('next-session-join')).toBeNull();
  expect(screen.getByTestId('next-session-details')).toBeOnTheScreen();
});

test('renders a book prompt when there is no booking and the user can book', async () => {
  const onBook = jest.fn();
  await render(<NextSessionCard booking={null} currentUserId="me" canBook canJoin={false} onJoin={() => {}} onDetails={() => {}} onBook={onBook} />);
  await userEvent.setup().press(screen.getByTestId('next-session-book'));
  expect(onBook).toHaveBeenCalled();
});

test('renders nothing when there is no booking and the user cannot book', async () => {
  await render(<NextSessionCard booking={null} currentUserId="me" canBook={false} canJoin={false} onJoin={() => {}} onDetails={() => {}} onBook={() => {}} />);
  expect(screen.queryByTestId('next-session-card')).toBeNull();
});
