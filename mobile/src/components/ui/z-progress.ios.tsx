import { Host, ProgressView } from '@expo/ui/swift-ui';
import { View } from 'react-native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/**
 * iOS: SwiftUI ProgressView (linear when it has no label child). Outer NativeWind
 * View forwards `className`; matchContents vertical lets the bar fill width and
 * size to intrinsic height.
 */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className={className} testID={testID}>
      <Host matchContents={{ vertical: true }}>
        <ProgressView value={clamped} />
      </Host>
    </View>
  );
}
