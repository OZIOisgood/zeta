import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

const mockUseMyBookingsQuery = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseCancelBookingMutation = jest.fn();

jest.mock('../api/queries/coaching', () => ({
  ...jest.requireActual('../api/queries/coaching'),
  useMyBookingsQuery: () => mockUseMyBookingsQuery(),
  useCancelBookingMutation: (_groupId: string) => mockUseCancelBookingMutation(_groupId),
}));

const mockShowToast = jest.fn();
jest.mock('../components/ui/z-toast', () => ({
  ...jest.requireActual('../components/ui/z-toast'),
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

// The notification bell (header-right on every tab screen) reads the unread
// count from this query; default to zero unread so the badge stays hidden.
const mockUseNotificationsQuery = jest.fn(() => ({ data: { unread_count: 0 } }));
jest.mock('../api/queries/notifications', () => ({
  ...jest.requireActual('../api/queries/notifications'),
  useNotificationsQuery: () => mockUseNotificationsQuery(),
}));

let mockPermissions: string[] | null = ['coaching:bookings:read', 'coaching:book'];
let mockUserId = 's1';

jest.mock('../auth/auth-store', () => ({
  ...jest.requireActual('../auth/auth-store'),
  useAuth: (selector: (s: { user: { permissions: string[]; id: string } | null }) => unknown) =>
    selector({
      user: mockPermissions !== null ? { permissions: mockPermissions, id: mockUserId } : null,
    }),
}));

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

import { initI18n } from '../i18n';
import CoachingScreen from '../app/(tabs)/coaching/index';
import type { Booking } from '../api/queries/coaching';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  mockPush.mockClear();
  mockSetOptions.mockClear();
  mockMutateAsync.mockClear();
  mockShowToast.mockClear();
  mockPermissions = ['coaching:bookings:read', 'coaching:book'];
  mockUserId = 's1';
  mockUseCancelBookingMutation.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(async () => {
  // Flush any pending VirtualizedList cell-render timers so they don't leak into
  // the next test's act() scope (FlatList schedules _updateCellsToRender via
  // setTimeout(0); an unflushed one corrupts the next render).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  client.clear();
});

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const UPCOMING_BOOKING: Booking = {
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

const PAST_BOOKING: Booking = {
  id: 'b2',
  expert_id: 'e1',
  expert_name: 'Coach Ana',
  student_id: 's1',
  student_name: 'Bob Student',
  group_id: 'g1',
  session_type_id: 'st1',
  session_type_name: 'Past Session',
  scheduled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // past
  duration_minutes: 45,
  status: 'done',
  created_at: '2026-01-01T00:00:00Z',
};

const CANCELLED_BOOKING: Booking = {
  id: 'b3',
  expert_id: 'e1',
  expert_name: 'Coach Ana',
  student_id: 's1',
  student_name: 'Bob Student',
  group_id: 'g1',
  session_type_id: 'st1',
  session_type_name: 'Cancelled Session',
  scheduled_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  duration_minutes: 30,
  status: 'cancelled',
  created_at: '2026-01-01T00:00:00Z',
};

// ── loading state ─────────────────────────────────────────────────────────────

test('loading state renders skeletons, not text', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: true,
    isError: false,
    data: undefined,
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  expect(screen.getAllByTestId('booking-skeleton').length).toBeGreaterThan(0);
  expect(screen.queryByText(/loading/i)).toBeNull();
});

// ── empty state ───────────────────────────────────────────────────────────────

test('empty state shows coaching-empty testID', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  expect(screen.getByTestId('coaching-empty')).toBeOnTheScreen();
  // Default tab is upcoming → upcoming empty copy
  expect(screen.getByText('No upcoming sessions')).toBeOnTheScreen();
});

// ── error + retry ─────────────────────────────────────────────────────────────

test('error state shows retry button', async () => {
  const refetch = jest.fn();
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: true,
    data: undefined,
    refetch,
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  expect(screen.getByTestId('coaching-error')).toBeOnTheScreen();
  const retryBtn = screen.getByRole('button', { name: /try again/i });
  expect(retryBtn).toBeOnTheScreen();
  fireEvent.press(retryBtn);
  expect(refetch).toHaveBeenCalledTimes(1);
});

// ── tabs: three distinct lists by status ──────────────────────────────────────

test('tab counts reflect upcoming / past / cancelled buckets', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING, PAST_BOOKING, CANCELLED_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  // Default (upcoming) tab shows only the upcoming booking.
  expect(screen.getByText('Strategy Session')).toBeOnTheScreen();
  expect(screen.queryByText('Past Session')).toBeNull();
  expect(screen.queryByText('Cancelled Session')).toBeNull();
});

test('switching to the past tab shows past sessions only (cancelled NOT folded in)', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING, PAST_BOOKING, CANCELLED_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  fireEvent.press(screen.getByRole('tab', { name: /past/i }));

  await waitFor(() => expect(screen.getByText('Past Session')).toBeOnTheScreen());
  expect(screen.queryByText('Strategy Session')).toBeNull();
  // Cancelled sessions must NOT appear in the past tab.
  expect(screen.queryByText('Cancelled Session')).toBeNull();
});

test('switching to the cancelled tab shows cancelled sessions only', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING, PAST_BOOKING, CANCELLED_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  fireEvent.press(screen.getByRole('tab', { name: /cancelled/i }));

  await waitFor(() => expect(screen.getByText('Cancelled Session')).toBeOnTheScreen());
  expect(screen.queryByText('Strategy Session')).toBeNull();
  expect(screen.queryByText('Past Session')).toBeNull();
});

test('empty cancelled tab shows the cancelled empty copy', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  fireEvent.press(screen.getByRole('tab', { name: /cancelled/i }));

  await waitFor(() => expect(screen.getByText('No cancelled sessions')).toBeOnTheScreen());
});

// ── Book action (iOS: header-right "+"; Android: FAB) ─────────────────────────
// jest-expo runs with Platform.OS = 'ios', so the Android FAB is not rendered.
// On iOS, the booking action is registered as a header-right button via setOptions.

test('Book action: setOptions called with headerRight containing book button when user has coaching:book (iOS path)', async () => {
  mockPermissions = ['coaching:bookings:read', 'coaching:book'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );
});

test('Book action: headerRight still set (bell only) when user lacks coaching:book and coaching:availability:manage (iOS path)', async () => {
  mockPermissions = ['coaching:bookings:read']; // has tab access but no book/availability action
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  // The notification bell makes headerRight unconditional on every tab screen.
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );

  // Only the bell renders — no book "+" and no availability action.
  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);
  expect(screen.getByTestId('notification-bell')).toBeOnTheScreen();
  expect(screen.queryByTestId('coaching-book-header-btn')).toBeNull();
  expect(screen.queryByTestId('coaching-availability-header-btn')).toBeNull();
});

test('header-right notification bell renders on the sessions screen and navigates to /notifications', async () => {
  mockPermissions = ['coaching:bookings:read'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  const bell = screen.getByTestId('notification-bell');
  expect(bell).toBeOnTheScreen();
  fireEvent.press(bell);
  expect(mockPush).toHaveBeenCalledWith('/notifications');
});

test('Book action: header-right book button is labelled sessions.bookLive and navigates to /book (iOS path)', async () => {
  mockPermissions = ['coaching:bookings:read', 'coaching:book'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  expect(screen.getByTestId('coaching-book-header-btn')).toBeOnTheScreen();
  expect(screen.getByLabelText('Book live coaching')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Book live coaching'));
  expect(mockPush).toHaveBeenCalledWith('/book');
});

// ── Manage Availability header action (both platforms) ────────────────────────

test('Availability action: setOptions called with headerRight when user has coaching:availability:manage', async () => {
  mockPermissions = ['coaching:bookings:read', 'coaching:availability:manage'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );
});

test('Availability action: header button is labelled and navigates to /availability', async () => {
  mockPermissions = ['coaching:bookings:read', 'coaching:availability:manage'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  expect(screen.getByTestId('coaching-availability-header-btn')).toBeOnTheScreen();
  // sessions.availability.manageTitle = 'Availability'
  expect(screen.getByLabelText('Availability')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Availability'));
  expect(mockPush).toHaveBeenCalledWith('/availability');
});

// ── cancel flow ───────────────────────────────────────────────────────────────

test('cancel flow: activating the swipe action navigates to the cancel formSheet route', async () => {
  // Cancellation is now a swipe-to-reveal action on the booking card that opens
  // a native formSheet route (cancel/[bookingId]) — no inline dialog, no footer
  // button. The bare ZSwipeable fallback (jest/web) exposes the revealed action
  // as a pressable with testID `<testID>-action`. The reason/mutation/toast flow
  // is covered by cancel-session.test.tsx; here we assert only the nav contract.
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  const cancelAction = await screen.findByTestId('booking-cancel-swipe-action');
  expect(cancelAction).toBeOnTheScreen();

  fireEvent.press(cancelAction);
  expect(mockPush).toHaveBeenCalledWith(
    `/cancel/${UPCOMING_BOOKING.id}?groupId=${UPCOMING_BOOKING.group_id}`,
  );
});

// ── recording press ───────────────────────────────────────────────────────────

test('recording press navigates to /asset/<id>', async () => {
  const bookingWithRecording: Booking = {
    ...UPCOMING_BOOKING,
    recording: { status: 'ready', asset_id: 'asset-xyz' },
  };
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [bookingWithRecording],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  fireEvent.press(await screen.findByTestId('booking-recording'));
  expect(mockPush).toHaveBeenCalledWith('/asset/asset-xyz');
});

// ── Join affordance ───────────────────────────────────────────────────────────

// A booking that is within the join window: scheduled 5 minutes from now,
// so now >= scheduled_at - 15min and now <= scheduled_at + duration.
const JOINABLE_BOOKING: Booking = {
  id: 'b1',
  expert_id: 'e1',
  expert_name: 'Coach Ana',
  student_id: 's1',
  student_name: 'Bob Student',
  group_id: 'g1',
  session_type_id: 'st1',
  session_type_name: 'Strategy Session',
  scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min from now
  duration_minutes: 60,
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
};

// A booking outside the join window: 7 days away.
const NOT_YET_JOINABLE_BOOKING: Booking = {
  ...JOINABLE_BOOKING,
  id: 'b2',
  scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

test('joinable booking with coaching:video:connect → Join button visible and navigates correctly', async () => {
  mockPermissions = ['coaching:bookings:read', 'coaching:book', 'coaching:video:connect'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [JOINABLE_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  const joinBtn = await screen.findByTestId('booking-join');
  expect(joinBtn).toBeOnTheScreen();
  fireEvent.press(joinBtn);
  expect(mockPush).toHaveBeenCalledWith('/call/b1?groupId=g1');
});

test('joinable booking WITHOUT coaching:video:connect → Join button absent', async () => {
  mockPermissions = ['coaching:bookings:read', 'coaching:book']; // no coaching:video:connect
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [JOINABLE_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  // Wait for the row to mount before asserting the Join affordance is absent.
  await screen.findByText('Strategy Session');
  expect(screen.queryByTestId('booking-join')).toBeNull();
});

test('booking outside join window → Join button absent even with permission', async () => {
  mockPermissions = ['coaching:bookings:read', 'coaching:book', 'coaching:video:connect'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [NOT_YET_JOINABLE_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  // Wait for the row to mount before asserting the Join affordance is absent.
  await screen.findByText('Strategy Session');
  expect(screen.queryByTestId('booking-join')).toBeNull();
});
