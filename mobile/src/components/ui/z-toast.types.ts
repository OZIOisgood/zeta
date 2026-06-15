/**
 * ZToast — shared public API types (Tier: Native)
 *
 * ZToast maps to transient feedback widgets on each platform:
 *   - Android → Material 3 Snackbar (via @expo/ui / react-native-paper)
 *   - iOS     → native HUD overlay (burnt / system feedback)
 *
 * Platform variants:
 *   - z-toast.tsx         — NativeWind fallback (web / Storybook / jest)
 *   - z-toast.ios.tsx     — native iOS HUD
 *   - z-toast.android.tsx — Material 3 Snackbar
 *
 * Shared runtime lives in z-toast.shared.tsx (store, showToast, ToastCard)
 * to avoid the self-import circular resolution problem on .ios/.android files.
 *
 * No .types imports are needed here — the canonical types live in
 * z-toast.shared.tsx and are re-exported from z-toast.tsx.
 */

// Re-export shared types so consumers can import from the canonical entry.
export type { ZToastTone, ZToast } from './z-toast.shared';
