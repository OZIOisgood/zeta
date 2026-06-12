import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({})),
  VideoView: () => null,
}));

const mockUseAssetQuery = jest.fn();
jest.mock('../api/queries/assets', () => ({
  ...jest.requireActual('../api/queries/assets'),
  useAssetQuery: (id: string) => mockUseAssetQuery(id),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

import { initI18n } from '../i18n';
import AssetDetailScreen from '../app/asset/[id]';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const DETAIL = {
  id: 'a1', title: 'Kata 1', description: 'Front stance drill', owner_id: 'u1',
  status: 'pending' as const, review_count: 0, playback_id: 'pb1',
  videos: [
    { id: 'v1', playback_id: 'pb1', status: 'ready', review_count: 2 },
    { id: 'v2', playback_id: '', status: 'preparing', review_count: 0 },
  ],
};

test('shows title, description and part info', async () => {
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL, refetch: jest.fn() });
  await render(<Providers><AssetDetailScreen /></Providers>);
  expect(screen.getByText('Kata 1')).toBeOnTheScreen();
  expect(screen.getByText('Front stance drill')).toBeOnTheScreen();
});

test('loading state renders a skeleton', async () => {
  mockUseAssetQuery.mockReturnValue({ isPending: true, isError: false, data: undefined, refetch: jest.fn() });
  await render(<Providers><AssetDetailScreen /></Providers>);
  expect(screen.getByTestId('asset-detail-skeleton')).toBeOnTheScreen();
});
