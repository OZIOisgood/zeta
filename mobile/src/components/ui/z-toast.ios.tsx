/**
 * ZToastHost — iOS implementation.
 *
 * Bridges the shared `toastStore` to `burnt`'s native iOS HUD.
 * Burnt renders its own native UI (SPM-linked) and auto-dismisses it; this
 * host immediately removes the entry from the store after firing so the RN
 * overlay never appears on iOS.
 *
 * Tone → preset mapping:
 *   success → 'done'    (checkmark HUD)
 *   error   → 'error'   (X HUD)
 *   info    → 'none'    (plain HUD, no icon)
 *
 * Tone → haptic mapping (matches preset intent):
 *   success → 'success'
 *   error   → 'error'
 *   info    → 'none'
 *
 * AUTO_DISMISS_MS / 1000 converts the shared constant to burnt's seconds.
 *
 * The store, showToast, useToasts, ToastCard, and all 11 callers are
 * untouched — only this host file is platform-specific.
 *
 * burnt version: 0.13.0
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/alerts
 */

import { useEffect, useRef } from 'react';
import * as Burnt from 'burnt';

import { toastStore, type ZToastTone } from './z-toast.shared';

// Re-export the shared public surface so importers of './z-toast' (which Metro
// resolves to THIS file on iOS) get the full API. Source is './z-toast.shared'
// — NOT './z-toast', which resolves back to this file and recurses infinitely
// ("Maximum call stack size exceeded").
export { toastStore };
export type { ZToastTone };
export { showToast, ToastCard } from './z-toast.shared';
export type { ZToast } from './z-toast.shared';

/** Duration in seconds (burnt's unit) derived from the shared 3 000 ms constant. */
const BURNT_DURATION_S = 3;

type BurntPreset = 'done' | 'error' | 'none';
type BurntHaptic = 'success' | 'warning' | 'error' | 'none';

const PRESET_MAP: Record<ZToastTone, BurntPreset> = {
  success: 'done',
  error: 'error',
  info: 'none',
};

const HAPTIC_MAP: Record<ZToastTone, BurntHaptic> = {
  success: 'success',
  error: 'error',
  info: 'none',
};

/**
 * iOS ZToastHost.
 *
 * Subscribes to the toast store. Each time a NEW toast is added it fires
 * `Burnt.toast(...)` (which owns the native HUD and its auto-dismiss), then
 * immediately removes the entry from the store so the shared RN overlay does
 * not appear on top of the native HUD.
 *
 * Returns null — burnt renders its own native layer.
 */
export function ZToastHost() {
  // Track the set of IDs we have already dispatched to burnt so that
  // store re-renders (e.g. a second toast arriving) don't re-fire the same HUD.
  const firedIds = useRef(new Set<number>());

  useEffect(() => {
    const unsubscribe = toastStore.subscribe((state) => {
      const { toasts, dismiss } = state;
      for (const toast of toasts) {
        if (firedIds.current.has(toast.id)) continue;

        firedIds.current.add(toast.id);

        Burnt.toast({
          title: toast.title,
          message: toast.message,
          preset: PRESET_MAP[toast.tone],
          haptic: HAPTIC_MAP[toast.tone],
          duration: BURNT_DURATION_S,
        });

        // Remove from store immediately — burnt owns the visual lifecycle.
        dismiss(toast.id);
      }
    });

    return unsubscribe;
  }, []);

  return null;
}
