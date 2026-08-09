import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

// Mock native modules before importing the screen.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));

// Controllable AuthKit prompt. `request` is truthy so the button is enabled;
// each test sets the resolved value of `promptAsync`.
const mockPromptAsync = jest.fn();
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'zeta://auth/callback',
  ResponseType: { Code: 'code' },
  useAuthRequest: () => [
    { codeVerifier: 'verifier' },
    null,
    mockPromptAsync,
  ],
}));

// Mock the auth helper so no real token exchange happens.
const mockCompleteLogin = jest.fn(async (_code: string) => true);
jest.mock('../auth/login', () => ({
  workosDiscovery: { authorizationEndpoint: 'https://example.test/authorize' },
  workosClientId: () => 'client_test',
  stashCodeVerifier: jest.fn(async () => undefined),
  completeLogin: (code: string) => mockCompleteLogin(code),
}));

import { initI18n } from '../i18n';
import { authStore } from '../auth/auth-store';
import LoginScreen from '../app/login';

beforeAll(() => initI18n('en'));

beforeEach(() => {
  jest.clearAllMocks();
  authStore.setState({ status: 'signedOut', user: null });
});

test('renders the localized brand and tagline', async () => {
  await render(<LoginScreen />);

  expect(screen.getByText('Zeta')).toBeOnTheScreen();
  expect(screen.getByText('Video coaching')).toBeOnTheScreen();
});

test('shows a spinner and disables the button while signing in', async () => {
  const user = userEvent.setup();
  // Keep the prompt pending so the button stays in its busy state.
  let resolvePrompt: (value: { type: string; params?: { code?: string } }) => void = () => {};
  mockPromptAsync.mockImplementation(
    () => new Promise((resolve) => { resolvePrompt = resolve; }),
  );

  await render(<LoginScreen />);

  const button = screen.getByTestId('login-submit');
  await user.press(button);

  await waitFor(() => expect(screen.getByTestId('login-submit-spinner')).toBeOnTheScreen());
  expect(screen.getByTestId('login-submit')).toBeDisabled();

  // Let the in-flight promise settle so the act() warning is avoided.
  resolvePrompt({ type: 'success', params: { code: 'abc' } });
  await waitFor(() => expect(screen.queryByTestId('login-submit-spinner')).toBeNull());
});

test('shows the error when sign-in fails', async () => {
  const user = userEvent.setup();
  mockPromptAsync.mockResolvedValue({ type: 'error', params: {} });

  await render(<LoginScreen />);

  await user.press(screen.getByTestId('login-submit'));

  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed. Please try again.'),
  );
  expect(mockCompleteLogin).not.toHaveBeenCalled();
});

test('cancelling the prompt does not show the error', async () => {
  const user = userEvent.setup();
  mockPromptAsync.mockResolvedValue({ type: 'cancel' });

  await render(<LoginScreen />);

  await user.press(screen.getByTestId('login-submit'));

  // Wait for the button to leave its busy state, then assert no error surfaced.
  await waitFor(() => expect(screen.queryByTestId('login-submit-spinner')).toBeNull());
  expect(screen.queryByRole('alert')).toBeNull();
  expect(mockCompleteLogin).not.toHaveBeenCalled();
});
