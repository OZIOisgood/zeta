/**
 * Brand-font resolution guard (source-level scan of app/_layout.tsx).
 *
 * WHY this exists:
 *   On the native build every <Text> silently fell back to the system font
 *   (Roboto) because (a) React 19 no longer honors Text.defaultProps on function
 *   components and (b) NativeWind v4 compiles the weight utilities to fontWeight
 *   only on native (the CSS @layer font-family override is dropped). jest renders
 *   the bare web fallback, so it NEVER sees the native font — lint/typecheck/test
 *   were all green while the device showed the wrong typeface on every screen.
 *
 *   The fix patches Text.render to map each rendered fontWeight to a real loaded
 *   Nunito face. This guard prevents that fix from silently regressing:
 *     1. The Text.render patch must still be present (not reverted to the dead
 *        defaultProps approach).
 *     2. Every face referenced by the weight→face map must actually be loaded via
 *        useFonts — otherwise that weight collapses back to the system font.
 *
 * It is source-level for the same reason as the other native guards: the failure
 * is invisible to a jest render.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const LAYOUT = path.join(__dirname, '..', 'app', '_layout.tsx');

describe('brand-font resolution guard', () => {
  const src = readFileSync(LAYOUT, 'utf-8');

  it('patches Text.render (the React-19/Fabric-safe mechanism), not defaultProps', () => {
    // The interceptor reassigns the Text render fn. Without it, native text
    // falls back to the system font.
    expect(src).toMatch(/\.render\s*=\s*function/);
    // The dead mechanism must not creep back as the font default.
    expect(src).not.toMatch(/defaultProps\s*=/);
  });

  it('maps every weight face to a font that is actually loaded via useFonts', () => {
    // Faces assigned as font families (quoted), e.g. 'NunitoSans_800ExtraBold'.
    const referenced = new Set(
      [...src.matchAll(/['"](NunitoSans_[A-Za-z0-9]+)['"]/g)].map((m) => m[1]),
    );
    // Faces loaded into the runtime: the identifiers inside useFonts({ ... }).
    const useFontsBlock = src.match(/useFonts\(\{([\s\S]*?)\}\)/);
    expect(useFontsBlock).not.toBeNull();
    const loaded = new Set(
      [...(useFontsBlock?.[1] ?? '').matchAll(/\b(NunitoSans_[A-Za-z0-9]+)\b/g)].map(
        (m) => m[1],
      ),
    );

    expect(referenced.size).toBeGreaterThan(0);
    const unloaded = [...referenced].filter((face) => !loaded.has(face));
    expect(unloaded).toEqual([]);
  });
});
