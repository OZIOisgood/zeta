import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useInvitationInfoQuery, useCreateInvitationMutation, useAcceptInvitationMutation, useDeclineInvitationMutation } from './invitations';

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

const INVITATION_INFO = {
  code: 'abc123',
  group_id: 'g1',
  group_name: 'Karate Club',
  group_avatar: '',
  already_member: false,
};

// ── useInvitationInfoQuery ────────────────────────────────────────────────────

test('useInvitationInfoQuery fetches invitation info by code', async () => {
  const mockGet = jest.fn(async () => ({ data: INVITATION_INFO, error: undefined }));
  const { result } = await renderHook(
    () => useInvitationInfoQuery('abc123', { GET: mockGet } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(INVITATION_INFO);
  expect(mockGet).toHaveBeenCalledWith('/groups/invitations/{code}', {
    params: { path: { code: 'abc123' } },
  });
});

test('useInvitationInfoQuery is disabled when code is empty', async () => {
  const mockGet = jest.fn();
  const { result } = await renderHook(
    () => useInvitationInfoQuery('', { GET: mockGet } as never),
    { wrapper },
  );
  expect(mockGet).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

// ── useCreateInvitationMutation ───────────────────────────────────────────────

test('useCreateInvitationMutation posts email and returns {id, code}', async () => {
  const POST = jest.fn(async () => ({ data: { id: 'inv1', code: 'ABC123' }, error: undefined }));
  const { result } = await renderHook(
    () => useCreateInvitationMutation({ POST } as never),
    { wrapper },
  );
  const invitation = await result.current.mutateAsync({ groupID: 'g1', email: 'student@example.com' });
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/invitations', {
    params: { path: { groupID: 'g1' } },
    body: { email: 'student@example.com' },
  });
  expect(invitation).toEqual({ id: 'inv1', code: 'ABC123' });
});

test('useCreateInvitationMutation omits email when not provided', async () => {
  const POST = jest.fn(async () => ({ data: { id: 'inv2', code: 'XYZ789' }, error: undefined }));
  const { result } = await renderHook(
    () => useCreateInvitationMutation({ POST } as never),
    { wrapper },
  );
  await result.current.mutateAsync({ groupID: 'g1' });
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/invitations', {
    params: { path: { groupID: 'g1' } },
    body: { email: undefined },
  });
});

test('useCreateInvitationMutation coerces an empty-string email to undefined', async () => {
  // A controlled invite form submits '' (not undefined) when the field is blank.
  const POST = jest.fn(async () => ({ data: { id: 'inv3', code: 'QWE456' }, error: undefined }));
  const { result } = await renderHook(
    () => useCreateInvitationMutation({ POST } as never),
    { wrapper },
  );
  await result.current.mutateAsync({ groupID: 'g1', email: '' });
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/invitations', {
    params: { path: { groupID: 'g1' } },
    body: { email: undefined },
  });
});

test('useCreateInvitationMutation surfaces errors', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'forbidden' } }));
  const { result } = await renderHook(
    () => useCreateInvitationMutation({ POST } as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ groupID: 'g1' })).rejects.toThrow();
});

// ── useAcceptInvitationMutation ───────────────────────────────────────────────

test('useAcceptInvitationMutation posts code body and invalidates [groups]', async () => {
  const POST = jest.fn(async () => ({ data: { group_id: 'g1' }, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useAcceptInvitationMutation({ POST } as never, qc as never),
    { wrapper },
  );
  const response = await result.current.mutateAsync({ code: 'abc123' });
  expect(POST).toHaveBeenCalledWith('/groups/invitations/accept', {
    body: { code: 'abc123' },
  });
  expect(response).toEqual({ group_id: 'g1' });
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['groups'] })]),
  );
});

test('useAcceptInvitationMutation does not invalidate on error', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'not found' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useAcceptInvitationMutation({ POST } as never, qc as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ code: 'bad' })).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useDeclineInvitationMutation ──────────────────────────────────────────────

test('useDeclineInvitationMutation posts code body and succeeds on 204', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: undefined }));
  const { result } = await renderHook(
    () => useDeclineInvitationMutation({ POST } as never),
    { wrapper },
  );
  await expect(result.current.mutateAsync({ code: 'abc123' })).resolves.not.toThrow();
  expect(POST).toHaveBeenCalledWith('/groups/invitations/decline', {
    body: { code: 'abc123' },
  });
});
