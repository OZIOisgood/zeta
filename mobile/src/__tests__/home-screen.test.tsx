import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

let mockPermissions: string[] | null = null;
jest.mock('../../src/auth/auth-store', () => ({
  ...jest.requireActual('../../src/auth/auth-store'),
  useAuth: (selector: (s: { user: { permissions: string[] } | null }) => unknown) =>
    selector({ user: mockPermissions !== null ? { permissions: mockPermissions } : null }),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

const mockUseAssetsQuery = jest.fn();
jest.mock('../api/queries/assets', () => ({
  ...jest.requireActual('../api/queries/assets'),
  useAssetsQuery: () => mockUseAssetsQuery(),
}));

const mockUseGroupsQuery = jest.fn();
jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useGroupsQuery: () => mockUseGroupsQuery(),
}));

const mockUseMyBookingsQuery = jest.fn();
const mockUseMyAvailabilityQuery = jest.fn();
jest.mock('../api/queries/coaching', () => ({
  ...jest.requireActual('../api/queries/coaching'),
  useMyBookingsQuery: () => mockUseMyBookingsQuery(),
  useMyAvailabilityQuery: (...args: unknown[]) => mockUseMyAvailabilityQuery(...args),
}));

const mockUseNotificationsQuery = jest.fn();
jest.mock('../api/queries/notifications', () => ({
  ...jest.requireActual('../api/queries/notifications'),
  useNotificationsQuery: () => mockUseNotificationsQuery(),
}));

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

import { initI18n } from '../i18n';
import HomeScreen from '../app/(tabs)/(home)/index';

beforeAll(() => initI18n('en'));

// review_count values are kept high so they never collide with the small stat
// counts (0-9) asserted on in these tests.
function asset(id: string, status: 'pending' | 'completed', title: string) {
  return { id, title, description: '', owner_id: 'u1', status, review_count: 90 };
}

function group(id: string, name: string) {
  return {
    id,
    name,
    owner_id: 'u1',
    avatar: null,
    description: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

// A booking starting in the future counts as upcoming.
function futureBooking(id: string) {
  return {
    id,
    group_id: 'g1',
    status: 'pending',
    scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function success<T>(data: T) {
  return {
    data,
    isPending: false,
    isError: false,
    isSuccess: true,
    refetch: jest.fn(),
    isRefetching: false,
  };
}

function pending() {
  return {
    data: undefined,
    isPending: true,
    isError: false,
    isSuccess: false,
    refetch: jest.fn(),
    isRefetching: false,
  };
}

let client: QueryClient;
beforeEach(() => {
  mockPermissions = null;
  mockPush.mockClear();
  mockSetOptions.mockClear();
  mockUseAssetsQuery.mockReturnValue(success([]));
  mockUseGroupsQuery.mockReturnValue(success([]));
  mockUseMyBookingsQuery.mockReturnValue(success([]));
  mockUseMyAvailabilityQuery.mockReturnValue(success([]));
  mockUseNotificationsQuery.mockReturnValue({ data: undefined, isPending: false, isError: false });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

test('renders the latest videos section heading', async () => {
  // The native stack header owns the page title ("Home"); the screen body
  // renders a "Latest Videos" card heading which is always visible.
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  expect(screen.getByText('Latest videos')).toBeOnTheScreen();
});

test('stat cards render live counts from the assets, groups, and bookings queries', async () => {
  // Both groups:read and coaching:bookings:read are required for the gated stat cards.
  mockPermissions = ['groups:read', 'coaching:bookings:read'];
  mockUseAssetsQuery.mockReturnValue(
    success([asset('a1', 'pending', 'Kata 1'), asset('a2', 'completed', 'Kata 2')]),
  );
  mockUseGroupsQuery.mockReturnValue(success([group('g1', 'Karate Club')]));
  mockUseMyBookingsQuery.mockReturnValue(success([futureBooking('b1'), futureBooking('b2')]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  // Two videos, one group, two upcoming sessions.
  expect(screen.getByLabelText('Videos: 2')).toBeOnTheScreen();
  expect(screen.getByLabelText('My Groups: 1')).toBeOnTheScreen();
  expect(screen.getByLabelText('Upcoming Sessions: 2')).toBeOnTheScreen();
});

test('cancelled and past bookings are excluded from the upcoming sessions count', async () => {
  // coaching:bookings:read required for the sessions stat card to render.
  mockPermissions = ['coaching:bookings:read'];
  const cancelled = { ...futureBooking('b1'), status: 'cancelled' as const };
  const past = {
    id: 'b2',
    group_id: 'g1',
    status: 'done' as const,
    scheduled_at: new Date(Date.now() - 86_400_000).toISOString(),
  };
  mockUseMyBookingsQuery.mockReturnValue(success([cancelled, past, futureBooking('b3')]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  // Only the single future, non-cancelled booking counts.
  expect(screen.getByLabelText('Upcoming Sessions: 1')).toBeOnTheScreen();
});

test('tapping a stat card navigates to its tab', async () => {
  // All three gated cards require their respective permissions.
  mockPermissions = ['groups:read', 'coaching:bookings:read'];
  const user = userEvent.setup();
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  await user.press(screen.getByTestId('stat-card-videos'));
  expect(mockPush).toHaveBeenCalledWith('/videos');

  await user.press(screen.getByTestId('stat-card-groups'));
  expect(mockPush).toHaveBeenCalledWith('/groups');

  await user.press(screen.getByTestId('stat-card-sessions'));
  expect(mockPush).toHaveBeenCalledWith('/coaching');
});

test('latest videos preview is bounded to four and View all navigates to the Videos tab', async () => {
  const user = userEvent.setup();
  const many = Array.from({ length: 8 }, (_, i) =>
    asset(`a${i}`, 'pending', `Kata ${i}`),
  );
  mockUseAssetsQuery.mockReturnValue(success(many));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  // First four render, the fifth+ do not.
  expect(screen.getByText('Kata 0')).toBeOnTheScreen();
  expect(screen.getByText('Kata 3')).toBeOnTheScreen();
  expect(screen.queryByText('Kata 4')).toBeNull();
  expect(screen.queryByText('Kata 7')).toBeNull();

  await user.press(screen.getByTestId('latest-videos-view-all'));
  expect(mockPush).toHaveBeenCalledWith('/videos');
});

test('latest videos shows an empty state when there are no videos', async () => {
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.getByText('No videos yet')).toBeOnTheScreen();
  expect(screen.queryByTestId('latest-videos-list')).toBeNull();
  // Without assets:create there is no upload CTA in the empty state.
  expect(screen.queryByTestId('latest-videos-upload')).toBeNull();
});

test('latest videos empty state shows an upload CTA when the user can create assets', async () => {
  const user = userEvent.setup();
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue(success([]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  expect(screen.getByText('No videos yet')).toBeOnTheScreen();
  await user.press(screen.getByTestId('latest-videos-upload'));
  expect(mockPush).toHaveBeenCalledWith('/upload');
});

test('latest videos shows skeletons (not text) while loading', async () => {
  mockUseAssetsQuery.mockReturnValue(pending());
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.getAllByTestId('home-video-skeleton').length).toBeGreaterThan(0);
  expect(screen.queryByText(/loading/i)).toBeNull();
});

test('first steps shows when a permitted step is incomplete', async () => {
  // assets:create with no videos => the "upload your first video" step is incomplete.
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue(success([]));
  mockUseGroupsQuery.mockReturnValue(success([]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  expect(screen.getByTestId('first-steps-card')).toBeOnTheScreen();
  expect(screen.getByTestId('first-step-upload')).toBeOnTheScreen();
  // Without groups:read there is no group step.
  expect(screen.queryByTestId('first-step-groups')).toBeNull();
});

test('first steps hides when the user has no relevant permissions', async () => {
  mockPermissions = [];
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.queryByTestId('first-steps-card')).toBeNull();
});

test('first steps hides when every permitted step is already complete', async () => {
  // assets:create with an existing video => the only step is complete, so the
  // onboarding card is suppressed (mirrors the web showFirstSteps).
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue(success([asset('a1', 'pending', 'Kata 1')]));
  mockUseGroupsQuery.mockReturnValue(success([]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.queryByTestId('first-steps-card')).toBeNull();
});

test('tapping an incomplete first step navigates to its mobile route', async () => {
  const user = userEvent.setup();
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue(success([]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  await user.press(screen.getByTestId('first-step-upload'));
  expect(mockPush).toHaveBeenCalledWith('/upload');
});

// ── fix (6): availability query gated on coaching:availability:manage ─────────

test('availability query is NOT called when user lacks coaching:availability:manage', async () => {
  mockPermissions = ['assets:create']; // has assets:create but NOT coaching:availability:manage
  mockUseGroupsQuery.mockReturnValue(success([group('g1', 'Dojo')]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  // useMyAvailabilityQuery should be called with an empty groupId so the
  // internal `enabled: groupId !== ''` guard prevents the network request.
  expect(mockUseMyAvailabilityQuery).toHaveBeenCalledWith('');
});

test('availability query IS called with the groupId when user has coaching:availability:manage', async () => {
  mockPermissions = ['coaching:availability:manage'];
  mockUseGroupsQuery.mockReturnValue(success([group('g1', 'Dojo')]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  expect(mockUseMyAvailabilityQuery).toHaveBeenCalledWith('g1');
});

// ── Notification bell header action ──────────────────────────────────────────
// The bell moves from an in-body View row into the native nav-bar header-right
// (on both platforms) via navigation.setOptions. Tests verify that setOptions
// is called with a headerRight function and that the rendered bell is
// pressable and navigates to /notifications.

test('notification bell is registered in the header-right via setOptions', async () => {
  mockUseNotificationsQuery.mockReturnValue(
    success({ items: [], unread_count: 3 }),
  );

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  // setOptions should have been called with a headerRight function.
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );
});

test('notification bell headerRight renders the bell and badge when there are unread notifications', async () => {
  const user = userEvent.setup();
  mockUseNotificationsQuery.mockReturnValue(
    success({ items: [], unread_count: 5 }),
  );

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  // Render the headerRight component extracted from setOptions.
  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  // The bell button is accessible.
  expect(screen.getByTestId('notification-bell')).toBeOnTheScreen();
  // Unread badge is visible.
  expect(screen.getByTestId('notification-bell-badge')).toBeOnTheScreen();

  // Pressing the bell navigates to /notifications.
  await user.press(screen.getByTestId('notification-bell'));
  expect(mockPush).toHaveBeenCalledWith('/notifications');
});

test('notification bell headerRight renders without badge when unread count is zero', async () => {
  mockUseNotificationsQuery.mockReturnValue(
    success({ items: [], unread_count: 0 }),
  );

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  expect(screen.getByTestId('notification-bell')).toBeOnTheScreen();
  expect(screen.queryByTestId('notification-bell-badge')).toBeNull();
});
