/**
 * Native Compose-text brand-font guard (source-level scan).
 *
 * WHY: @expo/ui Jetpack-Compose <Text> does NOT inherit the JS-loaded brand
 * font, and the app-wide Text.render patch (_layout.tsx) only reaches React
 * Native <Text> — not Compose. A Compose <Text> without an explicit `fontFamily`
 * therefore renders in the system font (Roboto) on the device, while jest (bare
 * web fallback) stays green. This blanketed every button label, segmented
 * control, text input, picker and dialog in the wrong typeface until each was
 * given the loaded face by name.
 *
 * CONTRACT: in every Android platform file that imports `Text` from
 * '@expo/ui/jetpack-compose', every `<Text …>` opening tag MUST set a
 * `fontFamily` (a real loaded Nunito face — Android cannot synthesize a weighted
 * cut from a numeric weight). Comments are stripped before scanning so doc
 * comments that mention <Text> do not trip the guard.
 *
 * (iOS @expo/ui SwiftUI text defaults to SF Pro, not Roboto — the same fix +
 * an .ios scan are tracked as part of the deferred iOS verification pass.)
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const UI_DIR = path.join(__dirname, '..', 'components', 'ui');

/** Strip block and line comments so commented-out / documented <Text> is ignored. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Android platform files that import Text from @expo/ui Jetpack Compose. */
function composeTextFiles(): string[] {
  return readdirSync(UI_DIR)
    .filter((f) => /\.android\.tsx$/.test(f))
    .filter((f) => {
      const src = readFileSync(path.join(UI_DIR, f), 'utf-8');
      return /import\s*\{[^}]*\bText\b[^}]*\}\s*from\s*['"]@expo\/ui\/jetpack-compose['"]/.test(
        src,
      );
    });
}

describe('native Compose-text brand-font guard', () => {
  const files = composeTextFiles();

  it('should find Compose-text primitives to guard (sanity check)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(files)('%s', (file) => {
    it('every Compose <Text> sets an explicit fontFamily', () => {
      const src = stripComments(readFileSync(path.join(UI_DIR, file), 'utf-8'));
      const openingTags = src.match(/<Text\b[^>]*>/g) ?? [];
      const missing = openingTags.filter((tag) => !/fontFamily/.test(tag));
      expect(missing).toEqual([]);
    });
  });
});
