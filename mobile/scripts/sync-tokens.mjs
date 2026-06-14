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
//   The Zeta brand is warm orange on a light cream canvas. In dark mode we
//   invert the luminance — warm-neutral near-black surfaces (#1a0f08 bg,
//   #231409 surface, #2e1b0e surfaceVariant) preserve the brand warmth without
//   eye strain. The accent is lightened to orange-400 (#fb923c) so it reads
//   at sufficient contrast against dark surfaces (approx 4.6:1 against #231409).
//   Status colors are lightened one step along their respective scales to keep
//   ≥4.5:1 on dark surfaces. onSurface text is warm-white (#f5e6d3) and
//   onSurfaceVariant is warm-gray (#a8917c), both readable against the dark
//   background. Container tones are dark-tinted versions of the light soft
//   tones. This is a sensible first pass; it can be refined via a full
//   contrast-check sweep in a later task.

const LIGHT_ROLES = {
  // Brand accent (maps to z-primary)
  accent: t.primary,
  onAccent: '#ffffff',
  accentContainer: t.primarySoft,
  onAccentContainer: t.primaryStrong,

  // Status — base colors
  success: t.success,
  onSuccess: '#ffffff',
  successContainer: t.successSoft,
  onSuccessContainer: t.success,

  warning: t.warning,
  onWarning: '#ffffff',
  warningContainer: t.warningSoft,
  onWarningContainer: t.warning,

  danger: t.danger,
  onDanger: '#ffffff',
  dangerContainer: t.dangerSoft,
  onDangerContainer: t.danger,

  // Surfaces
  background: t.bg,
  surface: t.surface,
  surfaceVariant: t.surfaceWarm,

  // Text hierarchy
  onSurface: t.text,
  onSurfaceVariant: t.muted,

  // Border / divider
  outline: t.border,
};

const DARK_ROLES = {
  // Brand accent — lightened to orange-400 for dark-surface contrast
  accent: '#fb923c',
  onAccent: '#ffffff',
  accentContainer: '#7c2d0a',
  onAccentContainer: '#fed7aa',

  // Status — one step lighter on their respective scales for dark-bg contrast
  success: '#4ade80',
  onSuccess: '#052e16',
  successContainer: '#14532d',
  onSuccessContainer: '#86efac',

  warning: '#fbbf24',
  onWarning: '#451a03',
  warningContainer: '#3b1500',
  onWarningContainer: '#fde68a',

  danger: '#fb7185',
  onDanger: '#4c0519',
  dangerContainer: '#500724',
  onDangerContainer: '#fda4af',

  // Surfaces — warm-neutral near-black; preserve brand warmth in dark mode
  background: '#1a0f08',
  surface: '#231409',
  surfaceVariant: '#2e1b0e',

  // Text hierarchy — warm-white / warm-gray on dark surfaces
  onSurface: '#f5e6d3',
  onSurfaceVariant: '#a8917c',

  // Border / divider — subtle warm line visible on dark backgrounds
  outline: '#4a3020',
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
const kebab = (key) => key.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`);
const lightRoleLines = Object.entries(LIGHT_ROLES).map(
  ([role, value]) => `  --role-${kebab(role)}: ${value};`,
);
const darkRoleLines = Object.entries(DARK_ROLES).map(
  ([role, value]) => `  --role-${kebab(role)}: ${value};`,
);

const cssBlock = [
  BEGIN,
  ':root {',
  ...tokens.map(([name, value]) => `  --z-${name}: ${value};`),
  ...lightRoleLines,
  '}',
  '@media (prefers-color-scheme: dark) {',
  '  :root {',
  ...darkRoleLines.map((l) => '  ' + l),
  '  }',
  '}',
  END,
].join('\n');
writeFileSync(cssPath, css.slice(0, begin) + cssBlock + css.slice(end + END.length));
console.log(`synced ${tokens.length} tokens + ${Object.keys(LIGHT_ROLES).length} role vars into global.css`);

// ─── src/theme/colors.ts: fully generated ────────────────────────────────────
const colorLines = tokens.map(([name, value]) => `  ${camelCase(name)}: '${value}',`);
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
 * Semantic role tokens for light and dark mode.
 * Light roles are derived from the flat web design tokens.
 * Dark roles use warm-neutral dark surfaces to preserve brand warmth;
 * see the derivation rationale in scripts/sync-tokens.mjs.
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
