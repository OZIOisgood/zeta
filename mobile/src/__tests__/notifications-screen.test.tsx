import React from 'react';
import { View as MockView } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// Stack.Screen: render headerRight so testIDs on header actions are accessible
// in the component tree (the real native stack renders them natively).
// mock-prefixed (case-insensitive) satisfies jest's hoisting allow-list;
// capitalised so JSX treats it as a React component (enables testID).
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => React.ReactNode } }) => {
      if (!options?.headerRight) return null;
      return <MockView testID="__header-right__">{options.headerRight()}</MockView>;
    },
  },
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const mockUseNotifications = jest.fn();
const mockMarkRead = { mutate: jest.fn(), mutateAsync: jest.fn() };
const mockMarkAll = { mutate: jest.fn(), mutateAsync: jest.fn() };
const mockAccept = { mutateAsync: jest.fn() };
const mockDecline = { mutateAsync: jest.fn() };

jest.mock('../api/queries/notifications', () => ({
  useNotificationsQuery: () => mockUseNotifications(),
  useMarkNotificationReadMutation: () => mockMarkRead,
  useMarkAllNotificationsReadMutation: () => mockMarkAll,
}));
jest.mock('../api/queries/invitations', () => ({
  useAcceptInvitationMutation: () => mockAccept,
  useDeclineInvitationMutation: () => mockDecline,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

import NotificationsScreen from '../app/notifications';

const item = {
  id: 'n1',
  type: 'group_member_joined',
  payload: { member_name: 'Lee', group_name: 'Karate', group_id: 'g1' },
  read: false,
  created_at: new Date().toISOString(),
};

test('renders a skeleton while pending', async () => {
  mockUseNotifications.mockReturnValue({ isPending: true, isError: false, data: undefined });
  await render(<NotificationsScreen />);
  expect(await screen.findByTestId('notifications-skeleton')).toBeTruthy();
});

test('renders the query error before the empty state', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: true,
    data: undefined,
    refetch: jest.fn(),
  });
  await render(<NotificationsScreen />);
  expect(await screen.findByTestId('notifications-error-retry')).toBeTruthy();
});

test('renders the empty state when there are no notifications', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [], unread_count: 0 },
    refetch: jest.fn(),
  });
  await render(<NotificationsScreen />);
  expect(await screen.findByTestId('notifications-empty')).toBeTruthy();
});

test('renders rows and the mark-all-read action when there are unread items', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [item], unread_count: 1 },
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<NotificationsScreen />);
  expect(await screen.findByTestId('notification-row-n1')).toBeTruthy();
  expect(screen.getByTestId('notifications-mark-all')).toBeTruthy();
  // The item's created_at is `now`, so it lands in the Today section.
  expect(screen.getByText('notifications.today')).toBeTruthy();
});

test('hides mark-all-read when there are no unread items', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [{ ...item, read: true }], unread_count: 0 },
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<NotificationsScreen />);
  expect(await screen.findByTestId('notification-row-n1')).toBeTruthy();
  expect(screen.queryByTestId('notifications-mark-all')).toBeNull();
});

// ── All/Unread tab filter ─────────────────────────────────────────────────────

const readItem = {
  id: 'n2',
  type: 'group_member_joined',
  payload: { member_name: 'Bob', group_name: 'Soccer', group_id: 'g2' },
  read: true,
  created_at: new Date().toISOString(),
};

test('renders All and Unread tabs', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [item, readItem], unread_count: 1 },
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<NotificationsScreen />);
  expect(await screen.findByTestId('notifications-tabs')).toBeTruthy();
  expect(screen.getByText('notifications.page.tabs.all')).toBeTruthy();
  expect(screen.getByText('notifications.page.tabs.unread')).toBeTruthy();
});

test('Unread tab hides already-read rows', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [item, readItem], unread_count: 1 },
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<NotificationsScreen />);
  // Switch to Unread tab
  const unreadTab = await screen.findByText('notifications.page.tabs.unread');
  fireEvent.press(unreadTab);
  // unread item still visible
  expect(await screen.findByTestId('notification-row-n1')).toBeTruthy();
  // read item hidden
  expect(screen.queryByTestId('notification-row-n2')).toBeNull();
});

test('Unread tab shows allRead empty state when no unread items remain', async () => {
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [readItem], unread_count: 0 },
    refetch: jest.fn(),
    isRefetching: false,
  });
  await render(<NotificationsScreen />);
  const unreadTab = await screen.findByText('notifications.page.tabs.unread');
  fireEvent.press(unreadTab);
  expect(await screen.findByTestId('notifications-empty')).toBeTruthy();
  // allRead title used in unread-empty state
  expect(screen.getByText('notifications.page.allRead')).toBeTruthy();
});

// ── Invite query invalidation after accept/decline when already read ──────────

const inviteItemRead = {
  id: 'ni1',
  type: 'group_invitation_received',
  payload: { inviter_name: 'Alice', group_name: 'Yoga', group_id: 'g3', code: 'ABC123' },
  read: true,
  invite_status: 'pending',
  created_at: new Date().toISOString(),
};

const mockRefetch = jest.fn();

test('accept invalidates notifications query even when item is already read', async () => {
  mockAccept.mutateAsync.mockResolvedValue(undefined);
  mockMarkRead.mutateAsync.mockResolvedValue(undefined);
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [inviteItemRead], unread_count: 0 },
    refetch: mockRefetch,
    isRefetching: false,
  });
  await render(<NotificationsScreen />);
  const acceptBtn = await screen.findByTestId('notification-accept-ni1');
  fireEvent.press(acceptBtn);
  // Wait for async mutation to settle
  await waitFor(() => expect(mockAccept.mutateAsync).toHaveBeenCalledWith({ code: 'ABC123' }));
  expect(mockRefetch).toHaveBeenCalled();
});

test('decline invalidates notifications query even when item is already read', async () => {
  mockDecline.mutateAsync.mockResolvedValue(undefined);
  mockMarkRead.mutateAsync.mockResolvedValue(undefined);
  mockUseNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { items: [inviteItemRead], unread_count: 0 },
    refetch: mockRefetch,
    isRefetching: false,
  });
  await render(<NotificationsScreen />);
  const declineBtn = await screen.findByTestId('notification-decline-ni1');
  fireEvent.press(declineBtn);
  await waitFor(() => expect(mockDecline.mutateAsync).toHaveBeenCalledWith({ code: 'ABC123' }));
  expect(mockRefetch).toHaveBeenCalled();
});
