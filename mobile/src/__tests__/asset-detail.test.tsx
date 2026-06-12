import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// Shared mutable player object — tests can inspect & reset it.
const mockPlayer = { currentTime: 0, play: jest.fn() };
jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => mockPlayer),
  VideoView: () => null,
}));

const mockUseAssetQuery = jest.fn();
jest.mock('../api/queries/assets', () => ({
  ...jest.requireActual('../api/queries/assets'),
  useAssetQuery: (id: string) => mockUseAssetQuery(id),
}));

const mockUseReviewsQuery = jest.fn();
const mockUseCreateReviewMutation = jest.fn();
jest.mock('../api/queries/reviews', () => ({
  ...jest.requireActual('../api/queries/reviews'),
  useReviewsQuery: (videoId: string) => mockUseReviewsQuery(videoId),
  useCreateReviewMutation: (videoId: string) => mockUseCreateReviewMutation(videoId),
}));

let mockPermissions: string[] | null = null;
jest.mock('../../src/auth/auth-store', () => ({
  ...jest.requireActual('../../src/auth/auth-store'),
  useAuth: (selector: (s: { user: { permissions: string[] } | null }) => unknown) =>
    selector({ user: mockPermissions !== null ? { permissions: mockPermissions } : null }),
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
  mockPermissions = null;
  mockPlayer.currentTime = 0;
  mockPlayer.play.mockClear();
  // Default: no reviews
  mockUseReviewsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  mockUseCreateReviewMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false, isError: false });
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

const REVIEWS = [
  {
    id: 'r1',
    content: 'Great stance overall',
    timestamp_seconds: 75,
    parent_id: undefined,
    author: { name: 'Coach Ana' },
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'r2',
    content: 'Watch your left foot',
    timestamp_seconds: undefined,
    parent_id: undefined,
    author: { name: 'Coach Ben' },
    created_at: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: 'r3',
    content: 'Agreed, tuck it under',
    timestamp_seconds: undefined,
    parent_id: 'r1',
    author: { name: 'Student Joe' },
    created_at: new Date(Date.now() - 900_000).toISOString(),
  },
];

// ── Test 1: reviews render ────────────────────────────────────────────────────

test('reviews of the active part render under the player', async () => {
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL, refetch: jest.fn() });
  mockUseReviewsQuery.mockReturnValue({ isPending: false, isError: false, data: REVIEWS });

  await render(<Providers><AssetDetailScreen /></Providers>);

  expect(screen.getByText('Great stance overall')).toBeOnTheScreen();
  expect(screen.getByText('Watch your left foot')).toBeOnTheScreen();
  // Reply (r3) is rendered nested under r1
  expect(screen.getByText('Agreed, tuck it under')).toBeOnTheScreen();
});

// ── Test 2: timestamp chip seeks the player ───────────────────────────────────

test('timestamp chip seeks the player', async () => {
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL, refetch: jest.fn() });
  mockUseReviewsQuery.mockReturnValue({ isPending: false, isError: false, data: REVIEWS });

  await render(<Providers><AssetDetailScreen /></Providers>);

  // '1:15' is the formatted label for 75 seconds (review r1)
  const chip = screen.getByText('1:15');
  fireEvent.press(chip);

  expect(mockPlayer.currentTime).toBe(75);
  expect(mockPlayer.play).toHaveBeenCalled();
});

// ── Test 3: composer hidden without reviews:create ────────────────────────────

test('composer hidden without reviews:create', async () => {
  mockPermissions = [];
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL, refetch: jest.fn() });

  await render(<Providers><AssetDetailScreen /></Providers>);

  expect(screen.queryByTestId('review-input')).toBeNull();
});

// ── Test 4: composer visible with reviews:create ──────────────────────────────

test('composer visible with reviews:create', async () => {
  mockPermissions = ['reviews:create'];
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL, refetch: jest.fn() });

  await render(<Providers><AssetDetailScreen /></Providers>);

  expect(screen.getByTestId('review-input')).toBeOnTheScreen();
});

// ── Existing tests (keep passing) ─────────────────────────────────────────────

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
