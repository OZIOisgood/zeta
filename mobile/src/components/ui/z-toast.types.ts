/**
 * ZToast — shared public API types (Tier: Native)
 *
 * ZToast maps to transient feedback widgets on each platform:
 *   - Android → Material 3 Snackbar (dark inverse-surface pill, @expo/ui)
 *   - iOS     → light top banner rendered in RN (replaces the old burnt HUD)
 *
 * Platform variants:
 *   - z-toast.tsx         — NativeWind fallback (web / Storybook / jest): the
 *                           dark inverse-surface pill (host positions it).
 *   - z-toast.ios.tsx     — light banner animated in from the top safe-area.
 *   - z-toast.android.tsx — Material 3 Snackbar (dark inverse pill, bottom).
 *
 * Shared runtime lives in z-toast.shared.tsx (store, showToast, ToastCard)
 * to avoid the self-import circular resolution problem on .ios/.android files.
 *
 * No .types imports are needed here — the canonical types live in
 * z-toast.shared.tsx and are re-exported from z-toast.tsx.
 */

// Re-export shared types so consumers can import from the canonical entry.
export type { ZToastTone, ZToast } from './z-toast.shared';
