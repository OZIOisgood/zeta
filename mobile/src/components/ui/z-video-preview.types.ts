/**
 * ZVideoPreview — shared public API types (Tier: Custom-RN)
 *
 * ZVideoPreview is a Custom-RN primitive: no OS-widget equivalent for a video
 * thumbnail tile with an icon fallback. Rendered via NativeWind with role tokens.
 *
 * Platform files:
 *   - z-video-preview.tsx — single shared NativeWind implementation (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (no native widget equivalent).
 */

export type ZVideoPreviewProps = {
  /** Mux thumbnail URL. When absent the fallback icon is shown. */
  thumbnail?: string;
  /** Accessibility label forwarded to the Image element. */
  alt?: string;
  testID?: string;
};
