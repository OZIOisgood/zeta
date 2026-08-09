// Guards against drift between the dashboard design tokens and the generated
// mobile mirrors in global.css and theme/colors.ts.
//
// Mobile intentionally DIVERGES from the flat web tokens: it adopts the
// Material-3 tonal "ember orange" palette from the design handoff. The
// generator (scripts/sync-tokens.mjs) applies a `MOBILE_LIGHT` override map on
// top of the web token names, so the mobile mirrors equal the web tokens with
// those Material overrides applied. This test re-derives that expectation, so
// it still catches accidental hand-edits and web-side token additions that
// weren't regenerated. If it fails, run `pnpm run sync:tokens`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colors } from './colors';

const mobileRoot = join(__dirname, '..', '..');

const camelCase = (name: string) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

// Keep in sync with MOBILE_LIGHT in scripts/sync-tokens.mjs. Keys are camelCase
// (as exported from colors.ts); values are the Material tonal palette. This IS
// the deliberate token-divergence definition for the drift guard, so the raw
// hex here is intentional (mirrors the generator's override map).
/* eslint-disable no-restricted-syntax */
const MOBILE_LIGHT: Record<string, string> = {
  bg: '#fff8f4',
  surface: '#fdf1ea',
  surfaceWarm: '#faece2',
  surfaceMuted: '#f5e6db',
  text: '#221a15',
  muted: '#54443b',
  border: '#d8c3b6',
  primary: '#bd4309',
  primaryStrong: '#bd4309',
  primarySoft: '#ffdbc8',
  success: '#15803d',
  successSoft: '#c7f1d2',
};
/* eslint-enable no-restricted-syntax */

function parseTokens(css: string): Record<string, string> {
  const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
  return Object.fromEntries(
    [...root.matchAll(/--z-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map((m) => [
      m[1],
      m[2].toLowerCase(),
    ]),
  );
}

const webTokens = parseTokens(
  readFileSync(join(mobileRoot, '..', 'web', 'dashboard-next', 'src', 'styles.scss'), 'utf8'),
);

// The web tokens with the mobile Material overrides applied — what the mobile
// mirrors should contain.
const mobileTokens = Object.fromEntries(
  Object.entries(webTokens).map(([name, value]) => [name, MOBILE_LIGHT[camelCase(name)] ?? value]),
);

test('the dashboard stylesheet defines z-* tokens', () => {
  expect(Object.keys(webTokens).length).toBeGreaterThanOrEqual(14);
});

test('global.css mirrors the dashboard tokens with the mobile Material overrides', () => {
  const appTokens = parseTokens(readFileSync(join(mobileRoot, 'global.css'), 'utf8'));
  expect(appTokens).toEqual(mobileTokens);
});

test('theme/colors.ts mirrors the dashboard tokens with the mobile Material overrides', () => {
  for (const [name, value] of Object.entries(mobileTokens)) {
    expect(colors[camelCase(name) as keyof typeof colors]).toBe(value);
  }
});
