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
