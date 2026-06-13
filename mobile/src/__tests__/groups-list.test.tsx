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

import { initI18n } from '../i18n';
import GroupsScreen from '../app/(tabs)/groups';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  mockPush.mockClear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const GROUP = {
  id: 'g1',
  name: 'Karate Club',
  owner_id: 'u1',
  avatar: null,
  description: 'Front stance drill',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

test('loading state renders skeletons, not text', async () => {
  mockUseGroupsQuery.mockReturnValue({ isPending: true, isError: false, data: undefined, refetch: jest.fn(), isRefetching: false });
  await render(<Providers><GroupsScreen /></Providers>);
  expect(screen.getAllByTestId('group-skeleton').length).toBeGreaterThan(0);
  expect(screen.queryByText(/loading/i)).toBeNull();
});

test('empty state shows groups-empty testID', async () => {
  mockUseGroupsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><GroupsScreen /></Providers>);
  expect(screen.getByTestId('groups-empty')).toBeOnTheScreen();
});

test('error state offers retry', async () => {
  const refetch = jest.fn();
  mockUseGroupsQuery.mockReturnValue({ isPending: false, isError: true, data: undefined, refetch, isRefetching: false });
  await render(<Providers><GroupsScreen /></Providers>);
  const retryBtn = screen.getByRole('button', { name: /retry/i });
  expect(retryBtn).toBeOnTheScreen();
  fireEvent.press(retryBtn);
  expect(refetch).toHaveBeenCalledTimes(1);
});

test('data state shows group name', async () => {
  mockUseGroupsQuery.mockReturnValue({ isPending: false, isError: false, data: [GROUP], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><GroupsScreen /></Providers>);
  expect(screen.getByText('Karate Club')).toBeOnTheScreen();
});

test('Join group button present and pushes /invite on press', async () => {
  mockUseGroupsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn(), isRefetching: false });
  await render(<Providers><GroupsScreen /></Providers>);
  const joinBtn = screen.getByTestId('groups-join');
  expect(joinBtn).toBeOnTheScreen();
  fireEvent.press(joinBtn);
  expect(mockPush).toHaveBeenCalledWith('/invite');
});
