import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';

export type Group = components['schemas']['Group'];
export type GroupUser = components['schemas']['GroupUser'];

type Fetcher = Pick<typeof api, 'GET'>;
type Deleter = Pick<typeof api, 'DELETE'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;

export function useGroupsQuery(client: Fetcher = api) {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/groups');
      if (error || !data) throw new Error('Failed to load groups');
      return data;
    },
  });
}

export function useGroupQuery(id: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['groups', id],
    enabled: id !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/groups/{groupID}', {
        params: { path: { groupID: id } },
      });
      if (error || !data) throw new Error('Failed to load group');
      return data;
    },
  });
}

export function useGroupStudentsQuery(
  id: string,
  enabled: boolean,
  client: Fetcher = api,
) {
  return useQuery({
    queryKey: ['groups', id, 'students'],
    enabled: enabled && id !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/groups/{groupID}/users', {
        params: { path: { groupID: id } },
      });
      if (error || !data) throw new Error('Failed to load group students');
      return data.data as GroupUser[];
    },
  });
}

export function useGroupExpertsQuery(
  id: string,
  enabled: boolean,
  client: Fetcher = api,
) {
  return useQuery({
    queryKey: ['groups', id, 'experts'],
    enabled: enabled && id !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/groups/{groupID}/experts', {
        params: { path: { groupID: id } },
      });
      if (error || !data) throw new Error('Failed to load group experts');
      return data.data as GroupUser[];
    },
  });
}

export function useLeaveGroupMutation(
  id: string,
  client: Deleter = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await (client as typeof api).DELETE('/groups/{groupID}/membership', {
        params: { path: { groupID: id } },
      });
      // 204 returns no body — treat error === undefined as success
      if (error !== undefined) throw new Error('Failed to leave group');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
