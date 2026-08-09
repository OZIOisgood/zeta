import { Pressable, Text, View } from 'react-native';
import type { ZSwipeableProps } from './z-swipeable.types';

export type { ZSwipeableProps } from './z-swipeable.types';

/**
 * ZSwipeable — bare fallback (web / Storybook / jest).
 *
 * react-native-gesture-handler is native-only, so off-device there is no swipe
 * gesture. The row renders with the trailing action exposed as a persistent
 * accessible button so the action stays reachable (web/Storybook) and testable
 * (jest). The native `.ios`/`.android` variant hides this behind a right-to-left
 * swipe. Keep this fallback in lockstep with the native action (same testID
 * suffix `-action`, same label) so screen tests target one contract.
 */
export function ZSwipeable({ children, actionLabel, actionIcon, onAction, testID }: ZSwipeableProps) {
  return (
    <View testID={testID}>
      {children}
      <Pressable
        testID={testID ? `${testID}-action` : undefined}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        className="mt-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-z-danger px-4 py-2 active:opacity-90"
      >
        {actionIcon}
        <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
      </Pressable>
    </View>
  );
}
