import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import {
  useMyBookingsQuery,
  useSessionTypesQuery,
  useCoachingExpertsQuery,
  useSlotsQuery,
  useCreateBookingMutation,
  useCancelBookingMutation,
  BookingError,
  formatBookingDateTime,
  useMyAvailabilityQuery,
  useBlockedSlotsQuery,
  useCreateSessionTypeMutation,
  useUpdateSessionTypeMutation,
  useDeactivateSessionTypeMutation,
  useCreateAvailabilityMutation,
  useUpdateAvailabilityMutation,
  useDeleteAvailabilityMutation,
  useCreateBlockedSlotMutation,
  useDeleteBlockedSlotMutation,
} from './coaching';

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

const BOOKING = {
  id: 'b1',
  expert_id: 'e1',
  expert_name: 'Alice',
  student_id: 's1',
  student_name: 'Bob',
  group_id: 'g1',
  session_type_id: 'st1',
  scheduled_at: '2026-07-01T10:00:00Z',
  duration_minutes: 60,
  status: 'pending' as const,
  created_at: '2026-06-12T10:00:00Z',
};

const SESSION_TYPE_ACTIVE = {
  id: 'st1',
  expert_id: 'e1',
  group_id: 'g1',
  name: '60-min session',
  description: 'Standard session',
  duration_minutes: 60,
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
};

const SESSION_TYPE_INACTIVE = {
  id: 'st2',
  expert_id: 'e1',
  group_id: 'g1',
  name: 'Archived session',
  description: 'Old session type',
  duration_minutes: 30,
  is_active: false,
  created_at: '2026-01-01T00:00:00Z',
};

const EXPERT = {
  expert_id: 'e1',
  first_name: 'Alice',
  last_name: 'Smith',
};

const SLOT = {
  expert_id: 'e1',
  starts_at: '2026-07-01T10:00:00Z',
  ends_at: '2026-07-01T11:00:00Z',
  duration_minutes: 60,
};

// ── useMyBookingsQuery ────────────────────────────────────────────────────────

test('useMyBookingsQuery fetches /coaching/bookings', async () => {
  const GET = jest.fn(async () => ({ data: [BOOKING], error: undefined }));
  const { result } = await renderHook(
    () => useMyBookingsQuery({ GET } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([BOOKING]);
  expect(GET).toHaveBeenCalledWith('/coaching/bookings', expect.anything());
});

// ── useSessionTypesQuery ──────────────────────────────────────────────────────

test('useSessionTypesQuery fetches session types and filters to active only', async () => {
  const GET = jest.fn(async () => ({
    data: [SESSION_TYPE_ACTIVE, SESSION_TYPE_INACTIVE],
    error: undefined,
  }));
  const { result } = await renderHook(
    () => useSessionTypesQuery('g1', { GET } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([SESSION_TYPE_ACTIVE]);
  expect(GET).toHaveBeenCalledWith('/groups/{groupID}/coaching/session-types', {
    params: { path: { groupID: 'g1' } },
  });
});

test('useSessionTypesQuery is disabled when groupId is empty', async () => {
  const GET = jest.fn();
  const { result } = await renderHook(
    () => useSessionTypesQuery('', { GET } as never),
    { wrapper },
  );
  expect(GET).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

// ── useCoachingExpertsQuery ───────────────────────────────────────────────────

test('useCoachingExpertsQuery fetches experts for a group', async () => {
  const GET = jest.fn(async () => ({ data: [EXPERT], error: undefined }));
  const { result } = await renderHook(
    () => useCoachingExpertsQuery('g1', { GET } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([EXPERT]);
  expect(GET).toHaveBeenCalledWith('/groups/{groupID}/coaching/experts', {
    params: { path: { groupID: 'g1' } },
  });
});

test('useCoachingExpertsQuery is disabled when groupId is empty', async () => {
  const GET = jest.fn();
  const { result } = await renderHook(
    () => useCoachingExpertsQuery('', { GET } as never),
    { wrapper },
  );
  expect(GET).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

// ── useSlotsQuery ─────────────────────────────────────────────────────────────

test('useSlotsQuery fetches slots with all three path/query params', async () => {
  const GET = jest.fn(async () => ({ data: [SLOT], error: undefined }));
  const { result } = await renderHook(
    () => useSlotsQuery('g1', 'e1', 'st1', { GET } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([SLOT]);
  expect(GET).toHaveBeenCalledWith('/groups/{groupID}/coaching/slots', {
    params: { path: { groupID: 'g1' }, query: { expert_id: 'e1', session_type_id: 'st1' } },
  });
});

test('useSlotsQuery is disabled when expertId is empty', async () => {
  const GET = jest.fn();
  const { result } = await renderHook(
    () => useSlotsQuery('g1', '', 'st1', { GET } as never),
    { wrapper },
  );
  expect(GET).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

// ── useCreateBookingMutation ──────────────────────────────────────────────────

test('useCreateBookingMutation posts body and invalidates bookings and slots on success', async () => {
  const POST = jest.fn(async () => ({ data: BOOKING, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useCreateBookingMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  const booking = await result.current.mutateAsync({
    expertId: 'e1',
    sessionTypeId: 'st1',
    scheduledAt: '2026-07-01T10:00:00Z',
    notes: 'Looking forward to it',
  });
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/coaching/bookings', {
    params: { path: { groupID: 'g1' } },
    body: {
      expert_id: 'e1',
      session_type_id: 'st1',
      scheduled_at: '2026-07-01T10:00:00Z',
      notes: 'Looking forward to it',
    },
  });
  expect(booking).toEqual(BOOKING);
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['bookings'] }),
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'slots'] }),
    ]),
  );
});

test('useCreateBookingMutation throws BookingError with response status on error', async () => {
  const POST = jest.fn(async () => ({
    data: undefined,
    error: { message: 'conflict' },
    response: { status: 409 },
  }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useCreateBookingMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  let thrown: unknown;
  try {
    await result.current.mutateAsync({ expertId: 'e1', sessionTypeId: 'st1', scheduledAt: '2026-07-01T10:00:00Z' });
  } catch (err) {
    thrown = err;
  }
  expect(thrown).toBeInstanceOf(BookingError);
  expect((thrown as BookingError).status).toBe(409);
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

test('useCreateBookingMutation throws BookingError with status 400 for notice errors', async () => {
  const POST = jest.fn(async () => ({
    data: undefined,
    error: { message: 'too late' },
    response: { status: 400 },
  }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useCreateBookingMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  let thrown: unknown;
  try {
    await result.current.mutateAsync({ expertId: 'e1', sessionTypeId: 'st1', scheduledAt: '2026-07-01T10:00:00Z' });
  } catch (err) {
    thrown = err;
  }
  expect(thrown).toBeInstanceOf(BookingError);
  expect((thrown as BookingError).status).toBe(400);
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

// ── useCancelBookingMutation ──────────────────────────────────────────────────

test('useCancelBookingMutation PUTs cancel and invalidates bookings', async () => {
  const PUT = jest.fn(async () => ({ data: { ...BOOKING, status: 'cancelled' as const }, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (args: unknown) => void invalidated.push(args)) };
  const { result } = await renderHook(
    () => useCancelBookingMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  const booking = await result.current.mutateAsync({
    bookingId: 'b1',
    reason: 'Schedule conflict',
  });
  expect(PUT).toHaveBeenCalledWith('/groups/{groupID}/coaching/bookings/{bookingID}/cancel', {
    params: { path: { groupID: 'g1', bookingID: 'b1' } },
    body: { cancellation_reason: 'Schedule conflict' },
  });
  expect(booking.status).toBe('cancelled');
  expect(invalidated).toEqual(
    expect.arrayContaining([expect.objectContaining({ queryKey: ['bookings'] })]),
  );
});

// ── formatBookingDateTime ─────────────────────────────────────────────────────

test('formatBookingDateTime renders a medium date + short time', () => {
  const out = formatBookingDateTime('2026-06-13T09:30:00.000Z');
  expect(typeof out).toBe('string');
  // Proves both dateStyle and timeStyle rendered, without pinning locale ordering.
  expect(out).toMatch(/2026/);
  expect(out).toMatch(/\d{1,2}[:.]\d{2}/);
});

// ── availability + blocked-slot fixtures ─────────────────────────────────────

const AVAILABILITY = {
  id: 'a1',
  expert_id: 'e1',
  group_id: 'g1',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '17:00',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
};

const BLOCKED = {
  id: 'bs1',
  expert_id: 'e1',
  blocked_date: '2026-07-04',
  start_time: '12:00',
  end_time: '13:00',
  reason: 'Lunch',
  created_at: '2026-06-01T00:00:00Z',
};

// ── useMyAvailabilityQuery ────────────────────────────────────────────────────

test('useMyAvailabilityQuery fetches availability for a group', async () => {
  const GET = jest.fn(async () => ({ data: [AVAILABILITY], error: undefined }));
  const { result } = await renderHook(
    () => useMyAvailabilityQuery('g1', { GET } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([AVAILABILITY]);
  expect(GET).toHaveBeenCalledWith('/groups/{groupID}/coaching/availability', {
    params: { path: { groupID: 'g1' } },
  });
});

test('useMyAvailabilityQuery is disabled when groupId is empty', async () => {
  const GET = jest.fn();
  const { result } = await renderHook(
    () => useMyAvailabilityQuery('', { GET } as never),
    { wrapper },
  );
  expect(GET).not.toHaveBeenCalled();
  expect(result.current.isPending).toBe(true);
});

// ── useBlockedSlotsQuery ──────────────────────────────────────────────────────

test('useBlockedSlotsQuery fetches blocked slots for a group', async () => {
  const GET = jest.fn(async () => ({ data: [BLOCKED], error: undefined }));
  const { result } = await renderHook(
    () => useBlockedSlotsQuery('g1', { GET } as never),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([BLOCKED]);
  expect(GET).toHaveBeenCalledWith('/groups/{groupID}/coaching/blocked-slots', {
    params: { path: { groupID: 'g1' } },
  });
});

// ── useCreateSessionTypeMutation ──────────────────────────────────────────────

test('useCreateSessionTypeMutation posts the body and invalidates session-types', async () => {
  const POST = jest.fn(async () => ({ data: SESSION_TYPE_ACTIVE, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useCreateSessionTypeMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  const body = { name: '60-min session', description: 'Standard session', duration_minutes: 60 };
  const out = await result.current.mutateAsync(body);
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/coaching/session-types', {
    params: { path: { groupID: 'g1' } },
    body,
  });
  expect(out).toEqual(SESSION_TYPE_ACTIVE);
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'session-types'] }),
    ]),
  );
});

test('useCreateSessionTypeMutation does not invalidate on error', async () => {
  const POST = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
  const qc = { invalidateQueries: jest.fn() };
  const { result } = await renderHook(
    () => useCreateSessionTypeMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  await expect(
    result.current.mutateAsync({ name: 'x', description: '', duration_minutes: 60 }),
  ).rejects.toThrow();
  expect(qc.invalidateQueries).not.toHaveBeenCalled();
});

test('useUpdateSessionTypeMutation puts the body for the given id', async () => {
  const PUT = jest.fn(async () => ({ data: SESSION_TYPE_ACTIVE, error: undefined }));
  const qc = { invalidateQueries: jest.fn(async () => undefined) };
  const { result } = await renderHook(
    () => useUpdateSessionTypeMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  const body = { name: '60-min session', description: 'Standard session', duration_minutes: 60 };
  await result.current.mutateAsync({ sessionTypeId: 'st1', body });
  expect(PUT).toHaveBeenCalledWith('/groups/{groupID}/coaching/session-types/{sessionTypeID}', {
    params: { path: { groupID: 'g1', sessionTypeID: 'st1' } },
    body,
  });
});

test('useDeactivateSessionTypeMutation deletes by id and invalidates', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useDeactivateSessionTypeMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync('st1');
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}/coaching/session-types/{sessionTypeID}', {
    params: { path: { groupID: 'g1', sessionTypeID: 'st1' } },
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'session-types'] }),
    ]),
  );
});

// ── useCreateAvailabilityMutation ─────────────────────────────────────────────

test('useCreateAvailabilityMutation posts and invalidates availability + slots', async () => {
  const POST = jest.fn(async () => ({ data: [AVAILABILITY], error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useCreateAvailabilityMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  const body = { day_of_week: 1, start_time: '09:00', end_time: '17:00' };
  await result.current.mutateAsync(body);
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/coaching/availability', {
    params: { path: { groupID: 'g1' } },
    body,
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'availability'] }),
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'slots'] }),
    ]),
  );
});

test('useUpdateAvailabilityMutation puts the body for the given id', async () => {
  const PUT = jest.fn(async () => ({ data: [AVAILABILITY], error: undefined }));
  const qc = { invalidateQueries: jest.fn(async () => undefined) };
  const { result } = await renderHook(
    () => useUpdateAvailabilityMutation('g1', { PUT } as never, qc as never),
    { wrapper },
  );
  const body = { day_of_week: 2, start_time: '10:00', end_time: '12:00' };
  await result.current.mutateAsync({ availabilityId: 'a1', body });
  expect(PUT).toHaveBeenCalledWith('/groups/{groupID}/coaching/availability/{availabilityID}', {
    params: { path: { groupID: 'g1', availabilityID: 'a1' } },
    body,
  });
});

test('useDeleteAvailabilityMutation deletes by id', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const qc = { invalidateQueries: jest.fn(async () => undefined) };
  const { result } = await renderHook(
    () => useDeleteAvailabilityMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync('a1');
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}/coaching/availability/{availabilityID}', {
    params: { path: { groupID: 'g1', availabilityID: 'a1' } },
  });
});

// ── useCreateBlockedSlotMutation ──────────────────────────────────────────────

test('useCreateBlockedSlotMutation posts and invalidates blocked-slots + slots', async () => {
  const POST = jest.fn(async () => ({ data: BLOCKED, error: undefined }));
  const invalidated: unknown[] = [];
  const qc = { invalidateQueries: jest.fn(async (a: unknown) => void invalidated.push(a)) };
  const { result } = await renderHook(
    () => useCreateBlockedSlotMutation('g1', { POST } as never, qc as never),
    { wrapper },
  );
  const body = { blocked_date: '2026-07-04', start_time: '12:00', end_time: '13:00', reason: 'Lunch' };
  await result.current.mutateAsync(body);
  expect(POST).toHaveBeenCalledWith('/groups/{groupID}/coaching/blocked-slots', {
    params: { path: { groupID: 'g1' } },
    body,
  });
  expect(invalidated).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'blocked-slots'] }),
      expect.objectContaining({ queryKey: ['coaching', 'g1', 'slots'] }),
    ]),
  );
});

test('useDeleteBlockedSlotMutation deletes by id', async () => {
  const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
  const qc = { invalidateQueries: jest.fn(async () => undefined) };
  const { result } = await renderHook(
    () => useDeleteBlockedSlotMutation('g1', { DELETE } as never, qc as never),
    { wrapper },
  );
  await result.current.mutateAsync('bs1');
  expect(DELETE).toHaveBeenCalledWith('/groups/{groupID}/coaching/blocked-slots/{slotID}', {
    params: { path: { groupID: 'g1', slotID: 'bs1' } },
  });
});
