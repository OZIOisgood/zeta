import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('../../src/auth/auth-store', () => ({
  ...jest.requireActual('../../src/auth/auth-store'),
  useAuth: (selector: (s: { user: null }) => unknown) => selector({ user: null }),
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
import VideosScreen from '../app/(tabs)/index';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ASSET = {
  id: 'a1', title: 'Kata 1', description: '', owner_id: 'u1',
  status: 'pending' as const, review_count: 0,
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
});

test('error state offers retry', async () => {
  const refetch = jest.fn();
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: true, data: undefined, refetch, isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
});

test('data state lists assets', async () => {
  mockUseAssetsQuery.mockReturnValue({ isPending: false, isError: false, data: [ASSET], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><VideosScreen /></Providers>);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
});
