import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useGroupsQuery } from './groups';

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

const GROUP = {
  id: 'g1', name: 'Karate Club', owner_id: 'u2', avatar: null,
  description: '', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

test('useGroupsQuery returns the group list', async () => {
  const client = { GET: jest.fn(async () => ({ data: [GROUP], error: undefined })) };
  const { result } = await renderHook(() => useGroupsQuery(client as never), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([GROUP]);
});

test('useGroupsQuery surfaces errors', async () => {
  const client = { GET: jest.fn(async () => ({ data: undefined, error: { message: 'boom' } })) };
  const { result } = await renderHook(() => useGroupsQuery(client as never), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
});
