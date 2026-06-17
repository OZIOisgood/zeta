import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

// ── native module mocks (before importing the screen) ─────────────────────────

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

const mockLaunch = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunch(...args),
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

  // No header copy, no save/sign-out chrome, and no visible loading text.
  expect(screen.queryByText('Preferences')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  expect(screen.queryByText(/loading/i)).toBeNull();
});

test('renders the editable personal-data fields for the signed-in user', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser() });
  await render(<ProfileScreen />);

  expect(screen.getByText('Preferences')).toBeOnTheScreen();
  // Role renders as a localized badge label, not the raw enum.
  expect(screen.getByText('Student')).toBeOnTheScreen();
  expect(screen.getByDisplayValue('Heinrich')).toBeOnTheScreen();
  expect(screen.getByDisplayValue('Mergel')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeOnTheScreen();
});

test('saves successfully: calls the mutation and shows a success toast', async () => {
  const user = userEvent.setup();
  const updated = makeUser({ first_name: 'Heidi' });
  const updateSpy = jest.fn(async (_body: UpdateMeRequest): Promise<Me | null> => updated);
  authStore.setState({ status: 'signedIn', user: makeUser(), updateCurrentUser: updateSpy });

  await render(<ProfileScreen />);

  const firstName = screen.getByDisplayValue('Heinrich');
  await user.clear(firstName);
  await user.type(firstName, 'Heidi');

  await user.press(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
  expect(updateSpy.mock.calls[0][0]).toMatchObject({
    first_name: 'Heidi',
    last_name: 'Mergel',
    language: 'en',
    timezone: 'Europe/Berlin',
  });
  // Success toast is raised via the imperative API.
  await waitFor(() =>
    expect(mockShowToast).toHaveBeenCalledWith(
      'Success',
      'Preferences updated successfully',
      'success',
    ),
  );
});

test('disables Save while the form is pristine and enables it once a field changes', async () => {
  const user = userEvent.setup();
  const updateSpy = jest.fn(async (_body: UpdateMeRequest): Promise<Me | null> => makeUser());
  authStore.setState({ status: 'signedIn', user: makeUser(), updateCurrentUser: updateSpy });

  await render(<ProfileScreen />);

  // Pristine: Save is disabled and pressing it is a no-op.
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(updateSpy).not.toHaveBeenCalled();

  // Editing a field makes the form dirty and enables Save.
  const firstName = screen.getByDisplayValue('Heinrich');
  await user.type(firstName, 'a');
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
});

test('shows an alert message when the mutation fails', async () => {
  const user = userEvent.setup();
  const updateSpy = jest.fn(async (_body: UpdateMeRequest): Promise<Me | null> => null);
  authStore.setState({ status: 'signedIn', user: makeUser(), updateCurrentUser: updateSpy });

  await render(<ProfileScreen />);
  // Dirty the form so Save is enabled, then submit.
  await user.type(screen.getByDisplayValue('Heinrich'), 'a');
  await user.press(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
  // The failure surfaces as an alert-role save-error message.
  await waitFor(() =>
    expect(screen.getByText('Failed to update preferences')).toBeOnTheScreen(),
  );
  // Button stays available (not busy) after a failure.
  expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
});

test('signs out via the auth store', async () => {
  const user = userEvent.setup();
  const signOut = jest.fn(async () => undefined);
  authStore.setState({ status: 'signedIn', user: makeUser(), signOut });

  await render(<ProfileScreen />);
  await user.press(screen.getByRole('button', { name: 'Sign out' }));

  expect(signOut).toHaveBeenCalledTimes(1);
});

test('hides permission-gated email rows when the user lacks the permission', async () => {
  const user = userEvent.setup();
  authStore.setState({ status: 'signedIn', user: makeUser({ permissions: [] }) });

  await render(<ProfileScreen />);
  // Switch to the email-preferences tab.
  await user.press(screen.getByRole('tab', { name: 'Email preferences' }));

  // Always-available row is present (now a settings ZSwitch, role "switch").
  expect(screen.getByRole('switch', { name: 'Group membership updates' })).toBeOnTheScreen();
  // Gated rows are absent without permissions.
  expect(screen.queryByRole('switch', { name: 'New videos uploaded to groups you own' })).toBeNull();
  expect(screen.queryByRole('switch', { name: 'Reviewed videos' })).toBeNull();
  expect(screen.queryByRole('switch', { name: 'Invitation activity' })).toBeNull();
  expect(screen.queryByRole('switch', { name: 'Coaching bookings and cancellations' })).toBeNull();
});

test('shows permission-gated email rows when the user holds the permissions', async () => {
  const user = userEvent.setup();
  authStore.setState({ status: 'signedIn', user: makeUser() });

  await render(<ProfileScreen />);
  await user.press(screen.getByRole('tab', { name: 'Email preferences' }));

  expect(screen.getByRole('switch', { name: 'New videos uploaded to groups you own' })).toBeOnTheScreen();
  expect(screen.getByRole('switch', { name: 'Reviewed videos' })).toBeOnTheScreen();
  expect(screen.getByRole('switch', { name: 'Invitation activity' })).toBeOnTheScreen();
  expect(screen.getByRole('switch', { name: 'Coaching bookings and cancellations' })).toBeOnTheScreen();
  expect(screen.getByRole('switch', { name: 'Coaching reminders' })).toBeOnTheScreen();
});

test('toggling an email-preference switch flips it and dirties the form', async () => {
  const user = userEvent.setup();
  authStore.setState({ status: 'signedIn', user: makeUser() });

  await render(<ProfileScreen />);
  await user.press(screen.getByRole('tab', { name: 'Email preferences' }));

  // The "Reviewed videos" preference starts on; the form is pristine so Save
  // is disabled. RN core Switch responds to a "valueChange" event (not a
  // press), so we drive it the canonical RNTL way for a switch.
  const reviewed = screen.getByRole('switch', { name: 'Reviewed videos' });
  expect(reviewed.props.accessibilityState?.checked).toBe(true);
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

  fireEvent(reviewed, 'valueChange', false);

  // Flipping the preference updates form state, which dirties the form and
  // enables Save — the observable proof the preference still flips via the
  // switch (the same assertion semantics the checkbox row carried).
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
});
