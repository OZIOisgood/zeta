/**
 * ZDialogPanel — shared public API types (Tier: Native)
 *
 * These types are shared across all platform variants:
 *   - z-dialog-panel.tsx          — Modal+backdrop implementation (web / Storybook / jest / Android)
 *   - z-dialog-panel.ios.tsx      — SwiftUI BottomSheet via @expo/ui/swift-ui
 *   - Android resolves to the bare .tsx: the @expo/ui Compose ModalBottomSheet
 *     never renders its window from RN hosting (verified on device 2026-07-03)
 *
 * The bare .tsx fallback is the contract doc and test surface; the native
 * variants (.ios/.android) must implement the same props without deviation.
 */

import type { ReactNode } from 'react';

export type ZDialogPanelProps = {
  /** Whether the panel is visible / presented. */
  visible: boolean;
  /** Called when the user dismisses the panel (scrim tap, swipe, back button). */
  onClose: () => void;
  /** Content rendered inside the sheet / panel. */
  children: ReactNode;
  /**
   * Accessibility label for the scrim backdrop (fallback only).
   * The native sheets use standard system dismiss gestures instead.
   * @default 'Close'
   */
  closeLabel?: string;
  /** Test identifier forwarded to the panel container (fallback only). */
  testID?: string;
};
