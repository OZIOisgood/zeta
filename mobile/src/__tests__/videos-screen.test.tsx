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

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { initI18n } from '../i18n';
import VideosScreen from '../app/(tabs)/videos';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  mockPermissions = null;
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

test('error state offers retry', async () => {
  const refetch = jest.fn();
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: true, data: undefined, refetch, isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  expect(screen.getByText('Videos could not be loaded')).toBeOnTheScreen();
});

test('data state lists assets', async () => {
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
});

test('upload FAB shows with assets:create permission', async () => {
  mockPermissions = ['assets:create'];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByLabelText('Upload video')).toBeOnTheScreen();
});

test('upload FAB hidden without permission', async () => {
  mockPermissions = [];
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [PENDING_ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.queryByLabelText('Upload video')).toBeNull();
});

test('filter tabs render with counts derived from the assets query', async () => {
  // 2 pending + 1 completed => all 3, to review 2, reviewed 1 (all distinct).
  mockUseAssetsQuery.mockReturnValue({
    isPending: false, isError: false, data: [PENDING_ASSET, PENDING_ASSET_2, COMPLETED_ASSET], refetch: jest.fn(), isRefetching: false,
  });
  await render(<Providers><VideosScreen /></Providers>);

  // All / To review / Reviewed each render as a tab.
  expect(screen.getByRole('tab', { name: 'All' })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'To review' })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Reviewed' })).toBeOnTheScreen();
  // Count badges: 3 total, 2 to review, 1 reviewed.
  expect(screen.getByText('3')).toBeOnTheScreen();
  expect(screen.getByText('2')).toBeOnTheScreen();
  expect(screen.getByText('1')).toBeOnTheScreen();
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
