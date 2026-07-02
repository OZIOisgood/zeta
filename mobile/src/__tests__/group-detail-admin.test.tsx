/**
 * G5-T6 — group detail admin wire-up tests
 *
 * Covers:
 *   1. Preferences button visible for users with groups:preferences:edit
 *   2. Preferences button hidden without the permission
 *   3. Pressing it navigates to /group/[id]/preferences
 *   4. Remove-member button visible for users with groups:user-list:delete
 *   5. Remove-member confirm dialog calls removeGroupMember mutation
 */
import React from 'react';
import { View as MockView } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
const mockUseLeaveGroupMutation = jest.fn();
const mockUseRemoveGroupMemberMutation = jest.fn();

jest.mock('../api/queries/groups', () => ({
  useGroupQuery: (...args: unknown[]) => mockUseGroupQuery(...args),
  useGroupStudentsQuery: (...args: unknown[]) => mockUseGroupStudentsQuery(...args),
  useGroupExpertsQuery: (...args: unknown[]) => mockUseGroupExpertsQuery(...args),
  useLeaveGroupMutation: (...args: unknown[]) => mockUseLeaveGroupMutation(...args),
  useRemoveGroupMemberMutation: (...args: unknown[]) => mockUseRemoveGroupMemberMutation(...args),
}));

let mockPermissions: string[] = [];
let mockUserId = 'u1';

jest.mock('../auth/auth-store', () => ({
  useAuth: (sel: (s: unknown) => unknown) =>
    sel({ user: { id: mockUserId, permissions: mockPermissions } }),
  api: {},
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
// Stack.Screen: render the headerRight so testIDs on header actions are
// accessible in the component tree (the real native stack renders them natively,
// so tests need the callback to execute here instead).
// Stack.Screen: render headerRight so testIDs on header actions are accessible
// in the component tree (the real native stack renders them natively).
// Variable name must be mock-prefixed so jest's hoisting check allows it.
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'g1' }),
  useRouter: () => ({ back: mockBack, push: mockPush, replace: jest.fn() }),
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => React.ReactNode } }) => {
      if (!options?.headerRight) return null;
      return <MockView testID="__header-right__">{options.headerRight()}</MockView>;
    },
  },
}));

import { initI18n } from '../i18n';
import GroupDetailScreen from '../app/group/[id]';

beforeAll(() => initI18n('en'));

const GROUP = {
  id: 'g1',
  name: 'Karate Club',
  owner_id: 'u2',
  avatar: null,
  description: 'Front stance drill',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const STUDENT = {
  id: 's1',
  email: 'student@example.com',
  first_name: 'Bob',
  last_name: 'Jones',
  role: 'student' as const,
  avatar: undefined,
};

let client: QueryClient;

beforeEach(() => {
  mockBack.mockClear();
  mockPush.mockClear();
  mockPermissions = [];
  mockUserId = 'u1';
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn() });
  mockUseGroupExpertsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn() });
  mockUseLeaveGroupMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseRemoveGroupMemberMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

afterEach(() => client.clear());

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ── preferences navigation ───────────────────────────────────────────────────

test('preferences button visible with groups:preferences:edit', async () => {
  mockPermissions = ['groups:preferences:edit'];
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.getByTestId('group-preferences-btn')).toBeOnTheScreen();
});

test('preferences button hidden without groups:preferences:edit', async () => {
  mockPermissions = [];
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.queryByTestId('group-preferences-btn')).toBeNull();
});

test('preferences button visible for leave-only user (groups:membership:leave, no edit)', async () => {
  // Non-owner member who can leave but cannot edit preferences must still
  // reach the preferences screen (mirrors web canOpenPreferences = canEditPreferences || canLeave).
  mockPermissions = ['groups:membership:leave'];
  mockUserId = 'u1'; // u1 != GROUP.owner_id (u2) so canLeave is true
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.getByTestId('group-preferences-btn')).toBeOnTheScreen();
});

test('pressing preferences button navigates to preferences screen', async () => {
  mockPermissions = ['groups:preferences:edit'];
  await render(<Providers><GroupDetailScreen /></Providers>);
  fireEvent.press(screen.getByTestId('group-preferences-btn'));
  expect(mockPush).toHaveBeenCalledWith('/group/g1/preferences');
});

// ── remove member ────────────────────────────────────────────────────────────

test('remove-member button visible for users with groups:user-list:delete', async () => {
  mockPermissions = ['groups:user-list:read', 'groups:user-list:delete'];
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [STUDENT], refetch: jest.fn() });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.getByTestId('member-remove')).toBeOnTheScreen();
});

test('remove-member button hidden without groups:user-list:delete', async () => {
  mockPermissions = ['groups:user-list:read'];
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [STUDENT], refetch: jest.fn() });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.queryByTestId('member-remove')).toBeNull();
});

test('remove-member flow: press remove → confirm dialog → mutation called', async () => {
  const removeMutate = jest.fn(async () => undefined);
  mockUseRemoveGroupMemberMutation.mockReturnValue({ mutateAsync: removeMutate, isPending: false });
  mockPermissions = ['groups:user-list:read', 'groups:user-list:delete'];
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [STUDENT], refetch: jest.fn() });
  await render(<Providers><GroupDetailScreen /></Providers>);
  fireEvent.press(screen.getByTestId('member-remove'));
  // Wait for confirm dialog to open
  await waitFor(() => expect(screen.getAllByText('Remove').length).toBeGreaterThan(0));
  // Press the confirm button (last "Remove" in tree, in dialog)
  const removeButtons = screen.getAllByText('Remove');
  fireEvent.press(removeButtons[removeButtons.length - 1]);
  await waitFor(() => expect(removeMutate).toHaveBeenCalledTimes(1));
  expect(removeMutate).toHaveBeenCalledWith({ userId: 's1' });
});

// ── self-exclusion (web parity: canRemoveUsers() && !isCurrentUser(member.id)) ─

test('remove button is hidden on the current user\'s own row even when canRemoveMembers is true', async () => {
  // The current user IS the student being listed — they must not see a remove
  // button on their own row (mirrors web group-details-page.component.ts:218).
  mockUserId = 's1'; // same as STUDENT.id
  mockPermissions = ['groups:user-list:read', 'groups:user-list:delete'];
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [STUDENT], refetch: jest.fn() });
  await render(<Providers><GroupDetailScreen /></Providers>);
  // The student row renders (name visible) but the remove button must be absent.
  expect(screen.getByText('Bob Jones')).toBeOnTheScreen();
  expect(screen.queryByTestId('member-remove')).toBeNull();
});

test('remove button is visible for OTHER members when current user has the permission', async () => {
  // Sanity-check: a different user in the list DOES get the remove button.
  const OTHER: typeof STUDENT = { ...STUDENT, id: 's2', first_name: 'Carol', last_name: 'Doe', email: 'carol@example.com' };
  mockUserId = 'u1'; // u1 is not s2
  mockPermissions = ['groups:user-list:read', 'groups:user-list:delete'];
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [OTHER], refetch: jest.fn() });
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.getByTestId('member-remove')).toBeOnTheScreen();
});
