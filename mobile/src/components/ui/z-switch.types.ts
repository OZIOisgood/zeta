/**
 * ZSwitch — shared public API types (Tier: Custom-RN)
 *
 * Single shared implementation:
 *   - z-switch.tsx — wraps React Native's core `Switch`.
 *
 * Why no .ios/.android split (vs ZCheckbox)?
 *   RN core `Switch` is ALREADY the platform-native control on both targets:
 *   iOS renders a real UISwitch, Android the Material 3 Switch. It is a single
 *   cross-platform component that resolves natively WITHOUT a platform split, so
 *   no `@expo/ui` SwiftUI/Compose variant is needed. Classified Custom-RN (no
 *   native-split equivalent) — same single-file pattern as ZBadge. The control
 *   itself is native; only the file structure is single-source.
 *
 * Platform idiom:
 *   iOS    → UISwitch, per HIG:
 *             https://developer.apple.com/design/human-interface-guidelines/toggles
 *   Android → Material 3 Switch, per M3 spec:
 *             https://m3.material.io/components/switch/overview
 *
 * Used as the `trailing` control of a settings ListItem.
 *
 * Colors come exclusively from role tokens via useRoleColors() — no hex.
 */

import type { StyleProp, ViewStyle } from 'react-native';

export type ZSwitchProps = {
  /** Current on/off state (controlled). */
  checked: boolean;
  /** Callback fired when the user toggles the control. */
  onChange: (checked: boolean) => void;
  /** When true, the control is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** Accessibility label describing what the switch controls. */
  accessibilityLabel: string;
  /** Additional NativeWind class(es) applied to the wrapping element. */
  className?: string;
  /** Inline style applied to the switch. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
