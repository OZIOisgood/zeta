/**
 * Tests for the root layout (src/app/_layout.tsx).
 * The layout shows a spinner while the session restores, then renders the
 * navigation stack with two Stack.Protected groups gated on the auth status:
 * the protected app stack for signedIn, the login screen for everything else.
 */
import { Text as MockText } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// RNTL v14 here ships without UNSAFE_*/type queries, and the loading spinner
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

// ── native module mocks (before importing the layout) ─────────────────────────

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// global.css is a side-effect import the layout pulls in; stub it out.
jest.mock('../../global.css', () => ({}), { virtual: true });

// Keep i18n init a no-op so the layout module's `void initI18n()` does nothing.
jest.mock('../i18n', () => ({ initI18n: jest.fn(async () => undefined) }));

// The toast host is mounted at the root; render a marker instead of the real one.
jest.mock('../components/ui/z-toast', () => {
  function ZToastHost() {
    return <MockText testID="toast-host">toast</MockText>;
  }
  return { ZToastHost };
});

// QueryClientProvider just needs to render its children for these tests.
jest.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../api/query-client', () => ({ queryClient: {} }));

// ── auth-store mock ───────────────────────────────────────────────────────────

// Mutable status controlled per-test; useAuth runs the selector against it.
let mockStatus: 'loading' | 'signedOut' | 'signedIn' = 'loading';
const mockRestore = jest.fn(async () => undefined);

jest.mock('../auth/auth-store', () => ({
  authStore: { getState: () => ({ restore: mockRestore }) },
  useAuth: (selector: (s: { status: string }) => unknown) => selector({ status: mockStatus }),
}));

// ── expo-router mock ──────────────────────────────────────────────────────────

// Stack renders its children; Stack.Protected renders its children only when the
// guard is truthy (mirrors the runtime gate); Stack.Screen renders a marker
// labelled with its route name so we can assert which group exposes which route.
jest.mock('expo-router', () => {
  function Stack({ children }: { children: React.ReactNode }) {
    return children;
  }
  function StackProtected({ guard, children }: { guard: boolean; children: React.ReactNode }) {
    return guard ? children : null;
  }
  function StackScreen({ name }: { name: string }) {
    return <MockText testID={`screen-${name}`}>{name}</MockText>;
  }
  Stack.Protected = StackProtected;
  Stack.Screen = StackScreen;
  return { Stack };
});

// ── component import (after mocks) ────────────────────────────────────────────

import RootLayout from '../app/_layout';

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'loading';
});

test('loading status → spinner, no navigation screens, restore kicked off', async () => {
  mockStatus = 'loading';

  await render(<RootLayout />);

  expect(spinnerCount()).toBe(1);
  expect(screen.queryByTestId('screen-(tabs)')).toBeNull();
  expect(screen.queryByTestId('screen-login')).toBeNull();
  // The toast host renders regardless of the auth branch.
  expect(screen.getByTestId('toast-host')).toBeOnTheScreen();
  // The effect restores the persisted session exactly once.
  expect(mockRestore).toHaveBeenCalledTimes(1);
});

test('signedIn status → protected app stack is gated in, login is gated out', async () => {
  mockStatus = 'signedIn';

  await render(<RootLayout />);

  expect(screen.getByTestId('screen-(tabs)')).toBeOnTheScreen();
  expect(screen.getByTestId('screen-asset/[id]')).toBeOnTheScreen();
  expect(screen.getByTestId('screen-call/[bookingId]')).toBeOnTheScreen();
  // The login screen lives in the !signedIn group, so it must be gated out.
  expect(screen.queryByTestId('screen-login')).toBeNull();
});

test('signedOut status → login is gated in, protected stack is gated out', async () => {
  mockStatus = 'signedOut';

  await render(<RootLayout />);

  expect(screen.getByTestId('screen-login')).toBeOnTheScreen();
  expect(screen.queryByTestId('screen-(tabs)')).toBeNull();
  expect(screen.queryByTestId('screen-call/[bookingId]')).toBeNull();
});
