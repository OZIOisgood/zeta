/**
 * ZAvatarInput — shared public API types (Tier: Custom-RN)
 *
 * ZAvatarInput is a Custom-RN primitive: composites ZAvatar + ZButton with an
 * expo-image-picker image library integration. No OS-widget equivalent for a
 * combined avatar display + pick control.
 *
 * Platform files:
 *   - z-avatar-input.tsx — single shared NativeWind implementation (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (no native widget equivalent).
 */

export type ZAvatarInputProps = {
  /** Current image URI or base-64 data URL. */
  value?: string;
  /** Called with the base-64 payload after the user picks an image. */
  onChange: (base64: string) => void;
  /** Fallback initials for the avatar while no image is set. */
  fallback?: string;
  /** Accessibility label forwarded to ZAvatar. */
  alt?: string;
  /** Already-translated label for the pick button. */
  label: string;
  /** Already-translated helper text shown beside the pick button. */
  helperText?: string;
  /** When true the pick button is non-interactive. */
  disabled?: boolean;
  testID?: string;
};
