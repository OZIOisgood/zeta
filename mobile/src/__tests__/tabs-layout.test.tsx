/**
 * Tests for the tabs layout (src/app/(tabs)/_layout.tsx).
 * Each tab's `title` option comes from t(), so this asserts the five titles
 * resolve to non-empty translated strings (not the raw i18n keys).
 */
import { render } from '@testing-library/react-native';

// ── native module mocks (before importing the layout) ─────────────────────────

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

// ── expo-router mock ──────────────────────────────────────────────────────────

// Capture each Tabs.Screen's options so the test can read the resolved titles.
const capturedScreens: Record<string, { title?: string }> = {};

jest.mock('expo-router', () => {
  function Tabs({ children }: { children: React.ReactNode }) {
    return children;
  }
  function TabsScreen({ name, options }: { name: string; options?: { title?: string } }) {
    capturedScreens[name] = options ?? {};
    return null;
  }
  Tabs.Screen = TabsScreen;
  return { Tabs };
});

// ── i18n + component imports (after mocks) ────────────────────────────────────

import i18next from 'i18next';
import { initI18n } from '../i18n';
import TabsLayout from '../app/(tabs)/_layout';

beforeAll(() => initI18n('en'));

beforeEach(() => {
  for (const key of Object.keys(capturedScreens)) delete capturedScreens[key];
});

// Each tab maps a route name to the i18n key its title is derived from.
const TAB_TITLE_KEYS: Record<string, string> = {
  index: 'common.nav.home',
  videos: 'common.nav.videos',
  coaching: 'common.nav.sessions',
  groups: 'common.nav.groups',
  profile: 'preferences.title',
};

test('renders all five tabs', async () => {
  await render(<TabsLayout />);

  expect(Object.keys(capturedScreens).sort()).toEqual(
    ['coaching', 'groups', 'index', 'profile', 'videos'],
  );
});

test('each tab title resolves to a non-empty translated string', async () => {
  await render(<TabsLayout />);

  for (const [name, key] of Object.entries(TAB_TITLE_KEYS)) {
    const title = capturedScreens[name]?.title;
    expect(typeof title).toBe('string');
    expect(title?.length ?? 0).toBeGreaterThan(0);
    // A resolved translation differs from the raw key and matches i18next.
    expect(title).not.toBe(key);
    expect(title).toBe(i18next.t(key));
  }
});
