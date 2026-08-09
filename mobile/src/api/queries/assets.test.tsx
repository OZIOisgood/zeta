import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useAssetQuery, useAssetsQuery, useFinalizeAssetMutation } from './assets';

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});

afterEach(() => {
  client.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ASSET = {
  id: 'a1', title: 'Kata 1', description: '', owner_id: 'u1',
  status: 'pending' as const, review_count: 2,
};

test('useAssetsQuery returns the asset list', async () => {
  const client = { GET: jest.fn(async () => ({ data: [ASSET], error: undefined })) };
  const { result } = await renderHook(() => useAssetsQuery(client as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([ASSET]);
});

test('useAssetsQuery surfaces errors', async () => {
  const client = { GET: jest.fn(async () => ({ data: undefined, error: { message: 'boom' } })) };
  const { result } = await renderHook(() => useAssetsQuery(client as never), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
});

test('useAssetQuery requests the asset by id', async () => {
  const GET = jest.fn(async () => ({ data: { ...ASSET, videos: [] }, error: undefined }));
  const { result } = await renderHook(() => useAssetQuery('a1', { GET } as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(GET).toHaveBeenCalledWith('/assets/{id}', { params: { path: { id: 'a1' } } });
});

test('useFinalizeAssetMutation posts finalize and invalidates the asset and list', async () => {
  const POST = jest.fn(async () => ({ data: { status: 'completed' }, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useFinalizeAssetMutation('a1', { POST } as never, qc as never),
    { wrapper },
  );
  const data = await result.current.mutateAsync();
  expect(data.status).toBe('completed');
  expect(POST).toHaveBeenCalledWith('/assets/{id}/finalize', {
    params: { path: { id: 'a1' } },
  });
  // Prefix invalidation only — ['assets'] covers ['assets', 'a1'] in TanStack v5.
  expect(invalidated).toEqual([expect.objectContaining({ queryKey: ['assets'] })]);
});

test('useFinalizeAssetMutation surfaces the unreviewed-parts 400 and does not invalidate', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'no reviews' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useFinalizeAssetMutation('a1', { POST } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync()).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});
