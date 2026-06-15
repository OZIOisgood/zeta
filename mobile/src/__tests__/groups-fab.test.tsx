/**
 * Tests the create-group FAB on the groups list screen (groups:create permission gate).
 * Isolated from groups-list.test.tsx to avoid re-testing already-covered paths.
 */
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

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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
  mockPermissions = [];
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

test('students get the Join FAB, not the Create FAB (no groups:create)', async () => {
  mockPermissions = [];
  await render(<Providers><GroupsScreen /></Providers>);
  expect(screen.queryByTestId('groups-create-fab')).toBeNull();
  expect(screen.getByTestId('groups-join-fab')).toBeOnTheScreen();
});

test('Join FAB press navigates to /invite', async () => {
  mockPermissions = [];
  await render(<Providers><GroupsScreen /></Providers>);
  fireEvent.press(screen.getByTestId('groups-join-fab'));
  expect(mockPush).toHaveBeenCalledWith('/invite');
});

test('experts get the Create FAB, not the Join FAB (groups:create)', async () => {
  mockPermissions = ['groups:create'];
  await render(<Providers><GroupsScreen /></Providers>);
  expect(screen.getByTestId('groups-create-fab')).toBeOnTheScreen();
  expect(screen.queryByTestId('groups-join-fab')).toBeNull();
});

test('Create FAB press navigates to /group/create', async () => {
  mockPermissions = ['groups:create'];
  await render(<Providers><GroupsScreen /></Providers>);
  fireEvent.press(screen.getByTestId('groups-create-fab'));
  expect(mockPush).toHaveBeenCalledWith('/group/create');
});
