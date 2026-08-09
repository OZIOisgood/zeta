import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useGroupsQuery, useGroupQuery, useGroupStudentsQuery, useGroupExpertsQuery, useCreateGroupMutation, useLeaveGroupMutation, useUpdateGroupMutation, useDeleteGroupMutation, useRemoveGroupMemberMutation } from './groups';

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

// ── useGroupQuery ─────────────────────────────────────────────────────────────

test('useGroupQuery fetches a single group by ID', async () => {
  const mockGet = jest.fn(async () => ({ data: GROUP, error: undefined }));
  const { result } = await renderHook(
    () => useGroupQuery('g1', { GET: mockGet } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(GROUP);
  expect(mockGet).toHaveBeenCalledWith('/groups/{groupID}', {
    params: { path: { groupID: 'g1' } },
  });
});

test('useGroupQuery is disabled when id is empty', async () => {
  const mockGet = jest.fn();
  const { result } = await renderHook(
    () => useGroupQuery('', { GET: mockGet } as never),
    { wrapper },
  );
  expect(mockGet).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

// ── useGroupStudentsQuery ─────────────────────────────────────────────────────

const GROUP_USER = {
  id: 'u1', email: 'alice@example.com', first_name: 'Alice',
  last_name: 'Smith', role: 'student',
};

test('useGroupStudentsQuery unwraps the {data:[...]} envelope', async () => {
  const mockGet = jest.fn(async () => ({ data: { data: [GROUP_USER] }, error: undefined }));
  const { result } = await renderHook(
    () => useGroupStudentsQuery('g1', true, { GET: mockGet } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([GROUP_USER]);
  expect(mockGet).toHaveBeenCalledWith('/groups/{groupID}/users', {
    params: { path: { groupID: 'g1' } },
  });
});

test('useGroupStudentsQuery is disabled when enabled=false', async () => {
  const mockGet = jest.fn();
  const { result } = await renderHook(
    () => useGroupStudentsQuery('g1', false, { GET: mockGet } as never),
    { wrapper },
  );
  expect(mockGet).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

// ── useGroupExpertsQuery ──────────────────────────────────────────────────────

test('useGroupExpertsQuery unwraps the {data:[...]} envelope', async () => {
  const mockGet = jest.fn(async () => ({ data: { data: [GROUP_USER] }, error: undefined }));
  const { result } = await renderHook(
    () => useGroupExpertsQuery('g1', true, { GET: mockGet } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([GROUP_USER]);
  expect(mockGet).toHaveBeenCalledWith('/groups/{groupID}/experts', {
    params: { path: { groupID: 'g1' } },
  });
});

// ── useCreateGroupMutation ────────────────────────────────────────────────────

test('useCreateGroupMutation posts the body, returns the group, invalidates [groups]', async () => {
  const POST = jest.fn(async () => ({ data: GROUP, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useCreateGroupMutation({ POST } as never, qc as never),
    { wrapper },
  );
  const input = { name: 'Karate Club', description: 'Dojo', avatar: 'data:image/png;base64,AAA' };
  const group = await result.current.mutateAsync(input);
  expect(POST).toHaveBeenCalledWith('/groups', { body: input });
  expect(group).toEqual(GROUP);
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['groups'] })]),
  );
});

test('useCreateGroupMutation does not invalidate on error', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useCreateGroupMutation({ POST } as never, qc as never),
    { wrapper },
  );
  await expect(
    result.current.mutateAsync({ name: 'x', avatar: 'data:image/png;base64,AAA' }),
  ).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useLeaveGroupMutation ─────────────────────────────────────────────────────

test('useLeaveGroupMutation calls DELETE and invalidates [groups]', async () => {
  const mockDelete = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useLeaveGroupMutation('g1', { DELETE: mockDelete } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync();
  expect(mockDelete).toHaveBeenCalledWith('/groups/{groupID}/membership', {
    params: { path: { groupID: 'g1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['groups'] })]),
  );
});

// ── useUpdateGroupMutation ────────────────────────────────────────────────────

test('useUpdateGroupMutation puts the body, returns the group, invalidates [groups]', async () => {
  const PUT = jest.fn(async () => ({ data: GROUP, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useUpdateGroupMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  const input = { name: 'Karate Club', description: 'Dojo', avatar: 'data:image/png;base64,AAA' };
  const group = await result.current.mutateAsync(input);
  expect(PUT).toHaveBeenCalledWith('/groups/{groupID}', {
    params: { path: { groupID: 'g1' } },
    body: input,
  });
  expect(group).toEqual(GROUP);
  // Prefix invalidation only — ['groups'] covers ['groups', 'g1'] in TanStack v5.
  expect(invalidated).toEqual([expect.objectContaining({ queryKey: ['groups'] })]);
});

test('useUpdateGroupMutation does not invalidate on error', async () => {
  const PUT = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useUpdateGroupMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ name: 'x' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useDeleteGroupMutation ────────────────────────────────────────────────────

test('useDeleteGroupMutation deletes by id (204) and invalidates [groups]', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useDeleteGroupMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync();
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}', {
    params: { path: { groupID: 'g1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['groups'] })]),
  );
});

test('useDeleteGroupMutation throws when the api returns an error', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useDeleteGroupMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync()).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useRemoveGroupMemberMutation ──────────────────────────────────────────────

test('useRemoveGroupMemberMutation deletes the member (204) and invalidates member lists', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useRemoveGroupMemberMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync({ userId: 'u9' });
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}/users/{userID}', {
    params: { path: { groupID: 'g1', userID: 'u9' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['groups', 'g1', 'students'] }),
      expect.objectContaining({ queryKey: ['groups', 'g1', 'experts'] }),
    ]),
  );
});

test('useRemoveGroupMemberMutation throws when the api returns an error', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: { message: 'forbidden' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useRemoveGroupMemberMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ userId: 'u9' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});
