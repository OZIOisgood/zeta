import { render, screen, fireEvent, within } from '@testing-library/react-native';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { initI18n } from '../i18n';
import { BookingCard, bookingCounterpart } from './booking-card';
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
  expect(screen.getByText('Expert: Coach Ana')).toBeOnTheScreen();
  // duration
  expect(screen.getByText(/60 min/)).toBeOnTheScreen();
  // status chip
  expect(screen.getByTestId('booking-status-pending')).toBeOnTheScreen();
});

test('status label is driven by the server status, not the date: server `done` in the client-future still reads "done"', async () => {
  // Clock-skew / boundary case: server already derived status=done, but the
  // client clock still sees scheduled_at as future. The label must follow the
  // server status (done) so it cannot disagree with the neutral `done` tone.
  const doneInFuture: Booking = {
    ...BASE_BOOKING,
    status: 'done',
    scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
  await render(
    <BookingCard
      booking={doneInFuture}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  const badge = screen.getByTestId('booking-status-done');
  expect(within(badge).getByText('Done')).toBeOnTheScreen();
  expect(screen.queryByText('Upcoming')).toBeNull();
});

test('status label is driven by the server status, not the date: server `pending` in the client-past still reads "upcoming"', async () => {
  // Boundary case: server status=pending, but scheduled_at just slipped into the
  // client past. The label must stay "upcoming" to match the primary `pending` tone.
  const pendingInPast: Booking = {
    ...BASE_BOOKING,
    status: 'pending',
    scheduled_at: new Date(Date.now() - 60 * 1000).toISOString(),
  };
  await render(
    <BookingCard
      booking={pendingInPast}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  const badge = screen.getByTestId('booking-status-pending');
  expect(within(badge).getByText('Upcoming')).toBeOnTheScreen();
  expect(screen.queryByText('Done')).toBeNull();
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
  expect(screen.getByText('Student: Bob Student')).toBeOnTheScreen();
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
  const cancelBtn = screen.getByTestId('booking-cancel-swipe-action');
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
  expect(screen.queryByTestId('booking-cancel-swipe-action')).toBeNull();
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

test('recording affordance NOT shown when status not ready even if asset_id present', async () => {
  const bookingNotReady: Booking = {
    ...BASE_BOOKING,
    recording: { status: 'stopped', asset_id: 'asset-123' },
  };
  await render(
    <BookingCard
      booking={bookingNotReady}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.queryByTestId('booking-recording')).toBeNull();
});

test('recording-status badge shown whenever a recording exists', async () => {
  const bookingProcessing: Booking = {
    ...BASE_BOOKING,
    recording: { status: 'processing' },
  };
  await render(
    <BookingCard
      booking={bookingProcessing}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.getByTestId('booking-recording-status')).toBeOnTheScreen();
});

test('recording-status badge absent when booking has no recording', async () => {
  await render(
    <BookingCard
      booking={BASE_BOOKING}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.queryByTestId('booking-recording-status')).toBeNull();
});

test('recording-status badge labels a ready recording', async () => {
  const bookingReady: Booking = {
    ...BASE_BOOKING,
    recording: { status: 'ready', asset_id: 'asset-123' },
  };
  await render(
    <BookingCard
      booking={bookingReady}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  const badge = screen.getByTestId('booking-recording-status');
  expect(within(badge).getByText('recording ready')).toBeOnTheScreen();
});

test('recording-status badge labels a failed recording', async () => {
  const bookingFailed: Booking = {
    ...BASE_BOOKING,
    recording: { status: 'failed' },
  };
  await render(
    <BookingCard
      booking={bookingFailed}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  const badge = screen.getByTestId('booking-recording-status');
  expect(within(badge).getByText('recording failed')).toBeOnTheScreen();
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
  expect(screen.queryByTestId('booking-cancel-swipe-action')).toBeNull();
});

test('cancelled booking with a reason renders the cancellation reason line', async () => {
  const cancelledWithReason: Booking = {
    ...BASE_BOOKING,
    status: 'cancelled',
    cancellation_reason: 'Coach unavailable',
  };
  await render(
    <BookingCard
      booking={cancelledWithReason}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  const reasonLine = screen.getByTestId('booking-cancellation-reason');
  expect(reasonLine).toBeOnTheScreen();
  expect(screen.getByText(/Coach unavailable/)).toBeOnTheScreen();
});

test('cancellation reason line absent when not cancelled even if reason present', async () => {
  const pendingWithReason: Booking = {
    ...BASE_BOOKING,
    status: 'pending',
    cancellation_reason: 'should not show',
  };
  await render(
    <BookingCard
      booking={pendingWithReason}
      currentUserId="s1"
      canCancel={false}
      onCancel={jest.fn()}
      onOpenRecording={jest.fn()}
    />,
  );
  expect(screen.queryByTestId('booking-cancellation-reason')).toBeNull();
});

test('bookingCounterpart returns the expert for the student viewer', () => {
  const b = { student_id: 'me', expert_id: 'x', expert_name: 'Coach Lee', student_name: 'Me' } as never;
  expect(bookingCounterpart(b, 'me')).toEqual({ name: 'Coach Lee', role: 'expert' });
});
test('bookingCounterpart returns the student for the expert viewer', () => {
  const b = { student_id: 's', expert_id: 'me', expert_name: 'Me', student_name: 'Sam' } as never;
  expect(bookingCounterpart(b, 'me')).toEqual({ name: 'Sam', role: 'student' });
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
