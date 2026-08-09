/**
 * ZProgress — shared public API types (Tier: Native)
 *
 * Determinate linear progress bar.
 *   - z-progress.tsx          — NativeWind track+fill fallback (web / Storybook / jest)
 *   - z-progress.ios.tsx      — SwiftUI ProgressView via @expo/ui/swift-ui
 *   - z-progress.android.tsx  — Material 3 LinearProgressIndicator via @expo/ui/jetpack-compose
 */
export type ZProgressProps = {
  /** Completion fraction 0..1 (clamped). */
  value: number;
  /** NativeWind layout classes forwarded to the outer wrapper. */
  className?: string;
  testID?: string;
};
