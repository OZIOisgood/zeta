import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useEnhanceReviewTextMutation,
  useReviewsQuery,
  useUpdateReviewMutation,
} from './reviews';

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

test('useUpdateReviewMutation puts the content and invalidates reviews and assets', async () => {
  const PUT = jest.fn(async () => ({ data: { ...REVIEW, content: 'Edited' }, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useUpdateReviewMutation('v1', { PUT } as never, qc as never),
    { wrapper },
  );
  const data = await result.current.mutateAsync({ reviewId: 'r1', content: 'Edited' });
  expect(data.content).toBe('Edited');
  expect(PUT).toHaveBeenCalledWith('/assets/videos/{id}/reviews/{reviewId}', {
    params: { path: { id: 'v1', reviewId: 'r1' } },
    body: { content: 'Edited' },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['reviews', 'v1'] }),
      expect.objectContaining({ queryKey: ['assets'] }),
    ]),
  );
});

test('useUpdateReviewMutation surfaces API errors and does not invalidate', async () => {
  const PUT = jest.fn(async () => ({ data: undefined, error: { message: 'forbidden' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useUpdateReviewMutation('v1', { PUT } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ reviewId: 'r1', content: 'x' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

test('useDeleteReviewMutation deletes and invalidates reviews and assets (204 no body)', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useDeleteReviewMutation('v1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync({ reviewId: 'r1' });
  expect(DELETE).toHaveBeenCalledWith('/assets/videos/{id}/reviews/{reviewId}', {
    params: { path: { id: 'v1', reviewId: 'r1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['reviews', 'v1'] }),
      expect.objectContaining({ queryKey: ['assets'] }),
    ]),
  );
});

test('useDeleteReviewMutation surfaces API errors', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: { message: 'forbidden' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useDeleteReviewMutation('v1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ reviewId: 'r1' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

test('useEnhanceReviewTextMutation posts the text and returns the enhanced string', async () => {
  const POST = jest.fn(async () => ({ data: { enhanced_text: 'Polished feedback.' }, error: undefined }));
  const { result } = await renderHook(
    () => useEnhanceReviewTextMutation({ POST } as never),
    { wrapper },
  );
  const enhanced = await result.current.mutateAsync({ text: 'good job' });
  expect(enhanced).toBe('Polished feedback.');
  expect(POST).toHaveBeenCalledWith('/reviews/enhance', { body: { text: 'good job' } });
});

test('useEnhanceReviewTextMutation surfaces API errors', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const { result } = await renderHook(
    () => useEnhanceReviewTextMutation({ POST } as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ text: 'x' })).rejects.toThrow();
});
