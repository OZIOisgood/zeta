import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useAssetQuery, useAssetsQuery } from './assets';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
