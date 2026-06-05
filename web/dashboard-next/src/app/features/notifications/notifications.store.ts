import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { InvitationsApiClient } from '../../core/http/invitations-api.service';
import {
  InviteState,
  NotificationItem,
  NotificationsApiClient,
} from '../../core/http/notifications-api.service';

const MAX_ITEMS = 50;

export type NotificationDayGroup = {
  key: 'today' | 'earlier';
  labelKey: string;
  items: NotificationItem[];
};

type NotificationsState = {
  items: NotificationItem[];
  unreadCount: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  connected: boolean;
  // Id of the most recent live arrival, used to flash the row once.
  lastArrivedId: string | null;
};

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  status: 'idle',
  connected: false,
  lastArrivedId: null,
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isUnread(item: NotificationItem): boolean {
  return !item.read && item.inviteState !== 'declined';
}

export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasUnread: computed(() => store.unreadCount() > 0),
    badge: computed(() => {
      const count = store.unreadCount();
      return count > 9 ? '9+' : String(count);
    }),
    // Two simple buckets (Today / Earlier), like a Slack/Linear inbox.
    grouped: computed<NotificationDayGroup[]>(() => {
      const now = new Date();
      const today: NotificationItem[] = [];
      const earlier: NotificationItem[] = [];
      for (const item of store.items()) {
        (isSameDay(new Date(item.created_at), now) ? today : earlier).push(item);
      }
      return [
        { key: 'today', labelKey: 'notifications.today', items: today },
        { key: 'earlier', labelKey: 'notifications.earlier', items: earlier },
      ].filter((group): group is NotificationDayGroup => group.items.length > 0);
    }),
  })),
  withMethods(
    (store, api = inject(NotificationsApiClient), invitations = inject(InvitationsApiClient)) => {
      let source: EventSource | null = null;

      const prepend = (item: NotificationItem): void => {
        // Guard against duplicates from a reconnect resync racing the live push.
        if (store.items().some((existing) => existing.id === item.id)) return;
        patchState(store, {
          items: [item, ...store.items()].slice(0, MAX_ITEMS),
          unreadCount: store.unreadCount() + (item.read ? 0 : 1),
          lastArrivedId: item.id,
        });
      };

      const patchItem = (id: string, patch: Partial<NotificationItem>): void => {
        patchState(store, {
          items: store.items().map((item) => (item.id === id ? { ...item, ...patch } : item)),
        });
      };

      const methods = {
        async load(): Promise<void> {
          patchState(store, { status: 'loading' });
          try {
            const res = await firstValueFrom(api.list());
            patchState(store, {
              items: res.items,
              unreadCount: res.unread_count,
              status: 'success',
            });
          } catch {
            patchState(store, { status: 'error' });
          }
        },

        async markRead(id: string): Promise<void> {
          const target = store.items().find((item) => item.id === id);
          if (!target || target.read) return;

          // Optimistic update, reverted if the request fails.
          patchState(store, {
            items: store.items().map((item) => (item.id === id ? { ...item, read: true } : item)),
            unreadCount: Math.max(0, store.unreadCount() - 1),
          });
          try {
            await firstValueFrom(api.markRead(id));
          } catch {
            patchState(store, {
              items: store
                .items()
                .map((item) => (item.id === id ? { ...item, read: false } : item)),
              unreadCount: store.unreadCount() + 1,
            });
          }
        },

        async markAllRead(): Promise<void> {
          if (store.unreadCount() === 0) return;
          const previous = store.items();
          patchState(store, {
            items: previous.map((item) => ({ ...item, read: true })),
            unreadCount: 0,
          });
          try {
            await firstValueFrom(api.markAllRead());
          } catch {
            patchState(store, {
              items: previous,
              unreadCount: previous.filter((item) => isUnread(item)).length,
            });
          }
        },

        /** Accept a group invitation inline. Resolves the row and marks it read. */
        async acceptInvite(item: NotificationItem): Promise<boolean> {
          const code = item.payload?.code;
          if (!code || item.inviteState) return false;
          try {
            await firstValueFrom(invitations.accept(code));
            patchItem(item.id, { inviteState: 'accepted' });
            await methods.markRead(item.id);
            return true;
          } catch {
            return false;
          }
        },

        /** Decline a group invitation inline. Resolves the row and marks it read. */
        async declineInvite(item: NotificationItem): Promise<boolean> {
          const code = item.payload?.code;
          if (!code || item.inviteState) return false;
          try {
            await firstValueFrom(invitations.decline(code));
            patchItem(item.id, { inviteState: 'declined' });
            await methods.markRead(item.id);
            return true;
          } catch {
            return false;
          }
        },

        /** Clear the one-shot arrival flash after the animation has played. */
        clearArrived(): void {
          if (store.lastArrivedId() !== null) {
            patchState(store, { lastArrivedId: null });
          }
        },

        /** Open the live SSE stream. Idempotent; no-op without EventSource. */
        connect(): void {
          if (source || typeof EventSource === 'undefined') return;
          const es = new EventSource(api.streamUrl(), { withCredentials: true });
          source = es;
          es.onopen = () => {
            patchState(store, { connected: true });
            // Resync on (re)connect to pick up anything missed while offline.
            void methods.load();
          };
          es.onmessage = (event: MessageEvent<string>) => {
            try {
              prepend(JSON.parse(event.data) as NotificationItem);
            } catch {
              // Ignore malformed frames; heartbeats are comments, not data events.
            }
          };
          es.onerror = () => {
            // EventSource reconnects automatically; just reflect the state.
            patchState(store, { connected: false });
          };
        },

        disconnect(): void {
          source?.close();
          source = null;
          patchState(store, { connected: false });
        },
      };

      return methods;
    },
  ),
);

export { type InviteState };
