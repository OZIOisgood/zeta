import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useCreateReviewMutation, useReviewsQuery } from './reviews';

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

const REVIEW = {
  id: 'r1', content: 'Nice stance', timestamp_seconds: 42,
  author: { name: 'Coach' }, created_at: '2026-06-12T10:00:00Z',
};

test('useReviewsQuery returns the review list', async () => {
  const client = { GET: jest.fn(async () => ({ data: [REVIEW], error: undefined })) };
  const { result } = await renderHook(() => useReviewsQuery('v1', client as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([REVIEW]);
  expect(client.GET).toHaveBeenCalledWith('/assets/videos/{id}/reviews', { params: { path: { id: 'v1' } } });
});

test('useReviewsQuery is disabled for empty video ids', async () => {
  const client = { GET: jest.fn() };
  const { result } = await renderHook(() => useReviewsQuery('', client as never), { wrapper });
  expect(client.GET).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

test('useCreateReviewMutation posts the body and invalidates reviews and assets', async () => {
  const POST = jest.fn(async () => ({ data: REVIEW, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useCreateReviewMutation('v1', { POST } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync({ content: 'Nice stance', timestampSeconds: 42 });
  expect(POST).toHaveBeenCalledWith('/assets/videos/{id}/reviews', {
    params: { path: { id: 'v1' } },
    body: { content: 'Nice stance', timestamp_seconds: 42 },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['reviews', 'v1'] }),
      expect.objectContaining({ queryKey: ['assets'] }),
    ]),
  );
});

test('useCreateReviewMutation surfaces API errors', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'forbidden' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useCreateReviewMutation('v1', { POST } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ content: 'x' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});
