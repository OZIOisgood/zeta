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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  // The real native-stack header is not mounted by RNTL, so render the
  // header-right node (the Save action) inline to keep it testable.
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => unknown } }) =>
      options?.headerRight ? options.headerRight() : null,
  },
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
import PreferencesScreen from '../app/preferences';

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

// Capture the real store method so per-test spies can be restored afterwards.
const originalUpdate = authStore.getState().updateCurrentUser;

afterEach(() => {
  jest.clearAllMocks();
  authStore.setState({ updateCurrentUser: originalUpdate });
});

test('renders a skeleton placeholder (no chrome, no loading text) while the user is loading', async () => {
  authStore.setState({ status: 'loading', user: null });
  await render(<PreferencesScreen />);

  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  expect(screen.queryByText(/loading/i)).toBeNull();
});

test('renders the editable personal-data fields and the header Save action', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser() });
  await render(<PreferencesScreen />);

  expect(screen.getByDisplayValue('Heinrich')).toBeOnTheScreen();
  expect(screen.getByDisplayValue('Mergel')).toBeOnTheScreen();
  // Email is shown read-only (used for sign-in).
  expect(screen.getByDisplayValue('h@example.test')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
});

test('saves successfully: calls the mutation and shows a success toast', async () => {
  const user = userEvent.setup();
  const updated = makeUser({ first_name: 'Heidi' });
  const updateSpy = jest.fn(async (_body: UpdateMeRequest): Promise<Me | null> => updated);
  authStore.setState({ status: 'signedIn', user: makeUser(), updateCurrentUser: updateSpy });

  await render(<PreferencesScreen />);

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

  await render(<PreferencesScreen />);

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

  await render(<PreferencesScreen />);
  // Dirty the form so Save is enabled, then submit.
  await user.type(screen.getByDisplayValue('Heinrich'), 'a');
  await user.press(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.getByText('Failed to update preferences')).toBeOnTheScreen(),
  );
  expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
});

test('hides permission-gated email rows when the user lacks the permission', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser({ permissions: [] }) });

  await render(<PreferencesScreen />);

  // Always-available row is present (settings ZSwitch, role "switch").
  expect(screen.getByRole('switch', { name: 'Group membership updates' })).toBeOnTheScreen();
  // Gated rows are absent without permissions.
  expect(screen.queryByRole('switch', { name: 'New videos uploaded to groups you own' })).toBeNull();
  expect(screen.queryByRole('switch', { name: 'Reviewed videos' })).toBeNull();
  expect(screen.queryByRole('switch', { name: 'Invitation activity' })).toBeNull();
  expect(screen.queryByRole('switch', { name: 'Coaching bookings and cancellations' })).toBeNull();
});

test('shows permission-gated email rows when the user holds the permissions', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser() });

  await render(<PreferencesScreen />);

  expect(screen.getByRole('switch', { name: 'New videos uploaded to groups you own' })).toBeOnTheScreen();
  expect(screen.getByRole('switch', { name: 'Reviewed videos' })).toBeOnTheScreen();
  expect(screen.getByRole('switch', { name: 'Invitation activity' })).toBeOnTheScreen();
  expect(screen.getByRole('switch', { name: 'Coaching bookings and cancellations' })).toBeOnTheScreen();
  expect(screen.getByRole('switch', { name: 'Coaching reminders' })).toBeOnTheScreen();
});

test('toggling an email-preference switch flips it and dirties the form', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser() });

  await render(<PreferencesScreen />);

  // The "Reviewed videos" preference starts on; the form is pristine so Save
  // is disabled. RN core Switch responds to a "valueChange" event (not a press).
  const reviewed = screen.getByRole('switch', { name: 'Reviewed videos' });
  expect(reviewed.props.accessibilityState?.checked).toBe(true);
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

  fireEvent(reviewed, 'valueChange', false);

  // Flipping the preference dirties the form and enables Save.
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
});

test('does not render the master email switch (it lives on the Profile screen)', async () => {
  authStore.setState({ status: 'signedIn', user: makeUser() });

  await render(<PreferencesScreen />);

  // The master toggle was moved to the Profile overview per the handoff; this
  // screen edits only the granular, permission-gated categories.
  expect(screen.queryByRole('switch', { name: 'All notification emails' })).toBeNull();
});
