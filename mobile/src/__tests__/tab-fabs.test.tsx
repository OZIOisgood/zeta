/**
 * Android extended-FAB contract for the three list tabs (Videos / Sessions /
 * Groups).
 *
 * jest-expo defaults to Platform.OS = 'ios', where these screens surface the
 * primary action via a native header-right button and render NO FAB. This file
 * forces Platform.OS = 'android' so the Material FAB branch runs, then asserts
 * that every screen renders an EXTENDED ZFab (icon + visible label) with the
 * correct testID, i18n label, and onPress wiring — while preserving the
 * role/permission gating.
 *
 * jest renders ZFab through its bare .tsx fallback (the jest moduleNameMapper
 * maps z-fab / z-fab.android → z-fab.tsx, since Compose can't run under jest).
 * That fallback renders the label `<Text>` ONLY when extended, so a present
 * label proves the extended variant; the native content-hug itself is covered
 * by the source scan in z-fab.test.tsx and verified on an Android device build.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// Shared query mocks across the three screens.
const mockUseAssetsQuery = jest.fn();
jest.mock('../api/queries/assets', () => ({
  ...jest.requireActual('../api/queries/assets'),
  useAssetsQuery: () => mockUseAssetsQuery(),
}));

const mockUseMyBookingsQuery = jest.fn();
jest.mock('../api/queries/coaching', () => ({
  ...jest.requireActual('../api/queries/coaching'),
  useMyBookingsQuery: () => mockUseMyBookingsQuery(),
  useCancelBookingMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockUseGroupsQuery = jest.fn();
jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useGroupsQuery: () => mockUseGroupsQuery(),
}));

const mockUseNotificationsQuery = jest.fn(() => ({ data: { unread_count: 0 } }));
jest.mock('../api/queries/notifications', () => ({
  ...jest.requireActual('../api/queries/notifications'),
  useNotificationsQuery: () => mockUseNotificationsQuery(),
}));

const mockPush = jest.fn();
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

let mockPermissions: string[] | null = null;
let mockUserId = 'u1';
jest.mock('../auth/auth-store', () => ({
  ...jest.requireActual('../auth/auth-store'),
  useAuth: (selector: (s: { user: { permissions: string[]; id: string } | null }) => unknown) =>
    selector({
      user: mockPermissions !== null ? { permissions: mockPermissions, id: mockUserId } : null,
    }),
}));

import { initI18n } from '../i18n';
import VideosScreen from '../app/(tabs)/videos/index';
import CoachingScreen from '../app/(tabs)/coaching/index';
import GroupsScreen from '../app/(tabs)/groups/index';

// jest-expo defaults Platform.OS to 'ios'; flip the shared Platform module to
// 'android' so the screens' `Platform.OS === 'android'` FAB branch renders.
// Components read Platform.OS at render time, so mutating it before render is
// observed. Restore afterwards so other suites keep the iOS default.
const ORIGINAL_OS = Platform.OS;
beforeAll(() => {
  initI18n('en');
  Platform.OS = 'android';
});
afterAll(() => {
  Platform.OS = ORIGINAL_OS;
});

const EMPTY_QUERY = {
  isPending: false,
  isError: false,
  data: [],
  refetch: jest.fn(),
  isRefetching: false,
};

let client: QueryClient;
beforeEach(() => {
  mockPush.mockClear();
  mockSetOptions.mockClear();
  mockUseAssetsQuery.mockReturnValue(EMPTY_QUERY);
  mockUseMyBookingsQuery.mockReturnValue(EMPTY_QUERY);
  mockUseGroupsQuery.mockReturnValue(EMPTY_QUERY);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(async () => {
  // Flush FlatList cell-render timers so they don't leak into the next test.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  client.clear();
});

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ── Videos ────────────────────────────────────────────────────────────────────
test('Videos: renders an EXTENDED create FAB with the upload label (Android)', async () => {
  mockPermissions = ['assets:create'];
  await render(
    <Providers>
      <VideosScreen />
    </Providers>,
  );

  const fab = screen.getByTestId('videos-create-fab');
  expect(fab).toBeOnTheScreen();
  // Extended → the bare fallback renders the visible label text.
  expect(screen.getByText('Upload video')).toBeOnTheScreen();

  fireEvent.press(fab);
  expect(mockPush).toHaveBeenCalledWith('/upload');
});

test('Videos: no create FAB without assets:create (Android)', async () => {
  mockPermissions = [];
  await render(
    <Providers>
      <VideosScreen />
    </Providers>,
  );
  expect(screen.queryByTestId('videos-create-fab')).toBeNull();
});

// ── Sessions / Coaching ─────────────────────────────────────────────────────
test('Sessions: renders an EXTENDED book FAB with the book label (Android)', async () => {
  mockPermissions = ['coaching:bookings:read', 'coaching:book'];
  await render(
    <Providers>
      <CoachingScreen />
    </Providers>,
  );

  const fab = screen.getByTestId('coaching-book');
  expect(fab).toBeOnTheScreen();
  expect(screen.getByText('Book session')).toBeOnTheScreen();

  fireEvent.press(fab);
  expect(mockPush).toHaveBeenCalledWith('/book');
});

test('Sessions: no book FAB without coaching:book (Android)', async () => {
  mockPermissions = ['coaching:bookings:read'];
  await render(
    <Providers>
      <CoachingScreen />
    </Providers>,
  );
  expect(screen.queryByTestId('coaching-book')).toBeNull();
});

// ── Groups (role-gated, mutually exclusive) ──────────────────────────────────
test('Groups: creator renders an EXTENDED create FAB with the create label (Android)', async () => {
  mockPermissions = ['groups:read', 'groups:create'];
  await render(
    <Providers>
      <GroupsScreen />
    </Providers>,
  );

  const fab = screen.getByTestId('groups-create-fab');
  expect(fab).toBeOnTheScreen();
  expect(screen.getByText('Create Group')).toBeOnTheScreen();
  // mutually exclusive: no join FAB for a creator
  expect(screen.queryByTestId('groups-join-fab')).toBeNull();

  fireEvent.press(fab);
  expect(mockPush).toHaveBeenCalledWith('/group/create');
});

test('Groups: student renders an EXTENDED join FAB with the join label (Android)', async () => {
  mockPermissions = ['groups:read'];
  await render(
    <Providers>
      <GroupsScreen />
    </Providers>,
  );

  const fab = screen.getByTestId('groups-join-fab');
  expect(fab).toBeOnTheScreen();
  expect(screen.getByText('Join Group')).toBeOnTheScreen();
  // mutually exclusive: no create FAB for a student
  expect(screen.queryByTestId('groups-create-fab')).toBeNull();

  fireEvent.press(fab);
  expect(mockPush).toHaveBeenCalledWith('/invite');
});
