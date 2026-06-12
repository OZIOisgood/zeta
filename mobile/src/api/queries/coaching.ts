import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';

export type Booking = components['schemas']['Booking'];
export type SessionType = components['schemas']['SessionType'];
export type CoachingSlot = components['schemas']['CoachingSlot'];
export type CoachingExpert = components['schemas']['CoachingExpert'];

type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Putter = Pick<typeof api, 'PUT'>;
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
      const { data, error } = await (client as typeof api).POST(
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
      if (error || !data) throw new Error('Failed to create booking');
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
