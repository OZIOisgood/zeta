import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const DURATION = 900;

export function ZSkeleton({ className = '', testID }: { className?: string; testID?: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,  // infinite
      true, // reverse (ping-pong)
    );
    // Reanimated cancels the animation when the shared value is garbage
    // collected; no explicit cleanup is needed.
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      testID={testID}
      style={animatedStyle}
      className={`rounded-md bg-z-surface-muted ${className}`}
    />
  );
}
