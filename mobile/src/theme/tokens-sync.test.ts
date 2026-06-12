// Guards against drift between the dashboard design tokens (the source of
// truth) and the generated mirrors in global.css and theme/colors.ts.
// If this fails, run `pnpm run sync:tokens`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colors } from './colors';

const mobileRoot = join(__dirname, '..', '..');

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

test('the dashboard stylesheet defines z-* tokens', () => {
  expect(Object.keys(webTokens).length).toBeGreaterThanOrEqual(14);
});

test('global.css mirrors the dashboard tokens exactly', () => {
  const appTokens = parseTokens(readFileSync(join(mobileRoot, 'global.css'), 'utf8'));
  expect(appTokens).toEqual(webTokens);
});

test('theme/colors.ts mirrors the dashboard tokens exactly', () => {
  const camelCase = (name: string) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  for (const [name, value] of Object.entries(webTokens)) {
    expect(colors[camelCase(name) as keyof typeof colors]).toBe(value);
  }
});
