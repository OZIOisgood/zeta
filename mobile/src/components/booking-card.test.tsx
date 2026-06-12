import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from '../i18n';
import { BookingCard } from './booking-card';
import type { Booking } from '../api/queries/coaching';

beforeAll(() => initI18n('en'));

const BASE_BOOKING: Booking = {
  id: 'b1',
  expert_id: 'e1',
  expert_name: 'Coach Ana',
  student_id: 's1',
  student_name: 'Bob Student',
  group_id: 'g1',
  session_type_id: 'st1',
  session_type_name: 'Strategy Session',
  scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // future
  duration_minutes: 60,
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
};

test('renders session type name, expert name (student view), date/time, duration', async () => {
  await render(
    <BookingCard
      booking={BASE_BOOKING}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.getByText('Strategy Session')).toBeOnTheScreen();
  expect(screen.getByText('Coach Ana')).toBeOnTheScreen();
  // duration
  expect(screen.getByText(/60 min/)).toBeOnTheScreen();
  // status chip
  expect(screen.getByTestId('booking-status-pending')).toBeOnTheScreen();
});

test('shows student name when current user is the expert', async () => {
  await render(
    <BookingCard
      booking={BASE_BOOKING}
      currentUserId="e1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.getByText('Bob Student')).toBeOnTheScreen();
});

test('cancel affordance shown when canCancel=true and fires onCancel', async () => {
  const onCancel = jest.fn();
  await render(
    <BookingCard
      booking={BASE_BOOKING}
      currentUserId="s1"
      canCancel={true}
      onCancel={onCancel}
      onOpenRecording={jest.fn()}
    />,
  );
  const cancelBtn = screen.getByTestId('booking-cancel');
  expect(cancelBtn).toBeOnTheScreen();
  fireEvent.press(cancelBtn);
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('cancel affordance NOT shown when canCancel=false', async () => {
  await render(
    <BookingCard
      booking={BASE_BOOKING}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.queryByTestId('booking-cancel')).toBeNull();
});

test('recording affordance shown when recording.asset_id present and fires onOpenRecording', async () => {
  const onOpenRecording = jest.fn();
  const bookingWithRecording: Booking = {
    ...BASE_BOOKING,
    recording: { status: 'ready', asset_id: 'asset-123' },
  };
  await render(
    <BookingCard
      booking={bookingWithRecording}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={onOpenRecording}
    />,
  );
  const recBtn = screen.getByTestId('booking-recording');
  expect(recBtn).toBeOnTheScreen();
  fireEvent.press(recBtn);
  expect(onOpenRecording).toHaveBeenCalledWith('asset-123');
});

test('recording affordance NOT shown when recording.asset_id absent', async () => {
  const bookingNoAsset: Booking = {
    ...BASE_BOOKING,
    recording: { status: 'processing' },
  };
  await render(
    <BookingCard
      booking={bookingNoAsset}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.queryByTestId('booking-recording')).toBeNull();
});

test('cancelled booking shows booking-status-cancelled chip and no cancel affordance', async () => {
  const cancelledBooking: Booking = {
    ...BASE_BOOKING,
    status: 'cancelled',
  };
  await render(
    <BookingCard
      booking={cancelledBooking}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.getByTestId('booking-status-cancelled')).toBeOnTheScreen();
  expect(screen.queryByTestId('booking-cancel')).toBeNull();
});

test('session type name falls back to "Session" when missing', async () => {
  const noTypeName: Booking = { ...BASE_BOOKING, session_type_name: undefined };
  await render(
    <BookingCard
      booking={noTypeName}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.getByText('Session')).toBeOnTheScreen();
});
