/**
 * Native className-forwarding guard (source-level scan).
 *
 * WHY source-level and not behavioral?
 *   jest cannot render @expo/ui native components (Swift-UI / Jetpack Compose);
 *   it always resolves Metro's platform-split to the bare .tsx fallback, which
 *   DOES honor className. A behavioral test would therefore always pass even
 *   when the native platform files silently drop className — exactly the bug
 *   this test is designed to catch. Source scanning is the only reliable way to
 *   verify that the platform files forward the prop on real device builds.
 *
 * CONTRACT: For every z-*.types.ts that declares a `className` prop, BOTH the
 * corresponding z-*.ios.tsx AND z-*.android.tsx source files MUST contain the
 * substring `className` (i.e. they must accept and forward the prop). A missing
 * occurrence means the native variant silently drops className → layout breakage
 * on device (invisible to CI because jest uses the bare fallback).
 *
 * Adding a `className` prop to a .types.ts file without updating both platform
 * files will cause this test to fail, surfacing the regression before merge.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const UI_DIR = path.join(__dirname, '..', 'components', 'ui');

/** Read a file and return its contents, or null if it does not exist. */
function readOrNull(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8');
}

/** Return all z-*.types.ts basenames (without extension) from the UI dir. */
function typesBasenames(): string[] {
  return readdirSync(UI_DIR)
    .filter((f) => /^z-.*\.types\.ts$/.test(f))
    .map((f) => f.replace(/\.types\.ts$/, ''));
}

/** Return true if the types file declares a `className` prop. */
function typesDeclaresClassName(basename: string): boolean {
  const typesPath = path.join(UI_DIR, `${basename}.types.ts`);
  const src = readOrNull(typesPath);
  if (!src) return false;
  // Match `className` as a prop declaration: "className?" or "className:" in the Props type.
  return /\bclassName\s*[?:]/.test(src);
}

describe('native className forwarding guard', () => {
  const basenames = typesBasenames();

  // Collect only the primitives whose types declare className and that have
  // at least one native platform file.
  const primitivesWithClassName = basenames.filter((basename) => {
    if (!typesDeclaresClassName(basename)) return false;
    const hasIOS = existsSync(path.join(UI_DIR, `${basename}.ios.tsx`));
    const hasAndroid = existsSync(path.join(UI_DIR, `${basename}.android.tsx`));
    return hasIOS || hasAndroid;
  });

  it('should find at least one primitive to guard (sanity check)', () => {
    // If this is zero the test suite has been mis-configured or all className
    // props have been removed from types files — either case warrants attention.
    expect(primitivesWithClassName.length).toBeGreaterThan(0);
  });

  describe.each(primitivesWithClassName)('%s', (basename) => {
    const iosPath = path.join(UI_DIR, `${basename}.ios.tsx`);
    const androidPath = path.join(UI_DIR, `${basename}.android.tsx`);

    if (existsSync(iosPath)) {
      it('ios.tsx must reference className (forward the prop)', () => {
        const src = readFileSync(iosPath, 'utf-8');
        expect(src).toMatch(/\bclassName\b/);
      });
    }

    if (existsSync(androidPath)) {
      it('android.tsx must reference className (forward the prop)', () => {
        const src = readFileSync(androidPath, 'utf-8');
        expect(src).toMatch(/\bclassName\b/);
      });
    }
  });
});
