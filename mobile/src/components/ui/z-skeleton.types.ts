/**
 * ZSkeleton — shared public API types (Tier: Custom-RN)
 *
 * ZSkeleton is a Custom-RN primitive: no OS-widget equivalent for a
 * pulsing placeholder shimmer block. Rendered via react-native-reanimated
 * with a NativeWind surface token background.
 *
 * Platform files:
 *   - z-skeleton.tsx — single shared implementation (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (no native widget equivalent).
 */

export type ZSkeletonProps = {
  /**
   * NativeWind layout classes forwarded to the animated View.
   * Typically `"h-<n> w-<n>"` or `"h-<n> w-full"`.
   */
  className?: string;
  testID?: string;
};
