import { useMutation, useQuery } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';
import { queryClient } from '../query-client';

export type Review = components['schemas']['Review'];

type Fetcher = Pick<typeof api, 'GET'>;
type Poster = Pick<typeof api, 'POST'>;
type Invalidator = Pick<typeof queryClient, 'invalidateQueries'>;

export type CreateReviewInput = {
  content: string;
  timestampSeconds?: number;
  parentId?: string;
};

export function useReviewsQuery(videoId: string, client: Fetcher = api) {
  return useQuery({
    queryKey: ['reviews', videoId],
    enabled: videoId !== '',
    queryFn: async () => {
      const { data, error } = await (client as typeof api).GET('/assets/videos/{id}/reviews', {
        params: { path: { id: videoId } },
      });
      if (error || !data) throw new Error('Failed to load reviews');
      return data;
    },
  });
}

export function useCreateReviewMutation(
  videoId: string,
  client: Poster = api,
  qc: Invalidator = queryClient,
) {
  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      const { data, error } = await (client as typeof api).POST('/assets/videos/{id}/reviews', {
        params: { path: { id: videoId } },
        body: {
          content: input.content,
          ...(input.timestampSeconds === undefined
            ? {}
            : { timestamp_seconds: input.timestampSeconds }),
          ...(input.parentId === undefined ? {} : { parent_id: input.parentId }),
        },
      });
      if (error || !data) throw new Error('Failed to create review');
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reviews', videoId] });
      await qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
