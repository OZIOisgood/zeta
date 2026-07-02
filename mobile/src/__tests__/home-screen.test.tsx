import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

let mockUser: { id: string; first_name: string; last_name: string; avatar?: string; permissions: string[] } | null = null;
jest.mock('../../src/auth/auth-store', () => ({
  ...jest.requireActual('../../src/auth/auth-store'),
  useAuth: (selector: (s: { user: typeof mockUser }) => unknown) => selector({ user: mockUser }),
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
  mockUser = { id: 'u1', first_name: 'Heinrich', last_name: 'M', permissions: [] };
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

test('renders the greeting and first name', async () => {
  mockUser = { id: 'u1', first_name: 'Heinrich', last_name: 'M', permissions: [] };
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.getByText('Heinrich')).toBeOnTheScreen();
  expect(
    screen.queryByText('Good morning') || screen.queryByText('Good afternoon') || screen.queryByText('Good evening'),
  ).not.toBeNull();
});

test('hides the native header in favor of the in-content greeting', async () => {
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({ headerShown: false }));
});

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

test('renders the next-session hero for an upcoming booking but no Join outside the window', async () => {
  // 2 days out => not in the join window => the hero renders without a dead
  // Join button (only Details).
  mockUser = { id: 'me', first_name: 'A', last_name: 'B', permissions: ['coaching:book'] };
  mockUseMyBookingsQuery.mockReturnValue(success([{
    id: 'b1', student_id: 'me', expert_id: 'x', expert_name: 'Coach Lee', student_name: 'Me',
    session_type_name: 'Video Review', status: 'pending', duration_minutes: 30,
    scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  }]));
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.getByTestId('next-session-card')).toBeOnTheScreen();
  expect(screen.getByText(/Coach Lee/)).toBeOnTheScreen();
  expect(screen.queryByTestId('next-session-join')).toBeNull();
});

test('hero Join is shown inside the window and routes to the call', async () => {
  // Within the join window (5 min out) AND the connect permission present =>
  // the Join button renders and routes to the actual call.
  const user = userEvent.setup();
  mockUser = {
    id: 'me', first_name: 'A', last_name: 'B',
    permissions: ['coaching:book', 'coaching:video:connect'],
  };
  mockUseMyBookingsQuery.mockReturnValue(success([{
    id: 'b1', student_id: 'me', expert_id: 'x', expert_name: 'Coach Lee', student_name: 'Me',
    session_type_name: 'Video Review', status: 'pending', duration_minutes: 30, group_id: 'g1',
    scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  }]));
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.getByTestId('next-session-join')).toBeOnTheScreen();
  await user.press(screen.getByTestId('next-session-join'));
  expect(mockPush).toHaveBeenCalledWith('/call/b1?groupId=g1');
});

test('hero shows a book prompt when there is no booking and the user can book', async () => {
  mockUser = { id: 'me', first_name: 'A', last_name: 'B', permissions: ['coaching:book'] };
  mockUseMyBookingsQuery.mockReturnValue(success([]));
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.getByTestId('next-session-book')).toBeOnTheScreen();
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
  mockUser = { ...mockUser!, permissions: ['assets:create'] };
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

test('first-steps card shows a progress bar', async () => {
  mockUser = { id: 'u1', first_name: 'A', last_name: 'B', permissions: ['assets:create'] };
  mockUseAssetsQuery.mockReturnValue(success([]));
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.getByTestId('first-steps-progress')).toBeOnTheScreen();
});

test('does not render the removed stat cards', async () => {
  mockUser = { id: 'u1', first_name: 'A', last_name: 'B', permissions: ['groups:read', 'coaching:bookings:read'] };
  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );
  expect(screen.queryByTestId('stat-card-videos')).toBeNull();
});

test('first steps shows when a permitted step is incomplete', async () => {
  // assets:create with no videos => the "upload your first video" step is incomplete.
  mockUser = { ...mockUser!, permissions: ['assets:create'] };
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
  mockUser = { ...mockUser!, permissions: [] };
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
  mockUser = { ...mockUser!, permissions: ['assets:create'] };
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
  mockUser = { ...mockUser!, permissions: ['assets:create'] };
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
  mockUser = { ...mockUser!, permissions: ['assets:create'] }; // has assets:create but NOT coaching:availability:manage
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
  mockUser = { ...mockUser!, permissions: ['coaching:availability:manage'] };
  mockUseGroupsQuery.mockReturnValue(success([group('g1', 'Dojo')]));

  await render(
    <Providers>
      <HomeScreen />
    </Providers>,
  );

  expect(mockUseMyAvailabilityQuery).toHaveBeenCalledWith('g1');
});
