import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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
const mockUseFinalizeAssetMutation = jest.fn();
jest.mock('../api/queries/assets', () => ({
  ...jest.requireActual('../api/queries/assets'),
  useAssetQuery: (id: string) => mockUseAssetQuery(id),
  useFinalizeAssetMutation: (id: string) => mockUseFinalizeAssetMutation(id),
}));

const mockUseReviewsQuery = jest.fn();
const mockUseCreateReviewMutation = jest.fn();
const mockUseUpdateReviewMutation = jest.fn();
const mockUseDeleteReviewMutation = jest.fn();
const mockUseEnhanceReviewTextMutation = jest.fn();
jest.mock('../api/queries/reviews', () => ({
  ...jest.requireActual('../api/queries/reviews'),
  useReviewsQuery: (videoId: string) => mockUseReviewsQuery(videoId),
  useCreateReviewMutation: (videoId: string) => mockUseCreateReviewMutation(videoId),
  useUpdateReviewMutation: (videoId: string) => mockUseUpdateReviewMutation(videoId),
  useDeleteReviewMutation: (videoId: string) => mockUseDeleteReviewMutation(videoId),
  useEnhanceReviewTextMutation: () => mockUseEnhanceReviewTextMutation(),
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
  mockUseUpdateReviewMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false, isError: false });
  mockUseDeleteReviewMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false, isError: false });
  mockUseEnhanceReviewTextMutation.mockReturnValue({ mutateAsync: jest.fn() });
  mockUseFinalizeAssetMutation.mockReturnValue({ mutateAsync: jest.fn() });
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

// ── Test 5: composer hidden on completed asset even with reviews:create ──────────

test('composer hidden when asset is completed even with reviews:create', async () => {
  mockPermissions = ['reviews:create'];
  mockUseAssetQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: { ...DETAIL, status: 'completed' as const },
    refetch: jest.fn(),
  });

  await render(<Providers><AssetDetailScreen /></Providers>);

  expect(screen.queryByTestId('review-input')).toBeNull();
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

// ── i18n fix: partsProcessing pluralization ───────────────────────────────────

test('processing-parts banner renders via i18n plural key (testID present)', async () => {
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL, refetch: jest.fn() });
  await render(<Providers><AssetDetailScreen /></Providers>);
  // DETAIL has 2 videos, one processing (playback_id === '')
  // Must render the testID for the processing banner
  expect(screen.getByTestId('processing-parts-banner')).toBeOnTheScreen();
  // English plural: "1 more part still processing."
  expect(screen.getByText('1 more part still processing.')).toBeOnTheScreen();
  // Must NOT render the old hardcoded hand-rolled plural string pattern
  expect(screen.queryByText(/more parts still processing\./)).toBeNull();
});

// ── Fix 1: handleEdit re-throws on failure so inline form stays open ──────────

test('edit form stays open and draft is preserved when the update mutation fails', async () => {
  // reviews:edit but NOT reviews:create (simulates edit-only role)
  mockPermissions = ['reviews:edit'];
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL, refetch: jest.fn() });
  mockUseReviewsQuery.mockReturnValue({ isPending: false, isError: false, data: REVIEWS });

  const failingUpdate = jest.fn().mockRejectedValue(new Error('network error'));
  mockUseUpdateReviewMutation.mockReturnValue({ mutateAsync: failingUpdate });

  await render(<Providers><AssetDetailScreen /></Providers>);

  // Open inline edit form on the first review (there are multiple edit buttons)
  await act(async () => { fireEvent.press(screen.getAllByTestId('review-edit')[0]); });

  // Modify the draft
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('review-edit-input'), 'My updated note');
  });

  // Attempt to save — the mutation rejects; handleEdit re-throws so setIsEditing(false)
  // is skipped; saveEdit catches the rethrow to avoid unhandled rejection.
  await act(async () => { fireEvent.press(screen.getByTestId('review-edit-save')); });

  // The edit form must still be visible (draft not discarded)
  await waitFor(() => expect(screen.getByTestId('review-edit-form')).toBeOnTheScreen());

  // The draft text must still be present in the input
  expect(screen.getByTestId('review-edit-input').props.value).toBe('My updated note');
});

// ── Fix 2: mutationError banner visible outside canCompose guard ──────────────

test('mutation error banner shows for edit-only role (no reviews:create)', async () => {
  // edit-only role: can edit/delete but NOT compose
  mockPermissions = ['reviews:edit', 'reviews:delete'];
  mockUseAssetQuery.mockReturnValue({ isPending: false, isError: false, data: DETAIL, refetch: jest.fn() });
  mockUseReviewsQuery.mockReturnValue({ isPending: false, isError: false, data: REVIEWS });

  const failingUpdate = jest.fn().mockRejectedValue(new Error('network error'));
  mockUseUpdateReviewMutation.mockReturnValue({ mutateAsync: failingUpdate });

  await render(<Providers><AssetDetailScreen /></Providers>);

  // Open inline edit form on the first review (there are multiple edit buttons)
  await act(async () => { fireEvent.press(screen.getAllByTestId('review-edit')[0]); });
  // Save triggers the failing mutation; handleEdit sets mutationError and re-throws;
  // saveEdit catches the rethrow so no unhandled rejection surfaces.
  await act(async () => { fireEvent.press(screen.getByTestId('review-edit-save')); });

  // The error banner must appear even though canCompose is false
  await waitFor(() =>
    expect(screen.getByTestId('mutation-error-banner')).toBeOnTheScreen()
  );
});
