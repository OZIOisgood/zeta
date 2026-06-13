/**
 * Tests for the tabs layout (src/app/(tabs)/_layout.tsx).
 * Asserts permission-gating of Groups and Coaching tabs and that
 * Home, Videos, and Profile are always rendered.
 */
import { render, screen } from '@testing-library/react-native';

// ── native module mocks (before importing the layout) ─────────────────────────

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// ── expo-router mock ──────────────────────────────────────────────────────────

// Render each <Tabs.Screen> as a testID-tagged View so we can assert
// presence/absence by route name. Tabs itself is a passthrough View.
// All identifiers are prefixed with 'mock' so jest's factory-scope rules allow them.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRN = require('react-native');
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  function mockTabsRoot({ children }: { children: unknown }) {
    return mockReact.createElement(mockRN.View, null, children);
  }
  function mockTabsScreen({ name }: { name: string }) {
    return mockReact.createElement(mockRN.View, { testID: `tab-${name}` });
  }
  mockTabsRoot.displayName = 'Tabs';
  mockTabsScreen.displayName = 'Tabs.Screen';
  const mockTabs = Object.assign(mockTabsRoot, { Screen: mockTabsScreen });
  return { Tabs: mockTabs };
});

// ── auth-store mock ───────────────────────────────────────────────────────────

// Drive permissions through useAuth, matching the screen-test idiom. Spread the
// real module first so the mock stays robust if _layout imports anything else
// from auth-store later.
let mockPermissions: string[] | null = [];
jest.mock('../auth/auth-store', () => ({
  ...jest.requireActual('../auth/auth-store'),
  useAuth: (selector: (s: { user: { permissions: string[] } | null }) => unknown) =>
    selector({ user: mockPermissions !== null ? { permissions: mockPermissions } : null }),
}));

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { initI18n } from '../i18n';
import TabsLayout from '../app/(tabs)/_layout';

beforeAll(() => initI18n('en'));
beforeEach(() => {
  mockPermissions = [];
});

// ── tests ─────────────────────────────────────────────────────────────────────

test('always renders Home, Videos, and Profile tabs', async () => {
  mockPermissions = [];
  await render(<TabsLayout />);
  expect(screen.getByTestId('tab-index')).toBeOnTheScreen();
  expect(screen.getByTestId('tab-videos')).toBeOnTheScreen();
  expect(screen.getByTestId('tab-profile')).toBeOnTheScreen();
});

test('hides Groups and Coaching tabs without the permissions', async () => {
  mockPermissions = ['assets:read'];
  await render(<TabsLayout />);
  expect(screen.queryByTestId('tab-groups')).toBeNull();
  expect(screen.queryByTestId('tab-coaching')).toBeNull();
});

test('shows the Groups tab with groups:read', async () => {
  mockPermissions = ['groups:read'];
  await render(<TabsLayout />);
  expect(screen.getByTestId('tab-groups')).toBeOnTheScreen();
  expect(screen.queryByTestId('tab-coaching')).toBeNull();
});

test('shows the Coaching tab with coaching:bookings:read', async () => {
  mockPermissions = ['coaching:bookings:read'];
  await render(<TabsLayout />);
  expect(screen.getByTestId('tab-coaching')).toBeOnTheScreen();
  expect(screen.queryByTestId('tab-groups')).toBeNull();
});

test('shows both gated tabs when both permissions are present', async () => {
  mockPermissions = ['groups:read', 'coaching:bookings:read'];
  await render(<TabsLayout />);
  expect(screen.getByTestId('tab-groups')).toBeOnTheScreen();
  expect(screen.getByTestId('tab-coaching')).toBeOnTheScreen();
});
