/**
 * ZToastHost — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 SnackbarHost driven by the shared `toastStore`.
 * `SnackbarHost` is an imperative ref-based component; this host holds a ref,
 * watches for new store entries, and calls `ref.showSnackbar(...)` imperatively.
 * On resolve (timeout or action tap) it calls `toastStore.dismiss(id)` — and
 * `toast.action.onPress()` when the result is `'actionPerformed'`.
 *
 * Handoff look: the M3 dark inverse-surface pill. Tones map to M3 roles:
 *   info    → onSurface / surface          (INVERTS the old light look)
 *   success → successContainer / onSuccessContainer
 *   error   → dangerContainer  / onDangerContainer
 * Colors come from theme/native.ts role tokens via useRoleColors(). Because the
 * `Snackbar` styling child is a single static element, the active tone's colors
 * are tracked in component state and applied when the next toast fires.
 *
 * AUTO_DISMISS_MS → SnackbarDuration mapping:
 *   3 000 ms → 'short'  (≈ 1.5 s on Compose; closest match for a transient toast)
 *
 * No dismiss "X" (`withDismissAction: false`) — auto-dismiss only, per handoff.
 * The optional `action` maps to the Snackbar's native `actionLabel`; the
 * accent action-content color is set via `actionContentColor`.
 *
 * The store, showToast, useToasts, ToastCard, and all callers are untouched —
 * only this host file is platform-specific.
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/snackbar/overview
 */

import { useEffect, useRef, useState } from 'react';
import { Host, Snackbar, SnackbarHost, type SnackbarHostRef } from '@expo/ui/jetpack-compose';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoleColors, type Role } from '../../theme/native';
import { toastStore, type ZToastTone } from './z-toast.shared';

// Re-export the shared public surface so importers of './z-toast' (which Metro
// resolves to THIS file on Android) get the full API. Source is
// './z-toast.shared' — NOT './z-toast', which resolves back to this file and
// recurses infinitely ("Maximum call stack size exceeded").
export { toastStore };
export type { ZToastTone };
export { showToast, ToastCard } from './z-toast.shared';
export type { ZToast } from './z-toast.shared';

type ToneColors = { containerColor: Role; contentColor: Role };

const TONE_ROLES: Record<ZToastTone, ToneColors> = {
  success: { containerColor: 'successContainer', contentColor: 'onSuccessContainer' },
  error:   { containerColor: 'dangerContainer',  contentColor: 'onDangerContainer'  },
  // info INVERTS to the M3 inverse surface — the dark pill of the handoff.
  info:    { containerColor: 'onSurface',        contentColor: 'surface'            },
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
  const insets = useSafeAreaInsets();
  const snackbarRef = useRef<SnackbarHostRef>(null);
  // Track which IDs we have already dispatched so re-renders don't re-fire.
  const firedIds = useRef(new Set<number>());
  // The Snackbar styling child is a single static element, so the active tone's
  // colors are held in state and applied just before the snackbar is shown.
  const [toneRoles, setToneRoles] = useState<ToneColors>(TONE_ROLES.info);

  useEffect(() => {
    const unsubscribe = toastStore.subscribe((state) => {
      const { toasts, dismiss } = state;
      for (const toast of toasts) {
        if (firedIds.current.has(toast.id)) continue;
        firedIds.current.add(toast.id);

        const { id, title, message, tone } = toast;
        const displayMessage = message ? `${title}: ${message}` : title;

        // Apply this toast's tone colors to the styling child before showing.
        setToneRoles(TONE_ROLES[tone]);

        snackbarRef.current
          ?.showSnackbar({
            message: displayMessage,
            withDismissAction: false, // handoff: auto-dismiss only, no "X".
            duration: 'short',
          })
          .then(() => {
            // Drop the id once resolved so the Set doesn't grow per toast over a session.
            firedIds.current.delete(id);
            dismiss(id);
          })
          .catch(() => {
            firedIds.current.delete(id);
            dismiss(id);
          });
      }
    });

    return unsubscribe;
  }, []);

  return (
    // M3: snackbars float ABOVE bottom bars — bottom:0 rendered the pill on top
    // of the native tab bar, hiding its labels. 80dp M3 NavigationBar + 16dp
    // breathing room; insets cover 3-button vs gesture navigation. On sheet
    // routes (no tab bar) the pill floats a bar-height up, which M3 permits.
    <Host
      matchContents
      useViewportSizeMeasurement
      style={{ position: 'absolute', bottom: insets.bottom + 96, left: 0, right: 0 }}
    >
      <SnackbarHost ref={snackbarRef}>
        <Snackbar
          containerColor={color(toneRoles.containerColor)}
          contentColor={color(toneRoles.contentColor)}
          actionContentColor={color('accent')}
        />
      </SnackbarHost>
    </Host>
  );
}
