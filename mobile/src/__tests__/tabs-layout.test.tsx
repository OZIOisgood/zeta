/**
 * Tests for the NativeTabs layout (src/app/(tabs)/_layout.tsx).
 *
 * The layout uses expo-router NativeTabs with `hidden` prop for permission-gating
 * (rather than conditional JSX). All 5 triggers are always declared; coaching and
 * groups are hidden when the user lacks the corresponding permission.
 *
 * The mock renders each NativeTabs.Trigger as a View with testID=`trigger-<name>`
 * so we can query by name and inspect the `hidden` prop via accessible attributes.
 */
import { render, screen } from '@testing-library/react-native';

// ── native module mocks ────────────────────────────────────────────────────────
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// ── expo-router/unstable-native-tabs mock ─────────────────────────────────────
//
// Render NativeTabs as a passthrough View; render each Trigger as a View with
// testID=`trigger-<name>` and data-hidden forwarded via accessibilityState so
// tests can assert which triggers are hidden.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRN = require('react-native');
jest.mock('expo-router/unstable-native-tabs', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');

  function NativeTabsRoot({ children }: { children: unknown }) {
    return mockReact.createElement(mockRN.View, null, children);
  }

  function NativeTabsTrigger({
    name,
    hidden,
  }: {
    name?: string;
    hidden?: boolean;
    children?: unknown;
  }) {
    return mockReact.createElement(mockRN.View, {
      testID: `trigger-${name}`,
      accessibilityState: { disabled: hidden === true },
    });
  }

  function TriggerLabel({ children }: { children?: string }) {
    return mockReact.createElement(mockRN.Text, null, children);
  }
  function TriggerIcon(_props: object) {
    return null;
  }

  NativeTabsTrigger.displayName = 'NativeTabs.Trigger';
  TriggerLabel.displayName = 'NativeTabs.Trigger.Label';
  TriggerIcon.displayName = 'NativeTabs.Trigger.Icon';

  const Trigger = Object.assign(NativeTabsTrigger, {
    Label: TriggerLabel,
    Icon: TriggerIcon,
  });
  NativeTabsRoot.displayName = 'NativeTabs';
  const NativeTabs = Object.assign(NativeTabsRoot, { Trigger });
  return { NativeTabs };
});

// ── auth-store mock ───────────────────────────────────────────────────────────
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

// ── helpers ───────────────────────────────────────────────────────────────────
function isHidden(testId: string): boolean {
  const el = screen.queryByTestId(testId);
  if (!el) return true; // absent counts as hidden
  return el.props.accessibilityState?.disabled === true;
}

// ── tests ─────────────────────────────────────────────────────────────────────

test('always renders Home, Videos, and Profile triggers (not hidden)', async () => {
  mockPermissions = [];
  await render(<TabsLayout />);
  expect(isHidden('trigger-index')).toBe(false);
  expect(isHidden('trigger-videos')).toBe(false);
  expect(isHidden('trigger-profile')).toBe(false);
});

test('hides Groups and Coaching triggers without the permissions', async () => {
  mockPermissions = ['assets:read'];
  await render(<TabsLayout />);
  expect(isHidden('trigger-groups')).toBe(true);
  expect(isHidden('trigger-coaching')).toBe(true);
});

test('shows the Groups trigger with groups:read', async () => {
  mockPermissions = ['groups:read'];
  await render(<TabsLayout />);
  expect(isHidden('trigger-groups')).toBe(false);
  expect(isHidden('trigger-coaching')).toBe(true);
});

test('shows the Coaching trigger with coaching:bookings:read', async () => {
  mockPermissions = ['coaching:bookings:read'];
  await render(<TabsLayout />);
  expect(isHidden('trigger-coaching')).toBe(false);
  expect(isHidden('trigger-groups')).toBe(true);
});

test('shows both gated triggers when both permissions are present', async () => {
  mockPermissions = ['groups:read', 'coaching:bookings:read'];
  await render(<TabsLayout />);
  expect(isHidden('trigger-groups')).toBe(false);
  expect(isHidden('trigger-coaching')).toBe(false);
});
