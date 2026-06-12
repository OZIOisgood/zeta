import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });
}

/** Shared app-wide query client; screens and the upload manager invalidate through it. */
export const queryClient = createQueryClient();
