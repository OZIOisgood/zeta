/**
 * ZAvatar — shared public API types (Tier: Custom-RN)
 *
 * ZAvatar is a Custom-RN primitive: no OS-widget equivalent for a user/group
 * avatar that shows an image or fallback initials. Rendered via NativeWind
 * with role tokens; adapts to dark mode through token classes.
 *
 * Platform files:
 *   - z-avatar.tsx — single shared NativeWind implementation (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (no native widget equivalent).
 */

export type ZAvatarShape = 'rounded' | 'circle';

export type ZAvatarProps = {
  /** URI or relative path for the avatar image. */
  image?: string;
  /** Fallback initials shown when no image is available. */
  fallback?: string;
  /** Diameter in dp/pt. Defaults to 36. */
  size?: number;
  /** Shape of the avatar container. Defaults to 'rounded'. */
  shape?: ZAvatarShape;
  /** Accessibility label for screen readers. */
  alt?: string;
  testID?: string;
};
