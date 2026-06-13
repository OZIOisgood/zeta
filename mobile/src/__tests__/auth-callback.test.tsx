/**
 * Tests for the /auth/callback route (src/app/auth/callback.tsx).
 * The route owns the AuthKit token exchange when Expo Go reloads the project
 * on redirect, and otherwise redirects based on the auth status.
 */
import { Text as MockText } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

// RNTL v14 here ships without UNSAFE_*/type queries, and ActivityIndicator
// carries no role/testID in the source, so count host nodes off the JSON tree.
function countHostType(node: unknown, type: string): number {
  if (node == null) return 0;
  if (Array.isArray(node)) return node.reduce((n, child) => n + countHostType(child, type), 0);
  const el = node as { type?: string; children?: unknown };
  let count = el.type === type ? 1 : 0;
  if (el.children != null) count += countHostType(el.children, type);
  return count;
}
function spinnerCount(): number {
  return countHostType(screen.toJSON(), 'ActivityIndicator');
}

// ── native module mocks (before importing the route) ──────────────────────────

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// ── expo-router mock ──────────────────────────────────────────────────────────

// Mutable route params controlled per-test.
let mockCode: string | undefined;

// Redirect renders a marker so we can assert the destination href.
function MockRedirect({ href }: { href: string }) {
  return <MockText testID="redirect">{href}</MockText>;
}
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ code: mockCode }),
  Redirect: MockRedirect,
}));

// ── completeLogin mock ────────────────────────────────────────────────────────

// A controllable promise so a test can keep the exchange pending or resolve it.
const mockCompleteLogin = jest.fn(async (_code: string) => true);
jest.mock('../auth/login', () => ({
  completeLogin: (code: string) => mockCompleteLogin(code),
}));

// ── i18n + component imports (after mocks) ────────────────────────────────────

import { initI18n } from '../i18n';
import { authStore } from '../auth/auth-store';
import AuthCallback from '../app/auth/callback';

beforeAll(() => initI18n('en'));

beforeEach(() => {
  jest.clearAllMocks();
  mockCode = undefined;
  authStore.setState({ status: 'signedOut', user: null });
});

test('code present → completeLogin called and spinner shown while exchanging', async () => {
  mockCode = 'auth_code_123';
  // Keep the exchange pending so the component stays in its exchanging state.
  let resolveLogin: (value: boolean) => void = () => {};
  mockCompleteLogin.mockImplementation(
    () => new Promise<boolean>((resolve) => { resolveLogin = resolve; }),
  );
  // The status must not be signedIn, or the redirect would win over the spinner.
  authStore.setState({ status: 'loading', user: null });

  await render(<AuthCallback />);

  expect(mockCompleteLogin).toHaveBeenCalledTimes(1);
  expect(mockCompleteLogin).toHaveBeenCalledWith('auth_code_123');
  expect(spinnerCount()).toBe(1);
  expect(screen.queryByTestId('redirect')).toBeNull();

  // Settle the in-flight promise to avoid an act() warning on teardown.
  resolveLogin(true);
  await waitFor(() => expect(mockCompleteLogin).toHaveBeenCalledTimes(1));
});

test('status signedIn → redirects to "/"', async () => {
  authStore.setState({ status: 'signedIn', user: null });

  await render(<AuthCallback />);

  expect(screen.getByTestId('redirect')).toHaveTextContent('/');
  expect(mockCompleteLogin).not.toHaveBeenCalled();
});

test('no code and not loading → redirects to "/login"', async () => {
  mockCode = undefined;
  authStore.setState({ status: 'signedOut', user: null });

  await render(<AuthCallback />);

  expect(screen.getByTestId('redirect')).toHaveTextContent('/login');
  expect(mockCompleteLogin).not.toHaveBeenCalled();
});

test('unmount mid-exchange does not setState (no act warning, finally is a no-op)', async () => {
  mockCode = 'auth_code_456';
  authStore.setState({ status: 'loading', user: null });

  // Capture the resolver so the exchange resolves *after* unmount.
  let resolveLogin: (value: boolean) => void = () => {};
  mockCompleteLogin.mockImplementation(
    () => new Promise<boolean>((resolve) => { resolveLogin = resolve; }),
  );

  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  const view = await render(<AuthCallback />);
  expect(mockCompleteLogin).toHaveBeenCalledTimes(1);

  // Unmount before the exchange settles — the cleanup sets `stale = true`.
  view.unmount();

  // Now resolve: the `finally` callback must skip setExchanging on a stale flag.
  resolveLogin(true);
  await waitFor(() => expect(mockCompleteLogin).toHaveBeenCalledTimes(1));

  // A setState after unmount would log a React act/state-update warning.
  const warned = errorSpy.mock.calls.some((args) =>
    args.some((a) => typeof a === 'string' && /unmounted|not wrapped in act/i.test(a)),
  );
  expect(warned).toBe(false);
  errorSpy.mockRestore();
});
