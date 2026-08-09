/**
 * Tests for the waitlist gate (src/app/welcome.tsx) — the way out of a
 * waitlisted account. Covers both steps, the failure path (which must keep the
 * typed code), and the session refresh that flips the root-layout guard.
 */
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockRedeem = jest.fn();
jest.mock('../api/queries/access', () => ({
  useRedeemAccessMutation: () => ({ mutateAsync: mockRedeem, isPending: false }),
}));

const mockRefreshUser = jest.fn(async () => undefined);
const mockSignOut = jest.fn(async () => undefined);

jest.mock('../auth/auth-store', () => ({
  useAuth: (sel: (s: unknown) => unknown) => sel({ user: { email: 'new@example.test' } }),
  authStore: {
    getState: () => ({ refreshUser: mockRefreshUser, signOut: mockSignOut }),
  },
  api: {},
}));

jest.mock('../components/ui/z-toast', () => ({ showToast: jest.fn() }));

import { initI18n } from '../i18n';
import WelcomeScreen from '../app/welcome';
import { showToast } from '../components/ui/z-toast';

beforeAll(() => initI18n('en'));
afterEach(() => cleanup());
beforeEach(() => {
  jest.clearAllMocks();
  mockRedeem.mockResolvedValue({ access_status: 'active', role: 'student', role_upgraded: false });
});

async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

// The code field is controlled — without act() the state update is not committed
// before the next press, and the handler reads a stale (empty) value.
async function type(testID: string, value: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), value);
  });
}

async function goToCodeStep() {
  await render(<WelcomeScreen />);
  await press('welcome-enter-code');
  await waitFor(() => expect(screen.getByTestId('welcome-code-input')).toBeOnTheScreen());
}

test('starts on the waitlist step with a way to sign out', async () => {
  await render(<WelcomeScreen />);

  // i18n: access.welcome.waitlistTitle
  expect(screen.getByText("You're on the waitlist.")).toBeOnTheScreen();
  expect(screen.getByTestId('welcome-sign-out')).toBeOnTheScreen();
  expect(screen.queryByTestId('welcome-code-input')).toBeNull();
});

test('sign out is wired to the auth store', async () => {
  await render(<WelcomeScreen />);
  await press('welcome-sign-out');
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

test('entering a code activates the account and refreshes the session', async () => {
  await goToCodeStep();

  await type('welcome-code-input','EXPERT01');
  await press('welcome-activate');

  await waitFor(() => expect(mockRedeem).toHaveBeenCalledWith('EXPERT01'));
  // The guard in _layout gates on access_status, so the profile must be re-read.
  await waitFor(() => expect(mockRefreshUser).toHaveBeenCalledTimes(1));
  expect(showToast).toHaveBeenCalled();
});

test('an empty code is rejected without calling the API', async () => {
  await goToCodeStep();

  await press('welcome-activate');

  // i18n: access.welcome.errorIncomplete
  await waitFor(() => expect(screen.getByText('Please enter your full code.')).toBeOnTheScreen());
  expect(mockRedeem).not.toHaveBeenCalled();
});

test('a rejected code shows the error and keeps the typed value', async () => {
  mockRedeem.mockRejectedValue(new Error('nope'));
  await goToCodeStep();

  await type('welcome-code-input','BADCODE1');
  await press('welcome-activate');

  // i18n: access.welcome.errorInvalid
  await waitFor(() =>
    expect(
      screen.getByText('This code is invalid, unavailable, or has already been used.'),
    ).toBeOnTheScreen(),
  );
  expect(screen.getByTestId('welcome-code-input').props.value).toBe('BADCODE1');
  expect(mockRefreshUser).not.toHaveBeenCalled();
});

test('typing again clears the previous error', async () => {
  mockRedeem.mockRejectedValue(new Error('nope'));
  await goToCodeStep();

  await type('welcome-code-input','BADCODE1');
  await press('welcome-activate');
  await waitFor(() =>
    expect(
      screen.getByText('This code is invalid, unavailable, or has already been used.'),
    ).toBeOnTheScreen(),
  );

  await type('welcome-code-input','BADCODE2');

  expect(
    screen.queryByText('This code is invalid, unavailable, or has already been used.'),
  ).toBeNull();
});
