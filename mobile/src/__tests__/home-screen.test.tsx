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
jest.mock('../api/queries/coaching', () => ({
  ...jest.requireActual('../api/queries/coaching'),
  useMyBookingsQuery: () => mockUseMyBookingsQuery(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { initI18n } from '../i18n';
import HomeScreen from '../app/(tabs)/index';

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
  mockUseAssetsQuery.mockReturnValue(success([]));
  mockUseGroupsQuery.mockReturnValue(success([]));
  mockUseMyBookingsQuery.mockReturnValue(success([]));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

test('stat cards render live counts from the assets, groups, and bookings queries', async () => {
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

test('latest videos preview is bounded to five and View all navigates to the Videos tab', async () => {
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

  // First five render, the sixth+ do not.
  expect(screen.getByText('Kata 0')).toBeOnTheScreen();
  expect(screen.getByText('Kata 4')).toBeOnTheScreen();
  expect(screen.queryByText('Kata 5')).toBeNull();
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
