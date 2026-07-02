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

jest.mock('../../src/upload/upload-store', () => ({
  ...jest.requireActual('../../src/upload/upload-store'),
  useUploads: (selector: (s: { jobs: never[] }) => unknown) => selector({ jobs: [] }),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

const mockUseAssetsQuery = jest.fn();
jest.mock('../api/queries/assets', () => ({
  ...jest.requireActual('../api/queries/assets'),
  useAssetsQuery: () => mockUseAssetsQuery(),
}));

// The notification bell (header-right on every tab screen) reads the unread
// count from this query; default to zero unread so the badge stays hidden.
const mockUseNotificationsQuery = jest.fn(() => ({ data: { unread_count: 0 } }));
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
import VideosScreen from '../app/(tabs)/videos/index';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  mockPermissions = null;
  mockSetOptions.mockClear();
  mockPush.mockClear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// review_count values are kept off the small filter-count integers (0-3) so
// asserting on a badge count never collides with an AssetCard comment count.
const PENDING_ASSET = {
  id: 'a1', title: 'Kata 1', description: '', owner_id: 'u1',
  status: 'pending' as const, review_count: 40,
};
const PENDING_ASSET_2 = {
  id: 'a3', title: 'Kata 3', description: '', owner_id: 'u1',
  status: 'pending' as const, review_count: 41,
};
const COMPLETED_ASSET = {
  id: 'a2', title: 'Kata 2', description: '', owner_id: 'u1',
  status: 'completed' as const, review_count: 42,
};

test('loading state renders skeletons, not text', async () => {
  mockUseAssetsQuery.mockReturnValue({ isPending: true, isError: false, data: undefined, refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getAllByTestId('asset-skeleton').length).toBeGreaterThan(0);
  expect(screen.queryByText(/loading/i)).toBeNull();
});

test('empty state explains there are no videos yet', async () => {
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByTestId('videos-empty')).toBeOnTheScreen();
  expect(screen.getByText('No videos yet')).toBeOnTheScreen();
});

test('empty state offers an upload CTA when the user can create', async () => {
  const user = userEvent.setup();
  mockPush.mockClear();
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);

  const cta = screen.getByRole('button', { name: 'Upload your first video' });
  expect(cta).toBeOnTheScreen();
  await user.press(cta);
  expect(mockPush).toHaveBeenCalledWith('/upload');
});

test('error state offers retry', async () => {
  const refetch = jest.fn();
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: true, data: undefined, refetch, isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
  expect(screen.getByText('Videos could not be loaded')).toBeOnTheScreen();
});

test('data state lists assets', async () => {
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
});

test('renders the filter tabs when data is present', async () => {
  // The native stack header owns the page title ("All my videos"); the screen
  // body renders filter tabs (All / To review / Reviewed) which are always
  // present in the data state.
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByRole('tab', { name: 'All' })).toBeOnTheScreen();
});

// ── Header-right actions (iOS: create "+" + bell; Android: bell only) ─────────
// jest-expo runs with Platform.OS = 'ios', so the Android FAB is not rendered.
// The header-right always carries the notification bell (every tab screen, both
// platforms); on iOS it additionally carries the create "+" when the user can
// create. The headerRight is therefore ALWAYS a function (the bell is present
// regardless of assets:create).

test('upload action: setOptions always called with a headerRight function (bell present) when user has assets:create (iOS path)', async () => {
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );
});

test('header-right is still a function (bell only) when user lacks assets:create (iOS path)', async () => {
  mockPermissions = [];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );

  // The bell renders; the create "+" does not (no assets:create).
  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);
  expect(screen.getByTestId('notification-bell')).toBeOnTheScreen();
  expect(screen.queryByTestId('videos-create-header-btn')).toBeNull();
});

test('upload action: headerRight create button renders with accessible label and navigates to /upload (iOS path)', async () => {
  const user = userEvent.setup();
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  // Both the header button and the FAB now carry "Upload video" (upload.title
  // was sentence-cased) — target the header element by testID and assert its
  // accessible label directly.
  const headerBtn = screen.getByTestId('videos-create-header-btn');
  expect(headerBtn).toBeOnTheScreen();
  expect(headerBtn.props.accessibilityLabel).toBe('Upload video');

  await user.press(headerBtn);
  expect(mockPush).toHaveBeenCalledWith('/upload');
});

test('header-right notification bell renders on every tab screen and navigates to /notifications', async () => {
  const user = userEvent.setup();
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  const bell = screen.getByTestId('notification-bell');
  expect(bell).toBeOnTheScreen();
  await user.press(bell);
  expect(mockPush).toHaveBeenCalledWith('/notifications');
});

test('filter tabs carry per-segment counts', async () => {
  // 2 pending + 1 completed → All (3) · To review (2) · Reviewed (1). Counts in
  // the segment labels — the one segment-count pattern app-wide (Sessions +
  // Notifications do the same).
  mockUseAssetsQuery.mockReturnValue({
    isPending: false, isError: false, data: [PENDING_ASSET, PENDING_ASSET_2, COMPLETED_ASSET], refetch: jest.fn(), isRefetching: false,
  });
  await render(<Providers><VideosScreen /></Providers>);

  expect(screen.getByRole('tab', { name: /All/ })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: /To review/ })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: /Reviewed/ })).toBeOnTheScreen();
  // Per-segment count badges (bare ZTabs renders counts as ZBadge).
  expect(screen.getByText('3')).toBeOnTheScreen();
  expect(screen.getByText('2')).toBeOnTheScreen();
  expect(screen.getByText('1')).toBeOnTheScreen();
});

test('the total-count overline is gone — counts live in the segments', async () => {
  mockUseAssetsQuery.mockReturnValue({
    isPending: false, isError: false, data: [PENDING_ASSET, PENDING_ASSET_2, COMPLETED_ASSET], refetch: jest.fn(), isRefetching: false,
  });
  await render(<Providers><VideosScreen /></Providers>);

  expect(screen.queryByTestId('videos-count-overline')).toBeNull();
});

test('selecting a filter narrows the visible list', async () => {
  const user = userEvent.setup();
  mockUseAssetsQuery.mockReturnValue({
    isPending: false, isError: false, data: [PENDING_ASSET, COMPLETED_ASSET], refetch: jest.fn(), isRefetching: false,
  });
  await render(<Providers><VideosScreen /></Providers>);

  // Default 'all' shows both.
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
  expect(screen.getByText('Kata 2')).toBeOnTheScreen();

  // Reviewed filter keeps only the completed asset.
  await user.press(screen.getByRole('tab', { name: 'Reviewed' }));
  expect(screen.queryByText('Kata 1')).toBeNull();
  expect(screen.getByText('Kata 2')).toBeOnTheScreen();

  // To review filter keeps only the pending asset.
  await user.press(screen.getByRole('tab', { name: 'To review' }));
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
  expect(screen.queryByText('Kata 2')).toBeNull();
});

test('filter with no matches shows the no-match empty copy', async () => {
  const user = userEvent.setup();
  mockUseAssetsQuery.mockReturnValue({
    isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false,
  });
  await render(<Providers><VideosScreen /></Providers>);

  await user.press(screen.getByRole('tab', { name: 'Reviewed' }));
  expect(screen.getByTestId('videos-empty')).toBeOnTheScreen();
  expect(screen.getByText('No videos match these filters')).toBeOnTheScreen();
});
