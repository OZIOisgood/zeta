import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';

export class BookingError extends Error {
  constructor(readonly status: number) {
    super('Booking failed');
  }
}

export type Booking = components['schemas']['Booking'];
export type SessionType = components['schemas']['SessionType'];
export type CoachingSlot = components['schemas']['CoachingSlot'];
export type CoachingExpert = components['schemas']['CoachingExpert'];

type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Putter = Pick<typeof api, 'PUT'>;
type Deleter = Pick<typeof api, 'DELETE'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;

export type CreateBookingInput = {
  expertId: string;
  sessionTypeId: string;
  scheduledAt: string;
  notes?: string;
};

export type CancelBookingInput = {
  bookingId: string;
  reason?: string;
};

/**
 * Localized booking timestamp (medium date + short time). Shared by the booking
 * card and the cancel dialog so the displayed format stays in lockstep.
 */
export function formatBookingDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Locale-aware relative time ("in 2 days", "in 3 hours") via Intl.RelativeTimeFormat.
 * `now` is injectable for deterministic tests. Falls back to the absolute date
 * string if RelativeTimeFormat is unavailable on the runtime.
 */
export function formatRelativeFuture(iso: string, locale: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const minutes = Math.round(diffMs / 60_000);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    return rtf.format(Math.round(hours / 24), 'day');
  } catch {
    return formatBookingDateTime(iso);
  }
}

export function useMyBookingsQuery(client: Fetcher = api) {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/coaching/bookings', {});
      if (error || !data) throw new Error('Failed to load bookings');
      return data;
    },
  });
}

export function useSessionTypesQuery(groupId: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['coaching', groupId, 'session-types'],
    enabled: groupId !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET(
        '/groups/{groupID}/coaching/session-types',
        { params: { path: { groupID: groupId } } },
      );
      if (error || !data) throw new Error('Failed to load session types');
      return data.filter((st) => st.is_active);
    },
  });
}

export function useCoachingExpertsQuery(groupId: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['coaching', groupId, 'experts'],
    enabled: groupId !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET(
        '/groups/{groupID}/coaching/experts',
        { params: { path: { groupID: groupId } } },
      );
      if (error || !data) throw new Error('Failed to load coaching experts');
      return data;
    },
  });
}

export function useSlotsQuery(
  groupId: string,
  expertId: string,
  sessionTypeId: string,
  client: Fetcher = api,
) {
  return useQuery({
    queryKey: ['coaching', groupId, 'slots', expertId, sessionTypeId],
    enabled: groupId !== '' && expertId !== '' && sessionTypeId !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET(
        '/groups/{groupID}/coaching/slots',
        {
          params: {
            path: { groupID: groupId },
            query: { expert_id: expertId, session_type_id: sessionTypeId },
          },
        },
      );
      if (error || !data) throw new Error('Failed to load coaching slots');
      return data;
    },
  });
}

export function useCreateBookingMutation(
  groupId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data, error, response } = await (client as typeof api).POST(
        '/groups/{groupID}/coaching/bookings',
        {
          params: { path: { groupID: groupId } },
          body: {
            expert_id: input.expertId,
            session_type_id: input.sessionTypeId,
            scheduled_at: input.scheduledAt,
            ...(input.notes === undefined ? {} : { notes: input.notes }),
          },
        },
      );
      if (error || !data) throw new BookingError(response.status);
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}

export function useCancelBookingMutation(
  groupId: string,
  client: Putter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: CancelBookingInput) => {
      const { data, error } = await (client as typeof api).PUT(
        '/groups/{groupID}/coaching/bookings/{bookingID}/cancel',
        {
          params: { path: { groupID: groupId, bookingID: input.bookingId } },
          body: {
            ...(input.reason === undefined ? {} : { cancellation_reason: input.reason }),
          },
        },
      );
      if (error || !data) throw new Error('Failed to cancel booking');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// ── Availability ──────────────────────────────────────────────────────────────

export type CoachingAvailability = components['schemas']['CoachingAvailability'];
export type CoachingBlockedSlot = components['schemas']['CoachingBlockedSlot'];
export type AvailabilityInput = components['schemas']['AvailabilityRequest'];
export type BlockedSlotInput = components['schemas']['CreateBlockedSlotRequest'];
export type SessionTypeInput = components['schemas']['CreateSessionTypeRequest'];

export type UpdateSessionTypeInput = {
  sessionTypeId: string;
  body: SessionTypeInput;
};

export type UpdateAvailabilityInput = {
  availabilityId: string;
  body: AvailabilityInput;
};

export function useMyAvailabilityQuery(groupId: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['coaching', groupId, 'availability'],
    enabled: groupId !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET(
        '/groups/{groupID}/coaching/availability',
        { params: { path: { groupID: groupId } } },
      );
      if (error || !data) throw new Error('Failed to load availability');
      return data;
    },
  });
}

export function useBlockedSlotsQuery(groupId: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['coaching', groupId, 'blocked-slots'],
    enabled: groupId !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET(
        '/groups/{groupID}/coaching/blocked-slots',
        { params: { path: { groupID: groupId } } },
      );
      if (error || !data) throw new Error('Failed to load blocked slots');
      return data;
    },
  });
}

export function useCreateSessionTypeMutation(
  groupId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (body: SessionTypeInput) => {
      const { data, error } = await (client as typeof api).POST(
        '/groups/{groupID}/coaching/session-types',
        { params: { path: { groupID: groupId } }, body },
      );
      if (error || !data) throw new Error('Failed to create session type');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'session-types'] });
    },
  });
}

export function useUpdateSessionTypeMutation(
  groupId: string,
  client: Putter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: UpdateSessionTypeInput) => {
      const { data, error } = await (client as typeof api).PUT(
        '/groups/{groupID}/coaching/session-types/{sessionTypeID}',
        {
          params: { path: { groupID: groupId, sessionTypeID: input.sessionTypeId } },
          body: input.body,
        },
      );
      if (error || !data) throw new Error('Failed to update session type');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'session-types'] });
    },
  });
}

export function useDeactivateSessionTypeMutation(
  groupId: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (sessionTypeId: string) => {
      const { error } = await (client as typeof api).DELETE(
        '/groups/{groupID}/coaching/session-types/{sessionTypeID}',
        { params: { path: { groupID: groupId, sessionTypeID: sessionTypeId } } },
      );
      if (error !== undefined) throw new Error('Failed to deactivate session type');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'session-types'] });
    },
  });
}

export function useCreateAvailabilityMutation(
  groupId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (body: AvailabilityInput) => {
      const { data, error } = await (client as typeof api).POST(
        '/groups/{groupID}/coaching/availability',
        { params: { path: { groupID: groupId } }, body },
      );
      if (error || !data) throw new Error('Failed to create availability');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'availability'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}

export function useUpdateAvailabilityMutation(
  groupId: string,
  client: Putter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: UpdateAvailabilityInput) => {
      const { data, error } = await (client as typeof api).PUT(
        '/groups/{groupID}/coaching/availability/{availabilityID}',
        {
          params: { path: { groupID: groupId, availabilityID: input.availabilityId } },
          body: input.body,
        },
      );
      if (error || !data) throw new Error('Failed to update availability');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'availability'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}

export function useDeleteAvailabilityMutation(
  groupId: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (availabilityId: string) => {
      const { error } = await (client as typeof api).DELETE(
        '/groups/{groupID}/coaching/availability/{availabilityID}',
        { params: { path: { groupID: groupId, availabilityID: availabilityId } } },
      );
      if (error !== undefined) throw new Error('Failed to delete availability');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'availability'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}

export function useCreateBlockedSlotMutation(
  groupId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (body: BlockedSlotInput) => {
      const { data, error } = await (client as typeof api).POST(
        '/groups/{groupID}/coaching/blocked-slots',
        { params: { path: { groupID: groupId } }, body },
      );
      if (error || !data) throw new Error('Failed to create blocked slot');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'blocked-slots'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}

export function useDeleteBlockedSlotMutation(
  groupId: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await (client as typeof api).DELETE(
        '/groups/{groupID}/coaching/blocked-slots/{slotID}',
        { params: { path: { groupID: groupId, slotID: slotId } } },
      );
      if (error !== undefined) throw new Error('Failed to delete blocked slot');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'blocked-slots'] });
      await qc.invalidateQueries({ queryKey: ['coaching', groupId, 'slots'] });
    },
  });
}
