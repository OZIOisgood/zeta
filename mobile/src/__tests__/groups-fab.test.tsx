/**
 * Tests the role-dependent primary action on the groups list screen.
 * On iOS (default jest-expo platform), the action is a native header-right button.
 * On Android, it is a Material FAB (not exercised in jest which runs on iOS).
 * Isolated from groups-list.test.tsx to avoid re-testing already-covered paths.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

const mockUseGroupsQuery = jest.fn();
jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useGroupsQuery: () => mockUseGroupsQuery(),
}));

// The notification bell (header-right on every tab screen) reads the unread
// count from this query; default to zero unread so the badge stays hidden.
const mockUseNotificationsQuery = jest.fn(() => ({ data: { unread_count: 0 } }));
jest.mock('../api/queries/notifications', () => ({
  ...jest.requireActual('../api/queries/notifications'),
  useNotificationsQuery: () => mockUseNotificationsQuery(),
}));

const mockSetOptions = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

let mockPermissions: string[] | null = null;
jest.mock('../auth/auth-store', () => ({
  ...jest.requireActual('../auth/auth-store'),
  useAuth: (selector: (s: { user: { permissions: string[] } | null }) => unknown) =>
    selector({
      user: mockPermissions !== null ? { permissions: mockPermissions } : null,
    }),
}));

import { initI18n } from '../i18n';
import GroupsScreen from '../app/(tabs)/groups/index';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  mockPush.mockClear();
  mockSetOptions.mockClear();
  mockPermissions = ['groups:read']; // groups:read required for tab permission guard
  mockUseGroupsQuery.mockReturnValue({
    isPending: false,
    isError: false,
    data: [],
    refetch: jest.fn(),
    isRefetching: false,
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ── iOS header-right (jest-expo default platform = 'ios') ─────────────────────
// On iOS, the role-dependent primary action lives in the native nav-bar via
// setOptions rather than a floating FAB. FABs render only on Android.

test('students: setOptions called with a headerRight Join button (no groups:create) (iOS path)', async () => {
  mockPermissions = ['groups:read']; // student: tab access but no create permission
  await render(<Providers><GroupsScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );
});

test('students: header-right Join button renders and navigates to /invite (iOS path)', async () => {
  mockPermissions = ['groups:read']; // student: tab access but no create permission
  await render(<Providers><GroupsScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  expect(screen.getByTestId('groups-join-header-btn')).toBeOnTheScreen();
  expect(screen.queryByTestId('groups-create-header-btn')).toBeNull();
  // The notification bell sits alongside the role action on every tab screen.
  expect(screen.getByTestId('notification-bell')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Join Group'));
  expect(mockPush).toHaveBeenCalledWith('/invite');
});

test('header-right notification bell renders and navigates to /notifications (iOS path)', async () => {
  mockPermissions = ['groups:read'];
  await render(<Providers><GroupsScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  const bell = screen.getByTestId('notification-bell');
  expect(bell).toBeOnTheScreen();
  fireEvent.press(bell);
  expect(mockPush).toHaveBeenCalledWith('/notifications');
});

test('experts: setOptions called with a headerRight Create button (groups:create) (iOS path)', async () => {
  mockPermissions = ['groups:read', 'groups:create']; // expert: tab access + create permission
  await render(<Providers><GroupsScreen /></Providers>);
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );
});

test('experts: header-right Create button renders and navigates to /group/create (iOS path)', async () => {
  mockPermissions = ['groups:read', 'groups:create']; // expert: tab access + create permission
  await render(<Providers><GroupsScreen /></Providers>);

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  expect(screen.getByTestId('groups-create-header-btn')).toBeOnTheScreen();
  expect(screen.queryByTestId('groups-join-header-btn')).toBeNull();
  fireEvent.press(screen.getByLabelText('Create Group'));
  expect(mockPush).toHaveBeenCalledWith('/group/create');
});
