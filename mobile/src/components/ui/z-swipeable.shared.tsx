import { useRef, type ComponentRef } from 'react';
import { Pressable, Text } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { ZSwipeableProps } from './z-swipeable.types';

export type { ZSwipeableProps } from './z-swipeable.types';

/**
 * ZSwipeable — native impl (shared by z-swipeable.ios.tsx / .android.tsx; the
 * gesture is platform-identical so both entries re-export this file).
 *
 * `ReanimatedSwipeable`: a right-to-left swipe reveals a trailing danger action.
 * Tapping the revealed action fires `onAction` and closes the row, so it resets
 * when the user returns from whatever the action opened. `overshootRight` is off
 * and the action does NOT auto-fire on a full swipe — the tap is required — so a
 * destructive action can't be triggered by an accidental fling.
 *
 * Requires <GestureHandlerRootView> at the app root (app/_layout.tsx); without
 * it the gesture is silently dead on Android.
 *
 * react-native-gesture-handler: ~2.31
 */
export function ZSwipeable({ children, actionLabel, actionIcon, onAction, testID }: ZSwipeableProps) {
  const ref = useRef<ComponentRef<typeof ReanimatedSwipeable>>(null);

  function activate() {
    ref.current?.close();
    onAction();
  }

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          testID={testID ? `${testID}-action` : undefined}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={activate}
          className="flex-row items-center justify-center gap-1.5 bg-z-danger px-5"
        >
          {actionIcon}
          <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
