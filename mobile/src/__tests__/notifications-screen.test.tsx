import { render, screen } from '@testing-library/react-native';

// ZBackHeader (WP-UI0) calls useRouter().back() for its default onBack, so the
// mock must expose `back` as well as `push`.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
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
