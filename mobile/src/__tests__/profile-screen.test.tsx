import React from 'react';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

// ── native module mocks (before importing the screen) ─────────────────────────

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// expo-router: capture push so navigation from the grouped rows can be asserted,
// and setOptions so the header-right notification bell wiring can be asserted.
const mockPush = jest.fn();
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
  Stack: { Screen: () => null },
}));

// The notification bell (header-right on every tab screen) reads the unread
// count from this query; default to zero unread so the badge stays hidden.
const mockUseNotificationsQuery = jest.fn(() => ({ data: { unread_count: 0 } }));
jest.mock('../api/queries/notifications', () => ({
  ...jest.requireActual('../api/queries/notifications'),
  useNotificationsQuery: () => mockUseNotificationsQuery(),
}));

// Spy on the imperative toast API; the host is mounted at the app root, not here.
const mockShowToast = jest.fn();
jest.mock('../components/ui/z-toast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

// ── i18n + component imports (after mocks) ────────────────────────────────────

import { initI18n } from '../i18n';
import { authStore } from '../auth/auth-store';
import type { Me, UpdateMeRequest } from '../auth/auth-store';
import ProfileScreen from '../app/(tabs)/profile/index';

beforeAll(() => initI18n('en'));

const ALL_PERMISSIONS = [
  'groups:create',
  'assets:create',
  'groups:invites:create',
  'coaching:bookings:read',
  'reports:read',
  'coaching:availability:manage',
];

function makeUser(overrides: Partial<Me> = {}): Me {
  return {
    id: 'user_1',
    first_name: 'Heinrich',
    last_name: 'Mergel',
    email: 'h@example.test',
    language: 'en',
    avatar: '',
    timezone: 'Europe/Berlin',
    role: 'student',
    permissions: [...ALL_PERMISSIONS],
    email_preferences: {
      notifications_enabled: true,
      asset_uploads_enabled: true,
      asset_reviews_enabled: true,
      invitation_updates_enabled: true,
      group_membership_updates_enabled: true,
      coaching_booking_updates_enabled: true,
      coaching_reminders_enabled: true,
    },
    push_preferences: {
      notifications_enabled: true,
      asset_uploads_enabled: true,
      asset_reviews_enabled: true,
      invitation_updates_enabled: true,
      group_membership_updates_enabled: true,
      coaching_booking_updates_enabled: true,
    },
    ...overrides,
  };
}

// Capture the real store methods so per-test spies can be restored afterwards.
const originalUpdate = authStore.getState().updateCurrentUser;
const originalSignOut = authStore.getState().signOut;

afterEach(() => {
  jest.clearAllMocks();
  authStore.setState({ updateCurrentUser: originalUpdate, signOut: originalSignOut });
});

test('renders a skeleton placeholder (no chrome, no loading text) while the user is loading', async () => {
  authStore.setState({ status: 'loading', user: null });
  await render(<ProfileScreen />);

  // No header copy, no sign-out chrome, and no visible loading text.
  expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  expect(screen.queryByText(/loading/i)).toBeNull();
});

test('renders the hero header with the user name', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser() });
  await render(<ProfileScreen />);

  expect(screen.getByText('Heinrich Mergel')).toBeOnTheScreen();
});

test('renders the grouped navigation rows and the sign-out button', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser() });
  await render(<ProfileScreen />);

  // Persönliche Daten (push to Preferences) — pressable row → button role.
  expect(screen.getByRole('button', { name: 'Personal data' })).toBeOnTheScreen();
  // Berichte (gated by reports:read).
  expect(screen.getByRole('button', { name: 'Open report' })).toBeOnTheScreen();
  // Verfügbarkeit verwalten (gated by coaching:availability:manage).
  expect(screen.getByRole('button', { name: 'Availability' })).toBeOnTheScreen();
  // E-Mail-Benachrichtigungen master switch.
  expect(screen.getByRole('switch', { name: 'Email notifications' })).toBeOnTheScreen();
  // Sign out.
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeOnTheScreen();
});

test('pressing "Personal data" pushes the Preferences screen', async () => {
  const user = userEvent.setup();
  authStore.setState({ status: 'signedIn', user: makeUser() });
  await render(<ProfileScreen />);

  await user.press(screen.getByRole('button', { name: 'Personal data' }));
  expect(mockPush).toHaveBeenCalledWith('/preferences');
});

test('pressing "Open report" pushes the reports screen', async () => {
  const user = userEvent.setup();
  authStore.setState({ status: 'signedIn', user: makeUser() });
  await render(<ProfileScreen />);

  await user.press(screen.getByRole('button', { name: 'Open report' }));
  expect(mockPush).toHaveBeenCalledWith('/reports');
});

test('pressing "Availability" pushes the availability screen', async () => {
  const user = userEvent.setup();
  authStore.setState({ status: 'signedIn', user: makeUser() });
  await render(<ProfileScreen />);

  await user.press(screen.getByRole('button', { name: 'Availability' }));
  expect(mockPush).toHaveBeenCalledWith('/availability');
});

test('hides the reports row without the reports:read permission', async () => {
  authStore.setState({
    status: 'signedIn',
    user: makeUser({ permissions: ['coaching:availability:manage'] }),
  });
  await render(<ProfileScreen />);

  expect(screen.queryByRole('button', { name: 'Open report' })).toBeNull();
  // Availability stays (its permission is present).
  expect(screen.getByRole('button', { name: 'Availability' })).toBeOnTheScreen();
});

test('hides the availability row without the coaching:availability:manage permission', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser({ permissions: ['reports:read'] }) });
  await render(<ProfileScreen />);

  expect(screen.queryByRole('button', { name: 'Availability' })).toBeNull();
  // Reports stays (its permission is present).
  expect(screen.getByRole('button', { name: 'Open report' })).toBeOnTheScreen();
});

test('the master email switch reflects the user state and persists when toggled', async () => {
  const updated = makeUser({
    email_preferences: { ...makeUser().email_preferences, notifications_enabled: false },
  });
  const updateSpy = jest.fn(async (_body: UpdateMeRequest): Promise<Me | null> => updated);
  authStore.setState({ status: 'signedIn', user: makeUser(), updateCurrentUser: updateSpy });

  await render(<ProfileScreen />);

  const master = screen.getByRole('switch', { name: 'Email notifications' });
  expect(master.props.accessibilityState?.checked).toBe(true);

  // Toggling the master switch persists immediately (fire-and-forget mutation).
  // Wrapped in act so the trailing state updates after the awaited mutation
  // settle inside React's act scope.
  await act(async () => {
    fireEvent(master, 'valueChange', false);
  });

  await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
  expect(updateSpy.mock.calls[0][0]).toMatchObject({
    email_preferences: expect.objectContaining({ notifications_enabled: false }),
  });
  await waitFor(() =>
    expect(mockShowToast).toHaveBeenCalledWith(
      'Success',
      'Preferences updated successfully',
      'success',
    ),
  );
});

test('wires the notification bell into the header-right and navigates to /notifications', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser() });
  await render(<ProfileScreen />);

  // headerRight is registered via setOptions with a render function (the bell).
  expect(mockSetOptions).toHaveBeenCalledWith(
    expect.objectContaining({ headerRight: expect.any(Function) }),
  );

  const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
  const HeaderRight = lastCall.headerRight as React.ComponentType;
  await render(<HeaderRight />);

  const bell = screen.getByTestId('notification-bell');
  expect(bell).toBeOnTheScreen();
  fireEvent.press(bell);
  expect(mockPush).toHaveBeenCalledWith('/notifications');
});

test('signs out via the auth store', async () => {
  const user = userEvent.setup();
  const signOut = jest.fn(async () => undefined);
  authStore.setState({ status: 'signedIn', user: makeUser(), signOut });

  await render(<ProfileScreen />);
  await user.press(screen.getByRole('button', { name: 'Sign out' }));

  expect(signOut).toHaveBeenCalledTimes(1);
});
