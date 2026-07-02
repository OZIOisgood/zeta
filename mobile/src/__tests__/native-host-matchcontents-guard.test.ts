/**
 * Native @expo/ui Host `matchContents` guard (source-level scan).
 *
 * WHY source-level and not behavioral?
 *   jest cannot render @expo/ui native components (SwiftUI / Jetpack Compose);
 *   it always resolves Metro's platform-split to the bare .tsx fallback (a plain
 *   RN View), so the Host sizing behavior never executes under test. The bug this
 *   guards is therefore 100% invisible to jest, lint and typecheck — it only
 *   shows up as a blank/0-height surface on a real device build.
 *
 * THE FOOTGUN: `<Host matchContents={{ horizontal: true }}>` sizes the Compose
 *   view to its content WIDTH only. The unmatched (vertical) axis is sized to the
 *   parent — and in a height-auto / centered / ScrollView parent the parent does
 *   not constrain height, so the Host collapses to 0 height and the whole surface
 *   becomes invisible. This blanked the login card and is a latent risk for any
 *   centered ZCard. (`{{ vertical: true }}` is the opposite and is fine — a
 *   full-width bar/segment hugging its own height; bare `matchContents` matches
 *   BOTH axes and is also fine.)
 *
 * CONTRACT: a `matchContents={{ ... }}` object that sets `horizontal` MUST also
 *   set `vertical`. If a genuine horizontal-only case ever exists, set both axes
 *   explicitly (or revisit this guard with a documented exception) — do not ship
 *   a half-matched Host silently.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const UI_DIR = path.join(__dirname, '..', 'components', 'ui');

/** All native platform files (.ios.tsx / .android.tsx) in the UI dir. */
function nativePlatformFiles(): string[] {
  return readdirSync(UI_DIR).filter((f) => /\.(ios|android)\.tsx$/.test(f));
}

/** Inner text of every `matchContents={{ ... }}` object literal in `src`. */
function matchContentsObjects(src: string): string[] {
  // [^}] (negated class) matches across newlines, so multi-line objects are
  // captured without the dotall flag. Stops at the first closing brace.
  const re = /matchContents=\{\{([^}]*)\}\}/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

describe('native Host matchContents guard', () => {
  const files = nativePlatformFiles();

  it('should find native platform files to scan (sanity check)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(files)('%s', (file) => {
    it('must not use a horizontal-only matchContents (0-height collapse risk)', () => {
      const src = readFileSync(path.join(UI_DIR, file), 'utf-8');
      const offenders = matchContentsObjects(src).filter(
        (obj) => /\bhorizontal\b/.test(obj) && !/\bvertical\b/.test(obj),
      );
      expect(offenders).toEqual([]);
    });
  });
});
