import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';

export type Asset = components['schemas']['Asset'];

type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;

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

export function useFinalizeAssetMutation(
  assetId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (client as typeof api).POST('/assets/{id}/finalize', {
        params: { path: { id: assetId } },
      });
      if (error || !data) throw new Error('Failed to mark video as reviewed');
      return data;
    },
    onSuccess: async () => {
      // Prefix invalidation covers ['assets', assetId] too (TanStack v5 matching).
      await qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
