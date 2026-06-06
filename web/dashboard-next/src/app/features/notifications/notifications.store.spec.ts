import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { InvitationsApiClient } from '../../core/http/invitations-api.service';
import {
  NotificationItem,
  NotificationListResponse,
  NotificationsApiClient,
} from '../../core/http/notifications-api.service';
import { NotificationsStore } from './notifications.store';

function item(id: string, read = false): NotificationItem {
  return {
    id,
    type: 'group_member_joined',
    payload: { group_id: 'g1', group_name: 'Academy', member_name: 'Max' },
    read,
    created_at: '2026-06-05T10:00:00Z',
  };
}

function inviteItem(id: string, code = 'ZP-1'): NotificationItem {
  return {
    id,
    type: 'group_invitation_received',
    payload: { group_name: 'Academy', inviter_name: 'Sofia', code },
    read: false,
    created_at: '2026-06-05T10:00:00Z',
  };
}

function provide(
  api: Partial<NotificationsApiClient>,
  invitations: Partial<InvitationsApiClient> = {},
) {
  TestBed.configureTestingModule({
    providers: [
      { provide: NotificationsApiClient, useValue: api },
      { provide: InvitationsApiClient, useValue: invitations },
    ],
  });
  return TestBed.inject(NotificationsStore);
}

describe('NotificationsStore', () => {
  it('loads items and unread count', async () => {
    const res: NotificationListResponse = {
      items: [item('n1'), item('n2', true)],
      unread_count: 1,
    };
    const store = provide({ list: () => of(res) });

    await store.load();

    expect(store.status()).toBe('success');
    expect(store.items().length).toBe(2);
    expect(store.unreadCount()).toBe(1);
    expect(store.hasUnread()).toBe(true);
  });

  it('records an error when loading fails', async () => {
    const store = provide({ list: () => throwError(() => new Error('offline')) });

    await store.load();

    expect(store.status()).toBe('error');
  });

  it('caps the badge at 9+', async () => {
    const store = provide({ list: () => of({ items: [], unread_count: 25 }) });

    await store.load();

    expect(store.badge()).toBe('9+');
  });

  it('marks a single notification read optimistically', async () => {
    const markRead = vi.fn(() => of(undefined));
    const store = provide({
      list: () => of({ items: [item('n1'), item('n2')], unread_count: 2 }),
      markRead,
    });
    await store.load();

    await store.markRead('n1');

    expect(markRead).toHaveBeenCalledWith('n1');
    expect(store.unreadCount()).toBe(1);
    expect(store.items().find((i: NotificationItem) => i.id === 'n1')?.read).toBe(true);
  });

  it('reverts an optimistic read when the request fails', async () => {
    const store = provide({
      list: () => of({ items: [item('n1')], unread_count: 1 }),
      markRead: () => throwError(() => new Error('boom')),
    });
    await store.load();

    await store.markRead('n1');

    expect(store.unreadCount()).toBe(1);
    expect(store.items()[0].read).toBe(false);
  });

  it('marks all read and clears the unread count', async () => {
    const markAllRead = vi.fn(() => of(undefined));
    const store = provide({
      list: () => of({ items: [item('n1'), item('n2')], unread_count: 2 }),
      markAllRead,
    });
    await store.load();

    await store.markAllRead();

    expect(markAllRead).toHaveBeenCalled();
    expect(store.unreadCount()).toBe(0);
    expect(store.items().every((i: NotificationItem) => i.read)).toBe(true);
  });

  it('accepts an invitation inline, resolving and reading the row', async () => {
    const accept = vi.fn(() => of({ group_id: 'g1' }));
    const store = provide(
      {
        list: () => of({ items: [inviteItem('inv1')], unread_count: 1 }),
        markRead: () => of(undefined),
      },
      { accept },
    );
    await store.load();

    const ok = await store.acceptInvite(store.items()[0]);

    expect(ok).toBe(true);
    expect(accept).toHaveBeenCalledWith('ZP-1');
    expect(store.items()[0].inviteState).toBe('accepted');
    expect(store.items()[0].read).toBe(true);
    expect(store.unreadCount()).toBe(0);
  });

  it('declines an invitation inline without joining', async () => {
    const decline = vi.fn(() => of(undefined));
    const store = provide(
      {
        list: () => of({ items: [inviteItem('inv1')], unread_count: 1 }),
        markRead: () => of(undefined),
      },
      { decline },
    );
    await store.load();

    const ok = await store.declineInvite(store.items()[0]);

    expect(ok).toBe(true);
    expect(decline).toHaveBeenCalledWith('ZP-1');
    expect(store.items()[0].inviteState).toBe('declined');
    expect(store.unreadCount()).toBe(0);
  });

  it('groups items into today and earlier buckets', async () => {
    const todayIso = new Date().toISOString();
    const recent: NotificationItem = { ...item('today1'), created_at: todayIso };
    const old: NotificationItem = { ...item('old1'), created_at: '2020-01-01T00:00:00Z' };
    const store = provide({ list: () => of({ items: [recent, old], unread_count: 2 }) });
    await store.load();

    const groups = store.grouped();
    expect(groups.map((g) => g.key)).toEqual(['today', 'earlier']);
    expect(groups[0].items[0].id).toBe('today1');
    expect(groups[1].items[0].id).toBe('old1');
  });
});
