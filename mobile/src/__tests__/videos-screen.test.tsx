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

// ── Upload action (iOS: header-right; Android: FAB) ──────────────────────────
// jest-expo runs with Platform.OS = 'ios', so the Android FAB is not rendered.
// Instead, the primary action is registered in the native header via setOptions.

test('upload action: setOptions called with headerRight when user has assets:create (iOS path)', async () => {
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );
});

test('upload action: setOptions called with headerRight undefined when user lacks assets:create (iOS path)', async () => {
  mockPermissions = [];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: undefined }),
  );
});

test('upload action: headerRight button renders with accessible label and navigates to /upload (iOS path)', async () => {
  const user = userEvent.setup();
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  expect(screen.getByTestId('videos-create-header-btn')).toBeOnTheScreen();
  expect(screen.getByLabelText('Upload Video')).toBeOnTheScreen();

  await user.press(screen.getByLabelText('Upload Video'));
  expect(mockPush).toHaveBeenCalledWith('/upload');
});

test('filter tabs render as plain labels without counts', async () => {
  // 2 pending + 1 completed. The segmented filter shows plain labels (no "(N)").
  mockUseAssetsQuery.mockReturnValue({
    isPending: false, isError: false, data: [PENDING_ASSET, PENDING_ASSET_2, COMPLETED_ASSET], refetch: jest.fn(), isRefetching: false,
  });
  await render(<Providers><VideosScreen /></Providers>);

  // All / To review / Reviewed each render as a tab with a plain label.
  expect(screen.getByRole('tab', { name: 'All' })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'To review' })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Reviewed' })).toBeOnTheScreen();
  // No per-segment count badges anymore.
  expect(screen.queryByText('3')).toBeNull();
  expect(screen.queryByText('2')).toBeNull();
  expect(screen.queryByText('1')).toBeNull();
});

test('data state shows the total-count overline above the list', async () => {
  // The overline uses the TOTAL asset count (3), independent of the active filter.
  mockUseAssetsQuery.mockReturnValue({
    isPending: false, isError: false, data: [PENDING_ASSET, PENDING_ASSET_2, COMPLETED_ASSET], refetch: jest.fn(), isRefetching: false,
  });
  await render(<Providers><VideosScreen /></Providers>);

  const overline = screen.getByTestId('videos-count-overline');
  expect(overline).toBeOnTheScreen();
  expect(overline).toHaveTextContent('3 videos');
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
