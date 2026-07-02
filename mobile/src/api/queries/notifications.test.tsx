import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from './notifications';

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
  client.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const LIST = {
  items: [
    {
      id: 'n1',
      type: 'group_invitation_received',
      payload: { group_name: 'Karate Club', inviter_name: 'Sam', code: 'aB3xZ9' },
      read: false,
      invite_status: 'pending',
      created_at: '2026-06-13T10:00:00Z',
    },
  ],
  unread_count: 1,
};

// ── useNotificationsQuery ─────────────────────────────────────────────────────

test('useNotificationsQuery returns items and unread_count', async () => {
  const GET = jest.fn(async () => ({ data: LIST, error: undefined }));
  const { result } = await renderHook(() => useNotificationsQuery({ GET } as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(LIST);
  expect(GET).toHaveBeenCalledWith('/notifications');
});

test('useNotificationsQuery surfaces errors', async () => {
  const GET = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const { result } = await renderHook(() => useNotificationsQuery({ GET } as never), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
});

// ── useMarkNotificationReadMutation ───────────────────────────────────────────

test('useMarkNotificationReadMutation posts the id and invalidates [notifications]', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useMarkNotificationReadMutation({ POST } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync({ id: 'n1' });
  expect(POST).toHaveBeenCalledWith('/notifications/{id}/read', {
    params: { path: { id: 'n1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['notifications'] })]),
  );
});

test('useMarkNotificationReadMutation does not invalidate on error', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'nope' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useMarkNotificationReadMutation({ POST } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ id: 'bad' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useMarkAllNotificationsReadMutation ───────────────────────────────────────

test('useMarkAllNotificationsReadMutation posts read-all and invalidates [notifications]', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useMarkAllNotificationsReadMutation({ POST } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync();
  expect(POST).toHaveBeenCalledWith('/notifications/read-all');
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['notifications'] })]),
  );
});
