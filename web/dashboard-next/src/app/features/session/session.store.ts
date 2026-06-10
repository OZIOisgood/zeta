import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { AuthApiClient, UpdateUserRequest, User } from '../../core/http/auth-api.service';
import { DashboardLocalizationService } from '../../core/i18n/dashboard-localization.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';

type SessionState = AsyncSlice & {
  mutationError: string | null;
  mutationStatus: AsyncSlice['status'];
  user: User | null;
  unauthenticated: boolean;
};

const initialState: SessionState = {
  ...idleAsyncSlice(),
  mutationError: null,
  mutationStatus: 'idle',
  user: null,
  unauthenticated: false,
};

export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    displayName: computed(() => {
      const user = store.user();

      return user
        ? user.username || `${user.first_name} ${user.last_name}`.trim() || user.email
        : '';
    }),
    permissions: computed(() => new Set(store.user()?.permissions ?? [])),
  })),
  withMethods(
    (store, api = inject(AuthApiClient), localization = inject(DashboardLocalizationService)) => ({
      hasPermission(permission: string): boolean {
        return store.permissions().has(permission);
      },

      async loadCurrentUser(): Promise<void> {
        patchState(store, loadingAsyncSlice());

        try {
          const user = await firstValueFrom(api.getCurrentUser());
          localization.useUserPreferences(user.language, user.timezone);
          patchState(store, {
            ...successAsyncSlice(),
            user,
            unauthenticated: false,
          });
        } catch (error) {
          patchState(store, {
            ...errorAsyncSlice(error),
            user: null,
            unauthenticated: true,
          });
        }
      },

      async updateCurrentUser(data: UpdateUserRequest): Promise<User | null> {
        patchState(store, {
          mutationError: null,
          mutationStatus: 'loading',
        });

        try {
          const user = await firstValueFrom(api.updateCurrentUser(data));
          localization.useUserPreferences(user.language, user.timezone);
          patchState(store, {
            mutationError: null,
            mutationStatus: 'success',
            user,
          });
          return user;
        } catch (error) {
          const errorState = errorAsyncSlice(error);
          patchState(store, {
            mutationError: errorState.error,
            mutationStatus: errorState.status,
          });
          return null;
        }
      },

      login(returnTo?: string): void {
        window.location.href = api.getLoginUrl(returnTo);
      },

      logout(): void {
        api.logout().subscribe({
          next: ({ logoutUrl }) => {
            window.location.href = logoutUrl;
          },
          error: () => {
            patchState(store, { ...idleAsyncSlice(), user: null, unauthenticated: true });
          },
        });
      },
    }),
  ),
  withHooks({
    onInit(store) {
      void store.loadCurrentUser();
    },
  }),
);
