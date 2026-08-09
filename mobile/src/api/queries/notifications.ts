import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';

export type NotificationItem = components['schemas']['NotificationItem'];
export type NotificationListResponse = components['schemas']['NotificationListResponse'];
export type NotificationPayload = components['schemas']['NotificationPayload'];

type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;

/** Poll the inbox so the bell badge + list stay fresh (mobile has no SSE; see plan). */
const REFETCH_INTERVAL_MS = 30_000;

export function useNotificationsQuery(client: Fetcher = api) {
  return useQuery({
    queryKey: ['notifications'],
    refetchInterval: REFETCH_INTERVAL_MS,
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/notifications');
      if (error || !data) throw new Error('Failed to load notifications');
      return data;
    },
  });
}

export function useMarkNotificationReadMutation(
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await (client as typeof api).POST('/notifications/{id}/read', {
        params: { path: { id: input.id } },
      });
      // 204 returns no body — treat error === undefined as success.
      if (error !== undefined) throw new Error('Failed to mark notification read');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsReadMutation(
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await (client as typeof api).POST('/notifications/read-all');
      if (error !== undefined) throw new Error('Failed to mark all notifications read');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
