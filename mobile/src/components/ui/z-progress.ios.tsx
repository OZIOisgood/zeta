import { Host, ProgressView } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/**
 * iOS: SwiftUI ProgressView (linear when it has no label child). Outer NativeWind
 * View forwards `className`; matchContents vertical lets the bar fill width and
 * size to intrinsic height.
 *
 * The `tint` modifier colours the FILL with the brand accent; SwiftUI keeps its
 * own default neutral-gray track behind it (matching the handoff: accent fill on
 * a neutral rail), so the track needs no explicit colour here.
 */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const { color } = useRoleColors();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className={className} testID={testID}>
      <Host matchContents={{ vertical: true }}>
        <ProgressView value={clamped} modifiers={[tint(color('accent'))]} />
      </Host>
    </View>
  );
}
