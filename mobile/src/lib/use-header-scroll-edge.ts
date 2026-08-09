import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useNavigation } from 'expo-router';

/**
 * Material-3 scroll-edge top-app-bar behavior for native-stack list screens.
 *
 * M3 wants the top app bar FLAT at rest and its elevation/divider to appear
 * ONLY once content scrolls under it (the "scroll-edge" effect). A real Compose
 * `TopAppBar` does this via `scrollBehavior`, but the expo-router Android
 * native-stack header is a plain Toolbar — it has no scroll-aware elevation — so
 * we drive `headerShadowVisible` from the list's scroll offset instead.
 *
 * iOS large-title headers already render the scroll-edge hairline natively
 * (UINavigationBar's scroll-edge appearance), so the hook is a NO-OP on iOS:
 * forcing `headerShadowVisible` there would fight the platform. The matching
 * `_layout.tsx` files therefore set `headerShadowVisible` only on Android
 * (`Platform.select({ android: false })`) so iOS keeps its native behavior.
 *
 * Usage: spread the returned handler onto the screen's primary scrollable as
 * `onScroll`, together with `scrollEventThrottle={16}`. The hook keeps a ref of
 * the current elevated/flat state so it only calls `setOptions` when the offset
 * actually crosses the top edge — not on every scroll frame.
 */
export function useHeaderScrollEdge(): (e: NativeSyntheticEvent<NativeScrollEvent>) => void {
  const navigation = useNavigation();
  // Tracks whether the header is currently elevated, so we avoid redundant
  // setOptions calls on every onScroll frame (only toggle on a crossing).
  const elevatedRef = useRef(false);

  // Flat at rest on mount (Android). On iOS this effect is skipped entirely so
  // the native large-title scroll-edge appearance is left untouched.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    elevatedRef.current = false;
    navigation.setOptions({ headerShadowVisible: false });
  }, [navigation]);

  return useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS !== 'android') return; // iOS native scroll-edge owns this.
      const next = e.nativeEvent.contentOffset.y > 0;
      if (next === elevatedRef.current) return; // no crossing → nothing to do.
      elevatedRef.current = next;
      navigation.setOptions({ headerShadowVisible: next });
    },
    [navigation],
  );
}
