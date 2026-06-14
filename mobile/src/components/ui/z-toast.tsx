import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toastStore, useToasts, ToastCard } from './z-toast.shared';

// Public surface. On web/Storybook/jest, screens import './z-toast' → this file
// (the NativeWind fallback). The shared store/card live in './z-toast.shared'
// so the native siblings can re-use them without a self-resolving import.
export { showToast } from './z-toast.shared';
export { toastStore, ToastCard };
export type { ZToastTone, ZToast } from './z-toast.shared';

/**
 * Renders active toasts as a safe-area-aware overlay pinned to the top.
 * Mount once at the app root. Mobile counterpart of the web `z-toast`
 * (web/dashboard-next/src/app/shared/ui/toast/).
 *
 * This bare implementation is the NativeWind fallback used by
 * web/Storybook/jest. Native HUDs (Material 3 Snackbar / burnt) live in the
 * `.android.tsx` / `.ios.tsx` siblings.
 */
export function ZToastHost() {
  const insets = useSafeAreaInsets();
  const toasts = useToasts();
  const dismiss = toastStore.getState().dismiss;

  if (toasts.length === 0) return null;

  return (
    <View
      className="absolute left-0 right-0 gap-3 px-4"
      style={{ top: insets.top + 8, pointerEvents: 'box-none' }}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </View>
  );
}
