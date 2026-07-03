// Generates the Zeta color tokens for the app from the dashboard stylesheet.
// The dashboard owns the design tokens; run `pnpm run sync:tokens` after
// changing them. Rewrites the marked block in global.css and the whole
// src/theme/colors.ts and src/theme/roles.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, '..', '..', 'web', 'dashboard-next', 'src', 'styles.scss');
const cssPath = join(here, '..', 'global.css');
const colorsPath = join(here, '..', 'src', 'theme', 'colors.ts');
const rolesPath = join(here, '..', 'src', 'theme', 'roles.ts');

// Mobile-only tokens with no dashboard counterpart. Keys are camelCase as
// exported from colors.ts.
const MOBILE_EXTRAS = {
  onPrimary: {
    value: '#ffffff',
    comment: 'Mobile-only: icon/text on primary-colored surfaces (e.g. the FAB).',
  },
};

function extractTokens(scss) {
  const root = scss.match(/:root\s*\{([^}]*)\}/);
  if (!root) throw new Error('no :root block found in the dashboard stylesheet');
  const tokens = [...root[1].matchAll(/--z-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(
    ([, name, value]) => [name, value.toLowerCase()],
  );
  if (tokens.length === 0) throw new Error('no --z-* tokens found in the dashboard stylesheet');
  return tokens;
}

const camelCase = (name) => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const tokens = extractTokens(readFileSync(sourcePath, 'utf8'));

// Build a lookup map for easy role derivation.
const t = Object.fromEntries(tokens.map(([name, value]) => [camelCase(name), value]));

// ── Mobile Material-3 tonal palette (design-handoff "ember orange") ──────────
// Mobile diverges from the flat web tokens to the Material-You tonal scheme
// (darker tonal primary + warm-tinted surfaces). Web styles.scss is untouched.
// Values from handoffs/design_handoff_home_videos/design-references/material-themes.js
// (orange-light). Override the raw web token values for mobile so both the
// --z-* CSS vars (global.css) and colors.ts carry the Material values.
const MOBILE_LIGHT = {
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
const tokensM = tokens.map(([name, value]) => [name, MOBILE_LIGHT[camelCase(name)] ?? value]);

// Dark values for the legacy flat --z-* tokens. Without these the --z-* vars are
// emitted only in :root (light) and DO NOT adapt to dark mode — so any screen
// still using a legacy class (text-z-text / bg-z-surface / border-z-border …)
// renders its light value on a dark canvas (near-black text on a dark card).
// These mirror the role dark values 1:1 (e.g. --z-surface == --role-surface in
// both schemes), so legacy and role classes stay visually identical until the
// remaining screens are migrated off the legacy vocabulary.
const MOBILE_DARK = {
  bg: '#18120d',
  surface: '#1f160f',
  surfaceWarm: '#261c14',
  surfaceMuted: '#31271d',
  text: '#f2dfd2',
  muted: '#d8c3b6',
  border: '#54443b',
  primary: '#ffb68f',
  primaryStrong: '#ffb68f',
  primarySoft: '#7c3500',
  accent: '#fbbf24',
  success: '#7fd99a',
  successSoft: '#1f4a30',
  warning: '#fbbf24',
  warningSoft: '#3b1500',
  danger: '#fb7185',
  dangerSoft: '#500724',
};
const tokensDark = tokens.map(([name, value]) => [
  name,
  MOBILE_DARK[camelCase(name)] ?? MOBILE_LIGHT[camelCase(name)] ?? value,
]);

// ─── Role maps ───────────────────────────────────────────────────────────────
//
// LIGHT roles are derived 1-to-1 from the flat web tokens. The mapping is
// intentionally verbose so it reads as a clear contract:
//   accent*      → brand primary (orange)
//   success/warning/danger → semantic status colors; *Container = soft tints
//   background   → root canvas; surface = card/sheet; surfaceVariant = warm tint
//   onSurface*   → text hierarchy
//   outline      → border/divider
//
// DARK derivation rationale:
//   The Zeta brand is warm orange on a light cream canvas. Dark mode mirrors the
//   handoff Material orange-dark scheme (material-themes.js -> orange-dark): warm
//   near-black surfaces (#18120d bg/surface, #1f160f s1 ... #3c3026 s4) preserve
//   the brand warmth without eye strain. Per Material You the primary FLIPS in
//   dark: accent is the lightened tone (#ffb68f, M3 --m-primary) and on-accent is
//   the deep brown (#522300, --m-on-primary) -- white-on-accent would fail
//   contrast against the light dark-mode accent. accent and accentStrong share
//   #ffb68f in dark (both fill high-emphasis primary surfaces: buttons, FAB,
//   icon-buttons). Status colors are lightened one step to keep >=4.5:1 on dark
//   surfaces; onSurface is warm-white (#f2dfd2); container tones are the handoff
//   dark-tinted tones.

const LIGHT_ROLES = {
  accent: '#bd4309',
  onAccent: '#ffffff',
  accentContainer: '#ffdbc8',
  onAccentContainer: '#3a1400',
  accentStrong: '#bd4309',
  secondaryContainer: '#ffdcc4',
  onSecondaryContainer: '#5a3214',

  success: '#15803d',
  onSuccess: '#ffffff',
  successContainer: '#c7f1d2',
  onSuccessContainer: '#05351a',

  warning: t.warning,
  onWarning: '#ffffff',
  warningContainer: t.warningSoft,
  onWarningContainer: t.warning,

  danger: t.danger,
  onDanger: '#ffffff',
  dangerContainer: t.dangerSoft,
  onDangerContainer: t.danger,

  background: '#fff8f4',
  surface: '#fdf1ea',
  surfaceVariant: '#faece2',
  surface1: '#fdf1ea',
  surface2: '#faece2',
  surface3: '#f5e6db',
  surface4: '#efe0d4',

  onSurface: '#221a15',
  onSurfaceVariant: '#54443b',

  outline: '#d8c3b6',
  outlineStrong: '#897668',
};

const DARK_ROLES = {
  accent: '#ffb68f',
  onAccent: '#522300',
  accentContainer: '#7c3500',
  onAccentContainer: '#ffdbc8',
  accentStrong: '#ffb68f',
  secondaryContainer: '#5d4030',
  onSecondaryContainer: '#ffdcc4',

  success: '#7fd99a',
  onSuccess: '#052e16',
  successContainer: '#1f4a30',
  onSuccessContainer: '#c7f1d2',

  warning: '#fbbf24',
  onWarning: '#451a03',
  warningContainer: '#3b1500',
  onWarningContainer: '#fde68a',

  danger: '#fb7185',
  onDanger: '#4c0519',
  dangerContainer: '#500724',
  onDangerContainer: '#fda4af',

  background: '#18120d',
  surface: '#1f160f',
  surfaceVariant: '#261c14',
  surface1: '#1f160f',
  surface2: '#261c14',
  surface3: '#31271d',
  surface4: '#3c3026',

  onSurface: '#f2dfd2',
  onSurfaceVariant: '#d8c3b6',

  outline: '#54443b',
  outlineStrong: '#a18d80',
};

// ─── global.css: replace the marker-delimited token block ────────────────────
const BEGIN = '/* BEGIN GENERATED TOKENS (scripts/sync-tokens.mjs — do not edit by hand) */';
const END = '/* END GENERATED TOKENS */';
const css = readFileSync(cssPath, 'utf8');
const begin = css.indexOf(BEGIN);
const end = css.indexOf(END);
if (begin === -1 || end === -1 || end < begin) {
  throw new Error('global.css is missing the BEGIN/END GENERATED TOKENS markers');
}

// Build the role CSS vars for light (:root) and dark (prefers-color-scheme).
const kebab = (key) =>
  key.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`).replace(/([a-z])(\d)/g, '$1-$2');
const lightRoleLines = Object.entries(LIGHT_ROLES).map(
  ([role, value]) => `  --role-${kebab(role)}: ${value};`,
);
const darkRoleLines = Object.entries(DARK_ROLES).map(
  ([role, value]) => `  --role-${kebab(role)}: ${value};`,
);

const cssBlock = [
  BEGIN,
  ':root {',
  ...tokensM.map(([name, value]) => `  --z-${name}: ${value};`),
  ...lightRoleLines,
  '}',
  '@media (prefers-color-scheme: dark) {',
  '  :root {',
  ...tokensDark.map(([name, value]) => `    --z-${name}: ${value};`),
  ...darkRoleLines.map((l) => '  ' + l),
  '  }',
  '}',
  END,
].join('\n');
writeFileSync(cssPath, css.slice(0, begin) + cssBlock + css.slice(end + END.length));
console.log(`synced ${tokens.length} tokens + ${Object.keys(LIGHT_ROLES).length} role vars into global.css`);

// ─── src/theme/colors.ts: fully generated ────────────────────────────────────
const colorLines = tokensM.map(([name, value]) => `  ${camelCase(name)}: '${value}',`);
for (const [key, { value, comment }] of Object.entries(MOBILE_EXTRAS)) {
  colorLines.push(`  /** ${comment} */`, `  ${key}: '${value}',`);
}
writeFileSync(
  colorsPath,
  `/**
 * GENERATED by scripts/sync-tokens.mjs from web/dashboard-next/src/styles.scss
 * — do not edit by hand; run \`pnpm run sync:tokens\`.
 *
 * Zeta design tokens as raw values, for the places NativeWind classes cannot
 * reach: icon \`color\` props, navigator options, placeholderTextColor.
 * Mobile uses the Material-3 tonal "ember orange" palette, which diverges from
 * the flat web token values; see scripts/sync-tokens.mjs.
 */
export const colors = {
${colorLines.join('\n')}
} as const;
`,
);
console.log(`synced ${tokens.length} tokens + ${Object.keys(MOBILE_EXTRAS).length} mobile extras into src/theme/colors.ts`);

// ─── src/theme/roles.ts: fully generated ─────────────────────────────────────
const roleToTs = (roleMap) =>
  Object.entries(roleMap)
    .map(([role, value]) => `    ${role}: '${value}',`)
    .join('\n');

writeFileSync(
  rolesPath,
  `/**
 * GENERATED by scripts/sync-tokens.mjs from web/dashboard-next/src/styles.scss
 * — do not edit by hand; run \`pnpm run sync:tokens\`.
 *
 * Semantic role tokens for light and dark mode — Mobile Material-3 tonal
 * palette ("ember orange"). Mobile diverges from the flat web tokens to the
 * Material-You tonal scheme (darker tonal primary + warm-tinted surfaces);
 * web styles.scss is untouched. Dark roles use Material orange-dark surfaces;
 * see the values and rationale in scripts/sync-tokens.mjs.
 *
 * Usage:
 *   - NativeWind: bg-accent / text-on-surface / bg-surface-variant etc.
 *   - Native tier: import { roles } from './roles' for icon color props etc.
 */
export const roles = {
  light: {
${roleToTs(LIGHT_ROLES)}
  },
  dark: {
${roleToTs(DARK_ROLES)}
  },
} as const;
`,
);
console.log(`synced ${Object.keys(LIGHT_ROLES).length} light + ${Object.keys(DARK_ROLES).length} dark role tokens into src/theme/roles.ts`);
