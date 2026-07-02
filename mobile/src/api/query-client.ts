import { AppState } from 'react-native';
import { focusManager, QueryClient } from '@tanstack/react-query';

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

// React Native has no window focus event, so TanStack Query never considers the
// app "refocused" on its own — without this wiring, screens that stay mounted
// (all tabs) keep stale data forever after the app returns from background and
// pull-to-refresh becomes the only refresh path. Module scope: the listener
// must live exactly once, not per component.
AppState.addEventListener('change', (state) => {
  focusManager.setFocused(state === 'active');
});

/** Shared app-wide query client; screens and the upload manager invalidate through it. */
export const queryClient = createQueryClient();
