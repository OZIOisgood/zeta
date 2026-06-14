/**
 * ZCheckbox — shared public API types (Tier: Native)
 *
 * These types are shared across all platform variants:
 *   - z-checkbox.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-checkbox.ios.tsx      — SwiftUI Toggle via @expo/ui/swift-ui
 *   - z-checkbox.android.tsx  — Jetpack Compose Checkbox via @expo/ui/jetpack-compose
 *
 * Platform idiom:
 *   iOS    → settings toggle semantics map to SwiftUI Toggle (a Switch control),
 *             per HIG: https://developer.apple.com/design/human-interface-guidelines/toggles
 *   Android → Material 3 Checkbox component, per M3 spec:
 *             https://m3.material.io/components/checkbox/overview
 *
 * The bare .tsx fallback is the contract doc and test surface; the native
 * variants (.ios/.android) must implement the same props without deviation.
 */

export type ZCheckboxProps = {
  /** Current checked state (controlled). */
  value: boolean;
  /** Callback fired when the user toggles the control. */
  onValueChange: (value: boolean) => void;
  /** Optional label rendered adjacent to the control. */
  label?: string;
  /**
   * Additional NativeWind class(es) applied to the label Text in the bare
   * fallback only. Native platform files ignore this prop (label styling
   * follows the OS theme on iOS/Android).
   */
  labelClassName?: string;
  /** When true, the control is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
