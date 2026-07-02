/**
 * ZToastHost — iOS implementation (light top banner).
 *
 * iOS has no native bottom snackbar, so — per the handoff — transient feedback
 * is a light banner that animates in from the top safe-area. This REPLACES the
 * previous `burnt` native HUD: the banner is plain React Native (role tokens +
 * NativeWind), animated with React Native's built-in `Animated` (no new
 * animation dependency). The `burnt` package stays in package.json untouched to
 * avoid a native-rebuild churn; it is simply no longer called here.
 *
 * Each banner:
 *   - opaque `surface` card, soft shadow, ~12dp radius;
 *   - a leading tone-colored status dot (success / danger / neutral);
 *   - title (on-surface) + optional message (on-surface-variant), single line;
 *   - optional accent action label;
 *   - sits within the top safe-area inset; auto-dismisses via its own timer,
 *     then removes itself from the shared store.
 *
 * The store, showToast, useToasts, ToastCard, and all callers are untouched —
 * only this host file is platform-specific.
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/notifications
 */

import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoleColors, type Role } from '../../theme/native';
import { toastStore, useToasts, type ZToast, type ZToastTone } from './z-toast.shared';

// Re-export the shared public surface so importers of './z-toast' (which Metro
// resolves to THIS file on iOS) get the full API. Source is './z-toast.shared'
// — NOT './z-toast', which resolves back to this file and recurses infinitely
// ("Maximum call stack size exceeded").
export { toastStore };
export type { ZToastTone };
export { showToast, ToastCard } from './z-toast.shared';
export type { ZToast } from './z-toast.shared';

/** How long a banner stays before auto-dismissing (mirrors the shared store). */
const AUTO_DISMISS_MS = 3000;
/** Enter/exit animation duration. */
const ANIM_MS = 220;

/** Tone → leading status-dot color role. */
const DOT_ROLE: Record<ZToastTone, Role> = {
  success: 'success',
  error: 'danger',
  info: 'onSurfaceVariant',
};

/**
 * A single light banner. Owns its enter/exit slide+fade animation and its
 * auto-dismiss timer; calls `onDismiss(id)` once the exit animation completes,
 * which removes the entry from the shared store.
 */
function IosToastBanner({ toast, onDismiss }: { toast: ZToast; onDismiss: (id: number) => void }) {
  const { color } = useRoleColors();
  // Lazy-init a stable Animated.Value via useState (not a ref) so the linter's
  // "no ref access during render" rule is satisfied while the instance survives
  // re-renders.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let alive = true;

    Animated.timing(progress, {
      toValue: 1,
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: ANIM_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (alive) onDismiss(toast.id);
      });
    }, AUTO_DISMISS_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
      progress.stopAnimation();
    };
  }, [toast.id, progress, onDismiss]);

  const animatedStyle = {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }),
      },
    ],
  };

  return (
    <Animated.View
      testID={`toast-${toast.id}`}
      accessibilityRole="alert"
      style={animatedStyle}
      className="flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-lg"
    >
      <View
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color(DOT_ROLE[toast.tone]) }}
      />
      <View className="min-w-0 flex-1">
        <Text className="text-sm text-on-surface" numberOfLines={1}>
          <Text className="font-semibold text-on-surface">{toast.title}</Text>
          {toast.message ? (
            <Text className="text-on-surface-variant">{`  ${toast.message}`}</Text>
          ) : null}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * iOS ZToastHost.
 *
 * Subscribes to the shared store via `useToasts` and renders each active toast
 * as a stacked light banner pinned to the top safe-area. Each banner owns its
 * own animation + auto-dismiss and removes itself from the store on exit.
 */
export function ZToastHost() {
  const insets = useSafeAreaInsets();
  const toasts = useToasts();
  const dismiss = toastStore.getState().dismiss;

  if (toasts.length === 0) return null;

  return (
    <View
      className="absolute left-0 right-0 gap-2 px-4"
      style={{ top: insets.top + 8, pointerEvents: 'box-none' }}
    >
      {toasts.map((toast) => (
        <IosToastBanner key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </View>
  );
}
