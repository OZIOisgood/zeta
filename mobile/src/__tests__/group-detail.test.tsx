import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

const mockUseGroupQuery = jest.fn();
const mockUseGroupStudentsQuery = jest.fn();
const mockUseGroupExpertsQuery = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseLeaveGroupMutation = jest.fn();

jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useGroupQuery: (_id: string) => mockUseGroupQuery(_id),
  useGroupStudentsQuery: (_id: string, _enabled: boolean) => mockUseGroupStudentsQuery(_id, _enabled),
  useGroupExpertsQuery: (_id: string, _enabled: boolean) => mockUseGroupExpertsQuery(_id, _enabled),
  useLeaveGroupMutation: (_id: string) => mockUseLeaveGroupMutation(_id),
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

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'g1' }),
  useRouter: () => ({ back: mockBack }),
}));

import { initI18n } from '../i18n';
import GroupDetailScreen from '../app/group/[id]';

beforeAll(() => initI18n('en'));

let client: QueryClient;
beforeEach(() => {
  mockBack.mockClear();
  mockMutateAsync.mockClear();
  mockPermissions = ['groups:expert-list:read', 'groups:user-list:read', 'groups:membership:leave'];
  mockUserId = 'u1';
  mockUseLeaveGroupMutation.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false, isError: false });
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  mockUseGroupExpertsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const GROUP = {
  id: 'g1',
  name: 'Karate Club',
  owner_id: 'u2', // different from mockUserId so leave is allowed
  avatar: null,
  description: 'Front stance drill',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const EXPERT: import('../api/queries/groups').GroupUser = {
  id: 'e1', email: 'coach@example.com', first_name: 'Coach', last_name: 'Ana', role: 'expert',
};

const STUDENT: import('../api/queries/groups').GroupUser = {
  id: 's1', email: 'student@example.com', first_name: 'Bob', last_name: 'Jones', role: 'student',
};

// ── permission-gated sections ─────────────────────────────────────────────────

test('experts section visible with groups:expert-list:read', async () => {
  mockPermissions = ['groups:expert-list:read'];
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  mockUseGroupExpertsQuery.mockReturnValue({ isPending: false, isError: false, data: [EXPERT] });
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.getByText('Experts')).toBeOnTheScreen();
});

test('students section absent without groups:user-list:read', async () => {
  mockPermissions = ['groups:expert-list:read'];
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  mockUseGroupExpertsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.queryByText('Students')).toBeNull();
});

test('students section visible with groups:user-list:read', async () => {
  mockPermissions = ['groups:user-list:read'];
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [STUDENT] });
  mockUseGroupExpertsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.getByText('Students')).toBeOnTheScreen();
});

test('experts section absent without groups:expert-list:read', async () => {
  mockPermissions = ['groups:user-list:read'];
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  mockUseGroupExpertsQuery.mockReturnValue({ isPending: false, isError: false, data: [] });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.queryByText('Experts')).toBeNull();
});

// ── leave button visibility ───────────────────────────────────────────────────

test('leave button hidden when user is the group owner', async () => {
  mockPermissions = ['groups:membership:leave'];
  mockUserId = 'u2'; // same as GROUP.owner_id
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.queryByTestId('group-leave')).toBeNull();
});

test('leave button hidden without groups:membership:leave', async () => {
  mockPermissions = [];
  mockUserId = 'u1';
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.queryByTestId('group-leave')).toBeNull();
});

test('leave button visible when user has permission and is not owner', async () => {
  mockPermissions = ['groups:membership:leave'];
  mockUserId = 'u1';
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.getByTestId('group-leave')).toBeOnTheScreen();
});

// ── leave flow ────────────────────────────────────────────────────────────────

test('leave flow: press leave → confirm UI → press confirm → mutateAsync called', async () => {
  mockPermissions = ['groups:membership:leave'];
  mockUserId = 'u1';
  mockMutateAsync.mockResolvedValueOnce(undefined);
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });

  await render(<Providers><GroupDetailScreen /></Providers>);

  // Step 1: initial leave button visible; confirm row not visible yet
  expect(screen.getByTestId('group-leave')).toBeOnTheScreen();
  expect(screen.queryByTestId('group-leave-confirm')).toBeNull();

  // Step 2: press leave → confirm row appears
  fireEvent.press(screen.getByTestId('group-leave'));
  await waitFor(() => expect(screen.getByTestId('group-leave-confirm')).toBeOnTheScreen());

  // Step 3: press confirm → mutateAsync called
  fireEvent.press(screen.getByTestId('group-leave-confirm'));
  await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
});

test('cancel in leave confirm row hides the confirm UI', async () => {
  mockPermissions = ['groups:membership:leave'];
  mockUserId = 'u1';
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });

  await render(<Providers><GroupDetailScreen /></Providers>);

  fireEvent.press(screen.getByTestId('group-leave'));
  await waitFor(() => expect(screen.getByTestId('group-leave-confirm')).toBeOnTheScreen());

  fireEvent.press(screen.getByRole('button', { name: /cancel/i }));
  await waitFor(() => expect(screen.queryByTestId('group-leave-confirm')).toBeNull());
  expect(screen.getByTestId('group-leave')).toBeOnTheScreen();
});

test('leave error: mutateAsync rejects → translated error message appears', async () => {
  mockPermissions = ['groups:membership:leave'];
  mockUserId = 'u1';
  mockMutateAsync.mockRejectedValueOnce(new Error('network error'));
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });

  await render(<Providers><GroupDetailScreen /></Providers>);

  // Open confirm UI
  fireEvent.press(screen.getByTestId('group-leave'));
  await waitFor(() => expect(screen.getByTestId('group-leave-confirm')).toBeOnTheScreen());

  // Trigger the failing mutation
  fireEvent.press(screen.getByTestId('group-leave-confirm'));

  // Translated error text should appear
  await waitFor(() =>
    expect(screen.getByText('Failed to leave group.')).toBeOnTheScreen(),
  );
});
