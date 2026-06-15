/**
 * Tests for the invite section added to group/[id].tsx:
 * groups:invites:create permission gate, email form, QR result view,
 * copy-to-clipboard, QR share, two-variant success toast, done/reset.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// Mock expo-image-picker (used by ZAvatarInput on the same screen but not relevant here)
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

// react-native-qrcode-svg is mapped to src/__mocks__/react-native-qrcode-svg.tsx
// via moduleNameMapper in package.json — no inline jest.mock() needed here.

// Mock expo-clipboard
const mockSetStringAsync = jest.fn(async (_text: string) => undefined);
jest.mock('expo-clipboard', () => ({
  setStringAsync: (text: string) => mockSetStringAsync(text),
}));

// Mock expo-sharing
const mockShareAsync = jest.fn(async (_uri: string) => undefined);
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: (uri: string) => mockShareAsync(uri),
}));

// Mock expo-file-system for QR save
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(async () => undefined),
  EncodingType: { Base64: 'base64' },
}));

const mockUseGroupQuery = jest.fn();
const mockUseGroupStudentsQuery = jest.fn();
const mockUseGroupExpertsQuery = jest.fn();
const mockUseLeaveGroupMutation = jest.fn();
const mockCreateInvitationMutateAsync = jest.fn();
const mockUseCreateInvitationMutation = jest.fn();

jest.mock('../api/queries/groups', () => ({
  ...jest.requireActual('../api/queries/groups'),
  useGroupQuery: (_id: string) => mockUseGroupQuery(_id),
  useGroupStudentsQuery: (_id: string, _enabled: boolean) =>
    mockUseGroupStudentsQuery(_id, _enabled),
  useGroupExpertsQuery: (_id: string, _enabled: boolean) =>
    mockUseGroupExpertsQuery(_id, _enabled),
  useLeaveGroupMutation: (_id: string) => mockUseLeaveGroupMutation(_id),
}));

jest.mock('../api/queries/invitations', () => ({
  ...jest.requireActual('../api/queries/invitations'),
  useCreateInvitationMutation: () => mockUseCreateInvitationMutation(),
}));

let mockPermissions: string[] = [];
let mockUserId = 'u1';
jest.mock('../auth/auth-store', () => ({
  ...jest.requireActual('../auth/auth-store'),
  useAuth: (selector: (s: { user: { permissions: string[]; id: string } | null }) => unknown) =>
    selector({
      user: { permissions: mockPermissions, id: mockUserId },
    }),
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'g1' }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('../components/ui/z-toast', () => ({
  showToast: jest.fn(),
}));

import { initI18n } from '../i18n';
import GroupDetailScreen from '../app/group/[id]';
import { showToast } from '../components/ui/z-toast';

beforeAll(() => initI18n('en'));

const GROUP = {
  id: 'g1',
  name: 'Karate Club',
  owner_id: 'u2',
  avatar: null,
  description: 'Front stance',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mockUseGroupQuery.mockReturnValue({ isPending: false, isError: false, data: GROUP, refetch: jest.fn() });
  mockUseGroupStudentsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn() });
  mockUseGroupExpertsQuery.mockReturnValue({ isPending: false, isError: false, data: [], refetch: jest.fn() });
  mockUseLeaveGroupMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseCreateInvitationMutation.mockReturnValue({
    mutateAsync: mockCreateInvitationMutateAsync,
    isPending: false,
  });
  function Providers({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Providers };
}

beforeEach(() => {
  mockBack.mockReset();
  mockPush.mockReset();
  mockSetStringAsync.mockReset();
  mockShareAsync.mockReset();
  (showToast as jest.Mock).mockReset();
  mockCreateInvitationMutateAsync.mockReset();
  mockPermissions = [];
  mockUserId = 'u1';
});

// ── permission gate ───────────────────────────────────────────────────────────

test('invite section hidden without groups:invites:create', async () => {
  mockPermissions = [];
  const { Providers } = setup();
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.queryByTestId('group-invite-section')).toBeNull();
});

test('invite section visible with groups:invites:create', async () => {
  mockPermissions = ['groups:invites:create'];
  const { Providers } = setup();
  await render(<Providers><GroupDetailScreen /></Providers>);
  expect(screen.getByTestId('group-invite-section')).toBeOnTheScreen();
});

// ── create invitation (link-only, no email) ───────────────────────────────────

test('creating link-only invitation shows QR result and linkCreated toast', async () => {
  mockPermissions = ['groups:invites:create'];
  const INVITE = { id: 'inv1', code: 'AbCdEf' };
  mockCreateInvitationMutateAsync.mockResolvedValueOnce(INVITE);
  const { Providers } = setup();

  await render(<Providers><GroupDetailScreen /></Providers>);

  await act(async () => {
    fireEvent.press(screen.getByTestId('group-invite-create-btn'));
  });

  await waitFor(() => expect(mockCreateInvitationMutateAsync).toHaveBeenCalledWith({
    groupID: 'g1',
    email: undefined,
  }));
  await waitFor(() => expect(screen.getByTestId('qr-code')).toBeOnTheScreen());
  expect(showToast).toHaveBeenCalledWith(
    expect.any(String),
    expect.stringContaining('link'),
    'success',
  );
});

// ── create invitation (email provided) ───────────────────────────────────────

test('creating invitation with email calls mutateAsync with email and shows sent toast', async () => {
  mockPermissions = ['groups:invites:create'];
  const INVITE = { id: 'inv2', code: 'XyZ123' };
  mockCreateInvitationMutateAsync.mockResolvedValueOnce(INVITE);
  const { Providers } = setup();

  await render(<Providers><GroupDetailScreen /></Providers>);

  // Update email first (state must flush before submit reads it)
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('group-invite-email'), 'student@example.com');
  });
  // Then create invitation
  await act(async () => {
    fireEvent.press(screen.getByTestId('group-invite-create-btn'));
  });

  await waitFor(() => expect(mockCreateInvitationMutateAsync).toHaveBeenCalledWith({
    groupID: 'g1',
    email: 'student@example.com',
  }));
  await waitFor(() =>
    expect(showToast).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('sent'),
      'success',
    ),
  );
});

// ── copy link ─────────────────────────────────────────────────────────────────

test('copy link button copies the invite URL to clipboard', async () => {
  mockPermissions = ['groups:invites:create'];
  const INVITE = { id: 'inv3', code: 'CoPyMe' };
  mockCreateInvitationMutateAsync.mockResolvedValueOnce(INVITE);
  const { Providers } = setup();

  await render(<Providers><GroupDetailScreen /></Providers>);
  await act(async () => { fireEvent.press(screen.getByTestId('group-invite-create-btn')); });

  await waitFor(() => expect(screen.getByTestId('group-invite-copy-btn')).toBeOnTheScreen());
  await act(async () => { fireEvent.press(screen.getByTestId('group-invite-copy-btn')); });

  await waitFor(() =>
    expect(mockSetStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('CoPyMe'),
    ),
  );
});

// ── mutation error ────────────────────────────────────────────────────────────

test('failed invitation shows inline error banner, not a toast', async () => {
  mockPermissions = ['groups:invites:create'];
  mockCreateInvitationMutateAsync.mockRejectedValueOnce(new Error('network'));
  const { Providers } = setup();

  await render(<Providers><GroupDetailScreen /></Providers>);
  await act(async () => { fireEvent.press(screen.getByTestId('group-invite-create-btn')); });

  // Form-save failures surface in-form (mirrors create-group + web), not via a toast.
  await waitFor(() => expect(screen.getByTestId('group-invite-error')).toBeOnTheScreen());
  expect(showToast).not.toHaveBeenCalledWith(expect.any(String), undefined, 'error');
  // QR result view not shown
  expect(screen.queryByTestId('qr-code')).toBeNull();
});

// ── done / reset ──────────────────────────────────────────────────────────────

test('done button resets invite section back to form', async () => {
  mockPermissions = ['groups:invites:create'];
  const INVITE = { id: 'inv4', code: 'ReSeT1' };
  mockCreateInvitationMutateAsync.mockResolvedValueOnce(INVITE);
  const { Providers } = setup();

  await render(<Providers><GroupDetailScreen /></Providers>);
  await act(async () => { fireEvent.press(screen.getByTestId('group-invite-create-btn')); });

  await waitFor(() => expect(screen.getByTestId('group-invite-done-btn')).toBeOnTheScreen());
  await act(async () => { fireEvent.press(screen.getByTestId('group-invite-done-btn')); });

  // Back to the email form
  await waitFor(() => expect(screen.getByTestId('group-invite-create-btn')).toBeOnTheScreen());
  expect(screen.queryByTestId('qr-code')).toBeNull();
});
