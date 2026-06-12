import { useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';

export type Group = components['schemas']['Group'];

type Fetcher = Pick<typeof api, 'GET'>;

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
