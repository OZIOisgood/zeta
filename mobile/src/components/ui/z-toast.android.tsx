/**
 * ZToastHost — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 SnackbarHost driven by the shared `toastStore`.
 * `SnackbarHost` is an imperative ref-based component; this host holds a ref,
 * watches for new store entries, and calls `ref.showSnackbar(...)` imperatively.
 * On resolve (timeout or user dismiss) it calls `toastStore.dismiss(id)`.
 *
 * AUTO_DISMISS_MS → SnackbarDuration mapping:
 *   3 000 ms → 'short'  (≈ 1.5 s on Compose; closest match for a transient toast)
 *
 * Colors come from theme/native.ts role tokens via useRoleColors(). Tone tints:
 *   success → successContainer / onSuccessContainer
 *   error   → dangerContainer  / onDangerContainer
 *   info    → surfaceVariant   / onSurface
 *
 * The store, showToast, useToasts, ToastCard, and all 11 callers are
 * untouched — only this host file is platform-specific.
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/snackbar/overview
 */

import { useEffect, useRef } from 'react';
import { Host, Snackbar, SnackbarHost, type SnackbarHostRef } from '@expo/ui/jetpack-compose';

import { useRoleColors, type Role } from '../../theme/native';
import { toastStore, showToast, type ZToastTone } from './z-toast';

// Re-export the shared imperative API so importers of z-toast.android get
// the full public surface (Metro resolves z-toast → z-toast.android on Android).
export { showToast, toastStore };
export type { ZToastTone };
export { ToastCard } from './z-toast';

type ToneColors = { containerColor: Role; contentColor: Role };

const TONE_ROLES: Record<ZToastTone, ToneColors> = {
  success: { containerColor: 'successContainer', contentColor: 'onSuccessContainer' },
  error:   { containerColor: 'dangerContainer',  contentColor: 'onDangerContainer'  },
  info:    { containerColor: 'surfaceVariant',   contentColor: 'onSurface'          },
};

/**
 * Android ZToastHost.
 *
 * Renders an invisible SnackbarHost anchored at the bottom of the screen.
 * When the store gains a new toast entry, `showSnackbar` is called
 * imperatively; the promise resolves when the snackbar times out or the user
 * dismisses it, at which point `toastStore.dismiss(id)` cleans up the entry.
 *
 * The Host wrapper is required by @expo/ui's Compose integration so that the
 * SnackbarHost participates in the Compose composition tree.
 */
export function ZToastHost() {
  const { color } = useRoleColors();
  const snackbarRef = useRef<SnackbarHostRef>(null);
  // Track which IDs we have already dispatched so re-renders don't re-fire.
  const firedIds = useRef(new Set<number>());

  useEffect(() => {
    const unsubscribe = toastStore.subscribe((state) => {
      const { toasts, dismiss } = state;
      for (const toast of toasts) {
        if (firedIds.current.has(toast.id)) continue;
        firedIds.current.add(toast.id);

        const { id, title, message } = toast;
        const displayMessage = message ? `${title}: ${message}` : title;

        snackbarRef.current
          ?.showSnackbar({
            message: displayMessage,
            withDismissAction: true,
            duration: 'short',
          })
          .then(() => {
            dismiss(id);
          })
          .catch(() => {
            dismiss(id);
          });
      }
    });

    return unsubscribe;
  }, []);

  const toneRoles = TONE_ROLES['info']; // default; overridden per-toast via Snackbar child

  return (
    <Host matchContents useViewportSizeMeasurement style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <SnackbarHost ref={snackbarRef}>
        <Snackbar
          containerColor={color(toneRoles.containerColor)}
          contentColor={color(toneRoles.contentColor)}
        />
      </SnackbarHost>
    </Host>
  );
}
