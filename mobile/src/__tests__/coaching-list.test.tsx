import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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

let mockPermissions: string[] | null = ['coaching:book'];
let mockUserId = 's1';

jest.mock('../auth/auth-store', () => ({
  ...jest.requireActual('../auth/auth-store'),
  useAuth: (selector: (s: { user: { permissions: string[]; id: string } | null }) => unknown) =>
    selector({
      user: mockPermissions !== null ? { permissions: mockPermissions, id: mockUserId } : null,
    }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { initI18n } from '../i18n';
import CoachingScreen from '../app/(tabs)/coaching';
import type { Booking } from '../api/queries/coaching';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  mockPush.mockClear();
  mockMutateAsync.mockClear();
  mockPermissions = ['coaching:book'];
  mockUserId = 's1';
  mockUseCancelBookingMutation.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

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
  const retryBtn = screen.getByRole('button', { name: /try again/i });
  expect(retryBtn).toBeOnTheScreen();
  fireEvent.press(retryBtn);
  expect(refetch).toHaveBeenCalledTimes(1);
});

// ── data: section layout ──────────────────────────────────────────────────────

test('upcoming booking appears in upcoming section, not past section', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING, PAST_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  const upcomingSection = screen.getByTestId('coaching-upcoming');
  const pastSection = screen.getByTestId('coaching-past');
  expect(upcomingSection).toBeOnTheScreen();
  expect(pastSection).toBeOnTheScreen();
  // Strategy Session is in upcoming, Past Session is in past
  expect(screen.getByText('Strategy Session')).toBeOnTheScreen();
  expect(screen.getByText('Past Session')).toBeOnTheScreen();
});

test('cancelled booking appears in past section', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [CANCELLED_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  expect(screen.getByText('Cancelled Session')).toBeOnTheScreen();
});

// ── Book session button ───────────────────────────────────────────────────────

test('"Book session" button shown with coaching:book permission', async () => {
  mockPermissions = ['coaching:book'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  expect(screen.getByTestId('coaching-book')).toBeOnTheScreen();
});

test('"Book session" button NOT shown without coaching:book permission', async () => {
  mockPermissions = [];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  expect(screen.queryByTestId('coaching-book')).toBeNull();
});

test('"Book session" button navigates to /book', async () => {
  mockPermissions = ['coaching:book'];
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);
  fireEvent.press(screen.getByTestId('coaching-book'));
  expect(mockPush).toHaveBeenCalledWith('/book');
});

// ── cancel flow ───────────────────────────────────────────────────────────────

test('cancel flow: press booking-cancel → confirm UI → confirm → mutateAsync called with bookingId', async () => {
  mockMutateAsync.mockResolvedValueOnce(undefined);
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  // Cancel button visible (upcoming pending booking)
  const cancelBtn = screen.getByTestId('booking-cancel');
  expect(cancelBtn).toBeOnTheScreen();

  // Step 1: press cancel → confirm UI appears
  fireEvent.press(cancelBtn);
  await waitFor(() => expect(screen.getByTestId('booking-cancel-confirm')).toBeOnTheScreen());

  // Step 2: press confirm → mutateAsync called
  fireEvent.press(screen.getByTestId('booking-cancel-confirm'));
  await waitFor(() =>
    expect(mockMutateAsync).toHaveBeenCalledWith({ bookingId: UPCOMING_BOOKING.id }),
  );
});

test('cancel flow: mutateAsync rejects → sessions.cancel.failed text appears', async () => {
  mockMutateAsync.mockRejectedValueOnce(new Error('network'));
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  fireEvent.press(screen.getByTestId('booking-cancel'));
  await waitFor(() => expect(screen.getByTestId('booking-cancel-confirm')).toBeOnTheScreen());

  fireEvent.press(screen.getByTestId('booking-cancel-confirm'));
  await waitFor(() => expect(screen.getByText('Failed to cancel booking.')).toBeOnTheScreen());
});

test('cancel flow: pressing abort button unmounts confirm row and cancel affordance reappears', async () => {
  mockUseMyBookingsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [UPCOMING_BOOKING],
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<Providers><CoachingScreen /></Providers>);

  // Cancel button visible initially
  expect(screen.getByTestId('booking-cancel')).toBeOnTheScreen();

  // Press cancel → confirm row appears
  fireEvent.press(screen.getByTestId('booking-cancel'));
  await waitFor(() => expect(screen.getByTestId('booking-cancel-confirm')).toBeOnTheScreen());
  // The original cancel affordance should be hidden while confirming
  expect(screen.queryByTestId('booking-cancel')).toBeNull();

  // Press abort (the ghost "Cancel" button in the confirm row)
  const [abortBtn] = screen.getAllByRole('button', { name: /cancel/i });
  fireEvent.press(abortBtn);

  // Confirm row gone, cancel affordance reappears
  await waitFor(() => expect(screen.queryByTestId('booking-cancel-confirm')).toBeNull());
  expect(screen.getByTestId('booking-cancel')).toBeOnTheScreen();
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
  fireEvent.press(screen.getByTestId('booking-recording'));
  expect(mockPush).toHaveBeenCalledWith('/asset/asset-xyz');
});
