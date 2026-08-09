import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';

export type InvitationInfo = components['schemas']['InvitationInfo'];
export type GroupInvitation = components['schemas']['GroupInvitation'];

type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;

export function useInvitationInfoQuery(code: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['invitations', code],
    enabled: code !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/groups/invitations/{code}', {
        params: { path: { code } },
      });
      if (error || !data) throw new Error('Failed to load invitation info');
      return data;
    },
  });
}

export function useCreateInvitationMutation(client: Poster = api) {
  return useMutation({
    mutationFn: async (input: { groupID: string; email?: string }) => {
      const { data, error } = await (client as typeof api).POST(
        '/groups/{groupID}/invitations',
        {
          params: { path: { groupID: input.groupID } },
          body: { email: input.email || undefined },
        },
      );
      if (error || !data) throw new Error('Failed to create invitation');
      return data;
    },
  });
}

export function useAcceptInvitationMutation(
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: { code: string }) => {
      const { data, error } = await (client as typeof api).POST('/groups/invitations/accept', {
        body: { code: input.code },
      });
      if (error || !data) throw new Error('Failed to accept invitation');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useDeclineInvitationMutation(client: Poster = api) {
  return useMutation({
    mutationFn: async (input: { code: string }) => {
      const { error } = await (client as typeof api).POST('/groups/invitations/decline', {
        body: { code: input.code },
      });
      // 204 returns no body — treat error === undefined as success
      if (error !== undefined) throw new Error('Failed to decline invitation');
    },
  });
}
