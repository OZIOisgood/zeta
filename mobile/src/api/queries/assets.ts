import { useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';

export type Asset = components['schemas']['Asset'];

type Fetcher = Pick<typeof api, 'GET'>;

export function useAssetsQuery(client: Fetcher = api) {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/assets');
      if (error || !data) throw new Error('Failed to load videos');
      return data;
    },
  });
}

export function useAssetQuery(id: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/assets/{id}', {
        params: { path: { id } },
      });
      if (error || !data) throw new Error('Failed to load video');
      return data;
    },
    enabled: id !== '',
  });
}
