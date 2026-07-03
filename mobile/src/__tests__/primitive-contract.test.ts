/**
 * primitive-contract.test.ts
 *
 * Guards the tier system so mis-classifications can't silently ship.
 *
 * ## Tier header convention
 * Every non-infra .types.ts must include a line matching:
 *   `* Tier: <tier-value>`
 * where <tier-value> is one of the canonical strings in tiers.ts
 * (case-insensitive; "Custom-RN" normalises to "custom-no-native").
 *
 * ## COMPOSITION_EXCEPTIONS
 * Native-by-composition primitives that render exclusively through native
 * sub-primitives but have no platform files of their own. Each entry must
 * include a one-line rationale.
 *
 * Currently empty — all primitives classified as 'native' in TIERS have
 * both .ios.tsx and .android.tsx. ZDangerZoneCard is classified
 * 'custom-no-native' rather than 'native' because the composition-native
 * pattern needs no platform split at the composition layer.
 */

import { TIERS, type Tier } from '../components/ui/tiers';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const UI_DIR = path.join(__dirname, '..', 'components', 'ui');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base-name list of all bare .tsx entry files (no test/stories/shared/platform suffixes). */
function getBareFiles(): string[] {
  return readdirSync(UI_DIR)
    .filter((f) => f.endsWith('.tsx') && !/\.(test|stories|shared|ios|android)\.tsx$/.test(f))
    .map((f) => f.replace(/\.tsx$/, ''));
}

/**
 * Parse the declared tier from a .types.ts header comment.
 *
 * Matches:
 *   * Tier: native
 *   * Tier: Native          (case-insensitive)
 *   * Tier: custom-no-native
 *   * Tier: Custom-RN       (alias → custom-no-native)
 *   * Tier: custom-canvas
 *   * Tier: infra
 *
 * Returns undefined when no match is found.
 */
function parseTierFromTypesFile(name: string): Tier | undefined {
  const typesPath = path.join(UI_DIR, `${name}.types.ts`);
  if (!existsSync(typesPath)) return undefined;

  const content = readFileSync(typesPath, 'utf8');
  const match = content.match(/\*\s+Tier:\s+(.+)/);
  if (!match) return undefined;

  const raw = match[1].trim().toLowerCase();

  if (raw === 'native') return 'native';
  if (raw === 'custom-no-native') return 'custom-no-native';
  if (raw === 'custom-rn') return 'custom-no-native'; // legacy alias
  if (raw === 'custom-canvas') return 'custom-canvas';
  if (raw === 'infra') return 'infra';

  // Unrecognised value — return as-is so the mismatch test surfaces it.
  return raw as Tier;
}

// ---------------------------------------------------------------------------
// COMPOSITION_EXCEPTIONS
// Each key is a primitive name (without extension); value is the rationale.
// ---------------------------------------------------------------------------
const COMPOSITION_EXCEPTIONS: Record<string, string> = {
  // (empty — no current composition-native primitives without platform files)
};

// ---------------------------------------------------------------------------
// Test 1 — Coverage: every bare .tsx has a TIERS entry
// ---------------------------------------------------------------------------
test('every ui primitive is tier-classified', () => {
  const files = getBareFiles();
  const missing = files.filter((name) => !(name in TIERS));
  expect(missing).toEqual([]);
});

// ---------------------------------------------------------------------------
// Test 2 — Staleness: no TIERS entry references a non-existent primitive
// ---------------------------------------------------------------------------
test('no TIERS entry references a non-existent primitive', () => {
  const files = new Set(getBareFiles());
  const stale = Object.keys(TIERS).filter((name) => !files.has(name));
  expect(stale).toEqual([]);
});

// ---------------------------------------------------------------------------
// Test 3 — Accuracy (A): tiers.ts value == .types.ts header tier
// ---------------------------------------------------------------------------
test('tiers.ts value matches .types.ts header for every primitive that has one', () => {
  const mismatches: string[] = [];

  for (const [name, tiersValue] of Object.entries(TIERS)) {
    const headerTier = parseTierFromTypesFile(name);
    if (headerTier === undefined) continue; // no .types.ts — covered by Test 4

    if (headerTier !== tiersValue) {
      mismatches.push(
        `${name}: tiers.ts='${tiersValue}' but .types.ts header='${headerTier}'`,
      );
    }
  }

  expect(mismatches).toEqual([]);
});

// ---------------------------------------------------------------------------
// Test 4 — Completeness (C): every non-infra primitive has a .types.ts
// (infra primitives intentionally omit it — their types live inline in the .tsx)
// ---------------------------------------------------------------------------
test('every non-infra primitive has a .types.ts', () => {
  const missing: string[] = [];

  for (const [name, tier] of Object.entries(TIERS)) {
    if (tier === 'infra') continue;
    if (name in COMPOSITION_EXCEPTIONS) continue;

    const typesPath = path.join(UI_DIR, `${name}.types.ts`);
    if (!existsSync(typesPath)) {
      missing.push(name);
    }
  }

  expect(missing).toEqual([]);
});

// ---------------------------------------------------------------------------
// Test 5 — Platform files (B): every 'native' TIERS entry has both
// .ios.tsx and .android.tsx — unless it is a COMPOSITION_EXCEPTION.
// ---------------------------------------------------------------------------
test('every native primitive has both .ios.tsx and .android.tsx platform files', () => {
  const violations: string[] = [];

  for (const [name, tier] of Object.entries(TIERS)) {
    if (tier !== 'native') continue;
    if (name in COMPOSITION_EXCEPTIONS) continue;

    const iosPath = path.join(UI_DIR, `${name}.ios.tsx`);
    const androidPath = path.join(UI_DIR, `${name}.android.tsx`);

    const missingFiles: string[] = [];
    if (!existsSync(iosPath)) missingFiles.push('.ios.tsx');
    if (!existsSync(androidPath)) missingFiles.push('.android.tsx');

    if (missingFiles.length > 0) {
      violations.push(`${name}: missing ${missingFiles.join(', ')}`);
    }
  }

  expect(violations).toEqual([]);
});
